import React, { createContext, useCallback, useEffect, useState } from "react";
import { useAccount, useDisconnect } from "wagmi";

export const AuthContext = createContext({
  isAuthenticated: false,
  isAdmin: false,
  walletAddress: "",
  token: "",
  cartCount: 0,
  notificationCount: 0,
  nonce: null,
  fetchNonce: async () => {},
  fetchUserProfile: async () => {},
  fetchCartCount: async () => {},
  fetchNotificationCount: async () => {},
  logout: () => {},
  setIsAuthenticated: async (value) => {},
  setToken: async (value) => {},
  setWalletAddress: async (value) => {},
});

export const AuthProvider = ({ children }) => {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  const [isAuthenticated, setIsAuthenticated] = useState(
    Boolean(localStorage.getItem("token")),
  );
  const [isAdmin, setIsAdmin] = useState(false);
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [walletAddress, setWalletAddress] = useState("");
  const [cartCount, setCartCount] = useState(
    Number(localStorage.getItem("cartCount")) || 0,
  );
  const [notificationCount, setNotificationCount] = useState(
    Number(localStorage.getItem("notificationCount")) || 0,
  );
  const [nonce, setNonce] = useState(null);

  // Cache mechanism
  const cache = {
    profile: null,
    cartCount: null,
    notificationCount: null,
    categories: null,
    nonce: null,
    lastFetched: {},
  };

  const fetchNonce = useCallback(async (walletAddress, force = false) => {
    // if (!walletAddress) return null;

    // const cacheKey = `nonce_${walletAddress}`;
    // if (
    //   !force &&
    //   cache[cacheKey] &&
    //   Date.now() - cache.lastFetched[cacheKey] < 5 * 60 * 1000
    // ) {
    //   setNonce(cache[cacheKey]);
    //   return cache[cacheKey];
    // }

    // try {
    //   console.log(`Fetching nonce for address: ${walletAddress}`);
    //   const response = await fetch(
    //     `http://localhost:3000/user/nonce/${walletAddress}`,
    //     { method: "GET" }
    //   );
    //   const data = await response.json();
    //   const fetchedNonce = data.data.nonce;
    //   if (!fetchedNonce) {
    //     throw new Error("Invalid nonce received");
    //   }
    //   cache[cacheKey] = fetchedNonce;
    //   cache.lastFetched[cacheKey] = Date.now();
    //   setNonce(fetchedNonce);
    //   console.log("Nonce retrieved:", fetchedNonce);
    //   return fetchedNonce;
    // } catch (error) {
    //   console.error("Error fetching nonce:", error.message);
    //   throw error;
    // }
  }, []);

  const fetchUserProfile = useCallback(async (force = false) => {
    const storedToken = localStorage.getItem("token");
    if (!storedToken) return;

    const cacheKey = "profile";
    if (
      !force &&
      cache[cacheKey] &&
      Date.now() - cache.lastFetched[cacheKey] < 5 * 60 * 1000
    ) {
      setIsAdmin(cache[cacheKey].isAdmin || false);
      setWalletAddress(cache[cacheKey].walletAddress);
      return;
    }

    try {
      const response = await fetch(
        "http://localhost:3000/user/profile",
        { method: "GET" },
      );
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to fetch profile");
      }

      cache[cacheKey] = data.data;
      cache.lastFetched[cacheKey] = Date.now();

      setIsAdmin(data.data.isAdmin || false);
      setWalletAddress(data.data.walletAddress);
      setIsAuthenticated(true);
    } catch (err) {
      console.error("Profile fetch error:", err.message);

      if (err.status === 401) {
        logout();
      }
    }
  }, []);

  const fetchCartCount = useCallback(async (force = false) => {
    const storedToken = localStorage.getItem("token");
    if (!storedToken) return;

    const cacheKey = "cartCount";
    if (
      !force &&
      cache[cacheKey] !== null &&
      Date.now() - cache.lastFetched[cacheKey] < 5 * 60 * 1000
    ) {
      setCartCount(cache[cacheKey]);
      return;
    }

    try {
      const response = await fetch("http://localhost:3000/cart", {
        method: "GET",
      });
      const data = await response.json();

      if (!data.success) throw new Error(data.error || "Failed to fetch cart");

      const count = data.data.items
        ? data.data.items.filter((item) => item.product != null).length
        : 0;

      cache[cacheKey] = count;
      cache.lastFetched[cacheKey] = Date.now();

      setCartCount(count);
      localStorage.setItem("cartCount", count);
    } catch (err) {
      console.warn("Cart fetch error:", err.message);
      setCartCount(0);
      localStorage.setItem("cartCount", "0");
    }
  }, []);

  const fetchNotificationCount = useCallback(async (force = false) => {
    const storedToken = localStorage.getItem("token");
    if (!storedToken) return;

    const cacheKey = "notificationCount";
    if (
      !force &&
      cache[cacheKey] !== null &&
      Date.now() - cache.lastFetched[cacheKey] < 5 * 60 * 1000
    ) {
      setNotificationCount(cache[cacheKey]);
      return;
    }

    try {
      const response = await fetch(
        "http://localhost:3000/notifications/count",
        { method: "GET" },
      );
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to fetch notification count");
      }

      const count = data.data.count || 0;

      cache[cacheKey] = count;
      cache.lastFetched[cacheKey] = Date.now();

      setNotificationCount(count);
      localStorage.setItem("notificationCount", count);
    } catch (err) {
      console.warn("Notification count fetch error:", err.message);
      setNotificationCount(0);
      localStorage.setItem("notificationCount", "0");
    }
  }, []);

  const logout = useCallback(() => {
    disconnect();
    localStorage.removeItem("token");
    localStorage.removeItem("cartCount");
    localStorage.removeItem("notificationCount");

    setToken("");
    setWalletAddress("");
    setCartCount(0);
    setNotificationCount(0);
    setIsAdmin(false);
    setIsAuthenticated(false);
    setNonce(null);

    // Clear cache
    cache.profile = null;
    cache.cartCount = null;
    cache.notificationCount = null;
    cache.categories = null;
    cache.nonce = null;
  }, [disconnect]);

  // Implement the setter functions that were only defined in the context
  const updateToken = useCallback(async (newToken) => {
    localStorage.setItem("token", newToken);
    setToken(newToken);
  }, []);

  const updateWalletAddress = useCallback(async (address) => {
    setWalletAddress(address);
  }, []);

  const updateIsAuthenticated = useCallback(async (value) => {
    setIsAuthenticated(value);
  }, []);

  // Check and synchronize wallet connection status
  // useEffect(() => {
  //   console.log(isAuthenticated, "isAuthenticated");

  //   if (!isConnected && isAuthenticated) {
  //     logout();
  //   } else if (isConnected && address && !isAuthenticated) {
  //     fetchNonce(address);
  //   }
  // }, [isConnected, address, isAuthenticated, fetchNonce, logout]);

  // Initialize data when token is available
  useEffect(() => {
    const storedToken = localStorage.getItem("token");

    if (storedToken) {
      setToken(storedToken);
      setIsAuthenticated(true);

      fetchUserProfile();
      fetchCartCount();
      fetchNotificationCount();
    }
  }, [fetchUserProfile, fetchCartCount, fetchNotificationCount]);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isAdmin,
        walletAddress,
        token,
        cartCount,
        notificationCount,
        nonce,
        fetchNonce,
        fetchUserProfile,
        fetchCartCount,
        fetchNotificationCount,
        logout,
        setIsAuthenticated: updateIsAuthenticated,
        setToken: updateToken,
        setWalletAddress: updateWalletAddress,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
