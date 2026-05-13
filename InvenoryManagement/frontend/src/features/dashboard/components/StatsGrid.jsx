import React from 'react';
import { ShoppingCart, Package, AlertTriangle, Truck, TrendingUp } from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, color, prefix = "" }) => (
  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
    <div className={`p-3 rounded-lg ${color}`}>
      <Icon className="w-6 h-6 text-white" />
    </div>
    <div>
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <h3 className="text-2xl font-bold text-slate-900">{prefix}{value}</h3>
    </div>
  </div>
);

export const StatsGrid = ({ summary }) => {
  if (!summary) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <StatCard 
        title="Total Sales" 
        value={Number(summary.totalSalesAmount || 0).toLocaleString()} 
        icon={ShoppingCart} 
        color="bg-blue-500"
        prefix="$"
      />
      <StatCard 
        title="Total Purchases" 
        value={Number(summary.totalPurchaseAmount || 0).toLocaleString()} 
        icon={Package} 
        color="bg-indigo-500"
        prefix="$"
      />
      <StatCard 
        title="Low Stock Items" 
        value={summary.lowStockItemCount || 0} 
        icon={AlertTriangle} 
        color="bg-amber-500"
      />
      <StatCard 
        title="Pending Shipments" 
        value={summary.pendingShipmentCount || 0} 
        icon={Truck} 
        color="bg-emerald-500"
      />
    </div>
  );
};
