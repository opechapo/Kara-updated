import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import Header from '../../Layouts/Header';
import Footer from '../../Layouts/Footer';

// Image URL cache to prevent duplicate computations
const imageUrlCache = new Map();

const getImageUrl = (imagePath) => {
  if (!imagePath || typeof imagePath !== 'string') {
    console.warn('Invalid imagePath:', imagePath);
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==';
  }

  // Check cache first
  if (imageUrlCache.has(imagePath)) {
    return imageUrlCache.get(imagePath);
  }

  const baseUrl = 'http://localhost:3000';
  // Normalize path to ensure consistent format
  const normalizedPath = imagePath.startsWith('/Uploads/')
    ? imagePath
    : imagePath.startsWith('Uploads/')
    ? `/${imagePath}`
    : `/Uploads/${imagePath.replace(/^\/+/, '')}`;
  const encodedPath = encodeURI(normalizedPath);
  const finalUrl = `${baseUrl}${encodedPath}`;

  console.log('getImageUrl:', { input: imagePath, output: finalUrl });
  imageUrlCache.set(imagePath, finalUrl);
  return finalUrl;
};

const Search = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSearchResults();
  }, [query]);

  const fetchSearchResults = async () => {
    setIsLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await fetch(`http://localhost:3000/search?q=${encodeURIComponent(query)}`, {
        headers,
        credentials: 'include',
      });
      console.log('Search response status:', response.status, response.statusText);
      const data = await response.json();
      console.log('Search raw response:', JSON.stringify(data, null, 2));
      if (!response.ok) throw new Error(data.message || 'Failed to fetch search results');
      setResults(data.data || []);
    } catch (err) {
      console.error('Search fetch error:', err.message);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Memoize results to prevent unnecessary re-renders
  const memoizedResults = useMemo(() => results, [results]);

  if (error) return <div className="text-red-500 p-6">{error}</div>;
  if (isLoading) return <div className="p-6">Loading...</div>;

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-100 p-8 pt-24">
        <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-6">
          <h1 className="text-3xl font-bold mb-6">Search Results for "{query}"</h1>
          {memoizedResults.length === 0 ? (
            <p className="text-gray-600">No results found.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {memoizedResults.map((item) => {
                console.log('Rendering item:', JSON.stringify(item, null, 2));
                const imagePath =
                  item.type === 'product'
                    ? item.generalImage ||
                      (item.store
                        ? item.store.featuredImage || item.store.bannerImage || item.store.logo
                        : null)
                    : item.featuredImage || item.bannerImage || item.logo;
                const imageUrl = getImageUrl(imagePath);
                return (
                  <Link
                    to={item.type === 'product' ? `/product/${item._id}` : `/store/${item._id}`}
                    key={item._id}
                    className="block"
                  >
                    <div className="p-4 rounded-md cursor-pointer hover:bg-gray-50 transition">
                      <img
                        src={`${imageUrl}?t=${Date.now()}`} // Add cache-busting query
                        alt={item.name}
                        className="w-24 h-24 object-cover rounded-md mb-2"
                        onError={(e) => {
                          console.error(
                            `${item.type} image load error:`,
                            item._id,
                            'URL:',
                            e.target.src,
                            'Path:',
                            imagePath
                          );
                          e.target.src =
                            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==';
                        }}
                        onLoad={() => {
                          console.log(`${item.type} image loaded:`, item._id, imageUrl);
                        }}
                      />
                      <h2 className="text-lg font-semibold">{item.name}</h2>
                      <p className="text-gray-600">
                        {item.type === 'product' ? item.shortDescription : item.description}
                      </p>
                      {item.type === 'product' && (
                        <p className="text-purple-600 font-medium">
                          {item.price} {item.paymentToken}
                        </p>
                      )}
                      <p className="text-sm text-gray-500 capitalize">{item.type}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
};

export default Search;