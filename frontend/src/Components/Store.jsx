import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Header from '../Layouts/Header';
import Footer from '../Layouts/Footer';
import { FaEllipsisV, FaArrowLeft } from 'react-icons/fa';

const Store = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [store, setStore] = useState(null);
  const [products, setProducts] = useState([]);
  const [collections, setCollections] = useState([]);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [closeTimeout, setCloseTimeout] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [imageErrors, setImageErrors] = useState({ banner: false, logo: false, products: {} });

  useEffect(() => {
    console.log('Store ID:', id);
    fetchStore();
    fetchProducts();
    fetchCollections();
    checkOwnership();
  }, [id]);

  const checkOwnership = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.log('No token found, user not authenticated');
      return;
    }
    try {
      const userResponse = await fetch('http://localhost:3000/user/profile', {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });
      if (!userResponse.ok) {
        throw new Error('Failed to fetch user profile');
      }
      const userData = await userResponse.json();
      const userId = userData.data?._id;
      if (!userId) {
        throw new Error('User ID not found in profile response');
      }

      const storeResponse = await fetch(`http://localhost:3000/stores/public/${id}`, {
        credentials: 'include',
      });
      if (!storeResponse.ok) {
        throw new Error('Failed to fetch store data');
      }
      const storeData = await storeResponse.json();
      const storeOwnerId = storeData.data?.owner?._id;

      if (storeOwnerId && userId === storeOwnerId) {
        console.log('User is the store owner');
        setIsOwner(true);
      } else {
        console.log('User is not the store owner');
      }
    } catch (err) {
      console.error('Ownership check error:', err.message);
      setIsOwner(false);
    }
  };

  const fetchStore = async () => {
    try {
      const response = await fetch(`http://localhost:3000/stores/public/${id}`, {
        credentials: 'include',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch store');
      setStore(data.data);
    } catch (err) {
      console.error('Store fetch error:', err.message);
      setError(err.message);
    }
  };

  const fetchProducts = async () => {
    const token = localStorage.getItem('token');
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await fetch(`http://localhost:3000/products?storeId=${id}`, {
        headers,
        credentials: 'include',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch products');
      setProducts(data.data || []);
    } catch (err) {
      console.error('Products fetch error:', err.message);
      setError(err.message);
    }
  };

  const fetchCollections = async () => {
    const token = localStorage.getItem('token');
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await fetch(`http://localhost:3000/collections/store/${id}`, {
        headers,
        credentials: 'include',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch collections');
      setCollections(data.data || []);
    } catch (err) {
      console.error('Collections fetch error:', err.message);
      setError(err.message);
    }
  };

  const handleMouseEnter = () => {
    if (closeTimeout) clearTimeout(closeTimeout);
    setIsModalOpen(true);
  };

  const handleMouseLeave = () => {
    const timeout = setTimeout(() => setIsModalOpen(false), 200);
    setCloseTimeout(timeout);
  };

  const handleBack = () => {
    navigate(-1);
  };

  const getImageUrl = (imagePath) => {
    if (!imagePath) {
      return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==';
    }
    const baseUrl = 'http://localhost:3000';
    // Normalize path to lowercase /uploads/ and encode
    const normalizedPath = imagePath.toLowerCase().startsWith('/uploads/')
      ? imagePath.toLowerCase()
      : `/uploads/${imagePath}`;
    return `${baseUrl}${encodeURI(normalizedPath)}`;
  };

  const handleImageError = (type, productId = null) => {
    if (productId) {
      setImageErrors((prev) => ({
        ...prev,
        products: { ...prev.products, [productId]: true },
      }));
    } else {
      setImageErrors((prev) => ({ ...prev, [type]: true }));
    }
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
        {isOwner && (
          <div
            className="absolute top-16 right-0 pr-4 z-[60]"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <button className="text-gray-700 hover:text-purple-900 text-2xl p-2 rounded-full">
              <FaEllipsisV />
            </button>
            {isModalOpen && (
              <div
                className="absolute right-0 mt-2 w-48 bg-white shadow-lg rounded-md py-2 z-[60]"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >
                <Link
                  to="/create-collection"
                  className="block px-4 py-2 text-gray-700 hover:bg-purple-100"
                >
                  Create Collection
                </Link>
                <Link
                  to={`/update-store/${id}`}
                  className="block px-4 py-2 text-gray-700 hover:bg-purple-100"
                >
                  Edit Store
                </Link>
                <Link
                  to="/my-products"
                  className="block px-4 py-2 text-gray-700 hover:bg-purple-100"
                >
                  My Products
                </Link>
                <Link
                  to={`/store/${id}/create-product`}
                  className="block px-4 py-2 text-gray-700 hover:bg-purple-100"
                >
                  Create Product
                </Link>
              </div>
            )}
          </div>
        )}

        {error ? (
          <div className="text-red-500 p-6">{error}</div>
        ) : !store ? (
          <div className="p-6">Loading...</div>
        ) : (
          <>
            <div className="relative w-full h-64 bg-gray-200">
              {store.bannerImage && !imageErrors.banner ? (
                <img
                  src={getImageUrl(store.bannerImage)}
                  alt="Store Banner"
                  className="w-full h-full object-cover"
                  crossOrigin="anonymous"
                  onError={(e) => {
                    console.error('Store banner image load error:', store.bannerImage);
                    e.target.src = getImageUrl(null);
                    e.target.alt = 'Banner image not available';
                    handleImageError('banner');
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500">
                  No Banner Available
                </div>
              )}
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2">
                {store.logo && !imageErrors.logo ? (
                  <img
                    src={getImageUrl(store.logo)}
                    alt="Store Logo"
                    className="w-44 h-44 rounded-full border-4 border-white object-cover"
                    crossOrigin="anonymous"
                    onError={(e) => {
                      console.error('Store logo image load error:', store.logo);
                      e.target.src = getImageUrl(null);
                      e.target.alt = 'Logo image not available';
                      handleImageError('logo');
                    }}
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gray-300 flex items-center justify-center text-gray-500 border-4 border-white">
                    No Logo Available
                  </div>
                )}
              </div>
            </div>

            <div className="max-w-5xl mx-auto mt-24 p-6">
              <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">{store.name}</h2>
              <div className="mb-6">
                <ul className="text-gray-700 space-y-2 flex justify-between gap-10">
                  <li>
                    <strong>ID:</strong> {store._id}
                  </li>
                  <li>
                    <strong>Orders:</strong> {store.orders || 0}
                  </li>
                  <li>
                    <strong>Products:</strong> {products.length}
                  </li>
                </ul>
              </div>
              <div className="mb-10">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Description:</h3>
                <p className="text-gray-600">{store.description}</p>
              </div>
              <div className="mb-10">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Collections</h3>
                {collections.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-2 md:grid-cols-3 gap-6">
                    {collections.map((collection) => (
                      <div
                        key={collection._id}
                        className="cursor-pointer group"
                        onClick={() => navigate(`/collections/${collection._id}`)}
                      >
                        <div className="flex flex-col items-center">
                          {collection.generalImage && !imageErrors.products[collection._id] ? (
                            <img
                              src={getImageUrl(collection.generalImage)}
                              alt={`${collection.name} Image`}
                              className="w-24 h-24 object-cover rounded-md transition-transform group-hover:scale-105"
                              crossOrigin="anonymous"
                              onError={(e) => {
                                console.error('Collection image load error:', collection.generalImage);
                                e.target.src = getImageUrl(null);
                                e.target.alt = 'Collection image not available';
                                handleImageError('collection', collection._id);
                              }}
                            />
                          ) : (
                            <div className="w-24 h-24 bg-gray-200 rounded-md flex items-center justify-center transition-transform group-hover:scale-105">
                              <span className="text-gray-500">No Image</span>
                            </div>
                          )}
                          <p className="mt-2 text-gray-800 font-medium text-center transition-colors group-hover:text-purple-700">
                            {collection.name}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600">No collections created yet.</p>
                )}
              </div>
              <div className="mb-20">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Products</h3>
                {products.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-2 md:grid-cols-3 gap-6">
                    {products.map((product) => (
                      <div
                        key={product._id}
                        className="cursor-pointer group"
                        onClick={() => navigate(`/product/${product._id}`)}
                      >
                        <div className="flex flex-col items-center">
                          {product.generalImage && !imageErrors.products[product._id] ? (
                            <img
                              src={getImageUrl(product.generalImage)}
                              alt={product.name}
                              className="w-24 h-24 object-cover rounded-md transition-transform group-hover:scale-105 mb-2"
                              crossOrigin="anonymous"
                              onError={(e) => {
                                console.error('Product image load error:', product.generalImage);
                                e.target.src = getImageUrl(null);
                                e.target.alt = 'Product image not available';
                                handleImageError('product', product._id);
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
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600">No products yet.</p>
                )}
              </div>
              <div className="h-20"></div>
            </div>
          </>
        )}
      </div>
      <Footer />
    </>
  );
};

export default Store;