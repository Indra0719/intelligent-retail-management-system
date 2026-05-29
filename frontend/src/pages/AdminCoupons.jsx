import { useState, useEffect } from 'react';
import api from '../api/axios';

const CATEGORIES = ['Electronics', 'Clothing', 'Food', 'Sports', 'Home', 'Other'];

const TRIGGER_LABELS = {
  purchase: { label: 'Thank You', short: 'THX', color: 'bg-indigo-100 text-indigo-700', dot: 'bg-indigo-500' },
  loyalty: { label: 'Loyalty', short: 'LYL', color: 'bg-purple-100 text-purple-700', dot: 'bg-purple-500' },
  stock_alert: { label: 'Clearance', short: 'CLR', color: 'bg-orange-100 text-orange-700', dot: 'bg-orange-400' },
  campaign: { label: 'Campaign', short: 'SALE', color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
};

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function timeLeft(expiresAt) {
  const diff = new Date(expiresAt) - Date.now();
  if (diff <= 0) return 'Expired';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days}d ${hours}h left`;
  return `${hours}h left`;
}

const EMPTY_CAMPAIGN_FORM = {
  name: '',
  type: 'percent',
  value: '',
  minCartValue: '',
  categoryRestriction: '',
  durationDays: '',
  usageLimit: '',
  perUserLimit: '',
};

function PersonalCouponCard({ coupon, onToggle, onDelete }) {
  const expired = new Date(coupon.expiresAt) < new Date();
  const used = coupon.usedCount > 0;
  const meta = TRIGGER_LABELS[coupon.trigger] || TRIGGER_LABELS.purchase;

  return (
    <div className={`bg-white rounded-2xl border px-5 py-3.5 flex items-center gap-4 ${expired || !coupon.isActive ? 'opacity-60 border-gray-100' : 'border-gray-200'}`}>
      <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${meta.color}`}>
        {meta.short}
      </span>
      <span className="font-mono font-bold text-gray-800 text-sm">{coupon.code}</span>
      <span className="text-sm text-gray-500">
        {coupon.type === 'percent' ? `${coupon.value}%` : `$${coupon.value}`} off
        {coupon.categoryRestriction ? ` · ${coupon.categoryRestriction}` : ''}
      </span>
      <div className="ml-auto flex items-center gap-3 shrink-0">
        <span className="text-xs text-gray-400">{timeLeft(coupon.expiresAt)}</span>
        <span className="text-xs text-gray-400">{coupon.usedCount}/{coupon.usageLimit}</span>
        <span className={`text-xs font-semibold ${coupon.isActive && !expired ? 'text-emerald-600' : 'text-gray-400'}`}>
          {expired ? 'Expired' : coupon.isActive ? 'Active' : 'Paused'}
        </span>
        {!expired && (
          <button
            onClick={() => onToggle(coupon._id)}
            className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition-colors ${
              coupon.isActive ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            {coupon.isActive ? 'Pause' : 'Resume'}
          </button>
        )}
        <button
          onClick={() => onDelete(coupon._id)}
          className="text-xs px-2.5 py-1 rounded-lg font-semibold bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

export default function AdminCoupons() {
  const [campaigns, setCampaigns] = useState([]);
  const [thxCoupons, setThxCoupons] = useState([]);
  const [lylCoupons, setLylCoupons] = useState([]);
  const [clrCoupons, setClrCoupons] = useState([]);
  const [tab, setTab] = useState('Campaigns');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showLoyaltyConfig, setShowLoyaltyConfig] = useState(false);
  const [showClearanceConfig, setShowClearanceConfig] = useState(false);
  const [form, setForm] = useState(EMPTY_CAMPAIGN_FORM);
  const [settings, setSettings] = useState(null);
  const [loyaltyForm, setLoyaltyForm] = useState(null);
  const [clearanceForm, setClearanceForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const [campRes, thxRes, lylRes, clrRes, settingsRes] = await Promise.all([
        api.get('/coupons/campaigns'),
        api.get('/coupons/personal?trigger=purchase'),
        api.get('/coupons/personal?trigger=loyalty'),
        api.get('/coupons/personal?trigger=stock_alert'),
        api.get('/settings'),
      ]);
      setCampaigns(campRes.data);
      setThxCoupons(thxRes.data);
      setLylCoupons(lylRes.data);
      setClrCoupons(clrRes.data);
      setSettings(settingsRes.data);
      setLoyaltyForm(JSON.parse(JSON.stringify(settingsRes.data.loyaltyAlgorithm)));
      setClearanceForm(JSON.parse(JSON.stringify(settingsRes.data.clearanceConfig)));
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }

  async function createCampaign() {
    setError('');
    if (!form.name || !form.value || !form.durationDays || !form.usageLimit) {
      setError('Please fill all required fields.');
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.post('/coupons/campaigns', {
        name: form.name,
        type: form.type,
        value: Number(form.value),
        minCartValue: Number(form.minCartValue) || 0,
        categoryRestriction: form.categoryRestriction || null,
        durationDays: Number(form.durationDays),
        usageLimit: Number(form.usageLimit),
        perUserLimit: form.perUserLimit ? Number(form.perUserLimit) : null,
      });
      setCampaigns((prev) => [data, ...prev]);
      setForm(EMPTY_CAMPAIGN_FORM);
      setShowForm(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create campaign.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleCampaign(id) {
    try {
      const { data } = await api.patch(`/coupons/campaigns/${id}/toggle`);
      setCampaigns((prev) => prev.map((c) => (c._id === id ? data : c)));
    } catch { /* silent */ }
  }

  async function deleteCampaign(id) {
    if (!window.confirm('Delete this campaign?')) return;
    try {
      await api.delete(`/coupons/campaigns/${id}`);
      setCampaigns((prev) => prev.filter((c) => c._id !== id));
    } catch { /* silent */ }
  }

  async function togglePersonal(id, trigger) {
    try {
      const { data } = await api.patch(`/coupons/${id}/toggle`);
      if (trigger === 'purchase') setThxCoupons((prev) => prev.map((c) => (c._id === id ? data : c)));
      else if (trigger === 'loyalty') setLylCoupons((prev) => prev.map((c) => (c._id === id ? data : c)));
      else setClrCoupons((prev) => prev.map((c) => (c._id === id ? data : c)));
    } catch { /* silent */ }
  }

  async function deletePersonal(id, trigger) {
    if (!window.confirm('Delete this coupon?')) return;
    try {
      await api.delete(`/coupons/${id}`);
      if (trigger === 'purchase') setThxCoupons((prev) => prev.filter((c) => c._id !== id));
      else if (trigger === 'loyalty') setLylCoupons((prev) => prev.filter((c) => c._id !== id));
      else setClrCoupons((prev) => prev.filter((c) => c._id !== id));
    } catch { /* silent */ }
  }

  async function toggleIssuance(field) {
    const newVal = !settings[field];
    try {
      const { data } = await api.patch('/settings', { [field]: newVal });
      setSettings(data);
    } catch { /* silent */ }
  }

  async function saveLoyaltyConfig() {
    setSavingSettings(true);
    try {
      const { data } = await api.patch('/settings', { loyaltyAlgorithm: loyaltyForm });
      setSettings(data);
      setLoyaltyForm(JSON.parse(JSON.stringify(data.loyaltyAlgorithm)));
      setShowLoyaltyConfig(false);
    } catch { /* silent */ }
    setSavingSettings(false);
  }

  async function saveClearanceConfig() {
    setSavingSettings(true);
    try {
      const { data } = await api.patch('/settings', { clearanceConfig: clearanceForm });
      setSettings(data);
      setClearanceForm(JSON.parse(JSON.stringify(data.clearanceConfig)));
      setShowClearanceConfig(false);
    } catch { /* silent */ }
    setSavingSettings(false);
  }

  const TABS = ['Campaigns', 'Thank You (THX)', 'Loyalty (LYL)', 'Clearance (CLR)'];

  const activeCampaigns = campaigns.filter((c) => c.isActive && new Date(c.expiresAt) > new Date());
  const totalRedemptions = campaigns.reduce((s, c) => s + c.usedCount, 0);

  const baseList = tab === 'Campaigns' ? campaigns
    : tab === 'Thank You (THX)' ? thxCoupons
    : tab === 'Loyalty (LYL)' ? lylCoupons
    : clrCoupons;

  const q = search.toLowerCase().trim();
  const currentList = q
    ? baseList.filter((c) => c.code.toLowerCase().includes(q) || (c.campaignName || '').toLowerCase().includes(q))
    : baseList;

  const currentTrigger = tab === 'Thank You (THX)' ? 'purchase'
    : tab === 'Loyalty (LYL)' ? 'loyalty'
    : 'stock_alert';

  const issuanceKey = tab === 'Thank You (THX)' ? 'issueThankYou'
    : tab === 'Loyalty (LYL)' ? 'issueLoyalty'
    : tab === 'Clearance (CLR)' ? 'issueClearance'
    : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 py-10">

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Coupon Management</h1>
            <p className="text-sm text-gray-400 mt-1">Create campaigns, monitor redemptions, control discounts</p>
          </div>
          {tab === 'Campaigns' && (
            <button
              onClick={() => { setShowForm(true); setError(''); }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Campaign
            </button>
          )}
          {tab === 'Loyalty (LYL)' && settings && (
            <button
              onClick={() => { setShowLoyaltyConfig(true); }}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Configure Algorithm
            </button>
          )}
          {tab === 'Clearance (CLR)' && settings && (
            <button
              onClick={() => { setShowClearanceConfig(true); }}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Configure Trigger
            </button>
          )}
        </div>

        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Active Campaigns</p>
            <p className="text-3xl font-bold text-emerald-600 mt-1">{activeCampaigns.length}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Campaign Redemptions</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{totalRedemptions}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Thank You Coupons</p>
            <p className="text-3xl font-bold text-indigo-600 mt-1">{thxCoupons.length}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Loyalty Rewards</p>
            <p className="text-3xl font-bold text-purple-600 mt-1">{lylCoupons.length}</p>
          </div>
        </div>

        {tab === 'Loyalty (LYL)' && settings && (
          <div className="bg-purple-50 border border-purple-100 rounded-2xl px-5 py-3.5 mb-6 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
            <div className="text-sm text-purple-700">
              <span className="font-semibold">Algorithm: </span>
              {settings.loyaltyAlgorithm.type === 'milestones' && (
                <>Milestone orders ({settings.loyaltyAlgorithm.milestones.join(', ')}) → {settings.loyaltyAlgorithm.milestoneValues.join('/')}% off</>
              )}
              {settings.loyaltyAlgorithm.type === 'every_nth' && (
                <>Every {settings.loyaltyAlgorithm.nthOrder}{settings.loyaltyAlgorithm.nthOrder === 1 ? 'st' : settings.loyaltyAlgorithm.nthOrder === 2 ? 'nd' : settings.loyaltyAlgorithm.nthOrder === 3 ? 'rd' : 'th'} order → {settings.loyaltyAlgorithm.nthValue}% off</>
              )}
              {settings.loyaltyAlgorithm.type === 'spend_threshold' && (
                <>Every ${settings.loyaltyAlgorithm.spendThreshold} spent → {settings.loyaltyAlgorithm.spendValue}% off</>
              )}
            </div>
          </div>
        )}

        {tab === 'Clearance (CLR)' && settings && (
          <div className="bg-orange-50 border border-orange-100 rounded-2xl px-5 py-3.5 mb-6 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-orange-400 shrink-0" />
            <div className="text-sm text-orange-700">
              <span className="font-semibold">Smart trigger: </span>
              Stock drops below {settings.clearanceConfig.stockThreshold} units AND product has been in store ≥ {settings.clearanceConfig.minDaysInStore} days
              → {settings.clearanceConfig.discountValue}% off, {settings.clearanceConfig.durationDays} days, {settings.clearanceConfig.usageLimit} uses
            </div>
          </div>
        )}

        <div className="flex gap-1 p-1 bg-gray-100 rounded-2xl mb-6 w-fit overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setSearch(''); }}
              className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                tab === t ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {issuanceKey && settings && (
          <div className="flex items-center justify-between bg-white border border-gray-200 rounded-2xl px-5 py-3.5 mb-4">
            <div>
              <p className="text-sm font-semibold text-gray-800">
                Auto-issue {tab.split(' (')[0]} coupons
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {settings[issuanceKey] ? 'New coupons of this type are being issued automatically' : 'Issuance is paused — no new coupons will be generated'}
              </p>
            </div>
            <button
              onClick={() => toggleIssuance(issuanceKey)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${settings[issuanceKey] ? 'bg-indigo-600' : 'bg-gray-300'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${settings[issuanceKey] ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        )}

        {tab !== 'Campaigns' && (
          <div className="relative mb-4">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by coupon code or campaign name..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 bg-white rounded-2xl border border-gray-200 animate-pulse" />
            ))}
          </div>
        ) : tab === 'Campaigns' ? (
          <div className="space-y-4">
            {campaigns.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
                <p className="text-gray-400 font-medium">No campaigns yet</p>
                <p className="text-gray-400 text-sm mt-1">Create your first campaign to start driving sales</p>
              </div>
            ) : campaigns.map((c) => {
              const expired = new Date(c.expiresAt) < new Date();
              const usagePct = Math.round((c.usedCount / c.usageLimit) * 100);
              return (
                <div key={c._id} className={`bg-white rounded-2xl border p-5 ${expired ? 'border-gray-100 opacity-60' : 'border-gray-200'}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-bold text-gray-900">{c.campaignName}</h3>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${c.isActive && !expired ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                          {expired ? 'Expired' : c.isActive ? 'Active' : 'Paused'}
                        </span>
                        {c.categoryRestriction && (
                          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                            {c.categoryRestriction} only
                          </span>
                        )}
                        {c.perUserLimit && (
                          <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">
                            {c.perUserLimit}× per customer
                          </span>
                        )}
                      </div>

                      <div className="font-mono text-sm font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded inline-block mb-3">
                        {c.code}
                      </div>

                      <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                        <span>
                          <span className="font-semibold text-gray-800">
                            {c.type === 'percent' ? `${c.value}% off` : `$${c.value} off`}
                          </span>
                          {c.minCartValue > 0 && ` · min $${c.minCartValue}`}
                        </span>
                        <span>{expired ? 'Expired' : timeLeft(c.expiresAt)}</span>
                        <span>Expires {formatDate(c.expiresAt)}</span>
                      </div>

                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                          <span>{c.usedCount} used</span>
                          <span>{c.usageLimit - c.usedCount} remaining</span>
                        </div>
                        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${usagePct >= 90 ? 'bg-red-400' : usagePct >= 60 ? 'bg-amber-400' : 'bg-emerald-500'}`}
                            style={{ width: `${Math.min(usagePct, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {!expired && (
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => toggleCampaign(c._id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                            c.isActive
                              ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          }`}
                        >
                          {c.isActive ? 'Pause' : 'Resume'}
                        </button>
                        <button
                          onClick={() => deleteCampaign(c._id)}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-2">
            {currentList.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
                <p className="text-gray-400 font-medium">
                  {q ? `No results for "${q}"` : `No ${tab.split(' (')[0]} coupons yet`}
                </p>
                {!q && (
                  <p className="text-gray-400 text-sm mt-1">
                    {tab.includes('THX') && 'Issued automatically after every order'}
                    {tab.includes('LYL') && 'Issued when loyalty milestones are reached'}
                    {tab.includes('CLR') && 'Issued when low-stock slow-moving products trigger clearance'}
                  </p>
                )}
              </div>
            ) : currentList.map((c) => (
              <PersonalCouponCard
                key={c._id}
                coupon={c}
                onToggle={(id) => togglePersonal(id, currentTrigger)}
                onDelete={(id) => deletePersonal(id, currentTrigger)}
              />
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900 mb-5">New Campaign</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Campaign Name *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder='"Weekend Flash Sale"'
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Discount Type *</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="percent">Percentage</option>
                    <option value="fixed">Fixed Amount</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Value * {form.type === 'percent' ? '(%)' : '($)'}</label>
                  <input
                    type="number"
                    value={form.value}
                    onChange={(e) => setForm({ ...form, value: e.target.value })}
                    placeholder={form.type === 'percent' ? '20' : '15'}
                    min="1"
                    max={form.type === 'percent' ? '80' : undefined}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Min Cart Value ($)</label>
                  <input
                    type="number"
                    value={form.minCartValue}
                    onChange={(e) => setForm({ ...form, minCartValue: e.target.value })}
                    placeholder="0"
                    min="0"
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Category (optional)</label>
                  <select
                    value={form.categoryRestriction}
                    onChange={(e) => setForm({ ...form, categoryRestriction: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">All categories</option>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Duration (days) *</label>
                  <input
                    type="number"
                    value={form.durationDays}
                    onChange={(e) => setForm({ ...form, durationDays: e.target.value })}
                    placeholder="7"
                    min="1"
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Usage Limit *</label>
                  <input
                    type="number"
                    value={form.usageLimit}
                    onChange={(e) => setForm({ ...form, usageLimit: e.target.value })}
                    placeholder="100"
                    min="1"
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Per-Customer Limit <span className="normal-case font-normal text-gray-400">(optional)</span>
                </label>
                <input
                  type="number"
                  value={form.perUserLimit}
                  onChange={(e) => setForm({ ...form, perUserLimit: e.target.value })}
                  placeholder="Leave blank for unlimited"
                  min="1"
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {error && <p className="text-red-500 text-xs mt-3">{error}</p>}

            <div className="flex gap-3 mt-6">
              <button
                onClick={createCampaign}
                disabled={saving}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors"
              >
                {saving ? 'Creating...' : 'Launch Campaign'}
              </button>
              <button
                onClick={() => { setShowForm(false); setForm(EMPTY_CAMPAIGN_FORM); setError(''); }}
                className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showLoyaltyConfig && loyaltyForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900 mb-1">Loyalty Algorithm</h2>
            <p className="text-sm text-gray-400 mb-5">Choose how loyalty rewards are earned</p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Algorithm Type</label>
                <div className="space-y-2">
                  {[
                    { value: 'milestones', label: 'Specific Order Milestones', desc: 'e.g. 3rd, 5th, 10th order' },
                    { value: 'every_nth', label: 'Every Nth Order', desc: 'e.g. every 5th order' },
                    { value: 'spend_threshold', label: 'Total Spend Threshold', desc: 'e.g. every $500 spent' },
                  ].map((opt) => (
                    <label key={opt.value} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${loyaltyForm.type === opt.value ? 'border-purple-300 bg-purple-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <input
                        type="radio"
                        name="loyaltyType"
                        value={opt.value}
                        checked={loyaltyForm.type === opt.value}
                        onChange={(e) => setLoyaltyForm({ ...loyaltyForm, type: e.target.value })}
                        className="mt-0.5"
                      />
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{opt.label}</p>
                        <p className="text-xs text-gray-400">{opt.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {loyaltyForm.type === 'milestones' && (
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Milestones &amp; Rewards</p>
                  {(loyaltyForm.milestones || [3, 5, 10]).map((m, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-sm text-gray-600 w-20 shrink-0">Order #{m}</span>
                      <input
                        type="number"
                        value={(loyaltyForm.milestoneValues || [])[i] ?? 20}
                        onChange={(e) => {
                          const vals = [...(loyaltyForm.milestoneValues || [20, 25, 30])];
                          vals[i] = Number(e.target.value);
                          setLoyaltyForm({ ...loyaltyForm, milestoneValues: vals });
                        }}
                        min="1" max="80"
                        className="w-20 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      <span className="text-sm text-gray-400">% off</span>
                    </div>
                  ))}
                </div>
              )}

              {loyaltyForm.type === 'every_nth' && (
                <div className="bg-gray-50 rounded-xl p-4 grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Every N orders</label>
                    <input
                      type="number"
                      value={loyaltyForm.nthOrder}
                      onChange={(e) => setLoyaltyForm({ ...loyaltyForm, nthOrder: Number(e.target.value) })}
                      min="1"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Discount (%)</label>
                    <input
                      type="number"
                      value={loyaltyForm.nthValue}
                      onChange={(e) => setLoyaltyForm({ ...loyaltyForm, nthValue: Number(e.target.value) })}
                      min="1" max="80"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              )}

              {loyaltyForm.type === 'spend_threshold' && (
                <div className="bg-gray-50 rounded-xl p-4 grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Spend threshold ($)</label>
                    <input
                      type="number"
                      value={loyaltyForm.spendThreshold}
                      onChange={(e) => setLoyaltyForm({ ...loyaltyForm, spendThreshold: Number(e.target.value) })}
                      min="1"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Discount (%)</label>
                    <input
                      type="number"
                      value={loyaltyForm.spendValue}
                      onChange={(e) => setLoyaltyForm({ ...loyaltyForm, spendValue: Number(e.target.value) })}
                      min="1" max="80"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={saveLoyaltyConfig}
                disabled={savingSettings}
                className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors"
              >
                {savingSettings ? 'Saving...' : 'Save Algorithm'}
              </button>
              <button
                onClick={() => { setShowLoyaltyConfig(false); setLoyaltyForm(JSON.parse(JSON.stringify(settings.loyaltyAlgorithm))); }}
                className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showClearanceConfig && clearanceForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900 mb-1">Clearance Trigger</h2>
            <p className="text-sm text-gray-400 mb-5">Set conditions for auto-generating clearance coupons</p>

            <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 mb-5 text-xs text-orange-700 leading-relaxed">
              Clearance coupons are issued when a customer's order causes stock to drop below the threshold AND the product has been sitting in the store longer than the minimum days — meaning it's slow-moving, not just popular.
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Stock Below (units)</label>
                  <input
                    type="number"
                    value={clearanceForm.stockThreshold}
                    onChange={(e) => setClearanceForm({ ...clearanceForm, stockThreshold: Number(e.target.value) })}
                    min="1"
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Min Days in Store</label>
                  <input
                    type="number"
                    value={clearanceForm.minDaysInStore}
                    onChange={(e) => setClearanceForm({ ...clearanceForm, minDaysInStore: Number(e.target.value) })}
                    min="1"
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Discount (%)</label>
                  <input
                    type="number"
                    value={clearanceForm.discountValue}
                    onChange={(e) => setClearanceForm({ ...clearanceForm, discountValue: Number(e.target.value) })}
                    min="1" max="80"
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Duration (days)</label>
                  <input
                    type="number"
                    value={clearanceForm.durationDays}
                    onChange={(e) => setClearanceForm({ ...clearanceForm, durationDays: Number(e.target.value) })}
                    min="1"
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Usage Limit</label>
                  <input
                    type="number"
                    value={clearanceForm.usageLimit}
                    onChange={(e) => setClearanceForm({ ...clearanceForm, usageLimit: Number(e.target.value) })}
                    min="1"
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={saveClearanceConfig}
                disabled={savingSettings}
                className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors"
              >
                {savingSettings ? 'Saving...' : 'Save Config'}
              </button>
              <button
                onClick={() => { setShowClearanceConfig(false); setClearanceForm(JSON.parse(JSON.stringify(settings.clearanceConfig))); }}
                className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
