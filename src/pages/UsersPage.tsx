import React, { useEffect, useRef, useState } from 'react';
import { AdminLayout } from '../layouts/AdminLayout';
import { TableFooter } from '../components/TableFooter';
import { useUsersStore } from '../store/useUsersStore';
import { UserTableRow } from '../components/UserTableRow';
import { UserAddressModal } from '../components/UserAddressModal';
import { UserEditModal } from '../components/UserEditModal';
import { Search, Loader2, Users } from 'lucide-react';

export const UsersPage: React.FC = () => {
  const {
    users, isLoading, error, fetchUsers, blockUser, unblockUser, changeRole,
    addressModalUserId, openAddressModal,
    editUserId, openEditUser,
    page, limit, total, totalPages, stats,
  } = useUsersStore();
  const [searchTerm, setSearchTerm] = useState('');
  const firstRun = useRef(true);

  // Initial load + debounced server-side search (always back to page 1).
  useEffect(() => {
    const delay = firstRun.current ? 0 : 350;
    firstRun.current = false;
    const t = setTimeout(() => { void fetchUsers({ page: 1, search: searchTerm }); }, delay);
    return () => clearTimeout(t);
  }, [searchTerm, fetchUsers]);

  const goTo = (p: number) => { void fetchUsers({ page: Math.min(Math.max(1, p), totalPages) }); };

  const addressModalUser = users.find((u) => u._id === addressModalUserId);
  const editModalUser = users.find((u) => u._id === editUserId);


  return (
    <AdminLayout>
      {/* Header: title · counts · search (counts drop to their own row on small screens) */}
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4 mb-8">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">User Management</h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">View, search and manage all registered users</p>
        </div>

        <div className="order-3 xl:order-2 w-full xl:w-auto grid grid-cols-3 gap-2 sm:gap-3">
          {[
            { label: 'Total Users',       value: stats.totalUsers,       color: 'text-brand',       bg: 'bg-blue-50 dark:bg-blue-500/10' },
            { label: 'Active',            value: stats.activeUsers,      color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
            { label: 'Delivery Partners', value: stats.deliveryPartners, color: 'text-violet-600',  bg: 'bg-violet-50 dark:bg-violet-500/10' },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-xl px-3 sm:px-4 py-2 min-w-0 xl:min-w-[110px] text-center xl:text-left`}>
              <p className={`text-lg sm:text-xl font-black leading-tight tabular-nums ${s.color}`}>{s.value}</p>
              <p className="text-[10px] sm:text-xs font-semibold text-slate-500 truncate">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="order-2 xl:order-3 relative group w-full md:w-80">
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
              ) : users.length === 0 ? (
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
                users.map((user) => (
                  <UserTableRow
                    key={user._id}
                    user={user}
                    onBlock={blockUser}
                    onUnblock={unblockUser}
                    onChangeRole={changeRole}
                    onManageAddresses={openAddressModal}
                    onEditProfile={openEditUser}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {!isLoading && (
          <TableFooter page={page} totalPages={totalPages} total={total} limit={limit} itemLabel="users"
            onPage={goTo} onLimit={(n) => void fetchUsers({ page: 1, limit: n })} />
        )}
      </div>

      {addressModalUserId && (
        <UserAddressModal userName={addressModalUser?.name ?? 'User'} />
      )}

      {editUserId && <UserEditModal user={editModalUser} />}
    </AdminLayout>
  );
};
