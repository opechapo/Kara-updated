import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../Layouts/Header';
import Footer from '../Layouts/Footer';
import { FaArrowLeft, FaSpinner } from 'react-icons/fa';

const UpdateCollection = () => {
  const { collectionId } = useParams();
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
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCollection();
    fetchStores();
  }, [collectionId]);

  const fetchCollection = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please connect your wallet.');
      setLoading(false);
      return;
    }
    try {
      const response = await fetch(`http://localhost:3000/collections/${collectionId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include',
      });
      const text = await response.text();
      console.log('UpdateCollection: Fetch collection raw response:', text);
      const data = JSON.parse(text);
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch collection');
      }
      const collection = data.data; // Access normalized data field
      setCollectionData({
        name: collection.name || '',
        shortDescription: collection.shortDescription || '',
        store: collection.store?._id || '',
        description: collection.description || '',
        generalImage: null,
      });
      setLoading(false);
    } catch (err) {
      console.error('UpdateCollection: Fetch collection error:', err.message);
      setError(err.message);
      setLoading(false);
    }
  };

  const fetchStores = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please connect your wallet.');
      return;
    }
    try {
      const response = await fetch('http://localhost:3000/stores', {
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include',
      });
      const text = await response.text();
      console.log('UpdateCollection: Fetch stores raw response:', text);
      const data = JSON.parse(text);
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch stores');
      }
      const storesData = data.data; // Access normalized data field
      if (!Array.isArray(storesData)) {
        throw new Error('Stores data is not an array');
      }
      setStores(storesData);
    } catch (err) {
      console.error('UpdateCollection: Fetch stores error:', err.message);
      setError(err.message);
      setStores([]);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCollectionData({ ...collectionData, [name]: value });
  };

  const handleFileChange = (e) => {
    setCollectionData({ ...collectionData, generalImage: e.target.files[0] });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('name', collectionData.name);
    formData.append('shortDescription', collectionData.shortDescription);
    formData.append('store', collectionData.store);
    formData.append('description', collectionData.description);
    if (collectionData.generalImage) formData.append('generalImage', collectionData.generalImage);

    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Please connect your wallet.');
      const response = await fetch(`http://localhost:3000/collections/${collectionId}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include',
        body: formData,
      });
      const text = await response.text();
      console.log('UpdateCollection: Update response:', text);
      if (!response.ok) {
        const errorData = JSON.parse(text);
        throw new Error(errorData.message || 'Failed to update collection');
      }
      setSuccess('Collection updated successfully!');
      setError('');
      setTimeout(() => navigate(`/collections/${collectionId}`), 2000);
    } catch (err) {
      console.error('UpdateCollection: Submit error:', err.message);
      setError(err.message);
      setSuccess('');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this collection?')) return;
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Please connect your wallet.');
      const response = await fetch(`http://localhost:3000/collections/${collectionId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include',
      });
      const text = await response.text();
      console.log('UpdateCollection: Delete response:', text);
      if (!response.ok) {
        const errorData = JSON.parse(text);
        throw new Error(errorData.message || 'Failed to delete collection');
      }
      setSuccess('Collection deleted successfully!');
      setError('');
      setTimeout(() => navigate('/profile'), 2000);
    } catch (err) {
      console.error('UpdateCollection: Delete error:', err.message);
      setError(err.message);
      setSuccess('');
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <div className="h-20"></div>
      <div className="absolute top-28 left-6">
        <button
          onClick={() => navigate(`/collections/${collectionId}`)}
          className="flex items-center text-purple-900 hover:text-purple-700 transition-colors"
        >
          <FaArrowLeft className="mr-2" />
        </button>
      </div>
      <div className="flex-1 p-10 max-w-6xl mx-auto bg-gray-50 rounded-xl shadow-lg">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Update Collection</h1>
        {error && <div className="text-red-500 mb-8">{error}</div>}
        {success && <div className="text-green-500 mb-8">{success}</div>}
        {loading ? (
          <div className="text-center py-10">
            <FaSpinner className="animate-spin text-purple-900 text-4xl" />
          </div>
        ) : (
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
                General Image (Optional - Upload to replace)
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
            <div className="flex space-x-4">
              <button
                type="submit"
                className="bg-purple-900 text-white px-6 py-4 rounded-md hover:bg-purple-800 transition-colors w-full text-lg"
              >
                Update Collection
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="bg-red-600 text-white px-6 py-4 rounded-md hover:bg-red-700 transition-colors w-full text-lg"
              >
                Delete Collection
              </button>
            </div>
          </form>
        )}
      </div>
      <div className="h-20"></div>
      <Footer />
    </div>
  );
};

export default UpdateCollection;