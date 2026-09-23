import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  MessageSquare, 
  Database, 
  Users, 
  KeyRound, 
  Cpu, 
  LogOut, 
  X,
  Archive,
  FileText,
  FileSignature,
  FileSpreadsheet,
  Server,
  Sparkles,
  Flame,
  Globe,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  BellRing,
  Menu,
  Pin,
  PanelRightClose
} from 'lucide-react';
import { User } from '../types';
import { TransparentLogo } from './TransparentLogo';

export interface RightSidebarNavProps {
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
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  sidebarMode: 'pinned' | 'collapsible';
  setSidebarMode: (mode: 'pinned' | 'collapsible') => void;
  isDrawerOpen: boolean;
  setIsDrawerOpen: (open: boolean) => void;
}

export const RightSidebarNav: React.FC<RightSidebarNavProps> = ({
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
  onLogout,
  mobileMenuOpen,
  setMobileMenuOpen,
  sidebarMode,
  setSidebarMode,
  isDrawerOpen,
  setIsDrawerOpen
}) => {
  const isFa = lang === 'fa';

  const handleNavClick = (tab: 'dashboard' | 'assistant' | 'database' | 'users' | 'proposal' | 'letters' | 'admin-console' | 'edms', filter?: 'all' | 'alarm' | 'fighting') => {
    setActiveTab(tab);
    if (filter) {
      setSystemFilter(filter);
    }
    // In collapsible mode, auto-hide the drawer when an item is selected
    if (sidebarMode === 'collapsible') {
      setIsDrawerOpen(false);
    }
    setMobileMenuOpen(false);
  };

  const navContent = (
    <div className="flex flex-col h-full justify-between select-none">
      {/* Top: Brand Header & Main Vertical Nav */}
      <div className="space-y-5">
        {/* Brand Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200/80 gap-2">
          <button
            onClick={() => handleNavClick('dashboard', 'all')}
            className="flex items-center gap-3 text-right group cursor-pointer flex-1 min-w-0"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-900/5 p-1 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0 border border-slate-200/60">
              <TransparentLogo 
                src="/logo.png" 
                alt="ISATIS Logo" 
                className="h-8 w-auto object-contain" 
                tolerance={50} 
              />
            </div>
            <div className="flex flex-col text-right min-w-0">
              <span className="text-sm font-black tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                {isFa ? 'ایساتیس پارس تجهیز' : 'Isatis Pars Tajhiz'}
              </span>
              <span className="text-[10px] text-slate-500 font-medium tracking-wide truncate">
                {isFa ? 'مدیریت مهندسی F&G' : 'Fire & Gas Engineering'}
              </span>
            </div>
          </button>

          {/* Controls: Mode Switch (Pin/Unpin) & Close Button */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Mode switch (Pin vs Collapsible) for desktop */}
            <button
              type="button"
              onClick={() => {
                const next = sidebarMode === 'pinned' ? 'collapsible' : 'pinned';
                setSidebarMode(next);
                localStorage.setItem('fg_sidebar_mode', next);
                if (next === 'collapsible') {
                  setIsDrawerOpen(false);
                }
              }}
              className={`hidden lg:flex p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer items-center justify-center ${
                sidebarMode === 'pinned'
                  ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 shadow-2xs'
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600'
              }`}
              title={
                sidebarMode === 'pinned'
                  ? (isFa ? 'تغییر به حالت کشویی (مخفی‌شونده برای فضای بیشتر)' : 'Switch to Collapsible Drawer')
                  : (isFa ? 'پین کردن نوار ابزار (نمایش دائمی در صفحه)' : 'Pin Sidebar')
              }
            >
              {sidebarMode === 'pinned' ? (
                <Pin className="w-4 h-4 text-blue-600" />
              ) : (
                <PanelRightClose className="w-4 h-4 text-slate-600" />
              )}
            </button>

            {/* Close button: for mobile drawer OR desktop drawer when open */}
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                setIsDrawerOpen(false);
              }}
              className={`p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer ${
                sidebarMode === 'pinned' ? 'lg:hidden' : ''
              }`}
              title={isFa ? 'بستن منو' : 'Close Menu'}
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Collapsible Mode Notification Tip */}
        {sidebarMode === 'collapsible' && (
          <div className="px-3 py-2 rounded-xl bg-blue-50/80 border border-blue-200/60 text-[11px] text-blue-900 flex items-center justify-between gap-2">
            <span className="truncate">{isFa ? '💡 حالت کشویی خودکار فعال است' : '💡 Auto-drawer mode active'}</span>
            <button
              type="button"
              onClick={() => {
                setSidebarMode('pinned');
                localStorage.setItem('fg_sidebar_mode', 'pinned');
              }}
              className="text-[10px] font-bold text-blue-700 hover:text-blue-900 underline cursor-pointer shrink-0"
              title={isFa ? 'ثابت ماندن منو در صفحه' : 'Pin to screen'}
            >
              {isFa ? 'پین کردن' : 'Pin'}
            </button>
          </div>
        )}

        {/* Section 1: Main Workspaces */}
        <div className="space-y-1">
          <div className="px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            {isFa ? 'بخش‌های اصلی نرم‌افزار' : 'Core Modules'}
          </div>

          {/* Catalog & Dashboard */}
          <div className="space-y-0.5">
            <button
              onClick={() => handleNavClick('dashboard')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <LayoutDashboard className={`w-4 h-4 ${activeTab === 'dashboard' ? 'text-white' : 'text-slate-500'}`} />
                <span>{isFa ? 'کاتالوگ تجهیزات' : 'Equipment Catalog'}</span>
              </div>
              {activeTab === 'dashboard' && (
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              )}
            </button>

            {/* Sub-Filters for Catalog */}
            <div className="pr-6 pl-2 py-1 space-y-1">
              <button
                onClick={() => handleNavClick('dashboard', 'all')}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                  activeTab === 'dashboard' && systemFilter === 'all'
                    ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200/60'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                <span>{isFa ? 'همه تجهیزات' : 'All Equipment'}</span>
                <span className="text-[10px] opacity-70">★</span>
              </button>

              <button
                onClick={() => handleNavClick('dashboard', 'alarm')}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                  activeTab === 'dashboard' && systemFilter === 'alarm'
                    ? 'bg-amber-50 text-amber-700 font-bold border border-amber-200/60'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>{isFa ? 'اعلام حریق' : 'Fire Alarm'}</span>
                </div>
                <BellRing className="w-3 h-3 text-amber-500 opacity-60" />
              </button>

              <button
                onClick={() => handleNavClick('dashboard', 'fighting')}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                  activeTab === 'dashboard' && systemFilter === 'fighting'
                    ? 'bg-emerald-50 text-emerald-700 font-bold border border-emerald-200/60'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>{isFa ? 'اطفاء حریق' : 'Fire Fighting'}</span>
                </div>
                <Flame className="w-3 h-3 text-emerald-500 opacity-60" />
              </button>
            </div>
          </div>

          {/* AI Assistant */}
          <button
            onClick={() => handleNavClick('assistant')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'assistant'
                ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-sm'
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <MessageSquare className={`w-4 h-4 ${activeTab === 'assistant' ? 'text-white' : 'text-purple-600'}`} />
              <span>{isFa ? 'دستیار مهندسی AI' : 'AI Assistant'}</span>
            </div>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${
              activeTab === 'assistant' 
                ? 'bg-white/20 text-white' 
                : 'bg-purple-100 text-purple-700'
            }`}>
              Gemini
            </span>
          </button>

          {/* Proposals & Commercial Pricing */}
          <button
            onClick={() => handleNavClick('proposal')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'proposal'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <FileText className={`w-4 h-4 ${activeTab === 'proposal' ? 'text-white' : 'text-indigo-600'}`} />
              <span>{isFa ? 'پروپوزال و آنالیز قیمت' : 'Proposal & Pricing'}</span>
            </div>
          </button>

          {/* Letters Automation */}
          <button
            onClick={() => handleNavClick('letters')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'letters'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <FileSignature className={`w-4 h-4 ${activeTab === 'letters' ? 'text-white' : 'text-blue-600'}`} />
              <span>{isFa ? 'اتوماسیون نامه‌ها' : 'Letters Automation'}</span>
            </div>
          </button>

          {/* EDMS / MDR */}
          <button
            onClick={() => handleNavClick('edms')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'edms'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <FileSpreadsheet className={`w-4 h-4 ${activeTab === 'edms' ? 'text-white' : 'text-emerald-600'}`} />
              <span>{isFa ? 'کنترل مدارک (EDMS)' : 'EDMS / MDR'}</span>
            </div>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${
              activeTab === 'edms' 
                ? 'bg-white/20 text-white' 
                : 'bg-emerald-100 text-emerald-700'
            }`}>
              MDR
            </span>
          </button>

          {/* Database View */}
          <button
            onClick={() => handleNavClick('database')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'database'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Database className={`w-4 h-4 ${activeTab === 'database' ? 'text-white' : 'text-slate-600'}`} />
              <span>{isFa ? 'پایگاه داده تجهیزات' : 'Equipment Database'}</span>
            </div>
          </button>
        </div>

        {/* Section 2: Administration (Admin Only) */}
        {currentUser.role === 'admin' && (
          <div className="space-y-1 pt-2 border-t border-slate-200/80">
            <div className="px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {isFa ? 'مدیریت و کنترل سامانه' : 'Administration'}
            </div>

            <button
              onClick={() => handleNavClick('users')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'users'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Users className={`w-4 h-4 ${activeTab === 'users' ? 'text-white' : 'text-blue-500'}`} />
                <span>{isFa ? 'مدیریت کاربران' : 'User Accounts'}</span>
              </div>
            </button>

            <button
              onClick={() => handleNavClick('admin-console')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'admin-console'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-emerald-800 bg-emerald-50/70 hover:bg-emerald-100/70 border border-emerald-200/60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Server className="w-4 h-4 text-emerald-600" />
                <span>{isFa ? 'مرکز کنترل و توسعه' : 'Dev Console'}</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-600/10 text-emerald-700 font-bold">
                PRO
              </span>
            </button>
          </div>
        )}

        {/* Section 3: Utility Tools */}
        <div className="space-y-1 pt-2 border-t border-slate-200/80">
          <div className="px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            {isFa ? 'ابزارهای کمکی' : 'Utilities & Tools'}
          </div>

          {/* Toggle Archive & Feeder Panel */}
          <button
            type="button"
            onClick={() => {
              setIsSidebarOpen(!isSidebarOpen);
              setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              isSidebarOpen
                ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Archive className="w-4 h-4 text-blue-600" />
              <span>{isFa ? 'پنل ارتقاء دیتابیس از طریق فایل' : 'Upgrade DB via File'}</span>
            </div>
            <span className={`w-2 h-2 rounded-full ${isSidebarOpen ? 'bg-blue-600' : 'bg-slate-300'}`} />
          </button>

          {/* AI Settings (Admin) */}
          {currentUser.role === 'admin' && (
            <button
              type="button"
              onClick={() => {
                onOpenAiModal();
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all cursor-pointer"
            >
              <Cpu className="w-4 h-4 text-slate-500" />
              <span>{isFa ? 'تنظیمات مدل هوش مصنوعی' : 'AI Model Settings'}</span>
            </button>
          )}

          {/* Change Password */}
          <button
            type="button"
            onClick={() => {
              onOpenPwdModal();
              setMobileMenuOpen(false);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all cursor-pointer"
          >
            <KeyRound className="w-4 h-4 text-slate-500" />
            <span>{isFa ? 'تغییر کلمه عبور' : 'Change Password'}</span>
          </button>

          {/* Language Switcher */}
          <button
            type="button"
            onClick={() => setLang(isFa ? 'en' : 'fa')}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <Globe className="w-4 h-4 text-slate-500" />
              <span>{isFa ? 'تغییر زبان به انگلیسی' : 'Switch to Persian'}</span>
            </div>
            <span className="text-[10px] font-bold uppercase bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded">
              {isFa ? 'EN' : 'فا'}
            </span>
          </button>
        </div>
      </div>

      {/* Bottom: User Card & Logout Button */}
      <div className="pt-4 border-t border-slate-200/80 space-y-3">
        {/* User Badge Card */}
        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white font-black text-sm flex items-center justify-center uppercase shadow-xs shrink-0">
              {currentUser.username.charAt(0)}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-slate-900 truncate">
                {currentUser.username}
              </span>
              <span className="text-[10px] text-slate-500 truncate">
                {currentUser.role === 'admin' 
                  ? (isFa ? 'ادمین ارشد سامانه' : 'Admin') 
                  : currentUser.role === 'manager'
                    ? (isFa ? 'مدیر (ورود و تغییر محتوا)' : 'Manager')
                    : (isFa ? 'کارشناس (ورود و خواندن)' : 'Expert')}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer shrink-0"
            title={isFa ? 'خروج از حساب' : 'Logout'}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* 1. Desktop Fixed Right Sidebar (اگر کاربر حالت منوی ثابت را انتخاب کرده باشد) */}
      {sidebarMode === 'pinned' && (
        <aside 
          className="hidden lg:flex flex-col w-64 xl:w-72 bg-white/95 backdrop-blur-md rtl:border-l ltr:border-r border-slate-200/90 h-screen sticky top-0 z-30 p-4 shrink-0 overflow-y-auto custom-scrollbar shadow-xs"
          dir={isFa ? 'rtl' : 'ltr'}
        >
          {navContent}
        </aside>
      )}

      {/* 2. Desktop Collapsible Drawer & Edge Trigger (حالت کشویی مخفی‌شونده برای حداکثر فضا) */}
      {sidebarMode === 'collapsible' && (
        <>
          {/* Floating Edge Trigger Tab (وقتی منو بسته است - با کلیک روی آن منو باز می‌شود) */}
          {!isDrawerOpen && (
            <motion.button
              initial={{ opacity: 0, x: isFa ? 20 : -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isFa ? 20 : -20 }}
              onClick={() => setIsDrawerOpen(true)}
              className={`hidden lg:flex fixed top-24 ${isFa ? 'right-0' : 'left-0'} z-40 bg-white/95 backdrop-blur-md hover:bg-blue-600 text-slate-700 hover:text-white border ${isFa ? 'border-r-0 rounded-l-2xl' : 'border-l-0 rounded-r-2xl'} border-slate-300/80 hover:border-blue-600 shadow-xl py-3.5 px-2 flex-col items-center gap-2 group transition-all duration-200 cursor-pointer`}
              title={isFa ? 'نمایش منوی ابزارها (کلیک کنید)' : 'Show Navigation Menu (Click)'}
            >
              <div className="p-1 rounded-lg bg-blue-50 group-hover:bg-blue-500/40 transition-colors">
                <Menu className="w-4 h-4 text-blue-600 group-hover:text-white transition-colors" />
              </div>
              <span className="text-[11px] font-black [writing-mode:vertical-rl] tracking-widest py-1 select-none text-slate-800 group-hover:text-white">
                {isFa ? 'منوی ابزارها' : 'Navigation'}
              </span>
              <ChevronLeft className={`w-4 h-4 text-slate-400 group-hover:text-white transition-transform ${isFa ? 'group-hover:-translate-x-1' : 'rotate-180 group-hover:translate-x-1'}`} />
            </motion.button>
          )}

          {/* Slide-out Drawer with Backdrop for Desktop */}
          <AnimatePresence>
            {isDrawerOpen && (
              <>
                {/* Backdrop: clicking anywhere on workspace closes the drawer */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsDrawerOpen(false)}
                  className="fixed inset-0 bg-slate-900/40 backdrop-blur-2xs z-50 hidden lg:block"
                />

                {/* Desktop Drawer Sheet */}
                <motion.div
                  initial={{ x: isFa ? '100%' : '-100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: isFa ? '100%' : '-100%' }}
                  transition={{ type: 'spring', damping: 28, stiffness: 260 }}
                  className={`fixed top-0 bottom-0 ${isFa ? 'right-0 border-l' : 'left-0 border-r'} w-72 xl:w-80 bg-white z-50 shadow-2xl flex flex-col p-4 overflow-y-auto hidden lg:flex border-slate-200`}
                  dir={isFa ? 'rtl' : 'ltr'}
                >
                  {navContent}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </>
      )}

      {/* 3. Mobile Off-Canvas Drawer (باز شونده از سمت راست روی موبایل و تبلت) */}
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
              initial={{ x: isFa ? '100%' : '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: isFa ? '100%' : '-100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 240 }}
              className={`fixed top-0 bottom-0 ${isFa ? 'right-0' : 'left-0'} w-4/5 max-w-sm bg-white z-50 shadow-2xl flex flex-col p-4 overflow-y-auto lg:hidden`}
              dir={isFa ? 'rtl' : 'ltr'}
            >
              {navContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
