import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Flame, 
  LayoutDashboard, 
  MessageSquare, 
  Database, 
  Users, 
  KeyRound, 
  Cpu, 
  LogOut, 
  Menu,
  X,
  Archive,
  FileText,
  FileSignature,
  FileSpreadsheet,
  ShieldCheck,
  Server,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { User } from '../types';
import { TransparentLogo } from './TransparentLogo';

interface NavbarProps {
  currentUser: User;
  activeTab: 'dashboard' | 'assistant' | 'database' | 'users' | 'proposal' | 'letters' | 'admin-console' | 'edms';
  setActiveTab: (tab: 'dashboard' | 'assistant' | 'database' | 'users' | 'proposal' | 'letters' | 'admin-console' | 'edms') => void;
  systemFilter: 'all' | 'alarm' | 'fighting';
  setSystemFilter: (filter: 'all' | 'alarm' | 'fighting') => void;
  lang: 'fa' | 'en';
  setLang: (l: 'fa' | 'en') => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  onOpenAiModal: () => void;
  onOpenPwdModal: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  activeTab,
  setActiveTab,
  systemFilter,
  setSystemFilter,
  lang,
  setLang,
  isSidebarOpen,
  setIsSidebarOpen,
  onOpenAiModal,
  onOpenPwdModal,
  onLogout
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleMobileNav = (action: () => void) => {
    action();
    setMobileMenuOpen(false);
  };

  return (
    <header className="w-full glass-nav sticky top-0 z-40 px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3 flex items-center justify-between shadow-xs border-b border-slate-200/80" dir={lang === 'fa' ? 'rtl' : 'ltr'}>
      {/* Brand Logo & Mobile Trigger */}
      <div className="flex items-center gap-3">
        {/* Mobile Menu Hamburger Button */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="lg:hidden p-2 rounded-xl text-slate-700 hover:bg-slate-100 active:bg-slate-200 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
          aria-label="Open Navigation Menu"
        >
          <Menu className="w-6 h-6" />
        </button>

        {/* Brand Logo */}
        <button
          onClick={() => { setActiveTab('dashboard'); setSystemFilter('all'); }}
          className="flex items-center gap-2.5 font-bold text-slate-900 group shrink-0 cursor-pointer text-right"
        >
          <div className="flex items-center justify-center group-hover:scale-105 transition-transform overflow-hidden px-1 h-9">
            <TransparentLogo src="/logo.png" alt="ISATIS Logo" className="h-8 sm:h-9 w-auto object-contain" tolerance={50} />
          </div>
          <div className="flex flex-col text-right">
            <span className="text-xs sm:text-sm font-bold tracking-tight text-slate-900 leading-tight">
              {lang === 'fa' ? 'ایساتیس پارس تجهیز' : 'Isatis F&G'}
            </span>
            <span className="text-[9px] sm:text-[10px] text-slate-500 font-medium tracking-wider hidden sm:inline-block">
              {lang === 'fa' ? 'سامانه اعلام و اطفاء حریق' : 'Fire & Gas Engineering'}
            </span>
          </div>
        </button>
      </div>

      {/* Desktop & Tablet Horizontal Navigation Tabs */}
      <div className="hidden lg:flex items-center gap-1.5 overflow-x-auto no-scrollbar touch-pan-x py-1 px-1">
        <nav className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/80 text-xs font-medium">
          <button
            onClick={() => { setActiveTab('dashboard'); setSystemFilter('all'); }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all cursor-pointer min-h-[38px] ${
              activeTab === 'dashboard' && systemFilter === 'all'
                ? 'bg-white text-blue-600 font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span className="whitespace-nowrap">{lang === 'fa' ? 'کاتالوگ تجهیزات' : 'Catalog'}</span>
          </button>

          <button
            onClick={() => { setActiveTab('dashboard'); setSystemFilter('alarm'); }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all cursor-pointer min-h-[38px] ${
              activeTab === 'dashboard' && systemFilter === 'alarm'
                ? 'bg-amber-500/10 text-amber-600 font-bold border border-amber-500/20 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="whitespace-nowrap">{lang === 'fa' ? 'اعلام حریق' : 'Fire Alarm'}</span>
          </button>

          <button
            onClick={() => { setActiveTab('dashboard'); setSystemFilter('fighting'); }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all cursor-pointer min-h-[38px] ${
              activeTab === 'dashboard' && systemFilter === 'fighting'
                ? 'bg-emerald-500/10 text-emerald-600 font-bold border border-emerald-500/20 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="whitespace-nowrap">{lang === 'fa' ? 'اطفاء حریق' : 'Fire Fighting'}</span>
          </button>

          <button
            onClick={() => setActiveTab('assistant')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all cursor-pointer min-h-[38px] ${
              activeTab === 'assistant'
                ? 'bg-blue-600 text-white font-bold shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="whitespace-nowrap">{lang === 'fa' ? 'دستیار مهندسی AI' : 'AI Assistant'}</span>
          </button>

          <button
            onClick={() => setActiveTab('proposal')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all cursor-pointer min-h-[38px] ${
              activeTab === 'proposal'
                ? 'bg-indigo-600 text-white font-bold shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="whitespace-nowrap">{lang === 'fa' ? 'پروپوزال و آنالیز قیمت' : 'Proposal & Price Analysis'}</span>
          </button>

          <button
            onClick={() => setActiveTab('letters')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all cursor-pointer min-h-[38px] ${
              activeTab === 'letters'
                ? 'bg-blue-600 text-white font-bold shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <FileSignature className="w-3.5 h-3.5" />
            <span className="whitespace-nowrap">{lang === 'fa' ? 'اتوماسیون نامه‌ها' : 'Letters Automation'}</span>
          </button>

          <button
            onClick={() => setActiveTab('edms')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all cursor-pointer min-h-[38px] ${
              activeTab === 'edms'
                ? 'bg-blue-600 text-white font-bold shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span className="whitespace-nowrap">{lang === 'fa' ? 'کنترل مدارک (EDMS)' : 'EDMS / MDR'}</span>
          </button>

          <button
            onClick={() => setActiveTab('database')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all cursor-pointer min-h-[38px] ${
              activeTab === 'database'
                ? 'bg-white text-blue-600 font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span className="whitespace-nowrap">{lang === 'fa' ? 'پایگاه داده' : 'Database'}</span>
          </button>

          {currentUser.role === 'admin' && (
            <>
              <button
                onClick={() => setActiveTab('users')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all cursor-pointer min-h-[38px] ${
                  activeTab === 'users'
                    ? 'bg-white text-blue-600 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span className="whitespace-nowrap">{lang === 'fa' ? 'مدیریت کاربران' : 'Users'}</span>
              </button>

              <button
                onClick={() => setActiveTab('admin-console')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all cursor-pointer min-h-[38px] ${
                  activeTab === 'admin-console'
                    ? 'bg-emerald-600 text-white font-bold shadow-sm'
                    : 'text-emerald-700 bg-emerald-50/70 hover:bg-emerald-100/70 border border-emerald-200/60'
                }`}
              >
                <Server className="w-3.5 h-3.5 text-emerald-500" />
                <span className="whitespace-nowrap">{lang === 'fa' ? 'مرکز کنترل و توسعه' : 'Dev Console'}</span>
              </button>
            </>
          )}
        </nav>
      </div>

      {/* Action items / Profile Controls */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Toggle Archive Sidebar Button on Mobile & Desktop */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className={`p-2 sm:px-3 sm:py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer min-h-[40px] ${
            isSidebarOpen 
              ? 'bg-blue-50 border-blue-200 text-blue-700' 
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
          title={lang === 'fa' ? 'پنل ارتقاء دیتابیس از طریق فایل' : 'Database Upgrade via File'}
        >
          <Archive className="w-4 h-4 text-blue-600 shrink-0" />
          <span className="hidden md:inline">{lang === 'fa' ? 'ارتقاء دیتابیس با فایل' : 'Upgrade DB'}</span>
        </button>

        {/* Change Password modal button (Desktop) */}
        <button
          onClick={onOpenPwdModal}
          className="hidden sm:flex p-2 sm:p-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-all cursor-pointer min-h-[40px] min-w-[40px] items-center justify-center"
          title={lang === 'fa' ? 'تغییر رمز عبور' : 'Change Password'}
        >
          <KeyRound className="w-4 h-4 text-slate-600" />
        </button>

        {/* AI Config Modal button (Admin only, Desktop) */}
        {currentUser.role === 'admin' && (
          <button
            onClick={onOpenAiModal}
            className="hidden sm:flex p-2 sm:p-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-all cursor-pointer min-h-[40px] min-w-[40px] items-center justify-center"
            title={lang === 'fa' ? 'تنظیمات هوش مصنوعی' : 'AI Config'}
          >
            <Cpu className="w-4 h-4 text-slate-600" />
          </button>
        )}

        {/* User Badge (Desktop) */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs">
          <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center uppercase">
            {currentUser.username.charAt(0)}
          </div>
          <span className="font-bold text-slate-800">{currentUser.username}</span>
          <span className="text-[10px] text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200 font-medium">
            {currentUser.role === 'admin' ? (lang === 'fa' ? 'مدیر' : 'Admin') : (lang === 'fa' ? 'کارشناس' : 'User')}
          </span>
        </div>

        {/* Logout Button (Desktop) */}
        <button
          onClick={onLogout}
          className="hidden sm:flex p-2 sm:p-2.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all cursor-pointer min-h-[40px] min-w-[40px] items-center justify-center"
          title={lang === 'fa' ? 'خروج از حساب' : 'Logout'}
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      {/* MOBILE RESPONSIVE DRAWER / OVERLAY SHEET */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 lg:hidden"
            />

            {/* Mobile Sheet Drawer */}
            <motion.div
              initial={{ x: lang === 'fa' ? '100%' : '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: lang === 'fa' ? '100%' : '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className={`fixed top-0 bottom-0 ${lang === 'fa' ? 'right-0' : 'left-0'} w-4/5 max-w-sm bg-white z-50 shadow-2xl flex flex-col justify-between p-5 overflow-y-auto lg:hidden`}
              dir={lang === 'fa' ? 'rtl' : 'ltr'}
            >
              {/* Drawer Top Header */}
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <TransparentLogo src="/logo.png" alt="ISATIS Logo" className="h-8 w-auto object-contain" tolerance={50} />
                    <div className="flex flex-col text-right">
                      <span className="text-sm font-extrabold text-slate-900">
                        {lang === 'fa' ? 'ایساتیس پارس تجهیز' : 'Isatis F&G'}
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium">
                        {lang === 'fa' ? 'منوی ناوبری سامانه' : 'System Navigation'}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* User Card inside Mobile Drawer */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-black text-sm flex items-center justify-center uppercase shadow-xs shrink-0">
                    {currentUser.username.charAt(0)}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-extrabold text-slate-900 truncate">{currentUser.username}</span>
                    <span className="text-[11px] text-slate-500">
                      {currentUser.role === 'admin' 
                        ? (lang === 'fa' ? 'مدیر ارشد سامانه' : 'System Administrator') 
                        : (lang === 'fa' ? 'کارشناس مهندسی' : 'Engineering User')}
                    </span>
                  </div>
                </div>

                {/* Mobile Menu Links */}
                <div className="space-y-1.5 pt-2">
                  <button
                    onClick={() => handleMobileNav(() => { setActiveTab('dashboard'); setSystemFilter('all'); })}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl text-xs font-bold transition-all cursor-pointer min-h-[44px] ${
                      activeTab === 'dashboard' && systemFilter === 'all'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <LayoutDashboard className="w-4 h-4 text-blue-600" />
                      <span>{lang === 'fa' ? 'کاتالوگ تجهیزات' : 'Catalog'}</span>
                    </div>
                    {lang === 'fa' ? <ChevronLeft className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                  </button>

                  <button
                    onClick={() => handleMobileNav(() => { setActiveTab('dashboard'); setSystemFilter('alarm'); })}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl text-xs font-bold transition-all cursor-pointer min-h-[44px] ${
                      activeTab === 'dashboard' && systemFilter === 'alarm'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                      <span>{lang === 'fa' ? 'تجهیزات اعلام حریق' : 'Fire Alarm Items'}</span>
                    </div>
                    {lang === 'fa' ? <ChevronLeft className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                  </button>

                  <button
                    onClick={() => handleMobileNav(() => { setActiveTab('dashboard'); setSystemFilter('fighting'); })}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl text-xs font-bold transition-all cursor-pointer min-h-[44px] ${
                      activeTab === 'dashboard' && systemFilter === 'fighting'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <span>{lang === 'fa' ? 'تجهیزات اطفاء حریق' : 'Fire Fighting Items'}</span>
                    </div>
                    {lang === 'fa' ? <ChevronLeft className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                  </button>

                  <button
                    onClick={() => handleMobileNav(() => setActiveTab('assistant'))}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl text-xs font-bold transition-all cursor-pointer min-h-[44px] ${
                      activeTab === 'assistant'
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <MessageSquare className="w-4 h-4" />
                      <span>{lang === 'fa' ? 'دستیار مهندسی Gemini AI' : 'AI Assistant'}</span>
                    </div>
                    {lang === 'fa' ? <ChevronLeft className="w-4 h-4 opacity-60" /> : <ChevronRight className="w-4 h-4 opacity-60" />}
                  </button>

                  <button
                    onClick={() => handleMobileNav(() => setActiveTab('proposal'))}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl text-xs font-bold transition-all cursor-pointer min-h-[44px] ${
                      activeTab === 'proposal'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4" />
                      <span>{lang === 'fa' ? 'پروپوزال و آنالیز قیمت' : 'Proposal & Price Analysis'}</span>
                    </div>
                    {lang === 'fa' ? <ChevronLeft className="w-4 h-4 opacity-60" /> : <ChevronRight className="w-4 h-4 opacity-60" />}
                  </button>

                  <button
                    onClick={() => handleMobileNav(() => setActiveTab('letters'))}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl text-xs font-bold transition-all cursor-pointer min-h-[44px] ${
                      activeTab === 'letters'
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <FileSignature className="w-4 h-4" />
                      <span>{lang === 'fa' ? 'اتوماسیون نامه‌ها' : 'Letters Automation'}</span>
                    </div>
                    {lang === 'fa' ? <ChevronLeft className="w-4 h-4 opacity-60" /> : <ChevronRight className="w-4 h-4 opacity-60" />}
                  </button>

                  <button
                    onClick={() => handleMobileNav(() => setActiveTab('edms'))}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl text-xs font-bold transition-all cursor-pointer min-h-[44px] ${
                      activeTab === 'edms'
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <FileSpreadsheet className="w-4 h-4" />
                      <span>{lang === 'fa' ? 'کنترل مدارک مهندسی (EDMS/MDR)' : 'Engineering EDMS / MDR'}</span>
                    </div>
                    {lang === 'fa' ? <ChevronLeft className="w-4 h-4 opacity-60" /> : <ChevronRight className="w-4 h-4 opacity-60" />}
                  </button>

                  <button
                    onClick={() => handleMobileNav(() => setActiveTab('database'))}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl text-xs font-bold transition-all cursor-pointer min-h-[44px] ${
                      activeTab === 'database'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Database className="w-4 h-4 text-blue-600" />
                      <span>{lang === 'fa' ? 'پایگاه داده' : 'Database'}</span>
                    </div>
                    {lang === 'fa' ? <ChevronLeft className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                  </button>

                  {currentUser.role === 'admin' && (
                    <>
                      <button
                        onClick={() => handleMobileNav(() => setActiveTab('users'))}
                        className={`w-full flex items-center justify-between p-3 rounded-2xl text-xs font-bold transition-all cursor-pointer min-h-[44px] ${
                          activeTab === 'users'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Users className="w-4 h-4 text-blue-600" />
                          <span>{lang === 'fa' ? 'مدیریت کاربران' : 'Users Management'}</span>
                        </div>
                        {lang === 'fa' ? <ChevronLeft className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                      </button>

                      <button
                        onClick={() => handleMobileNav(() => setActiveTab('admin-console'))}
                        className={`w-full flex items-center justify-between p-3 rounded-2xl text-xs font-bold transition-all cursor-pointer min-h-[44px] ${
                          activeTab === 'admin-console'
                            ? 'bg-emerald-600 text-white shadow-md'
                            : 'text-emerald-700 bg-emerald-50/70 hover:bg-emerald-100/70 border border-emerald-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Server className="w-4 h-4" />
                          <span>{lang === 'fa' ? 'مرکز کنترل و توسعه سیستم' : 'Dev & Admin Console'}</span>
                        </div>
                        {lang === 'fa' ? <ChevronLeft className="w-4 h-4 opacity-60" /> : <ChevronRight className="w-4 h-4 opacity-60" />}
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => handleMobileNav(() => setIsSidebarOpen(true))}
                    className="w-full flex items-center justify-between p-3 rounded-2xl text-xs font-bold text-slate-700 hover:bg-blue-50 transition-all cursor-pointer min-h-[44px] border border-dashed border-blue-200"
                  >
                    <div className="flex items-center gap-3">
                      <Archive className="w-4 h-4 text-blue-600" />
                      <span>{lang === 'fa' ? 'پنل ارتقاء دیتابیس از طریق فایل' : 'Database Upgrade via File'}</span>
                    </div>
                    {lang === 'fa' ? <ChevronLeft className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                  </button>
                </div>
              </div>

              {/* Drawer Bottom Actions */}
              <div className="pt-4 border-t border-slate-100 space-y-2">
                <button
                  onClick={() => handleMobileNav(onOpenPwdModal)}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors min-h-[44px]"
                >
                  <KeyRound className="w-4 h-4 text-slate-500" />
                  <span>{lang === 'fa' ? 'تغییر رمز عبور' : 'Change Password'}</span>
                </button>

                {currentUser.role === 'admin' && (
                  <button
                    onClick={() => handleMobileNav(onOpenAiModal)}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors min-h-[44px]"
                  >
                    <Cpu className="w-4 h-4 text-slate-500" />
                    <span>{lang === 'fa' ? 'تنظیمات هوش مصنوعی' : 'AI Config'}</span>
                  </button>
                )}

                <button
                  onClick={() => handleMobileNav(onLogout)}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors min-h-[44px]"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{lang === 'fa' ? 'خروج از حساب کاربری' : 'Logout'}</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
};
