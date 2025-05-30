import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../Layouts/Header';
import Footer from '../Layouts/Footer';
import { FaArrowLeft } from 'react-icons/fa';

const CreateStore = () => {
  const navigate = useNavigate();
  const [storeData, setStoreData] = useState({
    name: '',
    description: '',
    slogan: '',
    bannerImage: null,
    featuredImage: null,
    logo: null,
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false); // New state for loading

  const handleStoreChange = (e) => {
    const { name, value } = e.target;
    setStoreData({ ...storeData, [name]: value });
  };

  const handleFileChange = (e) => {
    const { name } = e.target;
    setStoreData({ ...storeData, [name]: e.target.files[0] });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true); // Set loading state to true
    const formData = new FormData();
    formData.append('name', storeData.name);
    formData.append('description', storeData.description);
    formData.append('slogan', storeData.slogan);
    formData.append('bannerImage', storeData.bannerImage);
    formData.append('featuredImage', storeData.featuredImage);
    formData.append('logo', storeData.logo);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3000/stores', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token || ''}` },
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to create store');
      }

      navigate('/profile');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false); // Reset loading state
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header Section */}
      <Header />

      {/* Spacer */}
      <div className="h-20"></div>

      {/* Back Button in Outer Div */}
      <div className="absolute top-28 left-6">
        <button
          onClick={() => navigate('/profile')}
          className="flex items-center text-purple-900 hover:text-purple-700 transition-colors"
        >
          <FaArrowLeft className="mr-2" />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-10 max-w-6xl mx-auto bg-gray-50 rounded-xl shadow-lg">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Create a Store</h1>
        {error && <div className="text-red-500 mb-8">{error}</div>}

        <form onSubmit={handleSubmit} encType="multipart/form-data">
          <div className="mb-8">
            <label className="block text-gray-700 font-medium mb-3">
              Store Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={storeData.name}
              onChange={handleStoreChange}
              className="w-full p-3 border rounded-md focus:ring-2 focus:ring-purple-500"
              required
            />
          </div>

          <div className="mb-8">
            <label className="block text-gray-700 font-medium mb-3">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              name="description"
              value={storeData.description}
              onChange={handleStoreChange}
              className="w-full p-3 border rounded-md focus:ring-2 focus:ring-purple-500"
              rows="6"
              required
            />
          </div>

          <div className="mb-8">
            <label className="block text-gray-700 font-medium mb-3">Slogan</label>
            <input
              type="text"
              name="slogan"
              value={storeData.slogan}
              onChange={handleStoreChange}
              className="w-full p-3 border rounded-md focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="mb-8">
            <label className="block text-gray-700 font-medium mb-3">
              Banner Image (1400 x 400 recommended)
            </label>
            <input
              type="file"
              name="bannerImage"
              onChange={handleFileChange}
              className="w-full p-3 border rounded-md"
              accept="image/*"
            />
          </div>

          <div className="mb-8">
            <label className="block text-gray-700 font-medium mb-3">
              Featured Image (1920 x 700 recommended)
            </label>
            <input
              type="file"
              name="featuredImage"
              onChange={handleFileChange}
              className="w-full p-3 border rounded-md"
              accept="image/*"
            />
          </div>

          <div className="mb-8">
            <label className="block text-gray-700 font-medium mb-3">
              Logo (350 x 350 recommended)
            </label>
            <input
              type="file"
              name="logo"
              onChange={handleFileChange}
              className="w-full p-3 border rounded-md"
              accept="image/*"
            />
          </div>

          <button
            type="submit"
            className="bg-purple-900 text-white px-6 py-4 rounded-md hover:bg-purple-800 transition-colors w-full text-lg flex items-center justify-center cursor-pointer"
            disabled={isLoading} // Disable button while loading
          >
            {isLoading ? (
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
              'Create Store'
            )}
          </button>
        </form>
      </div>

      {/* Spacer */}
      <div className="h-20"></div>

      {/* Footer Section */}
      <Footer />
    </div>
  );
};

export default CreateStore;