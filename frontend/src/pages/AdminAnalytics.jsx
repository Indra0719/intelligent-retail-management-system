import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';

const TRIGGER_COLORS = {
  purchase: 'bg-indigo-100 text-indigo-700',
  loyalty: 'bg-purple-100 text-purple-700',
  stock_alert: 'bg-orange-100 text-orange-700',
};

const DAYS_OPTIONS = [7, 30, 90];

function KPICard({ label, value, sub, accent }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${accent || 'text-gray-900'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function AdminAnalytics() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [pricingStatus, setPricingStatus] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [analyticsRes, pricingRes] = await Promise.all([
          api.get(`/orders/analytics?days=${days}`),
          api.get('/pricing/status'),
        ]);
        setData(analyticsRes.data);
        setPricingStatus(pricingRes.data || []);
      } catch {
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [days]);

  const atRisk = pricingStatus.filter((p) =>
    (!p.discounted && p.urgencyDisplay >= 40) || (p.discounted && p.urgencyDisplay >= 80)
  );
  const discounted = pricingStatus.filter((p) => p.currentPrice < p.basePrice);

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-8" />
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-28 bg-white rounded-2xl border border-gray-200 animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const { kpis, ordersOverTime, topProducts, couponPerformance } = data;

  const maxOrders = Math.max(...ordersOverTime.map((d) => d.orders), 1);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
          <div className="flex gap-2">
            {DAYS_OPTIONS.map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  days === d ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-indigo-300'
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <KPICard
            label="Total Orders"
            value={kpis.totalOrders}
            sub={`Last ${days} days`}
          />
          <KPICard
            label="Total Revenue"
            value={`$${kpis.totalRevenue.toFixed(2)}`}
            sub={`Last ${days} days`}
            accent="text-indigo-600"
          />
          <KPICard
            label="Avg Order Value"
            value={`$${kpis.avgOrderValue.toFixed(2)}`}
            sub="Per order"
          />
          <KPICard
            label="Coupons Issued"
            value={kpis.couponsIssued}
            sub="All time"
          />
          <KPICard
            label="Redemption Rate"
            value={`${kpis.redemptionRate}%`}
            sub="Coupons used at least once"
            accent={kpis.redemptionRate >= 50 ? 'text-emerald-600' : 'text-gray-900'}
          />
          <KPICard
            label="Avg Discount / Order"
            value={`$${kpis.avgDiscount.toFixed(2)}`}
            sub="Via coupons"
          />
        </div>

        {/* Orders over time bar chart */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8">
          <h2 className="font-semibold text-gray-900 mb-6">Orders Over Time</h2>
          {ordersOverTime.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No orders in this period</p>
          ) : (
            <div className="flex items-end gap-1.5 h-40 overflow-x-auto">
              {ordersOverTime.map((day) => {
                const pct = (day.orders / maxOrders) * 100;
                return (
                  <div key={day.date} className="flex flex-col items-center gap-1 flex-1 min-w-[28px]">
                    <p className="text-xs text-gray-500 font-medium">{day.orders}</p>
                    <div className="w-full flex flex-col justify-end" style={{ height: '96px' }}>
                      <div
                        className="w-full bg-indigo-500 rounded-t-lg transition-all"
                        style={{ height: `${Math.max(pct, 4)}%` }}
                        title={`${day.date}: ${day.orders} orders, $${day.revenue}`}
                      />
                    </div>
                    <p className="text-xs text-gray-400 whitespace-nowrap" style={{ fontSize: '9px' }}>
                      {day.date.slice(5)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Two column: top products + coupon performance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Top products */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Top Products by Revenue</h2>
            {topProducts.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-6">No sales data yet</p>
            ) : (
              <div className="space-y-3">
                {topProducts.map((p, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-sm font-bold text-gray-300 w-5 shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 line-clamp-1">{p.name}</p>
                      <p className="text-xs text-gray-400">{p.units} units sold</p>
                    </div>
                    <p className="text-sm font-bold text-gray-900 shrink-0">${p.revenue.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Coupon performance */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Coupon Performance by Type</h2>
            {couponPerformance.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-6">No coupons issued yet</p>
            ) : (
              <div className="space-y-4">
                {couponPerformance.map((t) => (
                  <div key={t.trigger}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full capitalize ${TRIGGER_COLORS[t.trigger] || 'bg-gray-100 text-gray-600'}`}>
                          {t.trigger.replace('_', ' ')}
                        </span>
                        <span className="text-xs text-gray-500">{t.issued} issued · {t.used} redeemed</span>
                      </div>
                      <span className="text-sm font-bold text-gray-700">{t.redemptionRate}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          t.trigger === 'purchase' ? 'bg-indigo-500' :
                          t.trigger === 'loyalty' ? 'bg-purple-500' : 'bg-orange-400'
                        }`}
                        style={{ width: `${t.redemptionRate}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Inventory health summary */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Inventory Health</h2>
            <Link to="/admin/pricing" className="text-xs text-indigo-600 font-semibold hover:underline">
              View Pricing Monitor
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-900">{pricingStatus.length}</p>
              <p className="text-xs text-gray-400 mt-1">Total Products</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-amber-500">{atRisk.length}</p>
              <p className="text-xs text-gray-400 mt-1">At Risk (no discount yet)</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-emerald-600">{discounted.length}</p>
              <p className="text-xs text-gray-400 mt-1">Currently Discounted</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
