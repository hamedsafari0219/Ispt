import React from 'react';
import { motion } from 'motion/react';
import { 
  FileUp, 
  Sparkles, 
  RefreshCw, 
  Trash2, 
  MessageSquare, 
  FileText, 
  FileDown, 
  Database,
  UserCheck,
  X
} from 'lucide-react';
import { User, ChatArchive } from '../types';

interface SidebarProps {
  currentUser: User;
  chatArchives: ChatArchive[];
  currentChatId: number | null;
  documents: { id: number; file_name: string }[];
  uploadCategory: 'alarm' | 'fighting';
  setUploadCategory: (cat: 'alarm' | 'fighting') => void;
  feedFile: File | null;
  setFeedFile: (f: File | null) => void;
  isFeeding: boolean;
  feedSuccessMsg: string;
  feedErrorMsg: string;
  onSmartFeed: () => void;
  onStartNewChat: () => void;
  onLoadArchive: (archive: ChatArchive) => void;
  onDeleteArchive: (id: number, e: React.MouseEvent) => void;
  onSelectTab: (tab: 'assistant') => void;
  onCloseSidebar?: () => void;
  lang: 'fa' | 'en';
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentUser,
  chatArchives,
  currentChatId,
  documents,
  uploadCategory,
  setUploadCategory,
  feedFile,
  setFeedFile,
  isFeeding,
  feedSuccessMsg,
  feedErrorMsg,
  onSmartFeed,
  onStartNewChat,
  onLoadArchive,
  onDeleteArchive,
  onSelectTab,
  onCloseSidebar,
  lang
}) => {
  return (
    <>
      {/* Mobile Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 lg:hidden"
        onClick={onCloseSidebar}
      />

      {/* Sidebar Panel */}
      <motion.aside
        initial={{ x: lang === 'fa' ? '100%' : '-100%', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: lang === 'fa' ? '100%' : '-100%', opacity: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="fixed top-0 bottom-0 z-50 lg:static lg:z-20 w-80 max-w-[85vw] bg-white border-l border-slate-200/80 flex flex-col overflow-y-auto shrink-0 h-full p-4 sm:p-5 space-y-5 shadow-2xl lg:shadow-xs custom-scrollbar"
        dir={lang === 'fa' ? 'rtl' : 'ltr'}
      >
        {/* Header with Close Button */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <span className="text-xs font-bold text-slate-800">
            {lang === 'fa' ? 'پنل ارتقاء دیتابیس از طریق فایل' : 'Database Upgrade via File'}
          </span>
          <button
            type="button"
            onClick={onCloseSidebar}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            title={lang === 'fa' ? 'بستن پنل' : 'Close Panel'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Profile Card */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-4 text-white shadow-md relative overflow-hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-base shadow-sm shrink-0">
              {currentUser.username.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-bold text-white truncate">{currentUser.username}</h4>
              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-300">
                <span className="flex items-center gap-1">
                  <UserCheck className="w-3 h-3 text-blue-400" />
                  {currentUser.role === 'admin' ? (lang === 'fa' ? 'مدیر ارشد' : 'Admin') : (lang === 'fa' ? 'کارشناس فنی' : 'Engineer')}
                </span>
              </div>
            </div>
          </div>

          {/* Clearances info */}
          <div className="mt-3 pt-2.5 border-t border-slate-700/80 grid grid-cols-2 gap-2 text-[10px] text-slate-300">
            <div className="bg-slate-800/80 px-2 py-1 rounded-lg">
              <span>{lang === 'fa' ? 'دسترسی:' : 'Access:'} </span>
              <span className="font-semibold text-blue-300">
                {currentUser.system_access === 'both' ? (lang === 'fa' ? 'جامع' : 'Both') : currentUser.system_access}
              </span>
            </div>
            <div className="bg-slate-800/80 px-2 py-1 rounded-lg">
              <span>{lang === 'fa' ? 'استعلام قیمت:' : 'Pricing:'} </span>
              <span className={`font-semibold ${currentUser.price_access === 1 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {currentUser.price_access === 1 ? (lang === 'fa' ? 'مجاز' : 'Allowed') : (lang === 'fa' ? 'محرمانه' : 'Hidden')}
              </span>
            </div>
          </div>
        </div>

        {/* Smart Catalog Feeder */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>{lang === 'fa' ? 'استخراج و یادگیری کاتالوگ' : 'AI Catalog Feeder'}</span>
            </h3>
          </div>

          <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl space-y-3">
            <p className="text-[11px] text-slate-600 leading-relaxed">
              {lang === 'fa' 
                ? 'فایل کاتالوگ یا دیتاشیت را جهت پردازش هوشمند و استخراج پارت‌نامبرها آپلود کنید:' 
                : 'Upload datasheets or catalogs to parse equipment via AI:'}
            </p>

            <div className="space-y-2">
              {/* System select switch */}
              <div className="flex bg-white rounded-xl p-1 border border-slate-200 text-xs">
                <button
                  type="button"
                  onClick={() => setUploadCategory('alarm')}
                  className={`flex-1 text-[11px] font-semibold py-1.5 rounded-lg transition-all cursor-pointer ${
                    uploadCategory === 'alarm' 
                      ? 'bg-amber-500 text-white shadow-xs' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {lang === 'fa' ? 'اعلام حریق' : 'Fire Alarm'}
                </button>
                <button
                  type="button"
                  onClick={() => setUploadCategory('fighting')}
                  className={`flex-1 text-[11px] font-semibold py-1.5 rounded-lg transition-all cursor-pointer ${
                    uploadCategory === 'fighting' 
                      ? 'bg-emerald-600 text-white shadow-xs' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {lang === 'fa' ? 'اطفاء حریق' : 'Fire Fighting'}
                </button>
              </div>

              {/* File drop area */}
              <div className="relative">
                <input
                  type="file"
                  id="sidebar-db-feeder"
                  accept=".png,.jpg,.jpeg,.pdf"
                  onChange={(e) => setFeedFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <label
                  htmlFor="sidebar-db-feeder"
                  className="w-full flex flex-col items-center justify-center border border-dashed border-slate-300 rounded-xl p-3.5 hover:border-blue-500 bg-white transition-all cursor-pointer group"
                >
                  <FileUp className="w-5 h-5 text-blue-600 mb-1 group-hover:scale-110 transition-transform" />
                  <span className="text-[11px] text-slate-700 font-medium text-center truncate max-w-[200px]">
                    {feedFile ? feedFile.name : (lang === 'fa' ? 'انتخاب فایل (PDF / تصویر)' : 'Select PDF or Image')}
                  </span>
                </label>
              </div>

              {/* Response messages */}
              {feedSuccessMsg && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-800 font-medium whitespace-pre-line">
                  {feedSuccessMsg}
                </div>
              )}
              {feedErrorMsg && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-rose-700 font-medium">
                  {feedErrorMsg}
                </div>
              )}

              <button
                type="button"
                onClick={onSmartFeed}
                disabled={isFeeding || !feedFile}
                className={`w-full py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  isFeeding || !feedFile 
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                }`}
              >
                {isFeeding ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>{lang === 'fa' ? 'در حال تحلیل هوشمند...' : 'Analyzing Document...'}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{lang === 'fa' ? 'شروع استخراج هوشمند' : 'Process Document'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Uploaded Corpus Documents Download */}
        {documents.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              <span>{lang === 'fa' ? 'اسناد مرجع استخراج‌شده' : 'Document Corpus'}</span>
            </h3>
            <div className="max-h-28 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
              {documents.map((doc) => (
                <a
                  key={doc.id}
                  href={`/api/documents/download/${encodeURIComponent(doc.file_name)}`}
                  download
                  className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200/80 hover:bg-blue-50 hover:border-blue-200 transition-all text-xs text-slate-700 group"
                >
                  <span className="truncate max-w-[180px] text-[11px] font-medium" dir="ltr">{doc.file_name}</span>
                  <FileDown className="w-3.5 h-3.5 text-blue-600 shrink-0 opacity-70 group-hover:opacity-100" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Chat Archives */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
              <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
              <span>{lang === 'fa' ? 'تاریخچه گفتگوها' : 'Chat History'}</span>
            </h3>
            <button
              type="button"
              onClick={onStartNewChat}
              className="text-[11px] text-blue-600 font-semibold hover:underline cursor-pointer flex items-center gap-0.5"
            >
              ➕ {lang === 'fa' ? 'جدید' : 'New'}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
            {chatArchives.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400">
                {lang === 'fa' ? 'هیچ چتی آرشیو نشده است.' : 'No chat history found.'}
              </div>
            ) : (
              chatArchives.map((archive) => (
                <div
                  key={archive.id}
                  onClick={() => {
                    onLoadArchive(archive);
                    onSelectTab('assistant');
                    if (onCloseSidebar) onCloseSidebar();
                  }}
                  className={`p-2.5 rounded-xl border flex items-center justify-between group cursor-pointer transition-all ${
                    currentChatId === archive.id 
                      ? 'bg-blue-50/80 border-blue-200 text-blue-700 font-semibold shadow-xs' 
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-xs truncate pr-1 max-w-[180px]">
                    💬 {archive.title}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => onDeleteArchive(archive.id, e)}
                    className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-all"
                    title="حذف چت"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </motion.aside>
    </>
  );
};
