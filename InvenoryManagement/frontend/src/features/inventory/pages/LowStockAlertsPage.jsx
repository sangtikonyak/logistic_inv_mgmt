import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  AlertTriangle, 
  ArrowLeft, 
  Search, 
  Filter, 
  Package, 
  ChevronLeft, 
  ChevronRight,
  TrendingDown
} from 'lucide-react';
import { reportingService } from '../../../shared/api/reporting';

export const LowStockAlertsPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ items: [], pagination: {} });
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    warehouseId: ''
  });

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const res = await reportingService.getLowStockReport(filters);
      setData(res.data);
    } catch (error) {
      console.error('Failed to fetch low stock alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [filters.page, filters.limit, filters.warehouseId]);

  return (
    <div className="space-y-6">
      {/* Breadcrumbs & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center text-sm text-slate-500 hover:text-slate-700 mb-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Dashboard
          </button>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center">
            <AlertTriangle className="w-6 h-6 mr-2 text-amber-500" />
            Critical Stock Alerts
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            All items currently below their defined minimum stock levels across your warehouses.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text"
              placeholder="Search products..."
              className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none w-64 shadow-sm"
            />
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Product Information</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Warehouse</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">On Hand</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Available</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Min Level</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Shortage</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={7} className="px-6 py-8 h-16 bg-slate-50/50"></td>
                  </tr>
                ))
              ) : data.items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400 italic">
                    No low stock items found. Your inventory is healthy!
                  </td>
                </tr>
              ) : (
                data.items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="p-2 bg-slate-100 rounded-lg mr-3 text-slate-400 group-hover:bg-amber-50 group-hover:text-amber-500 transition-colors">
                          <Package className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-slate-900 leading-none">{item.productName}</div>
                          {item.variantName && (
                            <div className="text-xs text-slate-500 mt-1">{item.variantName}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-600">{item.warehouseName}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm font-medium text-slate-700">{item.onHandQuantity}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`text-sm font-bold ${item.availableQuantity <= 0 ? 'text-red-600' : 'text-amber-600'}`}>
                        {item.availableQuantity}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm text-slate-500 font-medium">{item.minStockLevel}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end text-red-600 font-bold text-sm">
                        <TrendingDown className="w-3 h-3 mr-1" />
                        {item.shortageQuantity}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Link 
                        to={`/purchases/new?productId=${item.productId}`}
                        className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-md hover:bg-blue-700 transition-colors shadow-sm"
                      >
                        Restock
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data.pagination.totalPages > 1 && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Showing <span className="font-medium text-slate-900">{(filters.page - 1) * filters.limit + 1}</span> to <span className="font-medium text-slate-900">{Math.min(filters.page * filters.limit, data.pagination.total)}</span> of <span className="font-medium text-slate-900">{data.pagination.total}</span> alerts
            </p>
            <div className="flex gap-2">
              <button 
                disabled={filters.page === 1 || loading}
                onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
                className="p-2 border border-slate-200 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button 
                disabled={filters.page === data.pagination.totalPages || loading}
                onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                className="p-2 border border-slate-200 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
