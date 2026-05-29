import { useState, useEffect } from 'react';
import api from '../api/axios';

const PERIODS = [
  { label: 'Last 24h', value: '24h' },
  { label: 'Last 7 days', value: '7d' },
  { label: 'Last 30 days', value: '30d' },
  { label: 'All time', value: 'all' },
];

function formatDate(d) {
  return new Date(d).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function UrgencyBar({ score }) {
  const pct = Math.round(score * 100);
  const color =
    pct >= 75 ? 'bg-red-500' :
    pct >= 50 ? 'bg-orange-400' :
    pct >= 25 ? 'bg-yellow-400' :
    'bg-emerald-400';

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-semibold w-8 text-right ${
        pct >= 75 ? 'text-red-500' : pct >= 50 ? 'text-orange-500' : pct >= 25 ? 'text-yellow-600' : 'text-emerald-600'
      }`}>{pct}</span>
    </div>
  );
}

function AgeBadge({ days }) {
  const cls =
    days > 90 ? 'bg-red-50 text-red-600' :
    days > 60 ? 'bg-orange-50 text-orange-600' :
    days > 30 ? 'bg-yellow-50 text-yellow-700' :
    'bg-emerald-50 text-emerald-700';
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cls}`}>{days}d</span>
  );
}

export default function AdminPricingMonitor() {
  const [status, setStatus] = useState([]);
  const [logs, setLogs] = useState([]);
  const [period, setPeriod] = useState('7d');
  const [activeTab, setActiveTab] = useState('health');
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aiInsight, setAiInsight] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [expandedProduct, setExpandedProduct] = useState(null);
  const [priceHistory, setPriceHistory] = useState({});

  useEffect(() => { fetchAll(); }, []);
  useEffect(() => { fetchLogs(); }, [period]);

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([fetchStatus(), fetchLogs()]);
    setLoading(false);
  };

  const fetchStatus = async () => {
    const { data } = await api.get('/pricing/status');
    setStatus(data);
  };

  const fetchLogs = async () => {
    const { data } = await api.get(`/pricing/logs?period=${period}`);
    setLogs(data);
  };

  const getAiInsights = async () => {
    setAiLoading(true);
    setAiError('');
    setAiInsight(null);
    try {
      const { data } = await api.post('/ai/pricing-insights');
      setAiInsight(data.insight);
    } catch (err) {
      setAiError(err.response?.data?.message || 'AI analysis failed. Try again.');
    } finally {
      setAiLoading(false);
    }
  };

  const runEngine = async () => {
    setRunning(true);
    setRunResult(null);
    try {
      const { data } = await api.post('/pricing/run');
      setRunResult(data);
      await fetchAll();
      setTimeout(() => setRunResult(null), 6000);
    } catch {
      setRunResult({ error: true });
    } finally {
      setRunning(false);
    }
  };

  const toggleProductHistory = async (productId) => {
    if (expandedProduct === productId) {
      setExpandedProduct(null);
      return;
    }
    setExpandedProduct(productId);
    if (priceHistory[productId]) return;
    try {
      const { data } = await api.get(`/products/${productId}`);
      setPriceHistory((prev) => ({ ...prev, [productId]: data.priceHistory || [] }));
    } catch {
      setPriceHistory((prev) => ({ ...prev, [productId]: [] }));
    }
  };

  const discounted = status.filter((p) => p.discounted);
  const totalSavings = discounted.reduce((sum, p) => sum + (p.basePrice - p.currentPrice), 0);
  const atRisk = status.filter((p) =>
    (!p.discounted && p.urgencyDisplay >= 40) ||
    (p.discounted && p.urgencyDisplay >= 80)
  );
  const lastRun = status.find((p) => p.lastPricingRun)?.lastPricingRun;

  const TABS = [
    { id: 'health', label: 'Product Health', count: status.length },
    { id: 'activity', label: 'Activity Log', count: logs.length },
    { id: 'atrisk', label: 'At Risk', count: atRisk.length },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-8">

        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Pricing Monitor</h1>
            <p className="text-gray-500 mt-1 text-sm">
              Live view of what the dynamic pricing engine is doing
              {lastRun && <span className="ml-2 text-gray-400">· Last run: {formatDate(lastRun)}</span>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={getAiInsights}
              disabled={aiLoading}
              className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-semibold transition disabled:opacity-60"
            >
              <svg className={`w-4 h-4 ${aiLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.344.344a3.014 3.014 0 01-2.121.879H9.88a3.014 3.014 0 01-2.121-.879l-.344-.344z" />
              </svg>
              {aiLoading ? 'Analyzing...' : 'AI Insights'}
            </button>
            <button
              onClick={runEngine}
              disabled={running}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition disabled:opacity-60"
            >
              <svg className={`w-4 h-4 ${running ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {running ? 'Running...' : 'Run Engine Now'}
            </button>
          </div>
        </div>

        {runResult && (
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl mb-6 text-sm font-medium border ${
            runResult.error
              ? 'bg-red-50 text-red-700 border-red-200'
              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
          }`}>
            {runResult.error
              ? '✗ Engine failed — check server logs'
              : `✓ Engine complete — ${runResult.updated} of ${runResult.total} products updated`}
          </div>
        )}

        {aiLoading && (
          <div className="bg-violet-50 border border-violet-200 rounded-2xl p-5 mb-6 flex items-center gap-3">
            <svg className="w-5 h-5 text-violet-500 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-violet-700">Analyzing inventory data...</p>
              <p className="text-xs text-violet-500 mt-0.5">AI is reviewing urgency scores, stock levels, and pricing trends</p>
            </div>
          </div>
        )}

        {aiError && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 flex items-center justify-between">
            <p className="text-red-600 text-sm">{aiError}</p>
            <button onClick={() => setAiError('')} className="text-red-400 hover:text-red-600 text-xs ml-4">Dismiss</button>
          </div>
        )}

        {aiInsight && !aiLoading && (
          <div className="mb-6 space-y-4">
            {/* Header bar */}
            <div className={`rounded-2xl border p-5 ${
              aiInsight.overallHealth === 'critical' ? 'bg-red-50 border-red-200' :
              aiInsight.overallHealth === 'warning' ? 'bg-amber-50 border-amber-200' :
              'bg-emerald-50 border-emerald-200'
            }`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    aiInsight.overallHealth === 'critical' ? 'bg-red-500' :
                    aiInsight.overallHealth === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}>
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.344.344a3.014 3.014 0 01-2.121.879H9.88a3.014 3.014 0 01-2.121-.879l-.344-.344z" />
                    </svg>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-gray-500">AI Analyst · Live Insight</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full capitalize ${
                        aiInsight.overallHealth === 'critical' ? 'bg-red-100 text-red-700' :
                        aiInsight.overallHealth === 'warning' ? 'bg-amber-100 text-amber-700' :
                        'bg-emerald-100 text-emerald-700'
                      }`}>{aiInsight.overallHealth}</span>
                    </div>
                    <p className="font-bold text-gray-900 mt-0.5">{aiInsight.headline}</p>
                  </div>
                </div>
                <button onClick={() => setAiInsight(null)} className="text-gray-400 hover:text-gray-600 shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              {aiInsight.summary && (
                <p className="text-sm text-gray-600 mt-3 leading-relaxed border-t border-black/10 pt-3">{aiInsight.summary}</p>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {aiInsight.criticalItems?.length > 0 && (
                <div className="bg-white rounded-2xl border border-red-200 p-4">
                  <p className="text-xs font-bold text-red-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full inline-block" />
                    Needs Immediate Action
                  </p>
                  <div className="space-y-3">
                    {aiInsight.criticalItems.map((item, i) => (
                      <div key={i} className="border-l-2 border-red-300 pl-3">
                        <p className="text-sm font-semibold text-gray-800 leading-snug">{item.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{item.issue}</p>
                        <p className="text-xs text-red-600 font-medium mt-1">{item.action}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {aiInsight.categoryInsights?.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-200 p-4">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Category Health</p>
                  <div className="space-y-2.5">
                    {aiInsight.categoryInsights.map((cat, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <span className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${
                          cat.status === 'critical' ? 'bg-red-500' :
                          cat.status === 'warning' ? 'bg-amber-400' : 'bg-emerald-500'
                        }`} />
                        <div>
                          <p className="text-xs font-semibold text-gray-700">{cat.category}</p>
                          <p className="text-xs text-gray-400 leading-snug">{cat.note}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {aiInsight.topRecommendations?.length > 0 && (
                <div className="bg-white rounded-2xl border border-violet-200 p-4">
                  <p className="text-xs font-bold text-violet-600 uppercase tracking-wider mb-3">AI Recommendations</p>
                  <div className="space-y-3">
                    {aiInsight.topRecommendations.map((rec, i) => (
                      <div key={i} className="flex gap-2.5">
                        <span className="w-5 h-5 bg-violet-100 text-violet-700 text-xs font-bold rounded-full flex items-center justify-center shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <p className="text-xs text-gray-600 leading-relaxed">{rec}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Products', value: status.length, sub: 'being monitored' },
            { label: 'Currently Discounted', value: discounted.length, sub: `of ${status.length} products`, highlight: discounted.length > 0 },
            { label: 'Total Markdowns Value', value: `$${totalSavings.toFixed(2)}`, sub: 'aggregate savings applied' },
            { label: 'At-Risk Products', value: atRisk.length, sub: 'undiscounted ≥40 or discounted but still ≥80 urgency', warn: atRisk.length > 0 },
          ].map((s) => (
            <div key={s.label} className={`bg-white rounded-2xl border p-5 ${s.warn ? 'border-orange-200' : 'border-gray-200'}`}>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{s.label}</p>
              <p className={`text-3xl font-bold mt-1 ${s.highlight ? 'text-indigo-600' : s.warn ? 'text-orange-500' : 'text-gray-900'}`}>
                {loading ? '—' : s.value}
              </p>
              <p className="text-xs text-gray-400 mt-1">{s.sub}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="flex border-b border-gray-200">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-semibold border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  activeTab === tab.id ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}

            {activeTab === 'activity' && (
              <div className="ml-auto flex items-center gap-1 px-4">
                {PERIODS.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => setPeriod(p.value)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                      period === p.value ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {activeTab === 'health' && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Product</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Category</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Age</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Stock</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-36">Urgency</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Base</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Current</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {status.length === 0 && (
                    <tr><td colSpan={8} className="text-center py-12 text-gray-400">No products found</td></tr>
                  )}
                  {status.map((p) => {
                    const isExpanded = expandedProduct === p._id;
                    const history = priceHistory[p._id];
                    return (
                      <>
                        <tr
                          key={p._id}
                          onClick={() => toggleProductHistory(p._id)}
                          className={`cursor-pointer transition-colors ${isExpanded ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}
                        >
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              {p.images?.[0] ? (
                                <img src={p.images[0]} className="w-9 h-9 rounded-lg object-cover" alt="" />
                              ) : (
                                <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-gray-300 text-sm">?</div>
                              )}
                              <div>
                                <span className="font-medium text-gray-800 truncate max-w-[160px] block">{p.name}</span>
                                <span className="text-xs text-indigo-500">{isExpanded ? 'Hide journey ↑' : 'Price journey ↓'}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-gray-500">{p.category}</td>
                          <td className="px-4 py-3.5"><AgeBadge days={p.daysOld} /></td>
                          <td className="px-4 py-3.5 text-gray-600">{p.stock}</td>
                          <td className="px-4 py-3.5 w-40">
                            <div className="mb-0.5 text-xs text-gray-400">×{p.multiplier}</div>
                            <UrgencyBar score={p.urgencyScore} />
                          </td>
                          <td className="px-4 py-3.5 text-right text-gray-500">${p.basePrice.toFixed(2)}</td>
                          <td className="px-4 py-3.5 text-right font-semibold text-gray-900">${p.currentPrice.toFixed(2)}</td>
                          <td className="px-4 py-3.5 text-center">
                            {p.discounted ? (
                              <span className="text-xs font-semibold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full">
                                -{p.markdownPercent}% off
                              </span>
                            ) : (
                              <span className="text-xs font-medium bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full">
                                Full price
                              </span>
                            )}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr key={`${p._id}-history`} className="bg-indigo-50">
                            <td colSpan={8} className="px-5 py-4">
                              {!history ? (
                                <p className="text-xs text-gray-400">Loading...</p>
                              ) : history.length === 0 ? (
                                <div className="flex items-center gap-6 text-sm">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-gray-400" />
                                    <span className="text-gray-500">Listed at</span>
                                    <span className="font-semibold text-gray-800">${p.basePrice.toFixed(2)}</span>
                                  </div>
                                  <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-indigo-500" />
                                    <span className="text-gray-500">Current</span>
                                    <span className="font-semibold text-indigo-700">${p.currentPrice.toFixed(2)}</span>
                                    <span className="text-xs text-gray-400">(no pricing runs yet)</span>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center gap-3 flex-wrap">
                                  <div className="flex items-center gap-2 text-sm">
                                    <div className="w-2 h-2 rounded-full bg-gray-400 shrink-0" />
                                    <span className="text-gray-500 text-xs">Listed</span>
                                    <span className="font-semibold text-gray-700">${p.basePrice.toFixed(2)}</span>
                                  </div>
                                  {history.map((h, i) => (
                                    <div key={i} className="flex items-center gap-3">
                                      <svg className="w-3 h-3 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                      <div className="flex items-center gap-2 text-sm">
                                        <div className="w-2 h-2 rounded-full bg-orange-400 shrink-0" />
                                        <span className="font-semibold text-gray-700">${h.price.toFixed(2)}</span>
                                        <span className="text-xs text-gray-400">{new Date(h.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                                      </div>
                                    </div>
                                  ))}
                                  <svg className="w-3 h-3 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                  <div className="flex items-center gap-2 text-sm">
                                    <div className="w-2.5 h-2.5 rounded-full bg-indigo-600 shrink-0 ring-2 ring-indigo-200" />
                                    <span className="text-xs text-gray-500">Now</span>
                                    <span className="font-bold text-indigo-700">${p.currentPrice.toFixed(2)}</span>
                                  </div>
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'activity' && (
            <div>
              {logs.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <p className="font-medium">No activity in this period</p>
                  <p className="text-sm mt-1">Run the engine to see events here</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {logs.map((log, i) => (
                    <div key={log._id ?? i} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
                      <div className="shrink-0">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold ${
                          log.markdownPercent >= 30 ? 'bg-red-500' :
                          log.markdownPercent >= 20 ? 'bg-orange-400' :
                          log.markdownPercent >= 10 ? 'bg-yellow-400' : 'bg-emerald-500'
                        }`}>
                          -{Math.round(log.markdownPercent)}%
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-800">{log.productName}</span>
                          <span className="text-xs text-indigo-500 font-medium bg-indigo-50 px-2 py-0.5 rounded-full">{log.category}</span>
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          Age {log.daysOld}d · {log.stock} units · Urgency {Math.round(log.urgencyScore * 100)}/100
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="flex items-center gap-2 justify-end">
                          <span className="text-sm text-gray-400 line-through">${log.oldPrice.toFixed(2)}</span>
                          <svg className="w-3 h-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                          <span className="text-sm font-bold text-gray-900">${log.newPrice.toFixed(2)}</span>
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">{formatDate(log.runDate)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'atrisk' && (
            <div>
              {atRisk.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <p className="font-medium">No at-risk products</p>
                  <p className="text-sm mt-1">Products with urgency ≥ 40 that haven't been discounted yet will appear here</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {atRisk.map((p) => (
                    <div key={p._id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
                      {p.images?.[0] ? (
                        <img src={p.images[0]} className="w-10 h-10 rounded-xl object-cover shrink-0" alt="" />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-gray-100 shrink-0" />
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-800">{p.name}</span>
                          <span className="text-xs text-indigo-500 font-medium bg-indigo-50 px-2 py-0.5 rounded-full">{p.category}</span>
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {p.daysOld} days in stock · {p.stock} units
                        </div>
                      </div>

                      <div className="w-32">
                        <UrgencyBar score={p.urgencyScore} />
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-sm font-bold text-gray-900">${p.currentPrice.toFixed(2)}</div>
                        <div className="text-xs text-orange-500 font-medium mt-0.5">Needs review</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
