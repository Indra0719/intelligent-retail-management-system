import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import Shop from './pages/Shop';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import CustomerWallet from './pages/CustomerWallet';
import AdminProducts from './pages/AdminProducts';
import AdminPricingMonitor from './pages/AdminPricingMonitor';
import AdminAnalytics from './pages/AdminAnalytics';
import AdminCoupons from './pages/AdminCoupons';

function PrivateRoute({ children, role }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (role && user.role !== role) return <Navigate to="/" />;
  return children;
}

export default function App() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<PrivateRoute><Shop /></PrivateRoute>} />
        <Route path="/cart" element={<PrivateRoute role="customer"><Cart /></PrivateRoute>} />
        <Route path="/checkout" element={<PrivateRoute role="customer"><Checkout /></PrivateRoute>} />
        <Route path="/wallet" element={<PrivateRoute role="customer"><CustomerWallet /></PrivateRoute>} />
        <Route
          path="/admin/products"
          element={
            <PrivateRoute role="admin">
              <AdminProducts />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/pricing"
          element={
            <PrivateRoute role="admin">
              <AdminPricingMonitor />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/coupons"
          element={
            <PrivateRoute role="admin">
              <AdminCoupons />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/analytics"
          element={
            <PrivateRoute role="admin">
              <AdminAnalytics />
            </PrivateRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
}
