import React, { createContext, useEffect, useState } from "react";
import { AnalyticsBrowser } from "@segment/analytics-next";
import { useLocation } from "react-router-dom";
import { ARBITRUM, ARBITRUM_TESTNET, CURRENT_PROVIDER_LOCALSTORAGE_KEY, hasUserConsented } from "./Helpers";
import { useWeb3React } from "@web3-react/core";

const writeKey = process.env.REACT_APP_SEGMENT_WRITE_KEY;

const networkName = {
  [ARBITRUM]: "Arbitrum",
  [ARBITRUM_TESTNET]: "Rinkeby",
};

const IGNORE_IP_CONTEXT = {
  context: {
    ip: 0,
  },
};

export const useAnalytics = () => {
  const { account } = useWeb3React();
  const location = useLocation();
  const [analytics, setAnalytics] = useState(undefined);

  const trackLogin = (chainId, gmxBalances, balanceEth) => {
    const hasConsented = hasUserConsented();
    try {
      const provider = localStorage.getItem(CURRENT_PROVIDER_LOCALSTORAGE_KEY);
      const traits = {
        walletProvider: provider,
        walletAddress: account,
        network: networkName[chainId] ?? `Unsupported (${chainId})`,
        balanceEth: balanceEth,
        ...gmxBalances,
      };
      if (account && hasConsented) {
        analytics?.track("userLoggedIn", {
          ...traits,
        });
      } else {
        analytics?.track("userLoggedIn", {
          ...IGNORE_IP_CONTEXT,
          ...traits,
        });
      }
    } catch (err) {
      console.error("Failed to send Login action to Segment", err);
    }
  };

  // Identify call
  useEffect(() => {
    try {
      if (account) {
        analytics?.alias(account); // Alias previous anonymousId to wallet address
        analytics?.identify(account, {
          walletAddress: account,
        });
      }
    } catch (err) {
      console.error("Failed to send Identify action to Segment", err);
    }
  }, [analytics, account]);

  // Page call
  useEffect(() => {
    const hasConsented = hasUserConsented();
    const windowTraits = {
      screenHeight: window.innerHeight || "unknown",
      screenWidth: window.innerWidth || "unknown",
      screenDensity: window.devicePixelRatio || "unknown",
    };
    if (hasConsented) {
      analytics?.page({ ...windowTraits });
    } else if (!hasConsented) {
      analytics?.page({
        ...IGNORE_IP_CONTEXT,
        ...windowTraits,
      });
    }
  }, [analytics, location.pathname]);

  useEffect(() => {
    if (!writeKey) {
      console.warn("Segment.io write key not set");
    } else {
      const loadAnalytics = async () => {
        const [response] = await AnalyticsBrowser.load({ writeKey });
        setAnalytics(response);
      };
      loadAnalytics();
    }
  }, []);

  return {
    trackLogin,
  };
};

export const AnalyticsContext = createContext({});

export const AnalyticsProvider = ({ children }) => {
  return <AnalyticsContext.Provider value={useAnalytics()}>{children}</AnalyticsContext.Provider>;
};
