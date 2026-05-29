import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState('customer');
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(form.email, form.password);

      if (user.role !== selectedRole) {
        setError(
          user.role === 'admin'
            ? 'This is an admin account. Switch to the Admin tab to continue.'
            : 'This is a customer account. Switch to the Customer tab to continue.'
        );
        setLoading(false);
        return;
      }

      navigate(user.role === 'admin' ? '/admin/products' : '/');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[88vh] flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 w-full max-w-md overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-indigo-500 to-purple-500" />

        <div className="p-8">
          <h2 className="text-2xl font-bold text-gray-900">Welcome back</h2>
          <p className="text-sm text-gray-500 mt-1 mb-7">Sign in to your account</p>

          {/* Tab switcher */}
          <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
            {['customer', 'admin'].map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => { setSelectedRole(role); setError(''); }}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all capitalize ${
                  selectedRole === role
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {role === 'admin' ? 'Store Admin' : 'Customer'}
              </button>
            ))}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-3 rounded-xl mb-5">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
                placeholder="you@example.com"
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                required
                placeholder="••••••••"
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl text-sm font-semibold disabled:opacity-60 transition-colors mt-2"
            >
              {loading ? 'Signing in...' : `Sign in as ${selectedRole === 'admin' ? 'Admin' : 'Customer'}`}
            </button>
          </form>

          <p className="text-sm text-center text-gray-500 mt-6">
            No account?{' '}
            <Link to="/register" className="text-indigo-600 font-medium hover:underline">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
