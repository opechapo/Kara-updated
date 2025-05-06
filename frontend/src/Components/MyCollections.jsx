import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Header from '../Layouts/Header';
import Footer from '../Layouts/Footer';
import { FaEllipsisV, FaArrowLeft, FaSpinner } from 'react-icons/fa';

const MyCollections = () => {
  const { collectionId } = useParams();
  const navigate = useNavigate();
  const [collection, setCollection] = useState(null);
  const [products, setProducts] = useState([]);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [closeTimeout, setCloseTimeout] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('Collection ID from URL:', collectionId);
    fetchCollection();
    fetchUserProducts();
  }, [collectionId]);

  const fetchCollection = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      console.log('Fetching collection with URL:', `http://localhost:3000/collections/public/${collectionId}`);
      const response = await fetch(`http://localhost:3000/collections/public/${collectionId}`, {
        headers,
        credentials: 'include',
      });
      console.log('Collections: Response status:', response.status);
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP error! Status: ${response.status}, Response: ${text}`);
      }
      const data = await response.json();
      console.log('Collections: Parsed data:', data);
      const collectionData = data.data; // Access normalized data field
      setCollection(collectionData);
      setLoading(false);
    } catch (err) {
      console.error('Collections: Fetch error:', err.message);
      setError(err.message);
      setLoading(false);
    }
  };

  const fetchUserProducts = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please connect your wallet.');
      console.log('No token found in localStorage');
      return;
    }
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await fetch('http://localhost:3000/products/user', {
        headers,
        credentials: 'include',
      });
      console.log('Collections: Products response status:', response.status);
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP error! Status: ${response.status}, Response: ${text}`);
      }
      const data = await response.json();
      console.log('Collections: Products data:', data);
      if (!data.success || !Array.isArray(data.data)) {
        throw new Error('Invalid response format: Expected success true and data as array');
      }
      const collectionProducts = data.data.filter(
        (product) => product.collection?._id.toString() === collectionId
      );
      console.log('Filtered collection products:', collectionProducts);
      setProducts(collectionProducts);
    } catch (err) {
      console.error('Collections: Products fetch error:', err.message);
      setError(err.message);
      setProducts([]);
    }
  };

  const handleMouseEnter = () => {
    console.log('Mouse entered 3-dot button, isModalOpen:', isModalOpen);
    if (closeTimeout) clearTimeout(closeTimeout);
    setIsModalOpen(true);
  };

  const handleMouseLeave = () => {
    console.log('Mouse left 3-dot button, setting timeout');
    const timeout = setTimeout(() => {
      setIsModalOpen(false);
      console.log('Modal closed after timeout');
    }, 200);
    setCloseTimeout(timeout);
  };

  const handleBack = () => {
    navigate(-1);
  };

  const getImageUrl = (imagePath) => {
    if (!imagePath) {
      console.warn('No image path provided');
      return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==';
    }
    const normalizedPath = imagePath.toLowerCase().startsWith('/uploads/')
      ? imagePath
      : `/uploads/${imagePath}`;
    const url = `http://localhost:3000${normalizedPath}`;
    console.log('Generated image URL:', url);
    return url;
  };

  return (
    <>
      <Header />
      <div className="min-h-screen flex flex-col relative">
        <div className="absolute top-16 left-0 pl-4 z-[60]">
          <button
            onClick={handleBack}
            className="text-gray-700 hover:text-purple-900 text-2xl p-2 rounded-full"
          >
            <FaArrowLeft />
          </button>
        </div>
        <div
          className="absolute top-16 right-0 pr-4 z-[60]"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <button className="text-gray-700 hover:text-purple-900 text-2xl p-2 rounded-full">
            <FaEllipsisV />
          </button>
          {isModalOpen && collection?.store?._id && (
            <div
              className="absolute right-0 mt-2 w-48 bg-white shadow-lg rounded-md py-2 z-[60]"
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <Link
                to={`/store/${collection.store._id}/create-product`}
                className="block px-4 py-2 text-gray-700 hover:bg-purple-100"
              >
                Create Product
              </Link>
              <Link
                to={`/update-collection/${collection._id}`}
                className="block px-4 py-2 text-gray-700 hover:bg-purple-100"
              >
                Edit
              </Link>
            </div>
          )}
        </div>

        {error ? (
          <div className="text-red-500 p-6 text-center text-lg">{error}</div>
        ) : loading ? (
          <div className="p-6 w-full flex justify-center items-center min-h-screen">
            <FaSpinner className="animate-spin text-purple-900 text-4xl" />
          </div>
        ) : !collection ? (
          <div className="text-red-500 p-6 text-center text-lg">Collection not found</div>
        ) : (
          <div className="max-w-5xl mx-auto mt-20 p-6">
            <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">{collection.name}</h2>
            <div className="mb-6">
              <ul className="text-gray-700 space-y-2 flex justify-between gap-10">
                <li>
                  <strong>ID:</strong> {collection._id}
                </li>
                <li>
                  <strong>Orders:</strong> {collection.orders || 0}
                </li>
              </ul>
            </div>
            <div className="mb-20">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Products</h3>
              {products.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {products.map((product) => (
                    <Link to={`/product/${product._id}`} key={product._id}>
                      <div className="p-4 rounded-md cursor-pointer group transition-shadow">
                        <div className="flex flex-col items-center">
                          {product.generalImage ? (
                            <img
                              src={getImageUrl(product.generalImage)}
                              alt={product.name}
                              className="w-24 h-24 object-cover rounded-md transition-transform group-hover:scale-105 mb-2"
                              onError={(e) => {
                                console.error('Product image load error:', product.generalImage);
                                e.target.src =
                                  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==';
                              }}
                            />
                          ) : (
                            <div className="w-24 h-24 bg-gray-200 rounded-md flex items-center justify-center transition-transform group-hover:scale-105 mb-2">
                              <span className="text-gray-500">No Image</span>
                            </div>
                          )}
                          <h4 className="text-md font-medium text-gray-800 text-center transition-colors group-hover:text-purple-700">
                            {product.name}
                          </h4>
                          <p className="text-sm text-gray-600">{product.shortDescription}</p>
                          <p className="text-sm text-blue-600 font-semibold">
                            {product.price} {product.paymentToken}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10">
                  <p className="text-2xl font-bold text-gray-700">No Products Yet</p>
                  <p className="text-gray-500 mt-2">Create your first product to get started!</p>
                </div>
              )}
            </div>
            <div className="h-20"></div>
          </div>
        )}
      </div>
      <Footer />
    </>
  );
};

export default MyCollections;