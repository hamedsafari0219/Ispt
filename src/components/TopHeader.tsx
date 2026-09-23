import React from 'react';
import { 
  Menu, 
  Archive, 
  Globe, 
  Sparkles, 
  ShieldCheck, 
  LayoutDashboard, 
  MessageSquare, 
  FileText, 
  FileSignature, 
  FileSpreadsheet, 
  Database, 
  Users, 
  Server,
  Calendar,
  Pin,
  PanelRightClose
} from 'lucide-react';
import { User } from '../types';
import { TransparentLogo } from './TransparentLogo';

interface TopHeaderProps {
  currentUser: User;
  activeTab: 'dashboard' | 'assistant' | 'database' | 'users' | 'proposal' | 'letters' | 'admin-console' | 'edms';
  systemFilter: 'all' | 'alarm' | 'fighting';
  lang: 'fa' | 'en';
  setLang: (l: 'fa' | 'en') => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  onOpenMobileMenu: () => void;
  onLogout: () => void;
  sidebarMode?: 'pinned' | 'collapsible';
  setSidebarMode?: (mode: 'pinned' | 'collapsible') => void;
  isDrawerOpen?: boolean;
  onToggleDrawer?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  currentUser,
  activeTab,
  systemFilter,
  lang,
  setLang,
  isSidebarOpen,
  setIsSidebarOpen,
  onOpenMobileMenu,
  onLogout,
  sidebarMode = 'collapsible',
  setSidebarMode,
  isDrawerOpen = false,
  onToggleDrawer
}) => {
  const isFa = lang === 'fa';

  const getPageInfo = () => {
    switch (activeTab) {
      case 'dashboard':
        return {
          title: isFa 
            ? (systemFilter === 'alarm' ? 'تجهیزات اعلام حریق' : systemFilter === 'fighting' ? 'تجهیزات اطفاء حریق' : 'کاتالوگ و بانک تجهیزات F&G')
            : (systemFilter === 'alarm' ? 'Fire Alarm Equipment' : systemFilter === 'fighting' ? 'Fire Fighting Equipment' : 'F&G Equipment Catalog'),
          subtitle: isFa 
            ? 'جستجو، فیلتر و بررسی دیتاشیت‌های فنی استاندارد'
            : 'Search, filter and verify technical datasheets',
          icon: <LayoutDashboard className="w-5 h-5 text-blue-600" />
        };
      case 'assistant':
        return {
          title: isFa ? 'دستیار هوش مصنوعی مهندسی (Gemini)' : 'AI Engineering Assistant',
          subtitle: isFa 
            ? 'استعلام پارت‌نامبرها، ضوابط NFPA و محاسبات سیستم‌های اطفاء و اعلام'
            : 'NFPA standards lookup, part numbers inquiry and technical calculations',
          icon: <MessageSquare className="w-5 h-5 text-purple-600" />
        };
      case 'proposal':
        return {
          title: isFa ? 'صدور پروپوزال و آنالیز قیمت' : 'Proposal & Pricing Engine',
          subtitle: isFa 
            ? 'تولید پیش‌فاکتور رسمی با اعمال ضرایب سود، گمرک و ارز'
            : 'Generate formal commercial proposals with custom multipliers',
          icon: <FileText className="w-5 h-5 text-indigo-600" />
        };
      case 'letters':
        return {
          title: isFa ? 'اتوماسیون نامه‌ها و مکاتبات اداری' : 'Engineering Letters Automation',
          subtitle: isFa 
            ? 'تنظیم و ویرایش نامه‌های فنی با دستیار هوشمند نگارش'
            : 'Compose and review formal technical letters and correspondence',
          icon: <FileSignature className="w-5 h-5 text-blue-600" />
        };
      case 'edms':
        return {
          title: isFa ? 'کنترل مدارک مهندسی و اسناد (EDMS / MDR)' : 'Engineering Document Control (EDMS)',
          subtitle: isFa 
            ? 'مدیریت ترانزمیتال‌ها، فایل‌های پروژه و ردیابی وضعیت مدارک'
            : 'Manage transmittals, master document registers and approvals',
          icon: <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
        };
      case 'database':
        return {
          title: isFa ? 'پایگاه داده و مدیریت مستقیم اقلام' : 'Equipment Database Management',
          subtitle: isFa 
            ? 'ویرایش گروهی، افزودن تجهیز جدید و مدیریت فیلدهای فنی'
            : 'Direct bulk editing and management of equipment catalog',
          icon: <Database className="w-5 h-5 text-slate-700" />
        };
      case 'users':
        return {
          title: isFa ? 'مدیریت کاربران و دسترسی‌ها' : 'User Accounts & Access',
          subtitle: isFa 
            ? 'تعریف کاربران جدید و کنترل سطوح دسترسی مهندسی و مدیریت'
            : 'Configure user credentials and authorization roles',
          icon: <Users className="w-5 h-5 text-blue-600" />
        };
      case 'admin-console':
        return {
          title: isFa ? 'مرکز کنترل و توسعه سیستم' : 'System Control & Dev Console',
          subtitle: isFa 
            ? 'مدیریت پایگاه دانش NFPA، موتور هوش مصنوعی و پشتیبان‌گیری'
            : 'Manage NFPA knowledge base, AI models, and database backups',
          icon: <Server className="w-5 h-5 text-emerald-600" />
        };
      default:
        return {
          title: isFa ? 'سامانه مهندسی F&G' : 'F&G System',
          subtitle: '',
          icon: <ShieldCheck className="w-5 h-5 text-blue-600" />
        };
    }
  };

  const pageInfo = getPageInfo();

  return (
    <header 
      className="w-full bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 py-3 sticky top-0 z-20 flex items-center justify-between shadow-2xs"
      dir={isFa ? 'rtl' : 'ltr'}
    >
      {/* Right side (RTL): Hamburger button on Mobile / Collapsible Drawer trigger on Desktop + Page Title */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Mobile menu trigger */}
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-xl text-slate-700 hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Open Navigation Menu"
        >
          <Menu className="w-6 h-6" />
        </button>

        {/* Desktop Collapsible Menu Trigger (وقتی نوار ابزار در حالت کشویی است) */}
        {sidebarMode === 'collapsible' && onToggleDrawer && (
          <button
            type="button"
            onClick={onToggleDrawer}
            className={`hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shrink-0 ${
              isDrawerOpen
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200/80 shadow-2xs'
            }`}
            title={isFa ? 'باز کردن منوی کشویی ابزارها' : 'Open Tools Navigation'}
          >
            <Menu className={`w-4 h-4 ${isDrawerOpen ? 'text-white' : 'text-blue-600'}`} />
            <span>{isFa ? 'منوی ابزارها' : 'Menu'}</span>
          </button>
        )}

        {/* Mobile Brand indicator (small screens only) */}
        <div className="flex sm:hidden items-center gap-2 shrink-0">
          <TransparentLogo src="/logo.png" alt="ISATIS" className="h-7 w-auto object-contain" tolerance={50} />
        </div>

        {/* Current Active Section Info */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="hidden sm:flex p-2 rounded-xl bg-slate-50 border border-slate-200/80 shrink-0">
            {pageInfo.icon}
          </div>
          <div className="flex flex-col min-w-0">
            <h1 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight truncate leading-tight">
              {pageInfo.title}
            </h1>
            <p className="text-[11px] text-slate-500 truncate hidden md:block mt-0.5">
              {pageInfo.subtitle}
            </p>
          </div>
        </div>
      </div>

      {/* Left side (RTL): Status & Quick Controls */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Sidebar Mode Switch on Desktop (انتخاب حالت کشویی یا پین منو) */}
        {setSidebarMode && (
          <button
            type="button"
            onClick={() => {
              const next = sidebarMode === 'pinned' ? 'collapsible' : 'pinned';
              setSidebarMode(next);
              localStorage.setItem('fg_sidebar_mode', next);
            }}
            className="hidden lg:flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all cursor-pointer min-h-[40px] shadow-2xs"
            title={
              sidebarMode === 'pinned'
                ? (isFa ? 'تغییر به حالت کشویی خودکار (فضای حداکثری)' : 'Switch to Collapsible Drawer')
                : (isFa ? 'پین کردن منوی ابزارها (حالت ستونی ثابت)' : 'Pin Navigation')
            }
          >
            {sidebarMode === 'pinned' ? (
              <>
                <Pin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="text-[11px] font-bold">{isFa ? 'منو: ثابت' : 'Pinned'}</span>
              </>
            ) : (
              <>
                <PanelRightClose className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="text-[11px] font-bold text-blue-700">{isFa ? 'منو: کشویی' : 'Drawer'}</span>
              </>
            )}
          </button>
        )}

        {/* System Online Badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/70 text-[11px] font-bold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>{isFa ? 'سیستم آنلاین' : 'Online'}</span>
        </div>

        {/* Archives Drawer Button */}
        <button
          type="button"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer min-h-[40px] ${
            isSidebarOpen
              ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-xs'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
          title={isFa ? 'پنل ارتقاء دیتابیس از طریق فایل' : 'Database Upgrade via File'}
        >
          <Archive className="w-4 h-4 text-blue-600 shrink-0" />
          <span className="hidden md:inline">{isFa ? 'ارتقاء دیتابیس با فایل' : 'Upgrade DB'}</span>
        </button>

        {/* Language switch */}
        <button
          type="button"
          onClick={() => setLang(isFa ? 'en' : 'fa')}
          className="hidden sm:flex items-center gap-1 px-2.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-bold transition-all cursor-pointer min-h-[40px]"
          title={isFa ? 'Switch to English' : 'تغییر به فارسی'}
        >
          <Globe className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-[11px]">{isFa ? 'EN' : 'فا'}</span>
        </button>
      </div>
    </header>
  );
};
