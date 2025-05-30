import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../Layouts/Header';
import Footer from '../Layouts/Footer';
import { FaArrowLeft } from 'react-icons/fa';

const CreateProduct = () => {
  const { storeId } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    shortDescription: '',
    price: '',
    amount: '',
    category: '',
    paymentToken: '',
    storeId: storeId || '',
    store: storeId || '',
    collection: '',
    escrowSystem: 'Deposit',
    vendorDeposit: '',
    customerDeposit: '',
    generalImage: null,
  });
  const [collections, setCollections] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Validate MongoDB ObjectId
  const isValidObjectId = (id) => {
    return typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id);
  };

  useEffect(() => {
    console.log('CreateProduct: storeId from useParams:', storeId);
    if (!storeId || !isValidObjectId(storeId)) {
      setError('Invalid store ID. Please select a valid store.');
      return;
    }
    fetchCollections();
  }, [storeId]);

  const fetchCollections = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please connect your wallet.');
      return;
    }
    try {
      const response = await fetch(`http://localhost:3000/collections/store/${storeId}`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch collections: ${errorText}`);
      }
      const data = await response.json();
      const collectionsData = data.success ? data.data : Array.isArray(data) ? data : [];
      setCollections(collectionsData);
      if (collectionsData.length > 0) {
        setFormData((prev) => ({ ...prev, collection: collectionsData[0]._id }));
      }
    } catch (err) {
      console.error('Fetch collections error:', err.message);
      setError(err.message);
      setCollections([]);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    setFormData((prev) => ({ ...prev, generalImage: e.target.files[0] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please connect your wallet.');
      setLoading(false);
      return;
    }

    const form = new FormData();
    for (const key in formData) {
      if (key !== 'generalImage') form.append(key, formData[key]);
    }
    if (formData.generalImage) form.append('generalImage', formData.generalImage);

    try {
      const response = await fetch('http://localhost:3000/products', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
        body: form,
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `Failed to create product: ${response.status}`);
      }
      if (!data.success || !data.data || !data.data._id) {
        throw new Error('Invalid response format: Product ID missing');
      }
      setSuccess('Product created successfully!');
      setTimeout(() => {
        navigate(`/product/${data.data._id}`);
      }, 2000);
    } catch (err) {
      console.error('Create product error:', err.message);
      setError(err.message);
    } finally {
      setLoading(false); // Reset loading state
    }
  };

  const handleBack = () => {
    navigate(`/store/${storeId}`);
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
        <div className="max-w-md mx-auto mt-20 p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">Create Product</h2>
          {error && <p className="text-red-500 mb-4">{error}</p>}
          {success && <p className="text-green-500 mb-4">{success}</p>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-gray-700">Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Product Name"
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="block text-gray-700">Short Description</label>
              <input
                type="text"
                name="shortDescription"
                value={formData.shortDescription}
                onChange={handleChange}
                placeholder="Short Description"
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="block text-gray-700">Price</label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                placeholder="Price"
                className="w-full p-2 border rounded"
                step="0.01"
                required
              />
            </div>
            <div>
              <label className="block text-gray-700">Amount</label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                placeholder="Amount"
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="block text-gray-700">Category</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full p-2 border rounded"
                required
              >
                <option value="">Select Category</option>
                <option value="Electronics">Electronics</option>
                <option value="Smart Phones & Tabs">Smart Phones & Tabs</option>
                <option value="Homes & Gardens">Homes & Gardens</option>
                <option value="Fashion">Fashion</option>
                <option value="Vehicles">Vehicles</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-700">Payment Token</label>
              <input
                type="text"
                name="paymentToken"
                value={formData.paymentToken}
                onChange={handleChange}
                placeholder="Payment Token (e.g., ETH)"
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="block text-gray-700">Collection</label>
              <select
                name="collection"
                value={formData.collection}
                onChange={handleChange}
                className="w-full p-2 border rounded"
                required
              >
                <option value="">Select Collection</option>
                {collections.map((collection) => (
                  <option key={collection._id} value={collection._id}>
                    {collection.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-gray-700">Escrow System</label>
              <select
                name="escrowSystem"
                value={formData.escrowSystem}
                onChange={handleChange}
                className="w-full p-2 border rounded"
                required
              >
                <option value="Deposit">Deposit</option>
                <option value="Guarantor">Guarantor</option>
              </select>
            </div>
            {formData.escrowSystem === 'Deposit' && (
              <>
                <div>
                  <label className="block text-gray-700">Vendor Deposit</label>
                  <input
                    type="number"
                    name="vendorDeposit"
                    value={formData.vendorDeposit}
                    onChange={handleChange}
                    placeholder="Vendor Deposit"
                    className="w-full p-2 border rounded"
                    step="0.01"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700">Customer Deposit</label>
                  <input
                    type="number"
                    name="customerDeposit"
                    value={formData.customerDeposit}
                    onChange={handleChange}
                    placeholder="Customer Deposit"
                    className="w-full p-2 border rounded"
                    step="0.01"
                    required
                  />
                </div>
              </>
            )}
            <div>
              <label className="block text-gray-700">General Image</label>
              <input
                type="file"
                name="generalImage"
                onChange={handleFileChange}
                className="w-full p-2 border rounded"
                accept="image/*"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-purple-900 text-white p-2 rounded hover:bg-purple-700 disabled:bg-gray-400 flex items-center justify-center cursor-pointer"
              disabled={loading}
            >
              {loading ? (
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
                'Create Product'
              )}
            </button>
          </form>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default CreateProduct;