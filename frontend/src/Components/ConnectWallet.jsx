import React, { useEffect, useState } from "react";
import { useAccount, useDisconnect, useSignMessage } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { SiweMessage } from "siwe";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../Context/AuthContext";

export const ConnectWallet = () => {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();
  const navigate = useNavigate();
  const { isAuthenticated, setIsAuthenticated, setToken, setWalletAddress } =
    useAuth();
  const [errorMessage, setErrorMessage] = useState("");

  const handleAuthentication = async () => {
    if (!address || !isConnected || isAuthenticated) return;

    try {
      console.log(`Authenticating wallet for address: ${address}`);
      // Fetch nonce
      const nonceResponse = await fetch(
        `http://localhost:3000/user/nonce/${address}`,
        { method: "GET" },
      );
      const nonceData = await nonceResponse.json();
      const nonce = nonceData.data.nonce;
      if (!nonce) {
        throw new Error("Invalid nonce received");
      }
      console.log("Nonce retrieved:", nonce);

      // Create SIWE message - Fixed structure
      const siweMessage = new SiweMessage({
        domain: window.location.host,
        address: address,
        statement: "Allow me connect.",
        uri: window.location.origin,
        version: "1",
        chainId: 84532,
        nonce: nonce,
        issuedAt: new Date().toISOString(),
      });

      // Prepare message correctly
      const message = siweMessage.prepareMessage();
      console.log("SIWE message prepared:", message);

      // Sign message
      const signature = await signMessageAsync({ message });
      console.log("Signature:", signature);

      // Send to backend - Fixed to send proper format
      const connectResponse = await fetch(
        "http://localhost:3000/user/connect-wallet",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            walletAddress: address,
            signature,
            message: message, 
          }),
        },
      );

      const data = await connectResponse.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to authenticate wallet");
      }

      if (data.data.token) {
        localStorage.setItem("token", data.data.token);
        setIsAuthenticated(true);
        setToken(data.data.token);
        setWalletAddress(address);
        console.log("Authentication successful, token:", data.data.token);
        return;
      } else {
        throw new Error("No token received from server");
      }
    } catch (err) {
      console.error("Authentication error:", err);
      let userError = "Failed to authenticate wallet. Please try again.";

      if (err.message?.includes("User rejected request")) {
        userError = "Signature cancelled. Please approve the signature.";
      } else if (err.message?.includes("Cannot read properties of null")) {
        userError =
          "Wallet signing failed. Please ensure MetaMask is on Base Sepolia.";
      } else if (err.message?.includes("preparing message")) {
        userError =
          "Error preparing message. Please check your connection and try again.";
      }

      setErrorMessage(userError);
      disconnect();
    }
  };

  useEffect(() => {
    if (isConnected && address && !isAuthenticated) {
      handleAuthentication();
    }
  }, [isConnected, address, isAuthenticated]);

  
  // Clear error message when connection state changes
  useEffect(() => {
    setErrorMessage("");
  }, [isConnected]);

  return (
    <div style={{ textAlign: "center", marginTop: "20px" }}>
      <ConnectButton />
      {errorMessage && (
        <p style={{ color: "red", marginTop: "10px" }}>{errorMessage}</p>
      )}
    </div>
  );
};
