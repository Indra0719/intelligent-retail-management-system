import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { cartCount } = useCart();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => pathname === path;

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-bold">IR</span>
          </div>
          <span className="font-bold text-gray-900 text-lg">IRMS</span>
        </Link>

        <div className="flex items-center gap-1">
          {user ? (
            <>
              <Link
                to="/"
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  isActive('/') ? 'bg-indigo-50 text-indigo-600' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Shop
              </Link>
              {user.role === 'customer' && (
                <>
                  <Link
                    to="/wallet"
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                      isActive('/wallet') ? 'bg-indigo-50 text-indigo-600' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    My Wallet
                  </Link>
                  <Link
                    to="/cart"
                    className={`relative px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                      isActive('/cart') ? 'bg-indigo-50 text-indigo-600' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    {cartCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-indigo-600 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full leading-none">
                        {cartCount > 9 ? '9+' : cartCount}
                      </span>
                    )}
                  </Link>
                </>
              )}
              {user.role === 'admin' && (
                <>
                  <Link
                    to="/admin/products"
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                      isActive('/admin/products') ? 'bg-indigo-50 text-indigo-600' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    Products
                  </Link>
                  <Link
                    to="/admin/pricing"
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                      isActive('/admin/pricing') ? 'bg-indigo-50 text-indigo-600' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    Pricing Monitor
                  </Link>
                  <Link
                    to="/admin/coupons"
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                      isActive('/admin/coupons') ? 'bg-indigo-50 text-indigo-600' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    Coupons
                  </Link>
                  <Link
                    to="/admin/analytics"
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                      isActive('/admin/analytics') ? 'bg-indigo-50 text-indigo-600' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    Analytics
                  </Link>
                </>
              )}
              <div className="w-px h-5 bg-gray-200 mx-2" />
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-semibold text-gray-800">{user.name}</p>
                  <p className="text-xs text-gray-400 capitalize">{user.role}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="text-sm font-medium text-gray-500 hover:text-red-500 bg-gray-100 hover:bg-red-50 px-3 py-2 rounded-xl transition-colors"
                >
                  Logout
                </button>
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
                Sign in
              </Link>
              <Link to="/register" className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors">
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
