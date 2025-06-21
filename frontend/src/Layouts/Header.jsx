import React, { useState, useEffect, useCallback, useRef, memo } from "react";
import { useAccount, useSignMessage, useDisconnect } from "wagmi";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { IoMdNotifications, IoMdCart } from "react-icons/io";
import { FaBars, FaUser, FaUserCircle, FaSignOutAlt } from "react-icons/fa";
import karaLogo1 from "../assets/KaraLogo1.png";
import { debounce } from "lodash";
import { ConnectWallet } from "../Components/ConnectWallet";
import { useAuth } from "../context/AuthContext";

// Define category routes (same as LandingPage.jsx)
const categoryLinks = [
  { name: "Electronics", link: "/electronics" },
  { name: "Smartphones & Tablets", link: "/smartphonestabs" },
  { name: "Home & Garden", link: "/homeandgarden" },
  { name: "Fashion", link: "/fashion" },
  { name: "Vehicles", link: "/vehicles" },
];

const navItems = [
  { title: "Stores", link: "/stores" },
  { title: "Collections", link: "/collections" },
  { title: "About Us", link: "/aboutus" },
];

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    isAuthenticated,
    isAdmin,
    walletAddress,
    cartCount,
    notificationCount,
    logout,
    fetchCartCount,
    fetchNotificationCount,
    setIsAuthenticated,
  } = useAuth();

  const { isConnected } = useAccount();

  useEffect(() => {
    setIsAuthenticated(isConnected);
  }, [isConnected, setIsAuthenticated]);

  const [categoryOpen, setCategoryOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [closeTimeout, setCloseTimeout] = useState(null);
  const [profileCloseTimeout, setProfileCloseTimeout] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categories, setCategories] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");

  // Fetch categories
  const fetchCategories = useCallback(async (force = false) => {
    try {
      const response = await fetch("http://localhost:3000/api/categories", {
        method: "GET",
        credentials: "include",
      });
      const data = await response.json();
      if (!data.success)
        throw new Error(data.error || "Failed to fetch categories");
      // Map backend categories to predefined routes
      const mappedCategories = (data.data || []).map((category, index) => {
        const matchedCategory =
          categoryLinks.find(
            (c) => c.name.toLowerCase() === category.name?.toLowerCase()
          ) || categoryLinks[index % categoryLinks.length]; // Fallback to indexed link
        return {
          ...category,
          link: matchedCategory.link,
        };
      });
      setCategories(mappedCategories);
    } catch (err) {
      console.warn("Categories fetch error:", err.message);
      setCategories([]);
      setErrorMessage("Unable to load categories.");
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleEmailSubmit = useCallback(() => {
    if (window.handleModalSubmit) window.handleModalSubmit(emailInput || null);
    setEmailInput("");
    setIsEmailModalOpen(false);
    fetchNotificationCount(true);
  }, [emailInput, fetchNotificationCount]);

  const handleEmailSkip = useCallback(() => {
    if (window.handleModalSubmit) window.handleModalSubmit(null);
    setIsEmailModalOpen(false);
    setEmailInput("");
  }, []);

  const handleCategoryMouseEnter = useCallback(() => {
    if (closeTimeout) clearTimeout(closeTimeout);
    setCategoryOpen(true);
  }, [closeTimeout]);

  const handleCategoryMouseLeave = useCallback(() => {
    const timeout = setTimeout(() => setCategoryOpen(false), 200);
    setCloseTimeout(timeout);
  }, []);

  const handleProfileMouseEnter = useCallback(() => {
    if (profileCloseTimeout) clearTimeout(profileCloseTimeout);
    setIsDropdownOpen(true);
  }, [profileCloseTimeout]);

  const handleProfileMouseLeave = useCallback(() => {
    const timeout = setTimeout(() => setIsDropdownOpen(false), 200);
    setProfileCloseTimeout(timeout);
  }, []);

  const handleCartClick = useCallback(() => navigate("/cart"), [navigate]);
  const handleNotificationsClick = useCallback(
    () => navigate("/notifications"),
    [navigate]
  );

  const handleSearchSubmit = useCallback(
    (e) => {
      e.preventDefault();
      if (searchQuery.trim()) {
        navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
        setSearchQuery("");
      }
    },
    [searchQuery, navigate]
  );

  return (
    <header className="fixed top-0 w-full bg-white z-50 shadow-md">
      <nav className="container mx-auto flex items-center justify-between px-6 py-3">
        <div className="flex items-center space-x-6">
          <Link to="/" className="flex items-center">
            <img src={karaLogo1} alt="Logo" className="w-16 h-auto" />
          </Link>
          <div
            className="relative"
            onMouseEnter={handleCategoryMouseEnter}
            onMouseLeave={handleCategoryMouseLeave}
          >
            <button
              className="flex items-center space-x-2 text-base font-medium text-gray-700 cursor-pointer hover:text-purple-600 transition"
              aria-expanded={categoryOpen}
            >
              <FaBars className="text-base" />
              <span>Categories</span>
            </button>
            {categoryOpen && (
              <div className="absolute left-0 mt-2 bg-white shadow-lg rounded-md p-4 w-28 z-10">
                {categories.length > 0 ? (
                  <ul className="space-y-2 text-gray-700">
                    {categories.map((category) => (
                      <li key={category.name}>
                        <Link
                          to={category.link}
                          className="block hover:text-purple-600 text-base"
                        >
                          {category.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500">No categories yet</p>
                )}
              </div>
            )}
          </div>
          {navItems.map(({ link, title }, index) => (
            <Link
              key={index}
              to={link}
              className={`text-base font-medium text-gray-700 hover:text-purple-600 transition ${
                location.pathname === link
                  ? "text-purple-700 font-semibold"
                  : ""
              }`}
            >
              {title}
            </Link>
          ))}
        </div>
        <div className="flex-grow max-w-sm ml-8">
          <form onSubmit={handleSearchSubmit}>
            <input
              type="text"
              placeholder="Search products and stores"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full p-2 border-none rounded-full focus:outline-none placeholder-gray-500 px-4 bg-white"
              style={{
                border: "1.5px solid transparent",
                borderRadius: "20px",
                backgroundImage:
                  "linear-gradient(white, white), linear-gradient(90deg, #FFA5A5 0%, #A044FF 29%, #FFA5A5 73%, #A044FF 100%)",
                backgroundOrigin: "border-box",
                backgroundClip: "padding-box, border-box",
              }}
            />
          </form>
        </div>
        <div className="flex items-center space-x-4 text-xl text-gray-700 ml-6">
          <ConnectWallet />
          {errorMessage && (
            <span className="text-red-500 text-sm ml-2" role="alert">
              {errorMessage}
            </span>
          )}
          {isAuthenticated && (
            <>
              <div
                className="relative"
                onMouseEnter={handleProfileMouseEnter}
                onMouseLeave={handleProfileMouseLeave}
              >
                <button
                  className="flex items-center space-x-2 hover:bg-purple-700 cursor-pointer transition bg-purple-900 text-white px-2 py-1 font-small rounded-2xl"
                  aria-expanded={isDropdownOpen}
                >
                  <FaUser className="hover:text-purple-600 transition" />
                </button>
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white shadow-lg rounded-md py-2 z-50">
                    <Link
                      to={isAdmin ? "/admin-profile" : "/profile"}
                      className="flex items-center px-4 py-2 text-gray-700 hover:bg-purple-100"
                      onClick={() => setIsDropdownOpen(false)}
                    >
                      <FaUserCircle className="mr-2" />
                      {isAdmin ? "Admin Profile" : "Profile"}
                    </Link>
                    {/* <button
                      onClick={logout}
                      className="flex items-center w-full text-left px-4 py-2 text-gray-700 hover:bg-purple-100"
                    >
                      <FaSignOutAlt className="mr-2" />
                      Logout
                    </button> */}
                  </div>
                )}
              </div>
              <button
                onClick={handleNotificationsClick}
                className="relative hover:text-purple-600 cursor-pointer transition"
                title="View notifications"
                aria-label={`Notifications (${notificationCount} unread)`}
              >
                <IoMdNotifications />
                {notificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                    {notificationCount}
                  </span>
                )}
              </button>
              <button
                onClick={handleCartClick}
                className="relative hover:text-purple-600 cursor-pointer transition"
                title="View cart"
                aria-label={`Cart (${cartCount} items)`}
              >
                <IoMdCart />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-purple-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </button>
            </>
          )}
        </div>
      </nav>
      {isEmailModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Enter Your Email
            </h2>
            <p className="text-gray-600 mb-4">
              Provide an email to receive notifications (optional).
            </p>
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="example@gmail.com"
              className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-600 mb-4"
            />
            <div className="flex justify-end space-x-4">
              <button
                onClick={handleEmailSkip}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Skip
              </button>
              <button
                onClick={handleEmailSubmit}
                className="px-4 py-2 bg-purple-900 text-white rounded-md hover:bg-purple-700"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default memo(Header);
