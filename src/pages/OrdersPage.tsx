import React, { useEffect, useState } from 'react';
import { AdminLayout } from '../layouts/AdminLayout';
import { useOrdersStore } from '../store/useOrdersStore';
import { OrderTableRow } from '../components/OrderTableRow';
import { Search, Filter, Loader2, PackageX, FileText, ChevronLeft, ChevronRight } from 'lucide-react';

export const OrdersPage: React.FC = () => {
  const { orders, total, isLoading, error, fetchOrders, updateStatus } = useOrdersStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(10);

  useEffect(() => {
    fetchOrders({ page: currentPage, limit });
  }, [fetchOrders, currentPage, limit]);

  const filteredOrders = orders.filter(order => 
    order._id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(total / limit);

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Order Management</h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">Track and update customer laundry orders</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 group-focus-within:text-brand transition-colors" />
            <input
              type="text"
              placeholder="Search by Order ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-white dark:bg-[#1A1A1A] border border-slate-200 dark:border-white/5 rounded-xl w-full md:w-64 focus:ring-1 focus:ring-brand focus:outline-none transition-all shadow-sm text-sm"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-white/5 text-slate-600 dark:text-slate-200 text-sm font-bold border border-slate-200 dark:border-white/5 rounded-xl hover:bg-slate-50 transition-all">
            <Filter size={18} />
            <span>Filter</span>
          </button>
          <button className="btn-brand text-sm whitespace-nowrap">
            <FileText size={18} />
            <span>Reports</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-8 p-4 bg-red-50 dark:bg-red-500/10 text-red-600 border border-red-100 dark:border-red-500/20 rounded-xl font-semibold text-sm">
          {error}
        </div>
      )}

      {/* Orders Table */}
      <div className="premium-card !p-0 overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/5">
                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Order ID & Date</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Services</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest pr-10">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-white/5">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <Loader2 className="w-8 h-8 text-brand animate-spin" />
                      <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Loading Orders...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-24 text-center">
                    <div className="flex flex-col items-center gap-4 text-slate-400">
                      <PackageX size={48} className="opacity-20" />
                      <p className="text-sm font-medium">No orders found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <OrderTableRow 
                    key={order._id} 
                    order={order} 
                    onUpdateStatus={updateStatus}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      {!isLoading && total > limit && (
        <div className="flex items-center justify-between px-2">
          <p className="text-xs text-slate-500 font-medium">
            Showing <span className="font-bold text-slate-700 dark:text-slate-300">{(currentPage - 1) * limit + 1}</span> to <span className="font-bold text-slate-700 dark:text-slate-300">{Math.min(currentPage * limit, total)}</span> of <span className="font-bold text-slate-700 dark:text-slate-300">{total}</span> orders
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-slate-200 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 disabled:opacity-30 transition-all"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="flex items-center gap-1">
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`w-8 h-8 rounded-lg text-xs font-bold transition-all
                    ${currentPage === i + 1 
                      ? 'bg-brand text-white shadow-lg shadow-brand/20' 
                      : 'hover:bg-slate-50 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400'}
                  `}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border border-slate-200 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 disabled:opacity-30 transition-all"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};
