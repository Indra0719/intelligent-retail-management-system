import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';

export default function Cart() {
  const { cartItems, removeFromCart, updateQuantity, cartSubtotal } = useCart();
  const navigate = useNavigate();

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <p className="text-gray-500 font-medium">Your cart is empty</p>
        <Link to="/" className="text-indigo-600 text-sm font-semibold hover:underline">
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Your Cart</h1>

        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1 space-y-3">
            {cartItems.map((item) => (
              <div key={item._id} className="bg-white rounded-2xl border border-gray-200 p-4 flex gap-4">
                <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                  {item.images?.[0] ? (
                    <img
                      src={item.images[0]}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 text-2xl">?</div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wider">{item.category}</p>
                  <p className="font-semibold text-gray-900 leading-snug line-clamp-2">{item.name}</p>
                  <p className="text-sm font-bold text-gray-800 mt-1">${item.currentPrice.toFixed(2)}</p>
                </div>

                <div className="flex flex-col items-end justify-between shrink-0">
                  <button
                    onClick={() => removeFromCart(item._id)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>

                  <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-2 py-1">
                    <button
                      onClick={() => updateQuantity(item._id, item.quantity - 1)}
                      className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-indigo-600 font-bold disabled:opacity-30"
                      disabled={item.quantity <= 1}
                    >
                      -
                    </button>
                    <span className="text-sm font-semibold w-6 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item._id, item.quantity + 1)}
                      className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-indigo-600 font-bold"
                    >
                      +
                    </button>
                  </div>

                  <p className="text-sm font-bold text-gray-900">
                    ${(item.currentPrice * item.quantity).toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="lg:w-72">
            <div className="bg-white rounded-2xl border border-gray-200 p-5 sticky top-6">
              <h2 className="font-bold text-gray-900 mb-4">Summary</h2>
              <div className="space-y-2 text-sm">
                {cartItems.map((item) => (
                  <div key={item._id} className="flex justify-between text-gray-500">
                    <span className="line-clamp-1 flex-1 mr-2">{item.name} × {item.quantity}</span>
                    <span className="shrink-0">${(item.currentPrice * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-100 mt-4 pt-4 flex justify-between font-bold text-gray-900">
                <span>Subtotal</span>
                <span>${cartSubtotal.toFixed(2)}</span>
              </div>
              <button
                onClick={() => navigate('/checkout')}
                className="w-full mt-5 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl text-sm font-semibold transition-colors"
              >
                Proceed to Checkout
              </button>
              <Link
                to="/"
                className="block text-center text-indigo-600 text-xs font-medium mt-3 hover:underline"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
