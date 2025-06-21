import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import React from "react";
import { WagmiConfigProvider } from "./Wagmi.jsx";
import { BrowserRouter } from "react-router-dom"
import { AuthProvider } from "./Context/AuthContext";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <WagmiConfigProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </WagmiConfigProvider>
    </BrowserRouter>
  </StrictMode>
);
