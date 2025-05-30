import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../Layouts/Header';
import Footer from '../Layouts/Footer';
import { FaArrowLeft } from 'react-icons/fa';

const CreateCollection = () => {
  const navigate = useNavigate();
  const [collectionData, setCollectionData] = useState({
    name: '',
    shortDescription: '',
    store: '',
    description: '',
    generalImage: null,
  });
  const [stores, setStores] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false); // New state for submit loading

  useEffect(() => {
    const fetchStores = async () => {
      try {
        console.log('Fetching stores...');
        const token = localStorage.getItem('token');
        if (!token) {
          setError('Please connect your wallet.');
          console.log('No token found');
          return;
        }
        const response = await fetch('http://localhost:3000/stores', {
          headers: { 'Authorization': `Bearer ${token}` },
          credentials: 'include',
        });
        console.log('Stores response status:', response.status, response.statusText);
        const data = await response.json();
        console.log('Stores raw response:', JSON.stringify(data, null, 2));
        if (!response.ok) throw new Error(data.message || 'Failed to fetch stores');
        setStores(Array.isArray(data.data) ? data.data : data); // Handle { success: true, data: [...] } or plain array
        console.log('Stores set:', data.data || data);
      } catch (err) {
        console.error('Fetch stores error:', err.message);
        setError(err.message);
        setStores([]); // Ensure stores is an array even on error
      } finally {
        setIsLoading(false);
        console.log('Fetch stores completed');
      }
    };
    fetchStores();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCollectionData({ ...collectionData, [name]: value });
  };

  const handleFileChange = (e) => {
    setCollectionData({ ...collectionData, generalImage: e.target.files[0] });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); // Clear previous errors
    setIsSubmitting(true); // Set submitting state to true
    const formData = new FormData();
    formData.append('name', collectionData.name);
    formData.append('shortDescription', collectionData.shortDescription);
    formData.append('store', collectionData.store);
    formData.append('description', collectionData.description);
    if (collectionData.generalImage) formData.append('generalImage', collectionData.generalImage);

    try {
      console.log('Submitting collection...');
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Please connect your wallet.');
      const response = await fetch('http://localhost:3000/collections', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include',
        body: formData,
      });
      console.log('Submit response status:', response.status, response.statusText);
      const data = await response.json();
      console.log('Submit response data:', JSON.stringify(data, null, 2));
      if (!response.ok) throw new Error(data.message || 'Failed to create collection');
      navigate('/profile');
    } catch (err) {
      console.error('Submit error:', err.message);
      setError(err.message);
    } finally {
      setIsSubmitting(false); // Reset submitting state
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-600 text-xl">Loading...</p>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <div className="h-20"></div>
      <div className="absolute top-28 left-6">
        <button
          onClick={() => navigate('/profile')}
          className="flex items-center text-purple-900 hover:text-purple-700 transition-colors"
        >
          <FaArrowLeft className="mr-2" />
        </button>
      </div>
      <div className="flex-1 p-10 max-w-6xl mx-auto bg-gray-50 rounded-xl shadow-lg">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Create a Collection</h1>
        {error && <div className="text-red-500 mb-8">{error}</div>}
        <form onSubmit={handleSubmit} encType="multipart/form-data">
          <div className="mb-8">
            <label className="block text-gray-700 font-medium mb-3">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={collectionData.name}
              onChange={handleChange}
              placeholder="e.g., Summer Tech Gadgets"
              className="w-full p-3 border rounded-md focus:ring-2 focus:ring-purple-500"
              required
            />
          </div>
          <div className="mb-8">
            <label className="block text-gray-700 font-medium mb-3">
              Short Description <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="shortDescription"
              value={collectionData.shortDescription}
              onChange={handleChange}
              className="w-full p-3 border rounded-md focus:ring-2 focus:ring-purple-500"
              required
            />
          </div>
          <div className="mb-8">
            <label className="block text-gray-700 font-medium mb-3">
              Store <span className="text-red-500">*</span>
            </label>
            <select
              name="store"
              value={collectionData.store}
              onChange={handleChange}
              className="w-full p-3 border rounded-md focus:ring-2 focus:ring-purple-500"
              required
            >
              <option value="">Select your store</option>
              {stores.map((store) => (
                <option key={store._id} value={store._id}>
                  {store.name}
                </option>
              ))}
            </select>
          </div>
          <div className="mb-8">
            <label className="block text-gray-700 font-medium mb-3">
              Description (Optional)
            </label>
            <textarea
              name="description"
              value={collectionData.description}
              onChange={handleChange}
              className="w-full p-3 border rounded-md focus:ring-2 focus:ring-purple-500"
              rows="6"
            />
            <p className="text-sm text-gray-500 mt-2">
              The description will be included on the collection's detail page. Markdown syntax is supported.
            </p>
          </div>
          <div className="mb-8">
            <label className="block text-gray-700 font-medium mb-3">
              General Image (Optional)
            </label>
            <input
              type="file"
              name="generalImage"
              onChange={handleFileChange}
              className="w-full p-3 border rounded-md"
              accept="image/*"
            />
            <p className="text-sm text-gray-500 mt-2">
              File types supported: JPG, PNG, GIF, SVG. Max size: 100 MB.
            </p>
          </div>
          <button
            type="submit"
            className="bg-purple-900 text-white px-6 py-4 rounded-md hover:bg-purple-800 cursor-pointer transition-colors w-full text-lg flex items-center justify-center"
            disabled={isSubmitting} // Disable button while submitting
          >
            {isSubmitting ? (
              <>
                <svg
                  className="animate-spin h-5 w-5 mr-3 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  ></path>
                </svg>
                Creating...
              </>
            ) : (
              'Create Collection'
            )}
          </button>
        </form>
      </div>
      <div className="h-20"></div>
      <Footer />
    </div>
  );
};

export default CreateCollection;