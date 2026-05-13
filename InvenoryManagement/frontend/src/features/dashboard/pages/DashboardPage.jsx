import React, { useState, useEffect } from 'react';
import { subDays, format } from 'date-fns';
import { Calendar, RefreshCcw, Download } from 'lucide-react';
import { reportingService } from '../../../shared/api/reporting';
import { StatsGrid } from '../components/StatsGrid';
import { PerformanceChart } from '../components/PerformanceChart';
import { ActivityFeed } from '../components/ActivityFeed';
import { InventoryAlerts } from '../components/InventoryAlerts';
import { useAuth } from '../../../app/providers/AuthProvider.jsx';

export const DashboardPage = () => {
  const { session } = useAuth();
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState(null);
  const [trend, setTrend] = useState([]);
  const [activities, setActivities] = useState([]);
  const [lowStock, setLowStock] = useState([]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const filters = { dateFrom, dateTo };

      const [summaryRes, trendRes, activitiesRes, lowStockRes] = await Promise.all([
        reportingService.getDashboardSummary(filters),
        reportingService.getSalesTrend({ ...filters, groupBy: 'day' }),
        reportingService.getDashboardActivities(),
        reportingService.getLowStock(5)
      ]);

      setSummary(summaryRes.data.summary);
      setTrend(trendRes.data.series);
      setActivities(activitiesRes.data);
      setLowStock(lowStockRes.data.items);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError(err.message || 'An error occurred while loading dashboard data.');
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    fetchData();
  }, [dateFrom, dateTo]);

  return (
    <div className="space-y-8">
      {/* Header & Filters */}
      <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Overview</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Inventory Command Center</h1>
          <p className="mt-1 text-sm text-slate-500">
            Welcome back, {session?.user?.email ?? 'operator'}. Here's what's happening across your modules.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-sm">
            <Calendar className="w-4 h-4 text-slate-400 mr-2" />
            <input 
              type="date" 
              value={dateFrom} 
              onChange={(e) => setDateFrom(e.target.value)}
              className="border-none focus:ring-0 text-sm text-slate-600 font-medium cursor-pointer p-0 w-32"
            />
            <span className="text-slate-300 mx-2 text-sm">to</span>
            <input 
              type="date" 
              value={dateTo} 
              onChange={(e) => setDateTo(e.target.value)}
              className="border-none focus:ring-0 text-sm text-slate-600 font-medium cursor-pointer p-0 w-32"
            />
          </div>
          
          <button 
            onClick={fetchData}
            className="p-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors shadow-sm"
            disabled={loading}
            title="Refresh data"
          >
            <RefreshCcw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button className="flex items-center px-4 py-2.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors text-sm font-medium shadow-sm">
            <Download className="w-4 h-4 mr-2" />
            Export Snapshot
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center mb-6">
          <AlertTriangle className="w-5 h-5 mr-3 shrink-0" />
          <p className="text-sm font-medium">{error}</p>
          <button 
            onClick={fetchData} 
            className="ml-auto bg-red-100 hover:bg-red-200 px-3 py-1 rounded text-xs font-bold transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {loading && !summary ? (
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <StatsGrid summary={summary} />

          {/* Charts & Alerts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <PerformanceChart data={trend} />
            </div>
            <div className="lg:col-span-1">
              <InventoryAlerts lowStockItems={lowStock} />
            </div>
          </div>

          {/* Activity Feed */}
          <div className="grid grid-cols-1 gap-8">
            <div className="h-[450px]">
              <ActivityFeed activities={activities} />
            </div>
          </div>
        </>
      )}
    </div>
  );
};
