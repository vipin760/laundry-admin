import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  Users, 
  Zap, 
  LogOut, 
  Users2,
  Package,
  ChevronRight,
  User,
  MessageCircle
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navGroups = [
    {
      title: 'Main',
      items: [
        { to: '/home', icon: LayoutDashboard, label: 'Dashboard' },
      ]
    },
    {
      title: 'Management',
      items: [
        { to: '/users', icon: Users, label: 'Users' },
        { to: '/services', icon: Zap, label: 'Services' },
      ]
    },
    {
      title: 'Customers',
      items: [
        { to: '/customers', icon: Users2, label: 'Customers' },
      ]
    },
    {
      title: 'Sales',
      items: [
        { to: '/orders', icon: Package, label: 'Orders' },
      ]
    },
    {
      title: 'Support',
      items: [
        { to: '/messages', icon: MessageCircle, label: 'Messages' },
      ]
    }
  ];

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white dark:bg-[#0A0A0A] text-slate-500 dark:text-slate-400 flex flex-col z-50 border-r border-slate-200 dark:border-white/5 transition-colors">
      {/* Brand Header */}
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center">
          <Zap className="text-white w-5 h-5 fill-current" />
        </div>
        <div>
          <h1 className="text-base font-bold text-slate-900 dark:text-white tracking-tight leading-none">
            VeltroxCRM
          </h1>
          <p className="text-[10px] text-slate-500 mt-1">Manage everything in one place</p>
        </div>
      </div>

      {/* Navigation Groups */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-6">
        {navGroups.map((group) => (
          <div key={group.title}>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-600 px-4 mb-2">
              {group.title}
            </p>
            <nav className="space-y-1">
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => `
                    flex items-center justify-between px-4 py-2 rounded-lg transition-all duration-200 group
                    ${isActive 
                      ? 'bg-brand/10 text-brand font-semibold border-l-2 border-brand rounded-l-none -ml-4 pl-8' 
                      : 'hover:text-brand dark:hover:text-white hover:bg-brand/5 dark:hover:bg-white/5 text-slate-500 dark:text-slate-400'
                    }
                  `}
                >
                  {({ isActive }) => (
                    <>
                      <div className="flex items-center gap-3">
                        <item.icon size={18} className={isActive ? 'text-brand' : ''} />
                        <span className="text-sm">{item.label}</span>
                      </div>
                      {isActive && <ChevronRight size={14} className="text-brand" />}
                    </>
                  )}
                </NavLink>
              ))}
            </nav>
          </div>
        ))}
      </div>

      {/* User Profile Section at Bottom */}
      <div className="p-4 border-t border-slate-200 dark:border-white/5 space-y-3">
        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 rounded-full bg-brand/10 dark:bg-brand/20 flex items-center justify-center border border-brand/20 dark:border-brand/30">
            <User size={20} className="text-brand" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-900 dark:text-white truncate capitalize">
              {user?.email.split('@')[0]}
            </p>
            <p className="text-[10px] text-slate-500 truncate">{user?.email}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all duration-200 text-xs font-bold"
        >
          <LogOut size={14} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
