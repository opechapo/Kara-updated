import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '../Layouts/Header';
import Footer from '../Layouts/Footer';
import CategorySideBar from '../Layouts/CategorySideBar';
import { FaSpinner } from 'react-icons/fa';

const Electronics = () => {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const category = 'Electronics';
  const displayCategory = 'Electronics';

  const getImageUrl = (path) => {
    const fallbackImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==';
    return path ? `http://localhost:3000${path}` : fallbackImage;
  };

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const response = await fetch(
        `http://localhost:3000/products/public?category=${encodeURIComponent(category)}`,
        {
          headers,
          credentials: 'include',
        }
      );
      console.log(`${displayCategory} Products: Response status:`, response.status, response.statusText);
      const data = await response.json();
      console.log(`${displayCategory} Products: Raw response:`, JSON.stringify(data, null, 2));
      if (!response.ok) throw new Error(data.message || `Failed to fetch ${displayCategory} products`);
      setProducts(data.data || []);
      setIsLoading(false);
    } catch (err) {
      console.error(`${displayCategory} Products: Fetch error:`, err.message);
      setError(err.message);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  if (error) return <div className="text-red-500 p-6 w-full text-center text-lg">{error}</div>;
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
      <div className="flex min-h-screen px-6 py-4 pt-24">
        {/* Sidebar */}
        <div className="w-1/4 min-h-screen border-r border-gray-300">
          <CategorySideBar />
        </div>

        {/* Category Content */}
        <div className="w-3/4 px-10 pt-4">
          <h2 className="text-3xl font-bold text-gray-800 mb-6">{displayCategory}</h2>
          <div className="grid grid-cols-3 gap-6">
            {products.length > 0 ? (
              products.slice(0, 5).map((item) => (
                <Link to={`/product/${item._id}`} key={item._id} className="hover:scale-105 transition-transform">
                  <div>
                    <div className="w-full h-60 bg-gray-100 rounded-lg overflow-hidden">
                      <img
                        src={getImageUrl(item.generalImage)}
                        alt={item.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src = getImageUrl(null);
                          console.error('Image load error for product:', item._id);
                        }}
                      />
                    </div>
                    <div className="bg-white p-4 shadow-md rounded-lg mt-2">
                      <p className="text-lg font-semibold text-gray-900">{item.price} {item.paymentToken}</p>
                      <p className="text-sm text-gray-600">{item.shortDescription}</p>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <p className="text-gray-600">No {displayCategory} products available.</p>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default Electronics;