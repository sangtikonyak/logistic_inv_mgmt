import React from 'react';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const InventoryAlerts = ({ lowStockItems }) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-slate-900 flex items-center">
          <AlertTriangle className="w-5 h-5 mr-2 text-amber-500" />
          Low Stock Alerts
        </h3>
        <Link 
          to="/app/inventory/alerts" 
          className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center"
        >
          View All <ArrowRight className="w-4 h-4 ml-1" />
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto">
        {!lowStockItems || lowStockItems.length === 0 ? (
          <div className="h-full flex items-center justify-center p-8 text-slate-400 text-sm italic text-center">
            All items are above their minimum stock levels. Good job!
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
              <tr>
                <th className="px-6 py-3">Product</th>
                <th className="px-6 py-3">In Stock</th>
                <th className="px-6 py-3">Min Level</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lowStockItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-slate-900">{item.productName}</div>
                    {item.variantName && (
                      <div className="text-xs text-slate-500">{item.variantName}</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-red-50 text-red-700">
                      {item.availableQuantity}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {item.minStockLevel}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
