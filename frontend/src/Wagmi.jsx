import * as React from "react";
import "@rainbow-me/rainbowkit/styles.css";
import {
  createAuthenticationAdapter,
  getDefaultConfig,
  RainbowKitAuthenticationProvider,
  RainbowKitProvider,
} from "@rainbow-me/rainbowkit";
import { useAccount, useDisconnect, WagmiProvider } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SiweMessage } from "siwe";
import { fetchWithRetry } from "./utils/api";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./Context/AuthContext";

const InnerWagmiConfig = ({ children }) => {
  const { address } = useAccount();
  const { disconnect } = useDisconnect();
  const navigate = useNavigate();
  const { setIsAuthenticated, setToken, setWalletAddress, nonce, fetchNonce } =
    useAuth();
  const [walletAuthStatus, setWalletAuthStatus] = React.useState(
    "unauthenticated",
  );
  const [errorMessage, setErrorMessage] = React.useState("");

  const handleVerify = async ({ message, signature }) => {
    try {
      console.log(
        "Verifying with message:",
        message,
        "and signature:",
        signature,
      );
      const connectResponse = await fetchWithRetry(
        "http://localhost:3000/user/connect-wallet",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            walletAddress: address,
            signature,
            message,
          }),
        },
      );

      const data = await connectResponse.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to authenticate wallet");
      }

      if (data.data.token) {
        console.log("Token found:", data.data.token);
        console.log("Authentication successful!");
        localStorage.setItem("token", data.data.token);
        setWalletAuthStatus("authenticated");
        setIsAuthenticated(true);
        setToken(data.data.token);
        setWalletAddress(address);
        setTimeout(() => navigate("/profile"), 100);
      } else {
        throw new Error("No token received from server");
      }
    } catch (err) {
      console.error("Verification error:", err);
      setWalletAuthStatus("unauthenticated");
      let userError = "Failed to authenticate wallet. Please try again.";

      if (err.message.includes("User rejected request")) {
        userError = "Signature cancelled. Please approve the signature.";
      } else if (err.message.includes("Cannot read properties of null")) {
        userError =
          "Wallet signing failed. Please ensure MetaMask is on Base Sepolia and try again.";
      } else if (err.status === 500) {
        userError = "Server error: Unable to process wallet connection.";
      } else if (err.status === 401) {
        userError = "Authentication failed. Please try again.";
      }

      setErrorMessage(userError);
      disconnect();
    }
  };

  const authenticationAdapter = createAuthenticationAdapter({
    getNonce: async () => {
      if (!address) throw new Error("No address provided");
      const fetchedNonce = nonce || (await fetchNonce(address));
      if (!fetchedNonce) {
        throw new Error("Failed to fetch nonce");
      }
      console.log("Nonce retrieved:", fetchedNonce);
      return fetchedNonce;
    },
    createMessage: ({ nonce, address, chainId }) => {
      try {
        console.log("Creating SIWE message with:", { nonce, address, chainId });
        const siweMessage = new SiweMessage({
          domain: window.location.host,
          address,
          uri: window.location.origin,
          version: "1",
          chainId,
          nonce,
        });
        console.log("SIWE message object:", siweMessage);
        return siweMessage;
      } catch (error) {
        console.error("Error creating SIWE message:", error.message);
        throw new Error(`Failed to create SIWE message: ${error.message}`);
      }
    },
    getMessageBody: ({ message }) => {
      try {
        console.log("Preparing SIWE message:", message);
        const preparedMessage = message.prepareMessage();
        console.log("Prepared message:", preparedMessage);
        if (!preparedMessage || typeof preparedMessage !== "string") {
          throw new Error("Prepared message is invalid or not a string");
        }
        return preparedMessage;
      } catch (error) {
        console.error("Error preparing SIWE message:", error.message);
        throw new Error(`Failed to prepare SIWE message: ${error.message}`);
      }
    },
    verify: handleVerify,
    signOut: async () => {
      setWalletAuthStatus("unauthenticated");
      localStorage.removeItem("token");
      setErrorMessage("");
      setIsAuthenticated(false);
      setToken("");
      setWalletAddress("");
    },
  });

  React.useEffect(() => {
    console.log(
      "Authentication adapter initialized, walletAuthStatus:",
      walletAuthStatus,
    );
  }, [walletAuthStatus]);

  return (
    <RainbowKitAuthenticationProvider
      // adapter={authenticationAdapter}
      // status={walletAuthStatus}
    >
      <RainbowKitProvider modalSize="compact">
        {children}
        {errorMessage && (
          <div style={{ color: "red", textAlign: "center", marginTop: "10px" }}>
            {errorMessage}
          </div>
        )}
      </RainbowKitProvider>
    </RainbowKitAuthenticationProvider>
  );
};

export const WagmiConfigProvider = ({ children }) => {
  const appId = import.meta.env.REOWN_PROJECT_ID ||
    "b972d173034ec0a0cb6cf40713015942";

  if (!appId) {
    console.warn("Project ID not found");
    return <>{children}</>;
  }

  const config = getDefaultConfig({
    appName: "kARA",
    projectId: appId,
    chains: [baseSepolia],
  });

  const queryClient = new QueryClient();

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <InnerWagmiConfig>{children}</InnerWagmiConfig>
      </QueryClientProvider>
    </WagmiProvider>
  );
};
