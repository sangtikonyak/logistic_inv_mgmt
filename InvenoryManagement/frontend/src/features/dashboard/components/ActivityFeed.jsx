import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { History, User, Tag, ShoppingCart, Package, RefreshCw, Warehouse, RotateCcw } from 'lucide-react';

const getModuleIcon = (module) => {
  switch (module?.toUpperCase()) {
    case 'SALES': return ShoppingCart;
    case 'PURCHASE': return Package;
    case 'INVENTORY': return RefreshCw;
    case 'PRODUCT': return Tag;
    case 'WAREHOUSE': return Warehouse;
    case 'RETURNS': return RotateCcw;
    default: return History;
  }
};

const getModuleColor = (module) => {
  switch (module?.toUpperCase()) {
    case 'SALES': return 'text-blue-500 bg-blue-50';
    case 'PURCHASE': return 'text-indigo-500 bg-indigo-50';
    case 'INVENTORY': return 'text-emerald-500 bg-emerald-50';
    case 'PRODUCT': return 'text-amber-500 bg-amber-50';
    case 'WAREHOUSE': return 'text-purple-500 bg-purple-50';
    case 'RETURNS': return 'text-rose-500 bg-rose-50';
    default: return 'text-slate-500 bg-slate-50';
  }
};

export const ActivityFeed = ({ activities }) => {
  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-full flex flex-col">
      <h3 className="text-lg font-semibold text-slate-900 mb-6 flex items-center">
        <History className="w-5 h-5 mr-2 text-slate-400" />
        Latest Activity
      </h3>
      
      {!activities || activities.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-slate-400 text-sm italic">
          No recent activity found.
        </div>
      ) : (
        <div className="space-y-6 overflow-y-auto pr-2">
          {activities.map((activity) => {
            const Icon = getModuleIcon(activity.module);
            const colorClass = getModuleColor(activity.module);
            
            return (
              <div key={activity.id} className="flex space-x-4">
                <div className={`flex-shrink-0 p-2 rounded-lg h-fit ${colorClass}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-900 leading-snug">
                    {activity.description}
                  </p>
                  <div className="mt-1 flex items-center text-xs text-slate-400 space-x-2">
                    <span className="flex items-center">
                      <User className="w-3 h-3 mr-1" />
                      {activity.userEmail || 'System'}
                    </span>
                    <span>•</span>
                    <span>{formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
