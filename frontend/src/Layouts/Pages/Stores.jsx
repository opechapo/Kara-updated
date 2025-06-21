import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Header from '../../Layouts/Header';
import Footer from '../../Layouts/Footer';
import { FaSpinner } from 'react-icons/fa';

const Stores = () => {
  const navigate = useNavigate();
  const [stores, setStores] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const getImageUrl = (imagePath) => {
    if (!imagePath || typeof imagePath !== 'string') {
      console.warn('Invalid imagePath:', imagePath);
      return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==';
    }
    const baseUrl = 'http://localhost:3000';
    // Ensure path starts with /Uploads/ and encode special characters
    const normalizedPath = imagePath.startsWith('/Uploads/') ? imagePath : `/Uploads/${imagePath}`;
    const encodedPath = encodeURI(normalizedPath);
    console.log('getImageUrl:', { input: imagePath, output: `${baseUrl}${encodedPath}` });
    return `${baseUrl}${encodedPath}`;
  };

  const fetchAllStores = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await fetch('http://localhost:3000/stores/public/all', {
        headers,
        credentials: 'include',
      });
      console.log('Stores: Response status:', response.status, response.statusText);
      const data = await response.json();
      console.log('Stores: Raw response:', JSON.stringify(data, null, 2));
      if (!response.ok) throw new Error(data.message || 'Failed to fetch stores');
      setStores(data.data || []);
      setIsLoading(false);
    } catch (err) {
      console.error('Stores: Fetch error:', err.message);
      setError(err.message);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllStores();
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
      <div className="h-12"></div> {/* Spacer for fixed header */}
      <div className="p-6 max-w-6xl mx-auto bg-gray-50 rounded-xl pt-20 shadow-lg">
        <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">All Stores</h1>
        {stores.length > 0 ? (
          <div className="grid grid-cols-4 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {stores.map((store) => (
              <Link
                to={`/store/${store._id}`}
                key={store._id}
                className="cursor-pointer group  rounded-lg  p-4 hover:shadow-lg transition-shadow"
              >
                <div className="flex flex-col items-center">
                  {store.logo ? (
                    <img
                      src={getImageUrl(store.logo)}
                      alt={`${store.name} Logo`}
                      className="w-24 h-24 object-cover rounded-md transition-transform group-hover:scale-105"
                      onError={(e) => {
                        console.error('Store logo load error:', store._id, store.logo);
                        e.target.src =
                          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==';
                      }}
                      onLoad={() => console.log('Store logo loaded:', store._id, getImageUrl(store.logo))}
                    />
                  ) : (
                    <div className="w-24 h-24 bg-gray-200 rounded-md flex items-center justify-center transition-transform group-hover:scale-105">
                      <span className="text-gray-500">No Logo</span>
                    </div>
                  )}
                  <p className="mt-2 text-gray-800 font-medium text-center transition-colors group-hover:text-purple-700">
                    {store.name}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">{store.description || 'No description'}</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-gray-600 text-center">No stores available yet.</p>
        )}
      </div>
      <Footer />
    </>
  );
};

export default Stores;