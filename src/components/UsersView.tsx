import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Users, 
  UserPlus, 
  Trash2, 
  ShieldCheck, 
  KeyRound, 
  CheckCircle2, 
  AlertCircle,
  Eye,
  EyeOff,
  Flame,
  Layers,
  Sparkles
} from 'lucide-react';
import { User } from '../types';

interface UsersViewProps {
  usersList: User[];
  onAddUser: (u: Partial<User> & { password?: string }) => Promise<void>;
  onDeleteUser: (id: number) => Promise<void>;
  onToggleUserPermission: (userId: number, field: 'system_access' | 'price_access' | 'role', value: any) => Promise<void>;
  userFormMsg: { type: 'success' | 'error'; text: string } | null;
  lang: 'fa' | 'en';
}

export const UsersView: React.FC<UsersViewProps> = ({
  usersList,
  onAddUser,
  onDeleteUser,
  onToggleUserPermission,
  userFormMsg,
  lang
}) => {
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'manager' | 'user'>('user');
  const [newSystemAccess, setNewSystemAccess] = useState<'alarm' | 'fighting' | 'both'>('both');
  const [newPriceAccess, setNewPriceAccess] = useState<number>(1);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername || !newPassword) return;

    await onAddUser({
      username: newUsername,
      password: newPassword,
      role: newRole,
      system_access: newSystemAccess,
      price_access: newPriceAccess
    });

    setNewUsername('');
    setNewPassword('');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
      dir={lang === 'fa' ? 'rtl' : 'ltr'}
    >
      {/* Header */}
      <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
        <Users className="w-5 h-5 text-blue-600" />
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            {lang === 'fa' ? 'مدیریت کاربران و سطوح دسترسی' : 'User & Permission Management'}
          </h2>
          <p className="text-xs text-slate-500">
            {lang === 'fa' ? 'تعریف کارشناسان جدید، کنترل دسترسی به قیمت‌ها و سیستم‌های اعلام/اطفاء' : 'Define users, manage financial clearance and system permissions'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* New User Creation Card */}
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <UserPlus className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">
              {lang === 'fa' ? 'تعریف کاربر جدید' : 'Create New User'}
            </h3>
          </div>

          <form onSubmit={handleCreateUser} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === 'fa' ? 'نام کاربری *' : 'Username *'}
              </label>
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="eng_reza"
                className="w-full custom-input px-3 py-2 text-xs text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === 'fa' ? 'رمز عبور *' : 'Password *'}
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full custom-input px-3 py-2 text-xs text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === 'fa' ? 'سطح دسترسی و نقش کاربری' : 'Role & Access Level'}
              </label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as any)}
                className="w-full custom-input px-3 py-2 text-xs text-slate-800 cursor-pointer"
              >
                <option value="user">
                  {lang === 'fa' ? 'کارشناس (صرفاً ورود اطلاعات و خواندن)' : 'Expert (Read & Insert Only)'}
                </option>
                <option value="manager">
                  {lang === 'fa' ? 'مدیر (ورود اطلاعات و تغییر در محتوا)' : 'Manager (Read, Insert & Edit Content)'}
                </option>
                <option value="admin">
                  {lang === 'fa' ? 'ادمین (دسترسی کامل به تمام تنظیمات و مرکز توسعه)' : 'Admin (Full Access & Settings)'}
                </option>
              </select>
              <p className="text-[10px] text-slate-500 mt-1">
                {newRole === 'admin' 
                  ? (lang === 'fa' ? 'دسترسی کامل به تمام تنظیمات، کنسول توسعه و مدیریت کاربران.' : 'Full access to all settings, Dev Console, and user management.')
                  : newRole === 'manager'
                    ? (lang === 'fa' ? 'مجاز به ورود اطلاعات، ویرایش و تغییر در محتوا بدون دسترسی به تنظیمات ادمین.' : 'Authorized to input, edit and modify content without access to admin settings.')
                    : (lang === 'fa' ? 'صرفاً مجاز به مشاهده و ورود اطلاعات جدید بدون امکان ویرایش محتوا یا تنظیمات ادمین.' : 'Strictly authorized to read and enter new data without content modification or admin settings.')
                }
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === 'fa' ? 'دسترسی به سیستم‌ها' : 'System Access'}
              </label>
              <select
                value={newSystemAccess}
                onChange={(e) => setNewSystemAccess(e.target.value as any)}
                className="w-full custom-input px-3 py-2 text-xs text-slate-800 cursor-pointer"
              >
                <option value="both">{lang === 'fa' ? 'هر دو (اعلام و اطفاء)' : 'Both (Alarm & Fighting)'}</option>
                <option value="alarm">{lang === 'fa' ? 'فقط اعلام حریق' : 'Fire Alarm Only'}</option>
                <option value="fighting">{lang === 'fa' ? 'فقط اطفاء حریق' : 'Fire Fighting Only'}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === 'fa' ? 'دسترسی به استعلام قیمت' : 'Financial Clearance'}
              </label>
              <select
                value={newPriceAccess}
                onChange={(e) => setNewPriceAccess(Number(e.target.value))}
                className="w-full custom-input px-3 py-2 text-xs text-slate-800 cursor-pointer"
              >
                <option value={1}>{lang === 'fa' ? 'مجاز (نمایش قیمت‌ها)' : 'Allowed (Show Prices)'}</option>
                <option value={0}>{lang === 'fa' ? 'غیرمجاز (قیمت محرمانه)' : 'Restricted (Hide Prices)'}</option>
              </select>
            </div>

            {userFormMsg && (
              <div className={`p-2.5 rounded-xl text-xs font-semibold text-center border flex items-center justify-center gap-1.5 ${
                userFormMsg.type === 'success' 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                  : 'bg-rose-50 border-rose-200 text-rose-700'
              }`}>
                {userFormMsg.type === 'success' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                <span>{userFormMsg.text}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 px-4 rounded-xl text-xs shadow-md shadow-blue-600/20 transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <UserPlus className="w-4 h-4" />
              <span>{lang === 'fa' ? 'ایجاد حساب کاربر' : 'Create User Account'}</span>
            </button>
          </form>
        </div>

        {/* Users List Table */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              <span>{lang === 'fa' ? 'فهرست کاربران فعال سامانه' : 'Active Users List'}</span>
            </h3>
            <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full font-semibold">
              {usersList.length} {lang === 'fa' ? 'کاربر' : 'Users'}
            </span>
          </div>

          <div className="overflow-x-auto border border-slate-200 bg-white rounded-xl shadow-2xs">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-800 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3 border-x border-slate-200/50">#</th>
                  <th className="p-3 border-x border-slate-200/50">{lang === 'fa' ? 'نام کاربری' : 'Username'}</th>
                  <th className="p-3 border-x border-slate-200/50">{lang === 'fa' ? 'نقش' : 'Role'}</th>
                  <th className="p-3 border-x border-slate-200/50">{lang === 'fa' ? 'دسترسی سیستم' : 'System Clearance'}</th>
                  <th className="p-3 border-x border-slate-200/50 text-center">{lang === 'fa' ? 'مشاهده قیمت' : 'Price Clearance'}</th>
                  <th className="p-3 border-x border-slate-200/50 text-center">{lang === 'fa' ? 'عملیات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                {usersList.map((user, idx) => (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 text-slate-400 font-bold">{idx + 1}</td>
                    <td className="p-3 font-bold text-slate-900">{user.username}</td>
                    <td className="p-3">
                      {user.username === 'admin' ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 inline-flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-purple-600" />
                          <span>{lang === 'fa' ? 'ادمین ارشد' : 'Super Admin'}</span>
                        </span>
                      ) : (
                        <select
                          value={user.role}
                          onChange={(e) => onToggleUserPermission(user.id, 'role', e.target.value)}
                          className={`rounded-lg px-2 py-1 text-xs font-bold border cursor-pointer ${
                            user.role === 'admin'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : user.role === 'manager'
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-slate-50 text-slate-700 border-slate-200'
                          }`}
                        >
                          <option value="user">{lang === 'fa' ? 'کارشناس (ورود و خواندن)' : 'Expert'}</option>
                          <option value="manager">{lang === 'fa' ? 'مدیر (ورود و ویرایش)' : 'Manager'}</option>
                          <option value="admin">{lang === 'fa' ? 'ادمین (دسترسی کامل)' : 'Admin'}</option>
                        </select>
                      )}
                    </td>
                    <td className="p-3">
                      <select
                        value={user.system_access}
                        onChange={(e) => onToggleUserPermission(user.id, 'system_access', e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-800 text-xs font-semibold cursor-pointer"
                      >
                        <option value="both">{lang === 'fa' ? 'جامع (هر دو)' : 'Both'}</option>
                        <option value="alarm">{lang === 'fa' ? 'اعلام حریق' : 'Alarm'}</option>
                        <option value="fighting">{lang === 'fa' ? 'اطفاء حریق' : 'Fighting'}</option>
                      </select>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => onToggleUserPermission(user.id, 'price_access', user.price_access === 1 ? 0 : 1)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 mx-auto ${
                          user.price_access === 1 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {user.price_access === 1 ? (
                          <>
                            <Eye className="w-3.5 h-3.5" />
                            <span>{lang === 'fa' ? 'مجاز' : 'Allowed'}</span>
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3.5 h-3.5" />
                            <span>{lang === 'fa' ? 'محرمانه' : 'Restricted'}</span>
                          </>
                        )}
                      </button>
                    </td>
                    <td className="p-3 text-center">
                      {user.username !== 'admin' && (
                        <button
                          type="button"
                          onClick={() => onDeleteUser(user.id)}
                          className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 cursor-pointer transition-colors"
                          title="حذف کاربر"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 3-Level RBAC Policy Explanation Box */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2.5">
            <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>{lang === 'fa' ? 'سیاست سه لایه سطوح دسترسی (RBAC)' : 'Three-Tier Access Control Policy'}</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              <div className="bg-white p-3 rounded-lg border border-purple-200">
                <span className="font-bold text-purple-700 block mb-1">
                  {lang === 'fa' ? '👑 سطح ۱: ادمین (Admin)' : 'Admin (Full Access)'}
                </span>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  {lang === 'fa' 
                    ? 'دسترسی کامل به کلیه تنظیمات، مرکز کنترل و توسعه، لاگ‌های امنیتی، مدیریت کاربران و پایگاه‌داده.' 
                    : 'Full access to all system settings, Dev Console, audit logs, and user management.'}
                </p>
              </div>
              <div className="bg-white p-3 rounded-lg border border-amber-200">
                <span className="font-bold text-amber-800 block mb-1">
                  {lang === 'fa' ? '💼 سطح ۲: مدیر (Manager)' : 'Manager'}
                </span>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  {lang === 'fa'
                    ? 'دسترسی به خواندن، ورود اطلاعات و ویرایش/تغییر در کلیه محتوا و اسناد. بدون دسترسی به تنظیمات ادمین یا حذف نهایی.'
                    : 'Authorized to read, input, and edit/update all project and engineering content. No access to admin settings.'}
                </p>
              </div>
              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-700 block mb-1">
                  {lang === 'fa' ? '👤 سطح ۳: کارشناس (Expert / User)' : 'Expert (Engineer)'}
                </span>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  {lang === 'fa'
                    ? 'صرفاً مجاز به خواندن اطلاعات و ورود اطلاعات و اسناد جدید. فاقد امکان تغییر محتوا، ویرایش اطلاعات پایه، حذف یا تنظیمات ادمین.'
                    : 'Strictly authorized to read and submit new items. Prohibited from editing existing content or accessing admin settings.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
