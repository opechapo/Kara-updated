import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Header from "../Layouts/Header";
import Footer from "../Layouts/Footer";
import { FaArrowLeft } from "react-icons/fa";

const UpdateStore = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    slogan: "",
    bannerImage: null,
    featuredImage: null,
    logo: null,
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchStore();
  }, [id]);

  const fetchStore = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Please connect your wallet.");
      return;
    }
    try {
      const response = await fetch(`http://localhost:3000/stores/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch store");
      const data = await response.json();
      setFormData({
        name: data.name || "",
        description: data.description || "",
        slogan: data.slogan || "",
        bannerImage: null,
        featuredImage: null,
        logo: null,
      });
    } catch (err) {
      console.error("Fetch error:", err.message);
      setError(err.message);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const { name } = e.target;
    setFormData((prev) => ({ ...prev, [name]: e.target.files[0] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Please connect your wallet.");
      return;
    }
    const form = new FormData();
    form.append("name", formData.name);
    form.append("description", formData.description);
    form.append("slogan", formData.slogan);
    if (formData.bannerImage) form.append("bannerImage", formData.bannerImage);
    if (formData.featuredImage)
      form.append("featuredImage", formData.featuredImage);
    if (formData.logo) form.append("logo", formData.logo);

    try {
      const response = await fetch(`http://localhost:3000/stores/${id}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
        body: form,
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update store");
      }
      setSuccess("Store updated successfully!");
      setError("");
      setTimeout(() => navigate(`/store/${id}`), 2000);
    } catch (err) {
      console.error("Update error:", err.message);
      setError(err.message);
      setSuccess("");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this store?")) return;
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Please connect your wallet.");
      return;
    }
    try {
      const response = await fetch(`http://localhost:3000/stores/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete store");
      }
      setSuccess("Store deleted successfully!");
      setError("");
      setTimeout(() => navigate("/profile"), 2000);
    } catch (err) {
      console.error("Delete error:", err.message);
      setError(err.message);
      setSuccess("");
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <div className="h-20"></div>
      <div className="absolute top-28 left-6">
        <button
          onClick={() => navigate(`/store/${id}`)}
          className="flex items-center text-purple-900 hover:text-purple-700 transition-colors"
        >
          <FaArrowLeft className="mr-2" />
        </button>
      </div>
      <div className="flex-1 p-10 max-w-6xl mx-auto bg-gray-50 rounded-xl shadow-lg">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Update Store</h1>
        {error && <div className="text-red-500 mb-8">{error}</div>}
        {success && <div className="text-green-500 mb-8">{success}</div>}
        <form onSubmit={handleSubmit} encType="multipart/form-data">
          <div className="mb-8">
            <label className="block text-gray-700 font-medium mb-3">
              Store Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
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
              value={formData.description}
              onChange={handleChange}
              className="w-full p-3 border rounded-md focus:ring-2 focus:ring-purple-500"
              rows="6"
              required
            />
          </div>
          <div className="mb-8">
            <label className="block text-gray-700 font-medium mb-3">
              Slogan
            </label>
            <input
              type="text"
              name="slogan"
              value={formData.slogan}
              onChange={handleChange}
              className="w-full p-3 border rounded-md focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div className="mb-8">
            <label className="block text-gray-700 font-medium mb-3">
              Banner Image (Optional - Upload to replace)
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
              Featured Image (Optional - Upload to replace)
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
              Logo (Optional - Upload to replace)
            </label>
            <input
              type="file"
              name="logo"
              onChange={handleFileChange}
              className="w-full p-3 border rounded-md"
              accept="image/*"
            />
          </div>
          <div className="flex space-x-4">
            <button
              type="submit"
              className="bg-purple-900 text-white px-6 py-4 rounded-md hover:bg-purple-800 transition-colors w-full text-lg"
            >
              Update Store
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="bg-red-600 text-white px-6 py-4 rounded-md hover:bg-red-700 transition-colors w-full text-lg"
            >
              Delete Store
            </button>
          </div>
        </form>
      </div>
      <div className="h-20"></div>
      <Footer />
    </div>
  );
};

export default UpdateStore;
