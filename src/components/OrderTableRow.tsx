import React, { useState } from 'react';
import { Package, Clock, CheckCircle2, Truck, AlertCircle, ChevronDown, MoreVertical, PackageCheck } from 'lucide-react';
import type { Order, OrderStatus } from '../api/ordersApi';

interface OrderTableRowProps {
  order: Order;
  onUpdateStatus: (id: string, status: OrderStatus) => void;
}

export const OrderTableRow: React.FC<OrderTableRowProps> = ({ order, onUpdateStatus }) => {
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  const statusOptions: OrderStatus[] = [
    'ORDER_PLACED', 
    'PICKUP_ASSIGNED', 
    'PROCESSING', 
    'OUT_FOR_DELIVERY', 
    'COMPLETED', 
    'CANCELLED'
  ];

  const formatStatus = (status: string) => {
    return status.split('_').map(word => word.charAt(0) + word.slice(1).toLowerCase()).join(' ');
  };

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case 'ORDER_PLACED': return <PackageCheck size={14} className="text-blue-500" />;
      case 'PICKUP_ASSIGNED': return <Clock size={14} className="text-amber-500" />;
      case 'PROCESSING': return <Clock size={14} className="text-indigo-500" />;
      case 'OUT_FOR_DELIVERY': return <Truck size={14} className="text-purple-500" />;
      case 'COMPLETED': return <CheckCircle2 size={14} className="text-emerald-500" />;
      case 'CANCELLED': return <AlertCircle size={14} className="text-red-500" />;
      default: return null;
    }
  };

  return (
    <tr className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
      <td className="px-6 py-5 whitespace-nowrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center text-brand">
            <Package size={20} />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight">
              #{order._id.slice(-6)}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
              {new Date(order.createdAt).toLocaleString()}
            </div>
          </div>
        </div>
      </td>
      <td className="px-6 py-5 whitespace-nowrap">
        <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
          {order.items.length} {order.items.length === 1 ? 'Service' : 'Services'}
        </div>
        <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-[150px]">
          {order.items.map(i => i.serviceName || i.name || 'Laundry').join(', ')}
        </div>
      </td>
      <td className="px-6 py-5 whitespace-nowrap">
        <div className="text-sm font-black text-slate-900 dark:text-white">
          ${order.totalAmount.toFixed(2)}
        </div>
        <div className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest mt-0.5">
          {order.paymentStatus}
        </div>
      </td>
      <td className="px-6 py-5 whitespace-nowrap relative">
        <button 
          onClick={() => setShowStatusMenu(!showStatusMenu)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 hover:border-brand transition-all group/status"
        >
          <div className="flex items-center gap-2">
            {getStatusIcon(order.status)}
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
              {formatStatus(order.status)}
            </span>
          </div>
          <ChevronDown size={14} className={`text-slate-400 group-hover/status:text-brand transition-transform ${showStatusMenu ? 'rotate-180' : ''}`} />
        </button>

        {/* Status Dropdown */}
        {showStatusMenu && (
          <div className="absolute left-6 top-16 w-52 bg-white dark:bg-[#1A1A1A] border border-slate-200 dark:border-white/10 rounded-xl shadow-xl z-50 overflow-hidden py-1">
            {statusOptions.map((opt) => (
              <button
                key={opt}
                onClick={() => {
                  onUpdateStatus(order._id, opt);
                  setShowStatusMenu(false);
                }}
                className={`w-full px-4 py-2 text-left text-xs font-bold hover:bg-slate-50 dark:hover:bg-white/5 transition-colors flex items-center gap-3
                  ${order.status === opt ? 'text-brand bg-brand/5' : 'text-slate-600 dark:text-slate-400'}
                `}
              >
                {getStatusIcon(opt)}
                {formatStatus(opt)}
              </button>
            ))}
          </div>
        )}
      </td>
      <td className="px-6 py-5 whitespace-nowrap text-right">
        <button className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg">
          <MoreVertical size={16} />
        </button>
      </td>
    </tr>
  );
};
