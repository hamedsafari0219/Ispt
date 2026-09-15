import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mail, 
  X, 
  Trash2, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  User, 
  FileText, 
  Search, 
  Filter,
  Eye,
  Send,
  Building,
  ShieldCheck
} from 'lucide-react';
import { EmailLog } from '../types';

interface EmailHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang?: 'fa' | 'en';
  isAdmin?: boolean;
}

export const EmailHistoryModal: React.FC<EmailHistoryModalProps> = ({
  isOpen,
  onClose,
  lang = 'fa',
  isAdmin = false
}) => {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<EmailLog | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/email/logs');
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (err) {
      console.error('Failed to load email logs', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
      setSelectedLog(null);
      setFeedback(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDeleteLog = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(lang === 'fa' ? 'آیا از حذف این رکورد لاگ مطمئن هستید؟' : 'Are you sure you want to delete this email log?')) return;

    try {
      const res = await fetch(`/api/email/logs/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setLogs(logs.filter(l => l.id !== id));
        if (selectedLog?.id === id) {
          setSelectedLog(null);
        }
        setFeedback(lang === 'fa' ? 'رکورد با موفقیت حذف گردید.' : 'Log record deleted successfully.');
      }
    } catch (err) {
      console.error('Delete error', err);
    }
  };

  const handleClearAll = async () => {
    if (!confirm(lang === 'fa' ? 'آیا از پاک‌سازی کلیه سوابق ایمیل اطمینان دارید؟ این عملیات غیرقابل بازگشت است.' : 'Are you sure you want to clear all email history?')) return;

    try {
      const res = await fetch('/api/email/clear-logs', { method: 'POST' });
      if (res.ok) {
        setLogs([]);
        setSelectedLog(null);
        setFeedback(lang === 'fa' ? 'کلیه سوابق پاک‌سازی شدند.' : 'All logs cleared.');
      }
    } catch (err) {
      console.error('Clear logs error', err);
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      (log.to && log.to.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (log.subject && log.subject.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (log.sent_by && log.sent_by.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesType = selectedType === 'all' || log.type === selectedType;
    return matchesSearch && matchesType;
  });

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden text-slate-800 dark:text-slate-100"
          dir={lang === 'fa' ? 'rtl' : 'ltr'}
        >
          {/* Header */}
          <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white flex items-center justify-between border-b border-indigo-500/20">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-500/20 rounded-xl border border-indigo-400/30 text-indigo-300">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold">
                  {lang === 'fa' ? 'آرشیو و سوابق ایمیل‌های ارسالی' : 'Sent Emails Archive & History'}
                </h2>
                <p className="text-xs text-indigo-200/80">
                  {lang === 'fa' ? `تعداد کل سوابق ثبت‌شده: ${logs.length} مورد` : `Total recorded emails: ${logs.length}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={fetchLogs}
                className="p-2 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                title={lang === 'fa' ? 'بروزرسانی' : 'Refresh'}
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              {isAdmin && logs.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="px-3 py-1.5 bg-rose-600/80 hover:bg-rose-600 text-white text-xs rounded-xl font-semibold transition-colors flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{lang === 'fa' ? 'پاک‌سازی لاگ‌ها' : 'Clear All'}</span>
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Feedback banner */}
          {feedback && (
            <div className="px-6 py-2.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300 text-xs font-semibold flex items-center justify-between">
              <span>{feedback}</span>
              <button onClick={() => setFeedback(null)} className="text-indigo-500 hover:text-indigo-800">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Search & Filter Bar */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex-1 min-w-[240px] relative">
              <Search className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={lang === 'fa' ? 'جستجو بر اساس گیرنده، موضوع یا کاربر فرستنده...' : 'Search by recipient, subject, or sender...'}
                className="w-full pl-3 pr-9 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium"
              >
                <option value="all">{lang === 'fa' ? 'همه انواع ایمیل' : 'All Types'}</option>
                <option value="proposal">{lang === 'fa' ? 'پروپوزال‌های فنی و مالی' : 'Proposals'}</option>
                <option value="letter">{lang === 'fa' ? 'نامه‌های اداری' : 'Letters'}</option>
                <option value="equipment">{lang === 'fa' ? 'مشخصات تجهیزات' : 'Equipment Specs'}</option>
                <option value="custom">{lang === 'fa' ? 'مکاتبات متفرقه' : 'Custom'}</option>
              </select>
            </div>
          </div>

          {/* 2-Column Split View: List on left, Details on right */}
          <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x md:divide-x-reverse divide-slate-200 dark:divide-slate-800">
            
            {/* Logs List */}
            <div className="md:col-span-5 overflow-y-auto p-4 space-y-2 max-h-[60vh] md:max-h-none">
              {filteredLogs.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs space-y-2">
                  <Mail className="w-8 h-8 mx-auto opacity-40 text-slate-400" />
                  <p>{lang === 'fa' ? 'هیچ رکوردی یافت نشد.' : 'No email records found.'}</p>
                </div>
              ) : (
                filteredLogs.map((log) => {
                  const isSelected = selectedLog?.id === log.id;
                  return (
                    <div
                      key={log.id}
                      onClick={() => setSelectedLog(log)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-2 ${
                        isSelected 
                          ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-500/20' 
                          : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/70 hover:border-indigo-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.type === 'proposal' ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200' :
                            log.type === 'letter' ? 'bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200' :
                            log.type === 'equipment' ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200' :
                            'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                          }`}>
                            {log.type === 'proposal' ? (lang === 'fa' ? 'پروپوزال' : 'Proposal') :
                             log.type === 'letter' ? (lang === 'fa' ? 'نامه اداری' : 'Letter') :
                             log.type === 'equipment' ? (lang === 'fa' ? 'تجهیز' : 'Equipment') :
                             (lang === 'fa' ? 'سفارشی' : 'Custom')}
                          </span>

                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 ${
                            log.status === 'sent' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                            log.status === 'simulated' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                            'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          }`}>
                            {log.status === 'sent' ? <CheckCircle2 className="w-3 h-3" /> :
                             log.status === 'simulated' ? <Clock className="w-3 h-3" /> :
                             <AlertCircle className="w-3 h-3" />}
                            <span>
                              {log.status === 'sent' ? (lang === 'fa' ? 'ارسال شد' : 'Sent') :
                               log.status === 'simulated' ? (lang === 'fa' ? 'شبیه‌سازی' : 'Simulated') :
                               (lang === 'fa' ? 'ناموفق' : 'Failed')}
                            </span>
                          </span>
                        </div>

                        {isAdmin && (
                          <button
                            onClick={(e) => handleDeleteLog(log.id, e)}
                            className="text-slate-400 hover:text-rose-500 p-1 transition-colors"
                            title={lang === 'fa' ? 'حذف' : 'Delete'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="font-bold text-xs text-slate-900 dark:text-white line-clamp-1">
                        {log.subject}
                      </div>

                      <div className="text-[11px] text-slate-500 flex items-center justify-between">
                        <span className="truncate max-w-[180px]">گیرنده: {log.to}</span>
                        <span>{new Date(log.sent_at).toLocaleDateString(lang === 'fa' ? 'fa-IR' : 'en-US')}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Log Details Viewer */}
            <div className="md:col-span-7 p-6 overflow-y-auto max-h-[60vh] md:max-h-none space-y-4 bg-slate-50/50 dark:bg-slate-900/50">
              {selectedLog ? (
                <div className="space-y-4">
                  {/* Detailed Meta Header */}
                  <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      {selectedLog.subject}
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-3 text-xs text-slate-600 dark:text-slate-300 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                      <div><strong>{lang === 'fa' ? 'گیرنده (To):' : 'To:'}</strong> <span className="text-blue-600 dark:text-blue-400">{selectedLog.to}</span></div>
                      {selectedLog.cc && <div><strong>{lang === 'fa' ? 'رونوشت (Cc):' : 'Cc:'}</strong> {selectedLog.cc}</div>}
                      <div><strong>{lang === 'fa' ? 'ارسال‌کننده:' : 'Sent By:'}</strong> {selectedLog.sent_by}</div>
                      <div><strong>{lang === 'fa' ? 'زمان ارسال:' : 'Time:'}</strong> {new Date(selectedLog.sent_at).toLocaleString(lang === 'fa' ? 'fa-IR' : 'en-US')}</div>
                      <div>
                        <strong>{lang === 'fa' ? 'وضعیت:' : 'Status:'}</strong>{' '}
                        <span className="font-bold">
                          {selectedLog.status === 'sent' ? 'ارسال موفق با SMTP' :
                           selectedLog.status === 'simulated' ? 'ثبت در شبیه‌سازی سیستم' : 'خطا در ارسال'}
                        </span>
                      </div>
                    </div>

                    {selectedLog.error_message && (
                      <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 text-rose-800 dark:text-rose-300 text-xs mt-2">
                        <strong>توضیحات خطا/سیستم:</strong> {selectedLog.error_message}
                      </div>
                    )}
                  </div>

                  {/* Body Content */}
                  <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="font-bold text-xs text-slate-700 dark:text-slate-300">
                      {lang === 'fa' ? 'متن ارسالی:' : 'Email Body:'}
                    </div>
                    <div className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-line bg-slate-50 dark:bg-slate-900/60 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                      {selectedLog.body || '(متنی ثبت نشده است)'}
                    </div>
                  </div>

                  {/* HTML Email Template Preview */}
                  {selectedLog.html_body && (
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                      <div className="font-bold text-xs text-slate-700 dark:text-slate-300 flex items-center justify-between">
                        <span>{lang === 'fa' ? 'پیش‌نمایش محتوای قالب HTML:' : 'HTML Template Content Preview:'}</span>
                        <span className="text-[10px] text-slate-400 font-normal">{lang === 'fa' ? 'قالب تعبیه شده' : 'Embedded layout'}</span>
                      </div>
                      <div className="border border-slate-200 rounded-lg overflow-hidden max-h-[300px] overflow-y-auto bg-white">
                        <iframe
                          srcDoc={selectedLog.html_body}
                          title="Email HTML Preview"
                          className="w-full min-h-[350px] border-none"
                        />
                      </div>
                    </div>
                  )}

                </div>
              ) : (
                <div className="text-center py-20 text-slate-400 text-xs space-y-2">
                  <Eye className="w-8 h-8 mx-auto opacity-30" />
                  <p>{lang === 'fa' ? 'برای مشاهده جزئیات، یکی از ایمیل‌ها را از لیست انتخاب فرمایید.' : 'Select an email from the list to inspect details.'}</p>
                </div>
              )}
            </div>

          </div>

          {/* Footer */}
          <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors"
            >
              {lang === 'fa' ? 'بستن' : 'Close'}
            </button>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
};
