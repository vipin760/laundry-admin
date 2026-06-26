import React, { useState } from 'react';
import { Shield, ShieldOff, MapPin, Phone, Mail, Calendar, ChevronDown } from 'lucide-react';
import { Badge } from './Badge';
import type { UserRole } from '../api/usersApi';

interface UserTableRowProps {
  user: any;
  onBlock: (id: string) => void;
  onUnblock: (id: string) => void;
  onChangeRole: (id: string, role: UserRole) => Promise<void>;
  onManageAddresses: (id: string) => void;
}

const ROLE_LABELS: Record<string, string> = {
  admin:            'Admin',
  user:             'User',
  delivery_partner: 'Delivery Partner',
};

const ROLE_BADGE_VARIANT: Record<string, 'purple' | 'blue' | 'orange'> = {
  admin:            'purple',
  user:             'blue',
  delivery_partner: 'orange',
};

export const UserTableRow: React.FC<UserTableRowProps> = ({
  user, onBlock, onUnblock, onChangeRole, onManageAddresses,
}) => {
  const [roleLoading, setRoleLoading] = useState(false);

  const handleRoleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRole = e.target.value as UserRole;
    if (newRole === user.role) return;
    setRoleLoading(true);
    try {
      await onChangeRole(user._id, newRole);
    } finally {
      setRoleLoading(false);
    }
  };

  const initials = (user.name ?? '?').charAt(0).toUpperCase();
  const isAdmin  = user.role === 'admin';

  return (
    <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">

      {/* User — avatar + name */}
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 h-10 w-10 rounded-xl bg-brand/10 dark:bg-brand/20 flex items-center justify-center text-brand font-black text-sm">
            {initials}
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{user.name ?? '—'}</p>
            <Badge
              text={user.isActive !== false ? 'Active' : 'Blocked'}
              variant={user.isActive !== false ? 'green' : 'red'}
              dot
            />
          </div>
        </div>
      </td>

      {/* Contact — mobile (prominent) + email (secondary) */}
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="space-y-1">
          {/* Mobile — always show; if absent show dash */}
          <div className="flex items-center gap-1.5">
            <Phone size={13} className="text-slate-400 flex-shrink-0" />
            <span className={`text-sm font-bold ${user.mobileNumber ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
              {user.mobileNumber ?? '—'}
            </span>
          </div>
          {/* Email — optional */}
          <div className="flex items-center gap-1.5">
            <Mail size={13} className="text-slate-400 flex-shrink-0" />
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {user.email ?? <span className="italic">No email</span>}
            </span>
          </div>
        </div>
      </td>

      {/* Role — badge + dropdown for non-admin */}
      <td className="px-6 py-4 whitespace-nowrap">
        {isAdmin ? (
          <Badge text="Admin" variant="purple" />
        ) : (
          <div className="relative inline-flex items-center gap-1">
            <select
              value={user.role}
              onChange={handleRoleChange}
              disabled={roleLoading}
              className="appearance-none text-xs font-bold rounded-lg px-3 py-1.5 pr-7 border cursor-pointer
                         bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-100 dark:border-blue-500/20
                         focus:outline-none focus:ring-1 focus:ring-brand transition-all disabled:opacity-50"
            >
              <option value="user">User</option>
              <option value="delivery_partner">Delivery Partner</option>
            </select>
            <ChevronDown size={12} className="absolute right-2 pointer-events-none text-blue-500" />
            {roleLoading && (
              <span className="ml-1 w-3 h-3 border-2 border-brand border-t-transparent rounded-full animate-spin" />
            )}
          </div>
        )}
      </td>

      {/* Joined */}
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <Calendar size={13} className="text-slate-400" />
          {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}
        </div>
      </td>

      {/* Status badge (redundant with inline above but kept for scannability) */}
      <td className="px-6 py-4 whitespace-nowrap">
        <Badge
          text={user.isActive !== false ? 'Active' : 'Blocked'}
          variant={user.isActive !== false ? 'green' : 'red'}
          dot
        />
      </td>

      {/* Actions */}
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center gap-2">
          {user.isActive !== false ? (
            <button
              onClick={() => onBlock(user._id)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-lg text-xs font-bold hover:bg-red-100 dark:hover:bg-red-500/20 transition-all border border-red-100 dark:border-red-500/20"
            >
              <ShieldOff size={13} />
              Block
            </button>
          ) : (
            <button
              onClick={() => onUnblock(user._id)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-all border border-emerald-100 dark:border-emerald-500/20"
            >
              <Shield size={13} />
              Unblock
            </button>
          )}
          <button
            onClick={() => onManageAddresses(user._id)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-bold hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-all border border-indigo-100 dark:border-indigo-500/20"
          >
            <MapPin size={13} />
            Addresses
          </button>
        </div>
      </td>
    </tr>
  );
};
