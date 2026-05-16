import React from 'react';
import { AdminLayout } from '../layouts/AdminLayout';
import { 
  Users, 
  UserPlus, 
  UserCheck, 
  CalendarClock, 
  UserMinus,
  MessageSquare,
  Phone,
  Zap
} from 'lucide-react';
import { motion } from 'framer-motion';

export const HomePage: React.FC = () => {
  const stats = [
    { label: 'Total Customers', value: '13', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-500/10' },
    { label: 'New This Month', value: '2', icon: UserPlus, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
    { label: 'Active', value: '11', icon: UserCheck, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
    { label: 'Upcoming Follow-ups', value: '1', icon: CalendarClock, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-500/10' },
    { label: 'Inactive', value: '2', icon: UserMinus, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-500/10' },
  ];

  return (
    <AdminLayout>
      {/* Page Title */}
      <div className="mb-10">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">CRM Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Overview of your customer relationships</p>
      </div>

      {/* Stats Action Row */}
      <div className="flex items-center justify-end gap-3 mb-8">
        <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-white/5 text-slate-600 dark:text-slate-200 text-sm font-bold border border-slate-200 dark:border-white/5 rounded-lg hover:bg-slate-50 transition-all">
          <MessageSquare size={16} />
          <span>Customers</span>
        </button>
        <button className="flex items-center gap-2 px-4 py-2 bg-brand text-white text-sm font-bold rounded-lg hover:bg-brand-hover transition-all shadow-lg shadow-brand/20">
          <Phone size={16} />
          <span>Contacts</span>
        </button>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6 mb-10">
        {stats.map((stat, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="premium-card !p-5 flex items-center gap-4 group hover:border-brand/30 transition-all"
          >
            <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
              <stat.icon size={22} />
            </div>
            <div>
              <p className="text-slate-400 text-xs font-medium mb-1">{stat.label}</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white leading-none">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="premium-card h-full min-h-[450px]">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Customer Growth (Last 12 Months)</h2>
            </div>
            {/* Chart Placeholder */}
            <div className="h-64 flex items-end justify-between px-4 mt-20">
              {['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May'].map((month, i) => (
                <div key={i} className="flex flex-col items-center gap-4">
                  <div className="w-2 h-2 rounded-full bg-emerald-500/20 group-hover:bg-emerald-500 transition-all" />
                  <span className="text-[10px] font-bold text-slate-400">{month}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-8 px-4">
              <div className="w-3 h-3 bg-emerald-500 rounded-sm"></div>
              <span className="text-[11px] font-bold text-slate-500">New Customers</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="premium-card h-full min-h-[450px]">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Customers by Source</h2>
            </div>
            
            {/* Donut Chart Placeholder */}
            <div className="relative w-56 h-56 mx-auto mt-10">
              <div className="absolute inset-0 rounded-full border-[18px] border-slate-100 dark:border-white/5"></div>
              {/* Fake segments */}
              <div className="absolute inset-0 rounded-full border-[18px] border-brand border-l-transparent border-b-transparent border-r-transparent transform -rotate-45"></div>
              <div className="absolute inset-0 rounded-full border-[18px] border-emerald-500 border-t-transparent border-r-transparent border-b-transparent transform rotate-90"></div>
              
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-black text-slate-900 dark:text-white">11</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total</span>
              </div>
            </div>

            <div className="mt-12 space-y-3">
              {[
                { label: 'Cold Call', color: 'bg-emerald-500', value: '25%' },
                { label: 'Direct', color: 'bg-brand', value: '45%' },
                { label: 'Partner', color: 'bg-amber-500', value: '20%' },
                { label: 'Referral', color: 'bg-indigo-500', value: '10%' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-sm ${item.color}`}></div>
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{item.label}</span>
                  </div>
                  <span className="text-xs font-black text-slate-900 dark:text-white">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Button Placeholder matching bottom right of screenshot */}
      <div className="fixed bottom-10 right-10 z-50">
        <button className="w-14 h-14 bg-brand text-white rounded-full flex items-center justify-center shadow-xl shadow-brand/40 hover:scale-110 transition-all">
          <Zap size={24} className="fill-current" />
        </button>
      </div>
    </AdminLayout>
  );
};
