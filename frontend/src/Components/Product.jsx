import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  FaArrowLeft,
  FaComments,
  FaShoppingCart,
  FaSpinner,
} from "react-icons/fa";
import Header from "../Layouts/Header";
import Footer from "../Layouts/Footer";
import detectEthereumProvider from "@metamask/detect-provider";
import { ethers } from "ethers";
import EscrowArtifact from "../Escrow.json";
import { useAccount } from "wagmi";

const Product = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [escrow, setEscrow] = useState(null); // { id, contractAddress }
  const [escrowTransactions, setEscrowTransactions] = useState([]);
  const [isInitiatingEscrow, setIsInitiatingEscrow] = useState(false);
  const [isReleasingFunds, setIsReleasingFunds] = useState(false);
  const { isConnected } = useAccount();

  console.log(product);

  useEffect(() => {
    if (!productId) {
      setError("No product ID provided in URL");
      setIsLoading(false);
      return;
    }
    fetchProduct();
    fetchEscrowTransactions();
  }, [productId]);

  useEffect(() => {
    if (chatOpen) fetchMessages();
  }, [chatOpen, productId]);

  const fetchProduct = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Please connect your wallet.");
      setIsLoading(false);
      return;
    }
    try {
      console.log("Fetching product with ID:", productId);
      const headers = { "Authorization": `Bearer ${token}` };
      const response = await fetch(
        `http://localhost:3000/products/${productId}`,
        { headers, credentials: "include" },
      );
      console.log("Fetch product response status:", response.status);
      const text = await response.text();
      console.log("Fetch product raw response:", text);
      let data;
      try {
        data = JSON.parse(text);
      } catch (parseErr) {
        throw new Error(`Failed to parse response: ${parseErr.message}`);
      }
      if (!response.ok) {
        throw new Error(
          data.error || `Failed to fetch product: ${response.status}`,
        );
      }
      if (!data.success || !data.data) {
        throw new Error("Invalid response format from server");
      }
      console.log("Product data:", data.data);
      setProduct(data.data);
      setIsLoading(false);
    } catch (err) {
      console.error("Fetch product error:", err.message);
      setError(err.message);
      setIsLoading(false);
    }
  };

  const fetchEscrowTransactions = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const response = await fetch(`http://localhost:3000/escrow/user`, {
        headers: { "Authorization": `Bearer ${token}` },
        credentials: "include",
      });
      const text = await response.text();
      console.log("Escrow transactions raw response:", text);
      if (!response.ok) {
        throw new Error(
          `HTTP error! Status: ${response.status}, Response: ${text}`,
        );
      }
      const data = JSON.parse(text);
      const productTransactions = data.data.filter(
        (tx) =>
          tx.productId?._id && tx.productId._id.toString() === productId &&
          tx.status !== "held",
      );
      setEscrowTransactions(productTransactions);
    } catch (err) {
      console.error("Fetch escrow transactions error:", err.message);
      setEscrowTransactions([]);
    }
  };

  const fetchMessages = async () => {
    const token = localStorage.getItem("token");
    try {
      const response = await fetch(
        `http://localhost:3000/chat/product/${productId}`,
        {
          headers: { "Authorization": `Bearer ${token}` },
          credentials: "include",
        },
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch messages");
      }
      setMessages(data);
    } catch (err) {
      console.error("Fetch messages error:", err.message);
    }
  };

  const sendMessage = async () => {
    const token = localStorage.getItem("token");
    try {
      const response = await fetch("http://localhost:3000/chat/send", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ productId, message: newMessage }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to send message");
      }
      setNewMessage("");
      fetchMessages();
    } catch (err) {
      console.error("Send message error:", err.message);
    }
  };

  const addToCart = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Please connect your wallet to add items to cart.");
      return;
    }
    try {
      const response = await fetch("http://localhost:3000/cart/add", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ productId, quantity }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to add to cart");
      }
      alert("Item added to cart!");
      navigate("/cart");
    } catch (err) {
      setError(err.message);
    }
  };

  const initiateEscrow = async () => {
    setIsInitiatingEscrow(true);

    const token = localStorage.getItem("token");
    const provider = await detectEthereumProvider();
    if (!provider) {
      setIsInitiatingEscrow(false);
      setError("Please install MetaMask");
      return;
    }

    try {
      console.log("Requesting MetaMask account access...");
      await provider.request({ method: "eth_requestAccounts" });
      const ethersProvider = new ethers.providers.Web3Provider(provider);
      const signer = ethersProvider.getSigner();

      console.log("Creating escrow record on backend...");
      const response = await fetch("http://localhost:3000/escrow/create", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          productId: product._id,
          amount: product.price * quantity,
          paymentToken: product.paymentToken,
          quantity,
        }),
      });
      const text = await response.text();
      console.log("Escrow create raw response:", text);
      if (!response.ok) {
        setIsInitiatingEscrow(false);
        throw new Error(
          `HTTP error! Status: ${response.status}, Response: ${text}`,
        );
      }
      const data = JSON.parse(text);
      const escrowId = data.data?._id;

      if (!escrowId) {
        setIsInitiatingEscrow(false);
        throw new Error("Escrow ID not returned from backend");
      }
      console.log("Escrow ID:", escrowId);

      console.log("Seller address:", product.owner?.walletAddress);
      if (
        !product.owner?.walletAddress ||
        !ethers.utils.isAddress(product.owner.walletAddress)
      ) {
        setIsInitiatingEscrow(false);
        throw new Error("Invalid seller wallet address");
      }

      console.log("Deploying escrow contract...");
      const priceInEther = product.price * quantity;
      const valueInWei = ethers.utils.parseEther(priceInEther.toString());

      const buyerAddress = await signer.getAddress();
      console.log("Buyer address:", buyerAddress);
      const balance = await ethersProvider.getBalance(buyerAddress);
      if (balance.lt(valueInWei)) {
        setIsInitiatingEscrow(false);
        throw new Error("Insufficient ETH balance to cover the purchase");
      }

      const EscrowFactory = new ethers.ContractFactory(
        EscrowArtifact.abi,
        EscrowArtifact.data.bytecode,
        signer,
      );
      const escrowContract = await EscrowFactory.deploy(
        product.owner.walletAddress,
        {
          value: valueInWei,
          gasLimit: 3000000,
        },
      );
      await escrowContract.deployed();

      setEscrow({ id: escrowId, contractAddress: escrowContract.address });
      console.log("Escrow contract deployed at:", escrowContract.address);

      console.log("Updating backend with contract address...");
      const updateResponse = await fetch(
        `http://localhost:3000/escrow/${escrowId}`,
        {
          method: "PATCH",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            contractAddress: escrowContract.address,
            status: "held",
          }),
        },
      );
      const updateText = await updateResponse.text();
      console.log("Escrow update raw response:", updateText); // Added for debugging
      if (!updateResponse.ok) {
        let updateData;
        try {
          updateData = JSON.parse(updateText);
        } catch (parseErr) {
          setIsInitiatingEscrow(false);
          throw new Error(`Failed to parse update response: ${updateText}`);
        }
        setIsInitiatingEscrow(false);
        throw new Error(
          `Failed to update escrow: ${updateData.error || updateText}`,
        );
      }
      fetchEscrowTransactions();
      alert(`Escrow contract deployed at ${escrowContract.address}`);

      setIsInitiatingEscrow(false);
    } catch (err) {
      setIsInitiatingEscrow(false);

      console.error("Escrow initiation error:", err);
      if (err.code === 4001) {
        setError("MetaMask connection rejected by user");
      } else if (
        err.code === "UNSUPPORTED_OPERATION" && err.operation === "getAddress"
      ) {
        setError(
          "MetaMask is not connected or account is unavailable. Please connect MetaMask and try again.",
        );
      } else {
        setError(err.message || "Failed to initiate escrow");
      }
    }
  };

  const releaseFunds = async () => {
    const token = localStorage.getItem("token");
    setIsReleasingFunds(true);

    const provider = await detectEthereumProvider();
    if (!provider) {
      setIsReleasingFunds(false);
      setError("Please install MetaMask");
      return;
    }
    if (!escrow) {
      setIsReleasingFunds(false);
      setError("No escrow contract deployed");
      return;
    }

    try {
      await provider.request({ method: "eth_requestAccounts" });
      const ethersProvider = new ethers.providers.Web3Provider(provider);
      const signer = ethersProvider.getSigner();
      const escrowContract = new ethers.Contract(
        escrow.contractAddress,
        EscrowArtifact.abi,
        signer,
      );

      const callerAddress = await signer.getAddress();
      console.log("Caller address for release:", callerAddress);
      const buyerAddress = await escrowContract.buyer();
      if (callerAddress.toLowerCase() !== buyerAddress.toLowerCase()) {
        setIsReleasingFunds(false);
        throw new Error("Only the buyer can release funds");
      }

      console.log("Calling release on contract:", escrowContract.address);
      const tx = await escrowContract.release();
      await tx.wait();
      console.log("Release transaction confirmed:", tx.hash);

      const backendResponse = await fetch(
        `http://localhost:3000/escrow/release/${escrow.id}`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          credentials: "include",
        },
      );
      const backendText = await backendResponse.text();
      console.log("Release backend response:", backendText);
      if (!backendResponse.ok) {
        setIsReleasingFunds(false);
        throw new Error(`Backend release failed: ${backendText}`);
      }

      fetchEscrowTransactions();

      setIsReleasingFunds(false);
      setIsInitiatingEscrow(false);
      setEscrow(null);

      alert("Funds released to seller");
    } catch (err) {
      setIsReleasingFunds(false);
      console.error("Release funds error:", err);
      setError(err.reason || err.message || "Failed to release funds");
    }
  };

  const refundFunds = async () => {
    const token = localStorage.getItem("token");
    const provider = await detectEthereumProvider();
    if (!provider) {
      setError("Please install MetaMask");
      return;
    }
    if (!escrow) {
      setError("No escrow contract deployed");
      return;
    }

    try {
      await provider.request({ method: "eth_requestAccounts" });
      const ethersProvider = new ethers.providers.Web3Provider(provider);
      const signer = ethersProvider.getSigner();
      const escrowContract = new ethers.Contract(
        escrow.contractAddress,
        EscrowArtifact.abi,
        signer,
      );

      const callerAddress = await signer.getAddress();
      console.log("Caller address for refund:", callerAddress);
      const sellerAddress = await escrowContract.seller();
      if (callerAddress.toLowerCase() !== sellerAddress.toLowerCase()) {
        throw new Error("Only the seller can refund funds");
      }

      console.log("Calling refund on contract:", escrowContract.address);
      const tx = await escrowContract.refund();
      await tx.wait();
      console.log("Refund transaction confirmed:", tx.hash);

      const backendResponse = await fetch(
        `http://localhost:3000/escrow/refund/${escrow.id}`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          credentials: "include",
        },
      );
      const backendText = await backendResponse.text();
      console.log("Refund backend response:", backendText);
      if (!backendResponse.ok) {
        throw new Error(`Backend refund failed: ${backendText}`);
      }

      fetchEscrowTransactions();
      alert("Funds refunded to buyer");
    } catch (err) {
      console.error("Refund funds error:", err);
      setError(err.reason || err.message || "Failed to refund funds");
    }
  };

  const getImageUrl = (imagePath) => {
    if (!imagePath) {
      console.warn("No image path provided");
      return null;
    }
    const normalizedPath = imagePath.toLowerCase().startsWith("/uploads/")
      ? imagePath
      : `/Uploads/${imagePath}`;
    const url = `http://localhost:3000${normalizedPath}`;
    console.log("Attempting to fetch image:", url);
    return url;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <FaSpinner className="animate-spin text-purple-900 text-4xl" />
      </div>
    );
  }

  if (error) return <div className="text-red-500 p-6">{error}</div>;
  if (!product) return <div className="p-6">Product not found</div>;

  return (
    <>
      <div className="mt-12">
        <Header />
      </div>
      <div className="min-h-screen flex items-center justify-center p-8 bg-gray-100">
        <div className="bg-white shadow-lg rounded-lg flex w-full max-w-5xl p-6 relative">
          <button
            onClick={() => navigate(-1)}
            className="absolute top-4 left-4 text-gray-700 hover:text-purple-900 p-2 rounded-full"
          >
            <FaArrowLeft size={20} />
          </button>
          <div className="w-2/3">
            {product.generalImage
              ? (
                <img
                  src={getImageUrl(product.generalImage)}
                  alt={product.name}
                  className="w-full h-[400px] object-cover rounded-lg"
                  onError={(e) => {
                    console.error("Image load error:", e);
                    e.target.src =
                      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==";
                  }}
                />
              )
              : (
                <div className="w-full h-[400px] bg-gray-200 rounded-lg flex items-center justify-center">
                  <span className="text-gray-500">No Image</span>
                </div>
              )}
            <div className="p-4 rounded-lg">
              <p className="text-gray-600 mt-1">{product.shortDescription}</p>
            </div>
            <div className="p-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                Transaction History
              </h3>
              {escrowTransactions.length > 0
                ? (
                  <ul className="space-y-2 text-gray-600">
                    {escrowTransactions.map((tx) => (
                      <li key={tx._id}>
                        {tx.status === "released" ? "Sold" : "Refunded"}{" "}
                        {tx.amount} {tx.paymentToken} -{" "}
                        {new Date(tx.updatedAt).toLocaleString()} (Tx:{" "}
                        {tx.contractAddress.slice(0, 6)}...)
                      </li>
                    ))}
                  </ul>
                )
                : <p>No settled transactions yet.</p>}
            </div>
          </div>
          <div className="w-1/3 p-6 flex flex-col justify-between">
            <div>
              <h2 className="text-2xl font-bold">{product.name}</h2>
              <p className="text-xl text-blue-600 font-semibold">
                {product.price} {product.paymentToken}
              </p>
              <p className="text-gray-600">{product.shortDescription}</p>
              <p className="text-gray-500 mt-2 font-semibold">
                Store: {product.store?.name || "Unknown Store"}
              </p>
              <hr className="my-4" />
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                  className="px-3 py-1 bg-gray-300 text-black rounded cursor-pointer"
                >
                  -
                </button>
                <span className="text-lg font-semibold">{quantity}</span>
                <button
                  onClick={() =>
                    setQuantity((prev) =>
                      Math.min(product.amount || Infinity, prev + 1)
                    )}
                  className="px-3 py-1 bg-gray-300 text-black rounded cursor-pointer"
                >
                  +
                </button>
              </div>
              <div className="mt-4 flex space-x-4">
                {!escrow && (
                  <button
                    onClick={() => {
                      if (isConnected) {
                        if (product.amount === 0) {
                          alert("This product is currently not available.");
                        } else {
                          initiateEscrow();
                        }
                      } else {
                        alert("Connect your wallet to proceed.");
                      }
                    }}
                    className="flex-1 bg-purple-900 text-white py-2 rounded-lg text-center font-semibold cursor-pointer"
                    disabled={isInitiatingEscrow}
                  >
                    {isInitiatingEscrow ? "Loading..." : "Buy"}
                  </button>
                )}

                {escrow && (
                  <button
                    onClick={releaseFunds}
                    className="flex-1 bg-green-500 text-white px-4 py-2 rounded"
                    disabled={isReleasingFunds}
                  >
                    {isReleasingFunds ? "Loading..." : "Release Funds"}
                  </button>
                  // <button
                  //   onClick={refundFunds}
                  //   className="bg-red-500 text-white px-4 py-2 rounded"
                  // >
                  //   Refund
                  // </button>
                )}

                {
                  /* <button
                  onClick={() => setChatOpen(true)}
                  className="bg-gray-300 p-3 rounded-lg cursor-pointer hover:bg-gray-400 transition"
                >
                  <FaComments size={20} />
                </button> */
                }
                <button
                  onClick={addToCart}
                  className="bg-gray-300 p-3 rounded-lg cursor-pointer hover:bg-gray-400 transition"
                >
                  <FaShoppingCart size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      {chatOpen && (
        <div className="fixed bottom-4 right-4 w-80 h-96 bg-white border rounded-lg shadow-lg p-4">
          <h3 className="text-lg font-bold">Chat with Seller</h3>
          <div className="h-64 overflow-y-auto border p-2 mb-2">
            {messages.map((msg) => (
              <p key={msg._id}>
                {msg.senderId.walletAddress.slice(0, 6)}...: {msg.message}
              </p>
            ))}
          </div>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="w-full p-2 border rounded"
          />
          <div className="mt-2 flex space-x-2">
            <button
              onClick={sendMessage}
              className="bg-purple-500 text-white px-4 py-1 rounded hover:bg-purple-600"
            >
              Send
            </button>
            <button
              onClick={() => setChatOpen(false)}
              className="bg-gray-500 text-white px-4 py-1 rounded hover:bg-gray-600"
            >
              Close
            </button>
          </div>
        </div>
      )}
      <Footer />
    </>
  );
};

export default Product;
