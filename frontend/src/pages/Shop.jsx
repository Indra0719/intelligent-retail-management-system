import { useState, useEffect, useRef } from 'react';
import api from '../api/axios';
import ImageCarousel from '../components/ImageCarousel';
import { useCart } from '../context/CartContext';
import AiChat from '../components/AiChat';
import { useAuth } from '../context/AuthContext';

const CATEGORIES = ['All', 'Electronics', 'Clothing', 'Food', 'Home', 'Sports', 'Other'];

function daysInStock(catalogDate) {
  return Math.floor((Date.now() - new Date(catalogDate)) / (1000 * 60 * 60 * 24));
}


function PriceTooltip({ product }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef();

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setVisible(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const days = daysInStock(product.catalogDate);

  return (
    <span ref={ref} className="relative inline-flex items-center">
      <button
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onClick={(e) => { e.stopPropagation(); setVisible((v) => !v); }}
        className="ml-1.5 w-4 h-4 rounded-full bg-gray-200 text-gray-500 text-xs flex items-center justify-center hover:bg-indigo-100 hover:text-indigo-600 transition-colors leading-none"
      >
        i
      </button>
      {visible && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 bg-gray-900 text-white text-xs rounded-xl px-3 py-2.5 shadow-xl z-30 leading-relaxed">
          Price reduced automatically — in stock <span className="font-semibold text-indigo-300">{days} days</span> with <span className="font-semibold text-indigo-300">{product.stock} units</span> available.
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </div>
      )}
    </span>
  );
}


export default function Shop() {
  const { addToCart, cartItems } = useCart();
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [addedId, setAddedId] = useState(null);
  const [activeCampaign, setActiveCampaign] = useState(null);

  useEffect(() => {
    fetchProducts();
  }, [category, search]);

  useEffect(() => {
    api.get('/coupons/active-campaign')
      .then(({ data }) => setActiveCampaign(data))
      .catch(() => {});
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    const params = {};
    if (category !== 'All') params.category = category;
    if (search) params.search = search;
    const { data } = await api.get('/products', { params });
    setProducts(data);
    setLoading(false);
  };

  const discountPercent = (base, current) =>
    base > current ? Math.round(((base - current) / base) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Campaign banner */}
      {activeCampaign && (
        <div className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white">
          <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-sm">
              <span className="font-bold">{activeCampaign.campaignName}</span>
              <span className="text-white/70">·</span>
              <span>
                Use code{' '}
                <span className="font-mono font-bold bg-white/20 px-2 py-0.5 rounded">
                  {activeCampaign.code}
                </span>{' '}
                for {activeCampaign.type === 'percent' ? `${activeCampaign.value}% off` : `$${activeCampaign.value} off`}
                {activeCampaign.categoryRestriction ? ` on ${activeCampaign.categoryRestriction}` : ''}
              </span>
            </div>
            <button onClick={() => setActiveCampaign(null)} className="text-white/60 hover:text-white shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Search + filter bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <div className="relative">
                <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search products..."
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                    category === c ? 'bg-indigo-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {!loading && (
          <p className="text-sm text-gray-500 mb-5">
            {products.length} {products.length === 1 ? 'product' : 'products'} found
          </p>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-200 overflow-hidden animate-pulse">
                <div className="h-52 bg-gray-200" />
                <div className="p-4 space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-1/3" />
                  <div className="h-4 bg-gray-200 rounded w-2/3" />
                  <div className="h-6 bg-gray-200 rounded w-1/4 mt-3" />
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-gray-400 font-medium">No products found</p>
            <p className="text-gray-400 text-sm mt-1">Try a different category or search term</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {products.map((p) => {
              const d = discountPercent(p.basePrice, p.currentPrice);
              return (
                <div
                  key={p._id}
                  onClick={() => setSelected(p)}
                  className="bg-white rounded-2xl border border-gray-200 overflow-hidden cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 group"
                >
                  <div className="relative">
                    <ImageCarousel images={p.images} className="h-52 w-full" />
                    {d > 0 && (
                      <div className="absolute top-3 left-3 bg-emerald-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow">
                        -{d}% OFF
                      </div>
                    )}
                    {p.stock <= 10 && p.stock > 0 && (
                      <div className="absolute top-3 right-3 bg-orange-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow">
                        Only {p.stock} left
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    <span className="text-xs font-semibold text-indigo-500 uppercase tracking-wider">{p.category}</span>
                    <h3 className="font-semibold text-gray-900 mt-0.5 leading-snug group-hover:text-indigo-600 transition-colors line-clamp-2">
                      {p.name}
                    </h3>
                    {p.description && (
                      <p className="text-xs text-gray-400 mt-1.5 line-clamp-2 leading-relaxed">{p.description}</p>
                    )}

                    <div className="mt-4 flex items-end justify-between">
                      <div>
                        <div className="flex items-center">
                          <span className="text-2xl font-bold text-gray-900">${p.currentPrice.toFixed(2)}</span>
                          {d > 0 && <PriceTooltip product={p} />}
                        </div>
                        {d > 0 && (
                          <div className="text-xs text-gray-400 line-through mt-0.5">
                            was ${p.basePrice.toFixed(2)}
                          </div>
                        )}
                      </div>
                      <button className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-colors">
                        View
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* AI Shopping Assistant — customers only */}
      {user?.role === 'customer' && <AiChat cartItems={cartItems} />}

      {/* Product Detail Modal */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <ImageCarousel images={selected.images} className="h-72 w-full rounded-t-2xl" />

            <div className="p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-xs font-semibold text-indigo-500 uppercase tracking-wider">{selected.category}</span>
                  <h2 className="text-2xl font-bold text-gray-900 mt-0.5">{selected.name}</h2>
                </div>
                {discountPercent(selected.basePrice, selected.currentPrice) > 0 && (
                  <span className="shrink-0 bg-emerald-100 text-emerald-700 font-bold text-sm px-3 py-1.5 rounded-full">
                    -{discountPercent(selected.basePrice, selected.currentPrice)}%
                  </span>
                )}
              </div>

              {selected.description && (
                <p className="text-gray-500 text-sm mt-3 leading-relaxed">{selected.description}</p>
              )}

              {/* Pricing breakdown */}
              <div className="mt-5 bg-gray-50 rounded-2xl p-4 space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Original price</span>
                  <span className="text-gray-700">${selected.basePrice.toFixed(2)}</span>
                </div>
                {discountPercent(selected.basePrice, selected.currentPrice) > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">Auto-markdown</span>
                    <span className="text-emerald-600 font-semibold">
                      -${(selected.basePrice - selected.currentPrice).toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="border-t border-gray-200 pt-3 flex justify-between items-center">
                  <span className="font-semibold text-gray-900">Current price</span>
                  <span className="text-2xl font-bold text-gray-900">${selected.currentPrice.toFixed(2)}</span>
                </div>
              </div>

              <div className="mt-5 flex gap-3">
                <button
                  onClick={() => {
                    addToCart(selected);
                    setAddedId(selected._id);
                    setTimeout(() => setAddedId(null), 1500);
                    setSelected(null);
                  }}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl text-sm font-semibold transition-colors"
                >
                  {addedId === selected._id ? 'Added!' : 'Add to Cart'}
                </button>
                <button
                  onClick={() => setSelected(null)}
                  className="px-5 py-3 border border-gray-300 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
