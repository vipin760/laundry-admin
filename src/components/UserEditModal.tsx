import React, { useEffect, useState } from 'react';
import { X, Loader2, CheckCircle2, UserCog } from 'lucide-react';
import { useUsersStore } from '../store/useUsersStore';
import type { User } from '../api/usersApi';

/**
 * Admin edit of a user's core profile fields (name / email / mobile).
 * Mirrors UserAddressModal's shell/conventions but is a single flat form —
 * there's no list/add/edit sub-mode here, just one user at a time.
 */
export const UserEditModal: React.FC<{ user: User | undefined }> = ({ user }) => {
  const { editUserId, editUserSaving, editUserError, closeEditUser, updateUser } = useUsersStore();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');

  // Re-seed the form whenever the modal opens for a (possibly different) user.
  useEffect(() => {
    if (editUserId && user) {
      setName(user.name ?? '');
      setEmail(user.email ?? '');
      setMobileNumber(user.mobileNumber ?? '');
    }
  }, [editUserId, user]);

  if (!editUserId) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateUser({
      name: name.trim(),
      email: email.trim() || undefined,
      mobileNumber: mobileNumber.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white dark:bg-[#141414] rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-white/5">
          <div className="flex items-center gap-2">
            <UserCog size={16} className="text-brand" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Edit Profile</h2>
          </div>
          <button
            onClick={closeEditUser}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {editUserError && (
            <div className="p-3 bg-red-50 dark:bg-red-500/10 text-red-600 text-sm rounded-xl border border-red-100 dark:border-red-500/20">
              {editUserError}
            </div>
          )}

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1A1A1A] focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1A1A1A] focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">
              Mobile Number
            </label>
            <input
              type="tel"
              value={mobileNumber}
              onChange={(e) => setMobileNumber(e.target.value)}
              placeholder="+91XXXXXXXXXX"
              className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1A1A1A] focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={closeEditUser}
              className="px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-white/5 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={editUserSaving}
              className="px-4 py-2 text-sm font-bold text-white bg-brand rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center gap-2 transition-all"
            >
              {editUserSaving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
