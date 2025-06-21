import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaCopy, FaUpload, FaSpinner } from 'react-icons/fa';
import Header from '../Layouts/Header';
import Footer from '../Layouts/Footer';

const fetchWithRetry = async (url, options = {}, retries = 3, timeout = 30000) => {
  const token = localStorage.getItem('token');
  const headers = {
    ...options.headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  for (let i = 0; i < retries; i++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
        credentials: 'include',
      });
      clearTimeout(timeoutId);
      if (!response.ok) {
        const err = new Error(`HTTP error ${response.status}`);
        err.status = response.status;
        throw err;
      }
      return response;
    } catch (err) {
      clearTimeout(timeoutId);
      if (i === retries - 1) throw err;
      await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, i)));
    }
  }
};

// In-memory cache
const cache = {
  profile: null,
  stores: null,
  collections: null,
  products: null,
  escrow: null,
  lastFetched: {},
};

class ErrorBoundary extends React.Component {
  state = { hasError: false, errorMessage: '' };

  static getDerivedStateFromError(error) {
    return { hasError: true, errorMessage: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 text-center">
          <p className="text-red-500">Error: {this.state.errorMessage}</p>
          <button
            onClick={() => this.setState({ hasError: false, errorMessage: '' })}
            className="mt-4 text-purple-900 underline hover:text-purple-700"
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const Profile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [stores, setStores] = useState([]);
  const [collections, setCollections] = useState([]);
  const [products, setProducts] = useState([]);
  const [escrowTransactions, setEscrowTransactions] = useState([]);
  const [error, setError] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showCreateOptions, setShowCreateOptions] = useState(false);
  const [isAvatarLoading, setIsAvatarLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('stores');
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfileData = useCallback(
    async (force = false) => {
      const token = localStorage.getItem('token');
      if (!token) {
        console.warn('No token found, redirecting to home');
        setError('Please connect your wallet to view your profile.');
        navigate('/');
        return;
      }

      try {
        setIsLoading(true);
        const fetches = [];

        // Profile
        if (
          force ||
          !cache.profile ||
          Date.now() - cache.lastFetched.profile > 5 * 60 * 1000
        ) {
          fetches.push(
            fetchWithRetry('http://localhost:3000/user/profile', { method: 'GET' })
              .then((res) => {
                if (res.status === 401) {
                  throw new Error('Unauthorized');
                }
                return res.json();
              })
              .then((data) => {
                console.log('Profile response:', data);
                if (!data.success) throw new Error(data.error || 'Failed to fetch profile');
                cache.profile = data.data;
                cache.lastFetched.profile = Date.now();
                return { key: 'profile', data: data.data };
              })
              .catch((err) => {
                if (err.message === 'Unauthorized') {
                  console.warn('Unauthorized access, clearing token');
                  localStorage.removeItem('token');
                  navigate('/');
                  throw err;
                }
                throw err;
              })
          );
        } else {
          fetches.push(Promise.resolve({ key: 'profile', data: cache.profile }));
        }

        // Stores
        if (
          force ||
          !cache.stores ||
          Date.now() - cache.lastFetched.stores > 5 * 60 * 1000
        ) {
          fetches.push(
            fetchWithRetry('http://localhost:3000/stores', { method: 'GET' })
              .then((res) => res.json())
              .then((data) => {
                console.log('Stores response:', data);
                const storesData = data.success && Array.isArray(data.data) ? data.data : [];
                cache.stores = storesData;
                cache.lastFetched.stores = Date.now();
                return { key: 'stores', data: storesData };
              })
              .catch((err) => {
                console.warn('Stores fetch error:', err.message);
                return { key: 'stores', data: [] };
              })
          );
        } else {
          fetches.push(Promise.resolve({ key: 'stores', data: cache.stores }));
        }

        // Collections
        if (
          force ||
          !cache.collections ||
          Date.now() - cache.lastFetched.collections > 5 * 60 * 1000
        ) {
          fetches.push(
            fetchWithRetry('http://localhost:3000/collections', { method: 'GET' })
              .then((res) => res.json())
              .then((data) => {
                console.log('Collections response:', data);
                const collectionsData = data.success && Array.isArray(data.data) ? data.data : [];
                cache.collections = collectionsData;
                cache.lastFetched.collections = Date.now();
                return { key: 'collections', data: collectionsData };
              })
              .catch((err) => {
                console.warn('Collections fetch error:', err.message);
                return { key: 'collections', data: [] };
              })
          );
        } else {
          fetches.push(Promise.resolve({ key: 'collections', data: cache.collections }));
        }

        // Products
        if (
          force ||
          !cache.products ||
          Date.now() - cache.lastFetched.products > 5 * 60 * 1000
        ) {
          fetches.push(
            fetchWithRetry('http://localhost:3000/products/user', { method: 'GET' })
              .then((res) => res.json())
              .then((data) => {
                console.log('Products response:', data);
                const productsData = data.success && Array.isArray(data.data) ? data.data : [];
                cache.products = productsData;
                cache.lastFetched.products = Date.now();
                return { key: 'products', data: productsData };
              })
              .catch((err) => {
                console.warn('Products fetch error:', err.message);
                return { key: 'products', data: [] };
              })
          );
        } else {
          fetches.push(Promise.resolve({ key: 'products', data: cache.products }));
        }

        // Escrow Transactions
        if (
          force ||
          !cache.escrow ||
          Date.now() - cache.lastFetched.escrow > 5 * 60 * 1000
        ) {
          fetches.push(
            fetchWithRetry('http://localhost:3000/escrow/user', { method: 'GET' })
              .then((res) => res.json())
              .then((data) => {
                console.log('Escrow transactions fetched:', data);
                const escrowData = data.success && Array.isArray(data.data) ? data.data : [];
                cache.escrow = escrowData;
                cache.lastFetched.escrow = Date.now();
                return { key: 'escrow', data: escrowData };
              })
              .catch((err) => {
                console.warn('Escrow fetch error:', err.message);
                return { key: 'escrow', data: [] };
              })
          );
        } else {
          fetches.push(Promise.resolve({ key: 'escrow', data: cache.escrow }));
        }

        const results = await Promise.all(fetches);
        results.forEach(({ key, data }) => {
          if (key === 'profile') setUser(data);
          if (key === 'stores') setStores(data);
          if (key === 'collections') setCollections(data);
          if (key === 'products') setProducts(data);
          if (key === 'escrow') setEscrowTransactions(data);
        });
      } catch (err) {
        console.error('Profile: Fetch error:', err.message);
        setError(err.message === 'Unauthorized' ? 'Session expired. Please reconnect your wallet.' : err.message);
      } finally {
        setIsLoading(false);
      }
    },
    [navigate]
  );

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  const handleAvatarUpload = useCallback(async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsAvatarLoading(true);
    const formData = new FormData();
    formData.append('avatar', file);
    try {
      const response = await fetchWithRetry('http://localhost:3000/user/profile', {
        method: 'PUT',
        body: formData,
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to upload avatar');
      setUser(data.data);
      cache.profile = data.data;
      cache.lastFetched.profile = Date.now();
      cache.cart = null; // Invalidate cart cache
      setAvatarFile(null);
      setIsAvatarLoading(false);
    } catch (err) {
      console.error('Upload Error:', err.message);
      setError(err.message);
      setIsAvatarLoading(false);
    }
  }, []);

  const copyToClipboard = useCallback(() => {
    navigator.clipboard.writeText(user?.walletAddress || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [user?.walletAddress]);

  const toggleCreateOptions = useCallback(() => {
    setShowCreateOptions((prev) => !prev);
  }, []);

  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
  }, []);

  const handleDeleteProduct = useCallback(async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;

    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please connect your wallet.');
      return;
    }

    try {
      const response = await fetchWithRetry(`http://localhost:3000/products/${productId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to delete product');

      // Update state and cache
      setProducts((prev) => prev.filter((product) => product._id !== productId));
      cache.products = cache.products.filter((product) => product._id !== productId);
      cache.lastFetched.products = Date.now();
    } catch (err) {
      console.error('Delete product error:', err.message);
      setError(err.message);
    }
  }, []);

  const { ordersCreated, ordersReceived, lastAction } = useMemo(() => {
    const created = escrowTransactions.filter(
      (tx) => tx.buyerId?.toString() === user?._id?.toString()
    ).length;
    const received = escrowTransactions.filter(
      (tx) => tx.sellerId?.toString() === user?._id?.toString()
    ).length;

    const allActions = [
      ...escrowTransactions.map((tx) => ({
        type: tx.buyerId?.toString() === user?._id?.toString() ? 'Order Created' : 'Order Received',
        action: `${tx.status === 'released' ? 'Released funds for' : tx.status === 'refunded' ? 'Refunded' : 'Initiated'} ${
          tx.productId?.name || 'Product Unavailable'
        } - ${tx.amount} ${tx.paymentToken}`,
        timestamp: new Date(tx.updatedAt),
      })),
      ...stores.map((store) => ({
        type: 'Store Created',
        action: `Created store "${store.name}"`,
        timestamp: new Date(store.createdAt),
      })),
      ...collections.map((col) => ({
        type: 'Collection Created',
        action: `Created collection "${col.name}"`,
        timestamp: new Date(col.createdAt),
      })),
      ...products.map((prod) => ({
        type: 'Product Created',
        action: `Created product "${prod.name}"`,
        timestamp: new Date(prod.createdAt),
      })),
    ];

    const latest = allActions.sort((a, b) => b.timestamp - a.timestamp)[0];
    const lastActionText = latest
      ? `${latest.action} on ${latest.timestamp.toLocaleString()}`
      : 'No recent actions';

    return {
      ordersCreated: created,
      ordersReceived: received,
      lastAction: lastActionText,
    };
  }, [escrowTransactions, stores, collections, products, user?._id]);

  const defaultStoreId = useMemo(() => (stores.length > 0 ? stores[0]._id : null), [stores]);

  if (error) {
    return (
      <div className="p-6 w-full text-center">
        <p className="text-red-500">{error}</p>
        <button
          onClick={() => fetchProfileData(true)}
          className="mt-4 text-purple-900 underline hover:text-purple-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!user || isLoading) {
    return (
      <div className="p-6 w-full flex justify-center items-center min-h-screen">
        <FaSpinner className="animate-spin text-purple-900 text-4xl" />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Header />
      <div className="h-12"></div>
      <div className="p-6 max-w-5xl mx-auto flex space-x-6 bg-gray-50 rounded-xl pt-20 shadow-lg">
        {/* Left Section: User Info */}
        <div className="w-1/2 bg-white rounded-lg shadow-md p-6 ml-[-20px] border border-gray-200">
          <div className="flex flex-col items-center">
            {/* <div className="relative">
              {isAvatarLoading ? (
                <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-500">Uploading...</span>
                </div>
              ) : (
                <img
                  src={
                    user.avatarUrl
                      ? `http://localhost:3000${user.avatarUrl}?t=${Date.now()}`
                      : 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg=='
                  }
                  alt="Profile"
                  className="w-32 h-32 rounded-full mb-4 object-cover ring-2 ring-purple-200"
                  onError={(e) => {
                    e.target.src =
                      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==';
                  }}
                />
              )}
              <label className="absolute bottom-4 right-0 cursor-pointer">
                <FaUpload className="text-purple-900 hover:text-purple-700" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </label>
            </div> */}
            {/* <p className="text-gray-600 mt-2 italic">{user.email || 'No email provided'}</p> */}
            <div className="flex items-center space-x-2 mt-2">
              <p className="text-gray-600 truncate max-w-xs font-mono">{user.walletAddress}</p>
              <button onClick={copyToClipboard} className="text-purple-900 hover:text-purple-700">
                <FaCopy />
              </button>
              {copied && <span className="text-green-500 text-sm">Copied!</span>}
            </div>
          </div>
          <div className="mt-6 border-t pt-4">
            <div className="flex justify-between text-gray-700 mb-2">
              <span className="font-medium">Orders Created</span>
              <span>{ordersCreated}</span>
            </div>
            <div className="flex justify-between text-gray-700 mb-2">
              <span className="font-medium">Orders Received</span>
              <span>{ordersReceived}</span>
            </div>
            <div className="flex justify-between text-gray-700 mb-2">
              <span className="font-medium">Joined</span>
              <span>{new Date(user.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Right Section: Tabs and Dynamic Content */}
        <div className="w-2/3 bg-white rounded-lg shadow-md p-6 mx-auto border border-gray-200">
          <div className="flex justify-between items-center mb-6 border-b pb-2">
            <div className="flex space-x-6">
              <button
                onClick={() => handleTabChange('stores')}
                className={`text-sm font-semibold ${
                  activeTab === 'stores'
                    ? 'text-purple-900 border-b-2 border-purple-900'
                    : 'text-gray-700 hover:text-purple-700'
                } transition-colors`}
              >
                My Stores
              </button>
              <button
                onClick={() => handleTabChange('collections')}
                className={`text-sm font-semibold ${
                  activeTab === 'collections'
                    ? 'text-purple-900 border-b-2 border-purple-900'
                    : 'text-gray-700 hover:text-purple-700'
                } transition-colors`}
              >
                My Collections
              </button>
              <button
                onClick={() => handleTabChange('products')}
                className={`text-sm font-semibold ${
                  activeTab === 'products'
                    ? 'text-purple-900 border-b-2 border-purple-900'
                    : 'text-gray-700 hover:text-purple-700'
                } transition-colors`}
              >
                My Products
              </button>
              <button
                onClick={() => handleTabChange('transactions')}
                className={`text-sm font-semibold ${
                  activeTab === 'transactions'
                    ? 'text-purple-900 border-b-2 border-purple-900'
                    : 'text-gray-700 hover:text-purple-700'
                } transition-colors`}
              >
                Transactions
              </button>
            </div>
            <button
              onClick={toggleCreateOptions}
              className="bg-purple-900 text-white px-4 py-2 rounded-md hover:bg-purple-800 transition-colors"
            >
              Create
            </button>
          </div>

          {showCreateOptions && (
            <div className="flex space-x-4 mb-6">
              <Link
                to="/create-store"
                className="bg-transparent text-purple-900 px-4 py-2 rounded-md hover:bg-purple-100 transition-colors cursor-pointer"
              >
                Store
              </Link>
              {/* Uncomment if you want to enable these links */}
              <Link
                to="/create-collection"
                className="bg-transparent text-purple-900 px-4 py-2 rounded-md hover:bg-purple-100 transition-colors cursor-pointer"
              >
                Collection
              </Link>
              <Link
                to={defaultStoreId ? `/store/${defaultStoreId}/create-product` : '/profile'}
                className="bg-transparent text-purple-900 px-4 py-2 rounded-md hover:bg-purple-100 transition-colors cursor-pointer"
              >
                Product
              </Link>
            </div>
          )}

          {/* Dynamic Content Section */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              {activeTab === 'stores'
                ? 'Stores Created'
                : activeTab === 'collections'
                ? 'Collections Created'
                : activeTab === 'products'
                ? 'Products Created'
                : 'Transaction History'}
            </h3>
            {activeTab === 'stores' &&
              (stores.length > 0 ? (
                <div className="grid grid-cols-3 md:grid-cols-2 gap-6">
                  {stores.map((store) => (
                    <div
                      key={store._id}
                      className="cursor-pointer group"
                      onClick={() => navigate(`/store/${store._id}`)}
                    >
                      <div className="flex flex-col items-center">
                        {store.logo ? (
                          <img
                            src={`http://localhost:3000${store.logo}?t=${Date.now()}`}
                            alt={`${store.name} Logo`}
                            className="w-24 h-24 object-cover rounded-md transition-transform group-hover:scale-105"
                            onError={(e) => {
                              e.target.src =
                                'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==';
                            }}
                          />
                        ) : (
                          <div className="w-24 h-24 bg-gray-200 rounded-md flex items-center justify-center transition-transform group-hover:scale-105">
                            <span className="text-gray-500">No Logo</span>
                          </div>
                        )}
                        <p className="mt-2 text-gray-800 font-medium text-center transition-colors group-hover:text-purple-700">
                          {store.name}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600">No stores created yet.</p>
              ))}
            {activeTab === 'collections' &&
              (collections.length > 0 ? (
                <div className="grid grid-cols-3 md:grid-cols-2 gap-6">
                  {collections.map((collection) => (
                    <div
                      key={collection._id}
                      className="cursor-pointer group"
                      onClick={() => navigate(`/collections/${collection._id}`)}
                    >
                      <div className="flex flex-col items-center">
                        {collection.generalImage ? (
                          <img
                            src={`http://localhost:3000${collection.generalImage}?t=${Date.now()}`}
                            alt={`${collection.name} Image`}
                            className="w-24 h-24 object-cover rounded-md transition-transform group-hover:scale-105"
                            onError={(e) => {
                              e.target.src =
                                'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==';
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
              ))}
            {activeTab === 'products' &&
              (products.length > 0 ? (
                <div className="grid grid-cols-3 md:grid-cols-2 gap-6">
                  {products.map((product) => (
                    <div key={product._id} className="group">
                      <div
                        className="cursor-pointer flex flex-col items-center"
                        onClick={() => navigate(`/product/${product._id}`)}
                      >
                        {product.generalImage ? (
                          <img
                            src={`http://localhost:3000${product.generalImage}?t=${Date.now()}`}
                            alt={`${product.name} Image`}
                            className="w-24 h-24 object-cover rounded-md transition-transform group-hover:scale-105"
                            onError={(e) => {
                              e.target.src =
                                'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==';
                            }}
                          />
                        ) : (
                          <div className="w-24 h-24 bg-gray-200 rounded-md flex items-center justify-center transition-transform group-hover:scale-105">
                            <span className="text-gray-500">No Image</span>
                          </div>
                        )}
                        <p className="mt-2 text-gray-800 font-medium text-center transition-colors group-hover:text-purple-700">
                          {product.name}
                        </p>
                        <p className="text-sm text-blue-600 font-semibold">
                          {product.price} {product.paymentToken}
                        </p>
                      </div>
                      <div className="mt-2 flex justify-center space-x-2">
                        <Link
                          to={`/update-product/${product._id}`}
                          className="bg-purple-900 text-white px-3 py-1 rounded-md hover:bg-purple-700 transition-colors text-sm"
                        >
                          Update
                        </Link>
                        <button
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent navigating to product page
                            handleDeleteProduct(product._id);
                          }}
                          className="bg-red-600 text-white px-3 py-1 rounded-md hover:bg-red-500 transition-colors text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600">No products created yet.</p>
              ))}
            {activeTab === 'transactions' && (
              <div>
                {/* Orders Created (Buyer) */}
                <h4 className="text-md font-semibold text-gray-700 mb-2">Orders Created</h4>
                {escrowTransactions.filter((tx) => tx.buyerId?.toString() === user._id?.toString())
                  .length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-gray-600">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="p-2 text-left">Product</th>
                          <th className="p-2 text-left">Amount</th>
                          <th className="p-2 text-left">Status</th>
                          <th className="p-2 text-left">Date</th>
                          <th className="p-2 text-left">Transaction</th>
                        </tr>
                      </thead>
                      <tbody>
                        {escrowTransactions
                          .filter((tx) => tx.buyerId?.toString() === user._id?.toString())
                          .map((tx) => (
                            <tr key={tx._id} className="border-b">
                              <td className="p-2">
                                {tx.productId?.name ? (
                                  <Link
                                    to={`/product/${tx.productId._id}`}
                                    className="text-purple-900 hover:underline"
                                  >
                                    {tx.productId.name}
                                  </Link>
                                ) : (
                                  <span className="text-gray-500">Product Unavailable</span>
                                )}
                              </td>
                              <td className="p-2">
                                {tx.amount} {tx.paymentToken}
                              </td>
                              <td className="p-2 capitalize">{tx.status}</td>
                              <td className="p-2">{new Date(tx.updatedAt).toLocaleString()}</td>
                              <td className="p-2 font-mono">{tx.contractAddress.slice(0, 6)}...</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-600 mb-4">No orders created yet.</p>
                )}

                {/* Orders Received (Seller) */}
                <h4 className="text-md font-semibold text-gray-700 mt-6 mb-2">Orders Received</h4>
                {escrowTransactions.filter((tx) => tx.sellerId?.toString() === user._id?.toString())
                  .length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-gray-600">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="p-2 text-left">Product</th>
                          <th className="p-2 text-left">Amount</th>
                          <th className="p-2 text-left">Status</th>
                          <th className="p-2 text-left">Date</th>
                          <th className="p-2 text-left">Transaction</th>
                        </tr>
                      </thead>
                      <tbody>
                        {escrowTransactions
                          .filter((tx) => tx.sellerId?.toString() === user._id?.toString())
                          .map((tx) => (
                            <tr key={tx._id} className="border-b">
                              <td className="p-2">
                                {tx.productId?.name ? (
                                  <Link
                                    to={`/product/${tx.productId._id}`}
                                    className="text-purple-900 hover:underline"
                                  >
                                    {tx.productId.name}
                                  </Link>
                                ) : (
                                  <span className="text-gray-500">Product Unavailable</span>
                                )}
                              </td>
                              <td className="p-2">
                                {tx.amount} {tx.paymentToken}
                              </td>
                              <td className="p-2 capitalize">{tx.status}</td>
                              <td className="p-2">{new Date(tx.updatedAt).toLocaleString()}</td>
                              <td className="p-2 font-mono">{tx.contractAddress.slice(0, 6)}...</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-600">No orders received yet.</p>
                )}
              </div>
            )}
          </div>

          {activeTab !== 'transactions' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Last Action</h3>
              <ul className="text-gray-600 space-y-2 list-disc pl-5">
                <li>{lastAction}</li>
              </ul>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </ErrorBoundary>
  );
};

export default memo(Profile);