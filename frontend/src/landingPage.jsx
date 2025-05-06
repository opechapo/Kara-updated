import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { IoIosArrowBack, IoIosArrowForward } from 'react-icons/io';
import { FaSpinner, FaShoppingCart } from 'react-icons/fa';
import Header from './Layouts/Header';
import Footer from './Layouts/Footer';
import Categories5 from './assets/Categories5.png';
import Categories2 from './assets/Categories2.png';
import Categories3 from './assets/Categories3.png';
import Categories4 from './assets/Categories4.png';
import Categories1 from './assets/Categories1.png';
import { useAuth } from './context/AuthContext'; // Import useAuth for cart/notification updates

// Define category routes (same as Header.jsx)
const categoryLinks = [
  { name: 'Electronics', link: '/electronics' },
  { name: 'Smartphones & Tablets', link: '/smartphonestabs' },
  { name: 'Home & Garden', link: '/homeandgarden' },
  { name: 'Fashion', link: '/fashion' },
  { name: 'Vehicles', link: '/vehicles' },
];

const LandingPage = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [stores, setStores] = useState([]);
  const [latestProducts, setLatestProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [homeGardenItems, setHomeGardenItems] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [clickedItems, setClickedItems] = useState({});
  const { fetchCartCount, fetchNotificationCount } = useAuth(); // For cart updates

  const API_BASE_URL = 'http://localhost:3000';
  const POLLING_INTERVAL = 30000;

  const getImageUrl = (path) => {
    const fallbackImage =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==';
    return path ? `${API_BASE_URL}${path}` : fallbackImage;
  };

  const fetchUserProfile = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const response = await fetch(`${API_BASE_URL}/user/profile`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });
      const data = await response.json();
      if (response.ok && data._id) {
        setUserId(data._id);
      } else {
        console.warn('Failed to fetch user profile:', data.error);
      }
    } catch (err) {
      console.error('User profile fetch error:', err.message);
    }
  };

  const fetchStores = async () => {
    const token = localStorage.getItem('token');
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await fetch(`${API_BASE_URL}/stores/public/all`, {
        headers,
        credentials: 'include',
      });
      const data = await response.json();
      if (data.success) {
        setStores(data.data || []);
      } else {
        console.warn('Stores fetch failed:', data.error);
        setStores([]);
      }
    } catch (err) {
      console.error('Stores fetch error:', err.message);
      setStores([]);
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    setError('');

    const fetchWithRetry = async (url, retries = 3, timeout = 30000) => {
      for (let i = 0; i < retries; i++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        try {
          const response = await fetch(url, {
            credentials: 'include',
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          if (!response.ok) {
            throw new Error(`HTTP error ${response.status}`);
          }
          return await response.json();
        } catch (err) {
          clearTimeout(timeoutId);
          if (err.name === 'AbortError') {
            console.warn(`Fetch aborted for ${url}, retry ${i + 1}/${retries}`);
          } else {
            console.error(`Fetch error for ${url}:`, err.message);
          }
          if (i === retries - 1) {
            throw err;
          }
          await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, i)));
        }
      }
    };

    try {
      await fetchUserProfile();
      await fetchStores();

      try {
        const latestProductsData = await fetchWithRetry(`${API_BASE_URL}/products/public/latest`);
        if (latestProductsData.success) {
          setLatestProducts(latestProductsData.data || []);
        } else {
          console.warn('Latest Products fetch failed:', latestProductsData.error);
          setLatestProducts([]);
        }
      } catch (err) {
        console.error('Latest Products fetch error:', err.message);
        setLatestProducts([]);
      }

      try {
        const categoriesData = await fetchWithRetry(`${API_BASE_URL}/api/categories`);
        if (categoriesData.success) {
          const mappedCategories = (categoriesData.data || []).map((category, index) => {
            const matchedCategory =
              categoryLinks.find((c) => c.name.toLowerCase() === category.name?.toLowerCase()) ||
              categoryLinks[index % categoryLinks.length];
            return {
              ...category,
              link: matchedCategory.link,
            };
          });
          setCategories(mappedCategories);
        } else {
          console.warn('Categories fetch failed:', categoriesData.error);
          setCategories([]);
        }
      } catch (err) {
        console.error('Categories fetch error:', err.message);
        setCategories([]);
      }

      try {
        const homeGardenData = await fetchWithRetry(
          `${API_BASE_URL}/products/public?category=${encodeURIComponent('Homes & Gardens')}`
        );
        if (homeGardenData.success) {
          setHomeGardenItems(homeGardenData.data || []);
        } else {
          console.warn('Home & Garden fetch failed:', homeGardenData.error);
          setHomeGardenItems([]);
        }
      } catch (err) {
        console.error('Home & Garden fetch error:', err.message);
        setHomeGardenItems([]);
      }
    } catch (error) {
      console.error('Fetch error:', error.message);
      setError(`Failed to load data: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const addToCart = async (productId) => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please connect your wallet to add items to cart.');
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/cart/add`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ productId, quantity: 1 }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to add to cart');
      setClickedItems((prev) => ({ ...prev, [productId]: true }));
      setTimeout(() => {
        setClickedItems((prev) => ({ ...prev, [productId]: false }));
      }, 1000);
      fetchCartCount(true); // Update cart count
      fetchNotificationCount(true); // Update notification count
      alert('Item added to cart!');
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchData();
    const intervalId = setInterval(fetchStores, POLLING_INTERVAL);
    return () => clearInterval(intervalId);
  }, [fetchCartCount, fetchNotificationCount]);

  const handleNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % stores.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prevIndex) => (prevIndex === 0 ? stores.length - 1 : prevIndex - 1));
  };

  const categoryBanners = [Categories5, Categories2, Categories3, Categories4, Categories1];

  if (error)
    return <div className="text-red-500 p-6 w-full text-center text-lg">{error}</div>;
  if (isLoading) {
    return (
      <div className="p-6 w-full flex justify-center items-center min-h-screen">
        <FaSpinner className="animate-spin text-purple-900 text-4xl" />
      </div>
    );
  }

  return (
    <>
      <Header />
      {/* Full-Screen Image Slider */}
      {stores.length > 0 ? (
        <section className="relative w-full h-screen">
          <img
            src={getImageUrl(stores[currentIndex]?.bannerImage)}
            alt={stores[currentIndex]?.name || 'Store'}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.src = getImageUrl(null);
              console.error('Image load error for store:', stores[currentIndex]);
            }}
          />
          <div className="absolute bottom-20 left-16 text-left text-white">
            <p className="text-4xl font-bold drop-shadow-lg">{stores[currentIndex]?.name || 'Store'}</p>
            {userId && stores[currentIndex]?.owner?._id === userId ? (
              <p className="mt-4 text-lg text-gray-200">This is your store</p>
            ) : (
              <Link
                to={`/store/${stores[currentIndex]?._id}`}
                className="mt-4 px-6 py-3 bg-purple-900 text-white font-semibold rounded-full shadow-lg hover:bg-purple-700 transition cursor-pointer inline-block"
              >
                Shop Now
              </Link>
            )}
          </div>
          <button
            onClick={handlePrev}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-opacity-50 p-3 rounded-full cursor-pointer text-white hover:bg-opacity-70 transition"
          >
            <IoIosArrowBack size={40} />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-opacity-50 p-3 rounded-full text-white cursor-pointer hover:bg-opacity-70 transition"
          >
            <IoIosArrowForward size={40} />
          </button>
        </section>
      ) : (
        <section className="relative w-full h-screen flex items-center justify-center bg-gray-100">
          <p className="text-gray-600 text-xl">No stores available to display.</p>
        </section>
      )}
      {/* New Arrivals Section */}
      <section className="container mx-auto my-12 px-6">
        <h2 className="text-3xl font-bold text-left text-gray-800 mb-6">New Arrivals</h2>
        <div className="flex overflow-x-auto space-x-6 pb-4 cursor-pointer scrollbar-hide">
          {latestProducts.length > 0 ? (
            latestProducts.slice(0, 5).map((item) => (
              <div key={item._id} className="min-w-[250px]">
                <Link to={`/product/${item._id}`} className="hover:scale-105 transition-transform">
                  <div className="w-60 h-60 bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      src={getImageUrl(item.generalImage)}
                      alt={item.name || 'Product image'}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </Link>
                <div className="bg-white p-4 shadow-md rounded-lg mt-2 flex items-center justify-between">
                  <div>
                    <p className="text-lg font-semibold text-gray-900">
                      {item.price} {item.paymentToken}
                    </p>
                    <p className="text-sm text-gray-600 truncate">{item.shortDescription}</p>
                  </div>
                  <button
                    onClick={() => addToCart(item._id)}
                    className={`p-2 rounded-full transition-colors ${
                      clickedItems[item._id]
                        ? 'text-purple-500'
                        : 'text-purple-300 hover:text-purple-700'
                    }`}
                    title="Add to Cart"
                  >
                    <FaShoppingCart size={20} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-600">No new arrivals available.</p>
          )}
        </div>
      </section>
      {/* Categories Section */}
      <section className="container mx-auto my-12 px-6">
        <h2 className="text-3xl font-bold text-left text-gray-800 mb-6">Categories</h2>
        <div className="flex overflow-x-auto space-x-6 pb-4 cursor-pointer scrollbar-hide">
          {categories.length > 0 ? (
            categories.map((category, index) => (
              <Link
                to={category.link}
                key={index}
                className="hover:scale-105 transition-transform"
              >
                <div className="min-w-[250px]">
                  <div className="w-60 h-60 bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      src={categoryBanners[index % categoryBanners.length]}
                      alt={category.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="bg-white p-4 shadow-md rounded-lg mt-2">
                    <p className="text-lg font-semibold text-gray-900">{category.name}</p>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <p className="text-gray-600">No categories available.</p>
          )}
        </div>
      </section>
      {/* Homes & Gardens Section */}
      <section className="container mx-auto my-12 px-6">
        <h2 className="text-3xl font-bold text-left text-gray-800 mb-6">Homes & Gardens</h2>
        <div className="flex overflow-x-auto space-x-6 pb-4 cursor-pointer scrollbar-hide">
          {homeGardenItems.length > 0 ? (
            homeGardenItems.slice(0, 5).map((item) => (
              <div key={item._id} className="min-w-[250px]">
                <Link to={`/product/${item._id}`} className="hover:scale-105 transition-transform">
                  <div className="w-60 h-60 bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      src={getImageUrl(item.generalImage)}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </Link>
                <div className="bg-white p-4 shadow-md rounded-lg mt-2 flex items-center justify-between">
                  <div>
                    <p className="text-lg font-semibold text-gray-900">
                      {item.price} {item.paymentToken}
                    </p>
                    <p className="text-sm text-gray-600">{item.shortDescription}</p>
                  </div>
                  <button
                    onClick={() => addToCart(item._id)}
                    className={`p-2 rounded-full transition-colors ${
                      clickedItems[item._id]
                        ? 'text-purple-500'
                        : 'text-purple-300 hover:text-purple-700'
                    }`}
                    title="Add to Cart"
                  >
                    <FaShoppingCart size={20} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-600">No Homes & Gardens items available.</p>
          )}
        </div>
      </section>
      <Footer />
    </>
  );
};

export default LandingPage;