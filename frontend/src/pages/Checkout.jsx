import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

export default function Checkout() {
  const { cartItems, cartSubtotal, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null); // { code, savings }
  const [couponError, setCouponError] = useState('');
  const [recommendation, setRecommendation] = useState(null);
  const [nudges, setNudges] = useState([]);
  const [loadingRec, setLoadingRec] = useState(false);
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [orderResult, setOrderResult] = useState(null); // { order, couponsGenerated }
  const [priceError, setPriceError] = useState('');

  useEffect(() => {
    if (cartItems.length === 0 && !orderResult) navigate('/cart');
  }, [cartItems, orderResult]);

  const cartItemsWithCategory = cartItems.map((i) => ({
    productId: i._id,
    price: i.currentPrice,
    quantity: i.quantity,
    category: i.category,
  }));

  const savings = appliedCoupon?.savings || 0;
  const total = parseFloat(Math.max(0, cartSubtotal - savings).toFixed(2));

  async function findBestCoupon() {
    setLoadingRec(true);
    setRecommendation(null);
    setNudges([]);
    try {
      const { data } = await api.post('/coupons/recommend', {
        cartTotal: cartSubtotal,
        cartItems: cartItemsWithCategory,
      });
      setRecommendation(data.best);
      setNudges(data.nudges || []);
    } catch { /* silent */ } finally {
      setLoadingRec(false);
    }
  }

  async function applyCoupon(code) {
    setCouponError('');
    try {
      const { data } = await api.post('/coupons/validate', {
        code,
        cartTotal: cartSubtotal,
        cartItems: cartItemsWithCategory,
      });
      if (data.valid) {
        setAppliedCoupon({ code: code.toUpperCase(), savings: data.savings });
      } else {
        setCouponError(data.reason);
      }
    } catch {
      setCouponError('Could not validate coupon. Try again.');
    }
  }

  async function placeOrder() {
    setLoadingOrder(true);
    setPriceError('');
    try {
      const payload = {
        items: cartItems.map((i) => ({
          productId: i._id,
          price: i.currentPrice,
          quantity: i.quantity,
        })),
        couponCode: appliedCoupon?.code || null,
      };
      const { data } = await api.post('/orders', payload);
      clearCart();
      setOrderResult(data);
    } catch (err) {
      const msg = err.response?.data?.message || 'Something went wrong. Please try again.';
      setPriceError(msg);
    } finally {
      setLoadingOrder(false);
    }
  }

  if (orderResult) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 w-full max-w-md text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">Order Confirmed!</h2>
          <p className="text-gray-500 text-sm mb-2">
            Order #{orderResult.order._id.slice(-8).toUpperCase()}
          </p>
          <p className="text-2xl font-bold text-gray-900 mb-6">
            ${orderResult.order.total.toFixed(2)}
          </p>

          {orderResult.couponsGenerated?.length > 0 && (
            <div className="bg-indigo-50 rounded-2xl p-4 text-left mb-6">
              <p className="text-xs font-bold text-indigo-700 uppercase tracking-wider mb-3">
                Coupons added to your wallet
              </p>
              <div className="space-y-2">
                {orderResult.couponsGenerated.map((c) => (
                  <div key={c.code} className="flex items-center justify-between">
                    <span className="font-mono font-bold text-indigo-700 text-sm bg-indigo-100 px-2 py-0.5 rounded">
                      {c.code}
                    </span>
                    <span className="text-indigo-600 text-xs">{c.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Link
              to="/wallet"
              className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors text-center"
            >
              My Wallet
            </Link>
            <Link
              to="/"
              className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors text-center"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Checkout</h1>

        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1 space-y-5">
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-900 mb-4">Order Summary</h2>
              <div className="space-y-3">
                {cartItems.map((item) => (
                  <div key={item._id} className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                      {item.images?.[0] ? (
                        <img src={item.images[0]} alt={item.name} className="w-full h-full object-cover" />
                      ) : null}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 line-clamp-1">{item.name}</p>
                      <p className="text-xs text-gray-400">Qty: {item.quantity}</p>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 shrink-0">
                      ${(item.currentPrice * item.quantity).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-900 mb-4">Coupon</h2>

              {!appliedCoupon && (
                <button
                  onClick={findBestCoupon}
                  disabled={loadingRec}
                  className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-indigo-300 text-indigo-600 rounded-xl text-sm font-semibold hover:bg-indigo-50 transition-colors disabled:opacity-60 mb-4"
                >
                  {loadingRec ? (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.344.344a3.014 3.014 0 01-2.121.879H9.88a3.014 3.014 0 01-2.121-.879l-.344-.344z" />
                    </svg>
                  )}
                  Find Best Coupon
                </button>
              )}

              {/* Recommendation card */}
              {recommendation && !appliedCoupon && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Best Coupon</span>
                    <span className="text-sm font-bold text-emerald-700">-${recommendation.savings.toFixed(2)} off</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded text-sm">
                      {recommendation.code}
                    </span>
                    <button
                      onClick={() => applyCoupon(recommendation.code)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              )}

              {!recommendation && !loadingRec && !appliedCoupon && (
                <p className="text-xs text-gray-400 mb-4 text-center">
                  No eligible coupons found — try a manual code below.
                </p>
              )}

              {/* Nudge messages */}
              {nudges.length > 0 && !appliedCoupon && (
                <div className="space-y-2 mb-4">
                  {nudges.map((n, i) => (
                    <div key={i} className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-xs text-amber-800">
                      {n.message}
                    </div>
                  ))}
                </div>
              )}

              {/* Manual code */}
              {!appliedCoupon ? (
                <div className="flex gap-2">
                  <input
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="Enter code manually"
                    className="flex-1 border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono"
                  />
                  <button
                    onClick={() => applyCoupon(couponCode)}
                    disabled={!couponCode}
                    className="bg-gray-900 hover:bg-gray-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors disabled:opacity-40"
                  >
                    Apply
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                  <div>
                    <span className="font-mono font-bold text-emerald-800 text-sm">{appliedCoupon.code}</span>
                    <p className="text-xs text-emerald-600 mt-0.5">-${appliedCoupon.savings.toFixed(2)} applied</p>
                  </div>
                  <button
                    onClick={() => { setAppliedCoupon(null); setCouponCode(''); }}
                    className="text-emerald-600 hover:text-red-500 transition-colors text-xs font-medium"
                  >
                    Remove
                  </button>
                </div>
              )}

              {couponError && (
                <p className="text-red-500 text-xs mt-2">{couponError}</p>
              )}
            </div>
          </div>

          {/* Right: sticky total panel */}
          <div className="lg:w-72">
            <div className="bg-white rounded-2xl border border-gray-200 p-5 sticky top-6">
              <h2 className="font-bold text-gray-900 mb-4">Total</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-500">
                  <span>Subtotal</span>
                  <span>${cartSubtotal.toFixed(2)}</span>
                </div>
                {savings > 0 && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Coupon savings</span>
                    <span>-${savings.toFixed(2)}</span>
                  </div>
                )}
              </div>
              <div className="border-t border-gray-100 mt-4 pt-4 flex justify-between font-bold text-gray-900">
                <span>Total</span>
                <span className="text-xl">${total.toFixed(2)}</span>
              </div>

              {priceError && (
                <div className="mt-3 bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-xs text-red-600">
                  {priceError}
                </div>
              )}

              <button
                onClick={placeOrder}
                disabled={loadingOrder}
                className="w-full mt-5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white py-3 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
              >
                {loadingOrder && (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                )}
                Place Order
              </button>

              <Link
                to="/cart"
                className="block text-center text-indigo-600 text-xs font-medium mt-3 hover:underline"
              >
                Back to Cart
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
