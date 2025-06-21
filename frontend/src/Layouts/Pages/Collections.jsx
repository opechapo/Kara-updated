import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Header from '../../Layouts/Header';
import Footer from '../../Layouts/Footer';
import { FaSpinner } from 'react-icons/fa';

const Collections = () => {
  const navigate = useNavigate();
  const [collections, setCollections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const getImageUrl = (imagePath) => {
    if (!imagePath || typeof imagePath !== 'string') {
      console.warn('Invalid imagePath:', imagePath);
      return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==';
    }
    const baseUrl = 'http://localhost:3000';
    const normalizedPath = imagePath.toLowerCase().startsWith('/uploads/')
      ? `/Uploads/${imagePath.split('/uploads/')[1]}`
      : `/Uploads/${imagePath}`;
    const encodedPath = encodeURI(normalizedPath);
    console.log('getImageUrl:', { input: imagePath, output: `${baseUrl}${encodedPath}` });
    return `${baseUrl}${encodedPath}`;
  };

  const fetchAllCollections = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await fetch('http://localhost:3000/collections/public/all', {
        headers,
        credentials: 'include',
      });
      console.log('Collections: Response status:', response.status, response.statusText);
      const data = await response.json();
      console.log('Collections: Raw response:', JSON.stringify(data, null, 2));
      if (!response.ok) throw new Error(data.message || 'Failed to fetch collections');
      setCollections(data.data || []);
      setIsLoading(false);
    } catch (err) {
      console.error('Collections: Fetch error:', err.message);
      setError(err.message);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllCollections();
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
        <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">All Collections</h1>
        {collections.length > 0 ? (
          <div className="grid grid-cols-3 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {collections.map((collection) => (
              <Link
                to={`/collections/${collection._id}`}
                key={collection._id}
                className="cursor-pointer group  rounded-lg  p-4 hover:shadow-lg transition-shadow"
              >
                <div className="flex flex-col items-center">
                  {collection.generalImage ? (
                    <img
                      src={getImageUrl(collection.generalImage)}
                      alt={`${collection.name} Image`}
                      className="w-24 h-24 object-cover rounded-md transition-transform group-hover:scale-105"
                      onError={(e) => {
                        console.error('Collection image load error:', collection._id, collection.generalImage);
                        e.target.src =
                          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==';
                      }}
                      onLoad={() => console.log('Collection image loaded:', collection._id, getImageUrl(collection.generalImage))}
                    />
                  ) : (
                    <div className="w-24 h-24 bg-gray-200 rounded-md flex items-center justify-center transition-transform group-hover:scale-105">
                      <span className="text-gray-500">No Image</span>
                    </div>
                  )}
                  <p className="mt-2 text-gray-800 font-medium text-center transition-colors group-hover:text-purple-700">
                    {collection.name}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    Store: {collection.store?.name || 'Unknown'}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-gray-600 text-center">No collections available yet.</p>
        )}
      </div>
      <Footer />
    </>
  );
};

export default Collections;