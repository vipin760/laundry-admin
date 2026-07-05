import React from 'react';
import {
  Search,
  Moon,
  Sun,
  Globe,
  ChevronDown,
  LayoutGrid
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { NotificationBell } from './NotificationBell';

export const Navbar: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-white/80 dark:bg-[#0C0C0C]/80 backdrop-blur-md border-b border-slate-200 dark:border-white/5 px-8 py-3 flex items-center justify-between transition-colors">
      <div className="flex items-center gap-4">
        <button className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 lg:hidden">
          <LayoutGrid size={20} />
        </button>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-400">Dashboard</span>
        </div>
      </div>

      <div className="flex items-center gap-6">
        {/* Search Bar */}
        <div className="hidden md:flex items-center gap-2 bg-slate-100 dark:bg-white/5 px-4 py-2 rounded-lg border border-transparent focus-within:border-brand transition-all w-64 group">
          <Search size={16} className="text-slate-400 group-focus-within:text-brand" />
          <input 
            type="text" 
            placeholder="Search menus" 
            className="bg-transparent border-none outline-none text-xs w-full dark:text-white"
          />
          <span className="text-[10px] bg-white dark:bg-white/10 px-1.5 py-0.5 rounded text-slate-400 border border-slate-200 dark:border-white/10">Ctrl K</span>
        </div>

        {/* Action Icons */}
        <div className="flex items-center gap-4 border-r border-slate-200 dark:border-white/10 pr-6">
          <button className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-white/5 px-3 py-1.5 rounded-lg hover:bg-slate-200 transition-all">
            <Globe size={14} />
            <span>US English</span>
            <ChevronDown size={14} />
          </button>
          
          <button 
            onClick={toggleTheme}
            className="p-2 text-slate-400 hover:text-brand transition-colors"
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>

          <NotificationBell />
        </div>

        {/* User Profile */}
        <div className="flex items-center gap-3 cursor-pointer group">
          <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center text-white font-bold text-xs">
            {user?.email.charAt(0).toUpperCase()}
          </div>
          <div className="hidden sm:block">
            <div className="flex items-center gap-1">
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200 capitalize">
                {user?.email.split('@')[0]}
              </span>
              <ChevronDown size={14} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
