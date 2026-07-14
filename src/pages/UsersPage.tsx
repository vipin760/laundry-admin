import React, { useEffect, useState } from 'react';
import { AdminLayout } from '../layouts/AdminLayout';
import { useUsersStore } from '../store/useUsersStore';
import { UserTableRow } from '../components/UserTableRow';
import { UserAddressModal } from '../components/UserAddressModal';
import { Search, Loader2, Users } from 'lucide-react';

export const UsersPage: React.FC = () => {
  const {
    users, isLoading, error, fetchUsers, blockUser, unblockUser, changeRole,
    addressModalUserId, openAddressModal,
  } = useUsersStore();
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const q = searchTerm.toLowerCase().trim();
  const filteredUsers = users.filter(user => {
    if (!q) return true;
    const name   = (user.name         ?? '').toLowerCase();
    const email  = (user.email        ?? '').toLowerCase();
    const mobile = (user.mobileNumber ?? '').toLowerCase();
    return name.includes(q) || email.includes(q) || mobile.includes(q);
  });

  const addressModalUser = users.find((u) => u._id === addressModalUserId);

  const totalUsers       = users.length;
  const activeUsers      = users.filter(u => !u.isDeleted && u.accountStatus !== 'DELETED' && u.isActive !== false).length;
  const deliveryPartners = users.filter(u => u.role === 'delivery_partner').length;

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">User Management</h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">View, search and manage all registered users</p>
        </div>

        <div className="relative group w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 group-focus-within:text-brand transition-colors" />
          <input
            type="text"
            placeholder="Search by name, email or mobile…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2.5 bg-white dark:bg-[#1A1A1A] border border-slate-200 dark:border-white/5 rounded-xl w-full focus:ring-1 focus:ring-brand focus:outline-none transition-all shadow-sm text-sm"
          />
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total Users',       value: totalUsers,       color: 'text-brand',       bg: 'bg-blue-50 dark:bg-blue-500/10' },
          { label: 'Active',            value: activeUsers,      color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
          { label: 'Delivery Partners', value: deliveryPartners, color: 'text-violet-600',  bg: 'bg-violet-50 dark:bg-violet-500/10' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-2xl px-5 py-4`}>
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-500/10 text-red-600 border border-red-100 dark:border-red-500/20 rounded-xl font-semibold text-sm">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="premium-card !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/5">
                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">User</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Contact</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Role</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Joined</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-white/5">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <Loader2 className="w-8 h-8 text-brand animate-spin" />
                      <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Loading Users…</p>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-24 text-center">
                    <div className="flex flex-col items-center gap-4 text-slate-400">
                      <Users size={48} className="opacity-20" />
                      <p className="text-sm font-medium">
                        {searchTerm ? `No users matching "${searchTerm}"` : 'No users found'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <UserTableRow
                    key={user._id}
                    user={user}
                    onBlock={blockUser}
                    onUnblock={unblockUser}
                    onChangeRole={changeRole}
                    onManageAddresses={openAddressModal}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {!isLoading && filteredUsers.length > 0 && (
          <div className="px-6 py-3 border-t border-slate-100 dark:border-white/5 text-xs text-slate-400 font-medium">
            Showing {filteredUsers.length} of {totalUsers} users
          </div>
        )}
      </div>

      {addressModalUserId && (
        <UserAddressModal userName={addressModalUser?.name ?? 'User'} />
      )}
    </AdminLayout>
  );
};
