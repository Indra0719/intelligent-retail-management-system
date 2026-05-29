import { useState, useEffect, useRef } from 'react';
import api from '../api/axios';
import ImageCarousel from '../components/ImageCarousel';

const CATEGORIES = ['Electronics', 'Clothing', 'Food', 'Home', 'Sports', 'Other'];

const emptyForm = {
  name: '',
  description: '',
  category: 'Electronics',
  basePrice: '',
  stock: '',
  catalogDate: new Date().toISOString().split('T')[0],
};

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [pricingStatus, setPricingStatus] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const fileRef = useRef();

  useEffect(() => { fetchProducts(); }, []);

  const fetchProducts = async () => {
    const { data } = await api.get('/products');
    setProducts(data);
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const openAdd = () => {
    setForm(emptyForm);
    setEditingId(null);
    setImageFiles([]);
    setImagePreviews([]);
    setExistingImages([]);
    setShowForm(true);
  };

  const openEdit = (product) => {
    setForm({
      name: product.name,
      description: product.description,
      category: product.category,
      basePrice: product.basePrice,
      stock: product.stock,
      catalogDate: product.catalogDate?.split('T')[0] || new Date().toISOString().split('T')[0],
    });
    setEditingId(product._id);
    setImageFiles([]);
    setImagePreviews([]);
    setExistingImages(product.images || []);
    setShowForm(true);
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setImageFiles((prev) => [...prev, ...files]);
    const previews = files.map((f) => URL.createObjectURL(f));
    setImagePreviews((prev) => [...prev, ...previews]);
  };

  const removeNewImage = (index) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const removeExistingImage = (index) => {
    setExistingImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      let uploadedUrls = [];

      if (imageFiles.length > 0) {
        setUploading(true);
        const formData = new FormData();
        imageFiles.forEach((f) => formData.append('images', f));
        const { data } = await api.post('/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        uploadedUrls = data.urls;
        setUploading(false);
      }

      const payload = { ...form, images: [...existingImages, ...uploadedUrls] };

      if (editingId) {
        await api.put(`/products/${editingId}`, payload);
      } else {
        await api.post('/products', payload);
      }

      setShowForm(false);
      fetchProducts();
    } catch (err) {
      alert(err.response?.data?.message || 'Something went wrong');
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this product?')) return;
    await api.delete(`/products/${id}`);
    fetchProducts();
  };

  const runPricing = async () => {
    setPricingStatus('running');
    try {
      const { data } = await api.post('/pricing/run');
      setPricingStatus(`${data.updated} of ${data.total} products updated`);
      fetchProducts();
      setTimeout(() => setPricingStatus(null), 5000);
    } catch {
      setPricingStatus('error');
    }
  };

  const discount = (base, current) =>
    base > current ? Math.round(((base - current) / base) * 100) : 0;

  const daysOld = (date) =>
    Math.floor((Date.now() - new Date(date)) / (1000 * 60 * 60 * 24));

  const ageColor = (days) => {
    if (days > 90) return 'text-red-500 bg-red-50';
    if (days > 60) return 'text-orange-500 bg-orange-50';
    if (days > 30) return 'text-yellow-600 bg-yellow-50';
    return 'text-emerald-600 bg-emerald-50';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Product Catalog</h1>
            <p className="text-gray-500 mt-1">{products.length} products · Prices auto-update nightly</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={runPricing}
              disabled={pricingStatus === 'running'}
              className="flex items-center gap-2 px-4 py-2.5 border border-indigo-200 text-indigo-600 bg-indigo-50 rounded-xl text-sm font-medium hover:bg-indigo-100 transition disabled:opacity-50"
            >
              <svg className={`w-4 h-4 ${pricingStatus === 'running' ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {pricingStatus === 'running' ? 'Running...' : 'Run Pricing Engine'}
            </button>
            <button
              onClick={openAdd}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Product
            </button>
          </div>
        </div>

        {/* Pricing status toast */}
        {pricingStatus && pricingStatus !== 'running' && (
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl mb-6 text-sm font-medium border ${
            pricingStatus === 'error'
              ? 'bg-red-50 text-red-700 border-red-200'
              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
          }`}>
            <span>{pricingStatus === 'error' ? '✗ Pricing engine failed' : `✓ Pricing complete — ${pricingStatus}`}</span>
          </div>
        )}

        {/* Product Cards Grid */}
        {products.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-2xl border border-dashed border-gray-300">
            <div className="text-5xl mb-4">📦</div>
            <p className="text-gray-500 font-medium">No products yet</p>
            <p className="text-gray-400 text-sm mt-1">Click "Add Product" to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {products.map((p) => {
              const d = discount(p.basePrice, p.currentPrice);
              const age = daysOld(p.catalogDate);
              return (
                <div key={p._id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  <ImageCarousel images={p.images} className="h-44 w-full" />

                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-medium text-indigo-500 uppercase tracking-wider">{p.category}</span>
                        <h3 className="font-semibold text-gray-900 leading-tight truncate mt-0.5">{p.name}</h3>
                      </div>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${ageColor(age)}`}>
                        {age}d
                      </span>
                    </div>

                    <div className="mt-3 flex items-end justify-between">
                      <div>
                        <div className="text-xl font-bold text-gray-900">${p.currentPrice.toFixed(2)}</div>
                        {d > 0 && (
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-xs text-gray-400 line-through">${p.basePrice.toFixed(2)}</span>
                            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">-{d}%</span>
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-gray-400">{p.stock} in stock</span>
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-100 flex gap-2">
                      <button
                        onClick={() => openEdit(p)}
                        className="flex-1 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 py-2 rounded-lg transition"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(p._id)}
                        className="flex-1 text-xs font-medium text-red-500 bg-red-50 hover:bg-red-100 py-2 rounded-lg transition"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Product Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 rounded-t-2xl flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">
                {editingId ? 'Edit Product' : 'Add New Product'}
              </h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Images upload */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Product Images</label>

                {/* Existing images */}
                {existingImages.length > 0 && (
                  <div className="flex gap-2 flex-wrap mb-3">
                    {existingImages.map((url, i) => (
                      <div key={i} className="relative group">
                        <img src={url} className="w-20 h-20 object-cover rounded-xl border border-gray-200" />
                        <button
                          type="button"
                          onClick={() => removeExistingImage(i)}
                          className="absolute -top-1.5 -right-1.5 bg-red-500 text-white w-5 h-5 rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* New image previews */}
                {imagePreviews.length > 0 && (
                  <div className="flex gap-2 flex-wrap mb-3">
                    {imagePreviews.map((src, i) => (
                      <div key={i} className="relative group">
                        <img src={src} className="w-20 h-20 object-cover rounded-xl border border-indigo-200" />
                        <button
                          type="button"
                          onClick={() => removeNewImage(i)}
                          className="absolute -top-1.5 -right-1.5 bg-red-500 text-white w-5 h-5 rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload area */}
                <button
                  type="button"
                  onClick={() => fileRef.current.click()}
                  className="w-full border-2 border-dashed border-gray-300 hover:border-indigo-400 rounded-xl py-6 text-sm text-gray-500 hover:text-indigo-600 transition-colors flex flex-col items-center gap-2"
                >
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Click to add images (up to 8)
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Product Name</label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  placeholder="e.g. Wireless Headphones Pro"
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description</label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={3}
                  placeholder="What makes this product great..."
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Category + Catalog Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Category</label>
                  <select
                    name="category"
                    value={form.category}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                  >
                    {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Catalog Date</label>
                  <input
                    type="date"
                    name="catalogDate"
                    value={form.catalogDate}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Price + Stock */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Base Price ($)</label>
                  <input
                    type="number"
                    name="basePrice"
                    value={form.basePrice}
                    onChange={handleChange}
                    required
                    min="0"
                    step="0.01"
                    placeholder="99.99"
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Stock (units)</label>
                  <input
                    type="number"
                    name="stock"
                    value={form.stock}
                    onChange={handleChange}
                    required
                    min="0"
                    placeholder="150"
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 border border-gray-300 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 transition"
                >
                  {uploading ? 'Uploading images...' : saving ? 'Saving...' : editingId ? 'Save Changes' : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
