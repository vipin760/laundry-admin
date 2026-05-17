import React from 'react';
import { Shield, ShieldOff, MoreVertical, Mail, Calendar } from 'lucide-react';
import { Badge } from './Badge';

interface UserTableRowProps {
  user: any;
  onBlock: (id: string) => void;
  onUnblock: (id: string) => void;
}

export const UserTableRow: React.FC<UserTableRowProps> = ({ user, onBlock, onUnblock }) => {
  return (
    <tr className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
      <td className="px-6 py-5 whitespace-nowrap">
        <div className="flex items-center">
          <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-brand/10 dark:bg-brand/20 flex items-center justify-center text-brand font-bold">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="ml-4">
            <div className="text-sm font-bold text-slate-900 dark:text-white">{user.name}</div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              <Mail size={12} />
              {user.email}
            </div>
          </div>
        </div>
      </td>
      <td className="px-6 py-5 whitespace-nowrap">
        <Badge 
          text={user.role || 'User'} 
          variant={user.role === 'admin' ? 'purple' : 'blue'} 
        />
      </td>
      <td className="px-6 py-5 whitespace-nowrap">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <Calendar size={14} className="text-slate-400" />
          {new Date(user.createdAt).toLocaleDateString()}
        </div>
      </td>
      <td className="px-6 py-5 whitespace-nowrap">
        <Badge 
          text={user.isActive !== false ? 'Active' : 'Blocked'} 
          variant={user.isActive !== false ? 'green' : 'red'} 
          dot 
        />
      </td>
      <td className="px-6 py-5 whitespace-nowrap text-sm font-medium">
        <div className="flex items-center gap-2">
          {user.isActive !== false ? (
            <button 
              onClick={() => onBlock(user._id)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-lg text-xs font-bold hover:bg-red-100 dark:hover:bg-red-500/20 transition-all border border-red-100 dark:border-red-500/20"
            >
              <ShieldOff size={14} />
              Block
            </button>
          ) : (
            <button 
              onClick={() => onUnblock(user._id)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-all border border-emerald-100 dark:border-emerald-500/20"
            >
              <Shield size={14} />
              Unblock
            </button>
          )}
          <button className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg">
            <MoreVertical size={16} />
          </button>
        </div>
      </td>
    </tr>
  );
};
