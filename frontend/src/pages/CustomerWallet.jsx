import { useState, useEffect, useRef } from 'react';
import api from '../api/axios';

const TRIGGER_META = {
  purchase: { label: 'Thank You', color: 'bg-indigo-100 text-indigo-700', bar: 'bg-indigo-400' },
  loyalty: { label: 'Loyalty Reward', color: 'bg-purple-100 text-purple-700', bar: 'bg-purple-400' },
  stock_alert: { label: 'Clearance', color: 'bg-orange-100 text-orange-700', bar: 'bg-orange-400' },
  campaign: { label: 'Campaign', color: 'bg-emerald-100 text-emerald-700', bar: 'bg-emerald-400' },
};

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function useCountdown(expiresAt) {
  const [display, setDisplay] = useState('');
  const [urgency, setUrgency] = useState('normal'); // normal | soon | critical

  useEffect(() => {
    function compute() {
      const diff = new Date(expiresAt) - Date.now();
      if (diff <= 0) { setDisplay('Expired'); setUrgency('expired'); return; }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);

      if (diff < 1000 * 60 * 60) {
        setDisplay(`${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')} left`);
        setUrgency('critical');
      } else if (diff < 1000 * 60 * 60 * 24) {
        setDisplay(`${hours}h ${mins}m left`);
        setUrgency('soon');
      } else if (days <= 3) {
        setDisplay(`${days}d ${hours}h left`);
        setUrgency('soon');
      } else {
        setDisplay(`${days}d left`);
        setUrgency('normal');
      }
    }

    compute();
    const interval = setInterval(compute, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  return { display, urgency };
}

function CouponCard({ coupon, faded }) {
  const meta = TRIGGER_META[coupon.trigger] || { label: coupon.trigger, color: 'bg-gray-100 text-gray-600', bar: 'bg-gray-400' };
  const { display, urgency } = useCountdown(coupon.expiresAt);
  const isGlobal = !coupon.issuedTo;
  const usagePct = Math.round((coupon.usedCount / coupon.usageLimit) * 100);

  const urgencyStyles = {
    critical: 'text-red-600 font-bold',
    soon: 'text-amber-600 font-semibold',
    normal: 'text-gray-500',
    expired: 'text-gray-400',
  };

  const borderColor = faded
    ? 'border-gray-200'
    : urgency === 'critical'
    ? 'border-red-200'
    : urgency === 'soon'
    ? 'border-amber-200'
    : 'border-gray-200 hover:border-indigo-200';

  return (
    <div className={`relative bg-white rounded-2xl border border-dashed p-5 transition-all ${borderColor} ${faded ? 'opacity-40' : ''}`}>
      {urgency === 'critical' && !faded && (
        <span className="absolute top-3 right-3 flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
        </span>
      )}

      <div className="flex gap-3">
        <div className={`w-1 rounded-full shrink-0 ${faded ? 'bg-gray-300' : meta.bar}`} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${meta.color}`}>
              {meta.label}
            </span>
            {coupon.categoryRestriction && (
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                {coupon.categoryRestriction} only
              </span>
            )}
            {isGlobal && (
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                Public
              </span>
            )}
          </div>

          <p className="font-mono font-bold text-gray-900 text-xl leading-none tracking-wide mb-1">
            {coupon.code}
          </p>

          <p className="text-sm text-gray-500 mb-3">
            <span className="font-semibold text-gray-800">
              {coupon.type === 'percent' ? `${coupon.value}% off` : `$${coupon.value} off`}
            </span>
            {coupon.minCartValue > 0 && ` · min cart $${coupon.minCartValue.toFixed(2)}`}
          </p>

          {isGlobal && !faded && (
            <div className="mb-3">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>{coupon.usedCount} used</span>
                <span>{coupon.usageLimit - coupon.usedCount} remaining</span>
              </div>
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${usagePct >= 80 ? 'bg-red-400' : usagePct >= 50 ? 'bg-amber-400' : 'bg-emerald-500'}`}
                  style={{ width: `${Math.min(usagePct, 100)}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between text-xs">
            <span className={urgencyStyles[urgency] || 'text-gray-500'}>
              {faded ? (coupon.usedCount > 0 ? 'Used' : 'Expired') : display}
            </span>
            <span className="text-gray-400">Expires {formatDate(coupon.expiresAt)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const ORDER_STATUS_COLORS = {
  confirmed: 'bg-indigo-100 text-indigo-700',
  shipped: 'bg-blue-100 text-blue-700',
  delivered: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
};

function OrderCard({ order }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
            Order #{order._id.slice(-8).toUpperCase()}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full capitalize ${ORDER_STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-600'}`}>
          {order.status}
        </span>
      </div>

      <div className="space-y-2.5 mb-4">
        {order.items.map((item, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-gray-100 shrink-0">
              {item.imageUrl && <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 line-clamp-1">{item.name}</p>
              <p className="text-xs text-gray-400">Qty: {item.quantity} · ${item.price.toFixed(2)} each</p>
            </div>
            <p className="text-sm font-semibold text-gray-900 shrink-0">
              ${(item.price * item.quantity).toFixed(2)}
            </p>
          </div>
        ))}
      </div>

      <div className="border-t border-gray-100 pt-3 space-y-1.5 text-sm">
        <div className="flex justify-between text-gray-500">
          <span>Subtotal</span>
          <span>${order.subtotal.toFixed(2)}</span>
        </div>
        {order.couponApplied?.code && (
          <div className="flex justify-between text-emerald-600 font-medium">
            <span className="font-mono text-xs">{order.couponApplied.code}</span>
            <span>-${order.couponApplied.savings.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-gray-900 pt-1 border-t border-gray-100">
          <span>Total paid</span>
          <span className="text-base">${order.total.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}

const WALLET_FILTERS = [
  { key: 'active', label: 'Active' },
  { key: 'expiringSoon', label: 'Expiring Soon' },
  { key: 'used', label: 'Used' },
  { key: 'expired', label: 'Expired' },
];

const TABS = ['Coupon Wallet', 'Order History'];

export default function CustomerWallet() {
  const [tab, setTab] = useState('Coupon Wallet');
  const [walletFilter, setWalletFilter] = useState('active');
  const [wallet, setWallet] = useState({ active: [], expiringSoon: [], used: [], expired: [] });
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [walletRes, ordersRes] = await Promise.all([
          api.get('/coupons/my'),
          api.get('/orders/my'),
        ]);
        setWallet(walletRes.data);
        setOrders(ordersRes.data);
      } catch { /* silent */ }
      finally { setLoading(false); }
    }
    load();
  }, []);

  const visibleCoupons = wallet[walletFilter] || [];
  const totalActive = wallet.active.length + wallet.expiringSoon.length;
  const isFaded = walletFilter === 'used' || walletFilter === 'expired';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">My Wallet</h1>

        <div className="flex gap-1 p-1 bg-gray-100 rounded-2xl mb-8 w-fit">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
                tab === t ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t}
              {t === 'Coupon Wallet' && totalActive > 0 && (
                <span className="ml-2 bg-indigo-600 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                  {totalActive}
                </span>
              )}
              {t === 'Order History' && orders.length > 0 && (
                <span className="ml-2 bg-gray-400 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                  {orders.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-white rounded-2xl border border-gray-200 animate-pulse" />
            ))}
          </div>
        ) : tab === 'Coupon Wallet' ? (
          <div>
            <div className="flex gap-2 flex-wrap mb-5">
              {WALLET_FILTERS.map((f) => {
                const count = wallet[f.key]?.length || 0;
                return (
                  <button
                    key={f.key}
                    onClick={() => setWalletFilter(f.key)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      walletFilter === f.key
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white border border-gray-200 text-gray-600 hover:border-indigo-300'
                    }`}
                  >
                    {f.label}{count > 0 ? ` (${count})` : ''}
                  </button>
                );
              })}
            </div>

            {visibleCoupons.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
                <p className="text-gray-400 font-medium">
                  {walletFilter === 'active' ? 'No active coupons' : `No ${walletFilter.replace(/([A-Z])/g, ' $1').toLowerCase()} coupons`}
                </p>
                {walletFilter === 'active' && (
                  <p className="text-gray-400 text-sm mt-1">Place an order to earn your first coupon</p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {visibleCoupons.map((c) => (
                  <CouponCard key={c._id} coupon={c} faded={isFaded} />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div>
            {orders.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
                <p className="text-gray-400 font-medium">No orders yet</p>
                <p className="text-gray-400 text-sm mt-1">Your order history will appear here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((o) => <OrderCard key={o._id} order={o} />)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
