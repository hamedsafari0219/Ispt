import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Activity,
  Database,
  Cpu,
  BookOpen,
  Settings,
  ShieldAlert,
  Download,
  Upload,
  RefreshCw,
  Plus,
  Trash2,
  Edit,
  CheckCircle2,
  AlertTriangle,
  Server,
  KeyRound,
  FileCode2,
  HardDrive,
  Clock,
  Sparkles,
  Search,
  Check,
  X,
  ExternalLink,
  Layers,
  FileSpreadsheet
} from 'lucide-react';
import { User, AIConfig, SystemSettings, KnowledgeBase, AuditLog, SystemHealthStats } from '../types';
import { authenticatedFetch } from '../utils/api';

interface AdminConsoleViewProps {
  currentUser: User;
  lang: 'fa' | 'en';
}

export const AdminConsoleView: React.FC<AdminConsoleViewProps> = ({ currentUser, lang }) => {
  const isFa = lang === 'fa';
  const [activeTab, setActiveTab] = useState<'overview' | 'backup' | 'ai-models' | 'knowledge-base' | 'settings' | 'logs'>('overview');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Stats state
  const [stats, setStats] = useState<SystemHealthStats | null>(null);

  // AI Config state
  const [aiConfig, setAiConfig] = useState<AIConfig>({
    api_key: '',
    base_url: 'https://openrouter.ai/api/v1',
    model_name: 'gemini-3.5-flash',
    provider: 'gemini',
    temperature: 0.3,
    max_tokens: 2048,
    system_prompt_overrides: {
      assistant: '',
      letters: '',
      proposals: ''
    }
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [aiTestResult, setAiTestResult] = useState<{ success: boolean; latencyMs?: number; message?: string; response?: string } | null>(null);
  const [isTestingAi, setIsTestingAi] = useState(false);

  // System Settings state
  const [settings, setSettings] = useState<SystemSettings>({
    company_name_fa: 'شرکت مهندسی ایساتیس پارس تجهیز',
    company_name_en: 'Isatis Pars Tajhiz Engineering Co.',
    company_tagline: 'طراحی، مشاوره، تامین و اجرای سیستم‌های اعلام و اطفاء حریق تخصصی (F&G)',
    company_phone: '+98 21 88997766',
    company_email: 'info@isatis-fg.ir',
    company_website: 'www.isatis-fg.ir',
    company_address: 'تهران، خیابان ولیعصر، برج مهندسی، طبقه ۶، واحد ۶۰۲',
    ceo_name: 'مهندس حسینی',
    technical_manager: 'دپارتمان مهندسی F&G',
    default_multipliers: {
      customsFactor: 1.15,
      logisticsFactor: 1.05,
      overheadProfit: 1.20,
      currencyRisk: 1.05,
      discountFactor: 0.95
    },
    default_proposal_terms: {
      warranty: '۱۲ ماه گارانتی تعویض و ۱۰ سال خدمات پس از فروش و تامین قطعات یدکی',
      paymentTerms: '۵۰٪ پیش‌پرداخت هنگام عقد قرارداد، ۴۰٪ هنگام تحویل کالا، ۱۰٪ پس از راه‌اندازی و تایید نهایی',
      validityDays: 14,
      deliveryTime: '۴ الی ۶ هفته کاری پس از دریافت پیش‌پرداخت'
    }
  });

  // Knowledge Base state
  const [kbList, setKbList] = useState<KnowledgeBase[]>([]);
  const [kbSearch, setKbSearch] = useState('');
  const [kbFilter, setKbFilter] = useState<'all' | 'alarm' | 'fighting'>('all');
  const [isKbModalOpen, setIsKbModalOpen] = useState(false);
  const [editingKb, setEditingKb] = useState<KnowledgeBase | null>(null);
  const [kbFormData, setKbFormData] = useState<Omit<KnowledgeBase, 'id'>>({
    concept: '',
    details: '',
    system_type: 'both',
    keywords: '',
    source_file: 'admin_console'
  });

  // Audit Logs state
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [logSearch, setLogSearch] = useState('');

  // Backup restore state
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoreMode, setRestoreMode] = useState<'merge' | 'overwrite'>('merge');
  const [isRestoring, setIsRestoring] = useState(false);

  // Auto-dismiss alert messages
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  useEffect(() => {
    if (errorMsg) {
      const timer = setTimeout(() => setErrorMsg(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMsg]);

  // Initial Data Fetching
  const fetchAllData = async () => {
    setLoading(true);
    try {
      // 1. Fetch stats
      const statsRes = await authenticatedFetch('/api/admin/stats');
      if (statsRes.ok) {
        const sData = await statsRes.json();
        setStats(sData);
      }

      // 2. Fetch AI config
      const aiRes = await authenticatedFetch('/api/ai/config');
      if (aiRes.ok) {
        const aData = await aiRes.json();
        setAiConfig(prev => ({
          ...prev,
          ...aData,
          api_key: aData.api_key || ''
        }));
      }

      // 3. Fetch Settings
      const settingsRes = await authenticatedFetch('/api/admin/settings');
      if (settingsRes.ok) {
        const sData = await settingsRes.json();
        setSettings(sData);
      }

      // 4. Fetch KB
      const kbRes = await authenticatedFetch('/api/admin/knowledge-base');
      if (kbRes.ok) {
        const kData = await kbRes.json();
        setKbList(kData);
      }

      // 5. Fetch Logs
      const logsRes = await authenticatedFetch('/api/admin/audit-logs');
      if (logsRes.ok) {
        const lData = await logsRes.json();
        setLogs(lData);
      }
    } catch (err: any) {
      console.error('Error fetching admin console data:', err);
      setErrorMsg(isFa ? 'خطا در بارگذاری اطلاعات مرکز کنترل' : 'Error loading admin console data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Save AI Config
  const handleSaveAiConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authenticatedFetch('/api/ai/config', {
        method: 'POST',
        body: JSON.stringify(aiConfig)
      });
      if (res.ok) {
        const updated = await res.json();
        setAiConfig(prev => ({ ...prev, ...updated }));
        setSuccessMsg(isFa ? 'تنظیمات هوش مصنوعی با موفقیت ذخیره شد.' : 'AI Configuration saved successfully.');
      } else {
        const err = await res.json();
        setErrorMsg(err.error || (isFa ? 'خطا در ذخیره تنظیمات هوش مصنوعی' : 'Error saving AI configuration'));
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error saving AI config');
    } finally {
      setLoading(false);
    }
  };

  // Test AI Connection
  const handleTestAi = async () => {
    setIsTestingAi(true);
    setAiTestResult(null);
    try {
      const res = await authenticatedFetch('/api/admin/ai/test', {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAiTestResult({
          success: true,
          latencyMs: data.latencyMs,
          message: isFa ? `اتصال موفق به مدل ${data.model} در زمان ${data.latencyMs} میلی‌ثانیه` : `Connected successfully to ${data.model} in ${data.latencyMs}ms`,
          response: data.response
        });
      } else {
        setAiTestResult({
          success: false,
          latencyMs: data.latencyMs,
          message: data.error || (isFa ? 'عدم پاسخگویی مدل هوش مصنوعی' : 'No response from model')
        });
      }
    } catch (err: any) {
      setAiTestResult({
        success: false,
        message: err.message || 'Connection failed'
      });
    } finally {
      setIsTestingAi(false);
    }
  };

  // Save System Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authenticatedFetch('/api/admin/settings', {
        method: 'POST',
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        const updated = await res.json();
        setSettings(updated);
        setSuccessMsg(isFa ? 'اطلاعات شرکتی و ضرایب مالی با موفقیت ذخیره شد.' : 'Company settings & defaults saved.');
      } else {
        const err = await res.json();
        setErrorMsg(err.error || (isFa ? 'خطا در ذخیره تنظیمات' : 'Error saving settings'));
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  // Save Knowledge Base item (Create or Update)
  const handleSaveKb = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kbFormData.concept.trim() || !kbFormData.details.trim()) {
      setErrorMsg(isFa ? 'لطفاً عنوان و متن قانون/مفهوم را تکمیل کنید.' : 'Please fill title and details.');
      return;
    }

    try {
      if (editingKb) {
        const res = await authenticatedFetch(`/api/admin/knowledge-base/${editingKb.id}`, {
          method: 'PUT',
          body: JSON.stringify(kbFormData)
        });
        if (res.ok) {
          const updated = await res.json();
          setKbList(prev => prev.map(k => k.id === editingKb.id ? updated : k));
          setSuccessMsg(isFa ? 'مفهوم پایگاه دانش با موفقیت ویرایش شد.' : 'Knowledge base item updated.');
          setIsKbModalOpen(false);
          setEditingKb(null);
        }
      } else {
        const res = await authenticatedFetch('/api/admin/knowledge-base', {
          method: 'POST',
          body: JSON.stringify(kbFormData)
        });
        if (res.ok) {
          const created = await res.json();
          setKbList(prev => [created, ...prev]);
          setSuccessMsg(isFa ? 'مفهوم جدید به پایگاه دانش اضافه گردید.' : 'New knowledge item added.');
          setIsKbModalOpen(false);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error');
    }
  };

  // Delete Knowledge Base item
  const handleDeleteKb = async (id: number) => {
    if (!window.confirm(isFa ? 'آیا از حذف این استاندارد از حافظه هوش مصنوعی مطمئن هستید؟' : 'Are you sure you want to delete this rule?')) return;
    try {
      const res = await authenticatedFetch(`/api/admin/knowledge-base/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setKbList(prev => prev.filter(k => k.id !== id));
        setSuccessMsg(isFa ? 'مفهوم مورد نظر حذف شد.' : 'Item deleted.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error deleting item');
    }
  };

  // Export Full Backup
  const handleExportBackup = async () => {
    try {
      const token = localStorage.getItem('isatis_auth_token');
      const res = await fetch('/api/admin/backup/export', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `isatis_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setSuccessMsg(isFa ? 'فایل نسخه پشتیبان با موفقیت دانلود شد.' : 'Backup downloaded successfully.');
      fetchAllData();
    } catch (err: any) {
      setErrorMsg(isFa ? 'خطا در دریافت فایل پشتیبان' : 'Error exporting backup');
    }
  };

  // Import Full Backup
  const handleImportBackup = async () => {
    if (!restoreFile) {
      setErrorMsg(isFa ? 'لطفاً فایل پشتیبان با پسوند json. را انتخاب کنید.' : 'Please select a json backup file.');
      return;
    }

    if (restoreMode === 'overwrite' && !window.confirm(isFa ? 'هشدار جدی: حالت جایگزینی کامل، داده‌های قبلی را با داده‌های فایل بازنویسی می‌کند. آیا مایل به ادامه هستید؟' : 'Warning: Overwrite mode will replace current records. Continue?')) {
      return;
    }

    setIsRestoring(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const content = e.target?.result as string;
          const parsed = JSON.parse(content);

          const res = await authenticatedFetch('/api/admin/backup/import', {
            method: 'POST',
            body: JSON.stringify({
              backupData: parsed,
              mode: restoreMode
            })
          });

          if (res.ok) {
            const data = await res.json();
            setSuccessMsg(data.message || (isFa ? 'بازیابی با موفقیت انجام شد.' : 'Restore completed.'));
            setRestoreFile(null);
            fetchAllData();
          } else {
            const err = await res.json();
            setErrorMsg(err.error || (isFa ? 'خطا در بازیابی' : 'Restore failed'));
          }
        } catch (parseErr: any) {
          setErrorMsg(isFa ? 'فرمت فایل پشتیبان نامعتبر است.' : 'Invalid JSON file format.');
        } finally {
          setIsRestoring(false);
        }
      };
      reader.readAsText(restoreFile);
    } catch (err: any) {
      setIsRestoring(false);
      setErrorMsg(err.message || 'Restore failed');
    }
  };

  // Filtered KB List
  const filteredKb = kbList.filter(k => {
    const matchesSearch = !kbSearch || 
      k.concept.toLowerCase().includes(kbSearch.toLowerCase()) || 
      k.details.toLowerCase().includes(kbSearch.toLowerCase()) ||
      k.keywords.toLowerCase().includes(kbSearch.toLowerCase());
    const matchesType = kbFilter === 'all' || k.system_type === kbFilter || k.system_type === 'both';
    return matchesSearch && matchesType;
  });

  // Filtered Logs
  const filteredLogs = logs.filter(l => {
    if (!logSearch) return true;
    const term = logSearch.toLowerCase();
    return l.action.toLowerCase().includes(term) || 
           l.username.toLowerCase().includes(term) || 
           l.details.toLowerCase().includes(term);
  });

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-6" dir={isFa ? 'rtl' : 'ltr'}>
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-2xl p-6 text-white shadow-xl border border-slate-700/60 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-blue-600/30 border border-blue-400/30 rounded-xl text-blue-400">
                <Server className="w-6 h-6" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                {isFa ? 'مرکز کنترل و توسعه سیستم' : 'System Control & Dev Console'}
              </h1>
              <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs px-2.5 py-0.5 rounded-full font-bold">
                {isFa ? 'بدون نیاز به سرور' : 'No Server SSH Needed'}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
              {isFa 
                ? 'مدیریت و توسعه درون‌برنامه‌ای دیتابیس، تنظیمات هوش مصنوعی، پایگاه دانش استانداردهای NFPA، ضرایب مالی و پشتیبان‌گیری بدون نیاز به دسترسی مستقیم خط فرمان سرور.'
                : 'Complete in-app administration for database, AI inference models, NFPA knowledge base, commercial multipliers, and zero-downtime backup & restore.'}
            </p>
          </div>

          <button
            onClick={fetchAllData}
            disabled={loading}
            className="self-start md:self-auto flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold text-white transition-all cursor-pointer shadow-sm active:scale-95 shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>{isFa ? 'بروزرسانی داده‌ها' : 'Refresh State'}</span>
          </button>
        </div>
      </div>

      {/* Notifications / Alerts */}
      <AnimatePresence>
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold shadow-xs"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </motion.div>
        )}

        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-3 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold shadow-xs"
          >
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Tab Navigation */}
      <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap gap-1">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[42px] ${
            activeTab === 'overview'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>{isFa ? 'وضعیت و سلامت سامانه' : 'Health & Telemetry'}</span>
        </button>

        <button
          onClick={() => setActiveTab('backup')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[42px] ${
            activeTab === 'backup'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>{isFa ? 'پشتیبان‌گیری و بازیابی داده‌ها' : 'Backup & Restore'}</span>
        </button>

        <button
          onClick={() => setActiveTab('ai-models')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[42px] ${
            activeTab === 'ai-models'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Cpu className="w-4 h-4" />
          <span>{isFa ? 'پیکربندی هوش مصنوعی و پرامپت‌ها' : 'AI & Prompts Config'}</span>
        </button>

        <button
          onClick={() => setActiveTab('knowledge-base')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[42px] ${
            activeTab === 'knowledge-base'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>{isFa ? 'پایگاه دانش استانداردهای RAG' : 'NFPA Knowledge Base'}</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[42px] ${
            activeTab === 'settings'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>{isFa ? 'اطلاعات شرکت و ضرایب مالی' : 'Company & Multipliers'}</span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[42px] ${
            activeTab === 'logs'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>{isFa ? 'لاگ‌ها و ردپای امنیتی' : 'Audit Logs'}</span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW & HEALTH TELEMETRY */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl border border-amber-100">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-black text-slate-800">
                  {stats?.counts.equipment ?? 0}
                </div>
                <div className="text-[11px] font-medium text-slate-500">
                  {isFa ? 'تجهیزات اعلام و اطفاء' : 'Total Equipment'}
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-black text-slate-800">
                  {stats?.counts.proposals ?? 0}
                </div>
                <div className="text-[11px] font-medium text-slate-500">
                  {isFa ? 'پروپوزال‌های فنی-مالی' : 'Saved Proposals'}
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-black text-slate-800">
                  {stats?.counts.knowledge_base ?? 0}
                </div>
                <div className="text-[11px] font-medium text-slate-500">
                  {isFa ? 'قوانین و استانداردهای NFPA' : 'NFPA RAG Rules'}
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-black text-slate-800">
                  {stats?.system.uptime ?? '0h'}
                </div>
                <div className="text-[11px] font-medium text-slate-500">
                  {isFa ? 'مدت زمان فعالیت پیوسته' : 'System Uptime'}
                </div>
              </div>
            </div>
          </div>

          {/* Detailed System Health Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Database & Storage Health */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-5 h-5 text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-800">
                    {isFa ? 'وضعیت پایگاه داده و ذخیره‌سازی' : 'Database & Storage Health'}
                  </h3>
                </div>
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] px-2.5 py-0.5 rounded-full font-bold">
                  {isFa ? 'آنلاین و پایدار' : 'Healthy / Online'}
                </span>
              </div>

              <div className="space-y-3 text-xs text-slate-600">
                <div className="flex justify-between py-1.5 border-b border-slate-50">
                  <span>{isFa ? 'موتور دیتابیس:' : 'Database Engine:'}</span>
                  <span className="font-bold text-slate-800">High-Performance Atomic JSON Store</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-50">
                  <span>{isFa ? 'حجم دیتابیس روی دیسک:' : 'Database File Size:'}</span>
                  <span className="font-bold text-blue-600">{stats?.database.fileSizeKb ?? 0} KB</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-50">
                  <span>{isFa ? 'تعداد کاربران فعال:' : 'Active Users:'}</span>
                  <span className="font-bold text-slate-800">{stats?.counts.users ?? 0}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-50">
                  <span>{isFa ? 'تعداد نامه‌های اتوماسیون:' : 'Letters Archived:'}</span>
                  <span className="font-bold text-slate-800">{stats?.counts.letters ?? 0}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span>{isFa ? 'اسناد کاتالوگ تحلیل‌شده:' : 'Catalog Corpora:'}</span>
                  <span className="font-bold text-slate-800">{stats?.counts.documents ?? 0}</span>
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  onClick={handleExportBackup}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-xs transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>{isFa ? 'دانلود نسخه پشتیبان' : 'Export Full Backup'}</span>
                </button>
              </div>
            </div>

            {/* Runtime & Node Process Telemetry */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-sm font-bold text-slate-800">
                    {isFa ? 'مصرف حافظه و مشخصات سرور' : 'Runtime & Memory Telemetry'}
                  </h3>
                </div>
                <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-[11px] px-2.5 py-0.5 rounded-full font-bold">
                  {stats?.system.nodeVersion || 'Node.js'}
                </span>
              </div>

              <div className="space-y-3 text-xs text-slate-600">
                <div>
                  <div className="flex justify-between mb-1.5">
                    <span>{isFa ? 'مصرف حافظه هیپ (Heap Used):' : 'Heap Memory Used:'}</span>
                    <span className="font-bold text-slate-800">
                      {stats?.system.heapUsedMb ?? 0} MB / {stats?.system.heapTotalMb ?? 0} MB
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-indigo-600 h-2 rounded-full transition-all duration-500" 
                      style={{ width: `${Math.min(100, Math.round(((stats?.system.heapUsedMb || 1) / (stats?.system.heapTotalMb || 100)) * 100))}%` }}
                    />
                  </div>
                </div>

                <div className="flex justify-between py-1.5 border-b border-slate-50">
                  <span>{isFa ? 'سیستم‌عامل و معماری:' : 'Platform & Arch:'}</span>
                  <span className="font-bold text-slate-800">{stats?.system.platform} ({stats?.system.arch})</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-50">
                  <span>{isFa ? 'ارائه‌دهنده فعال هوش مصنوعی:' : 'Active AI Model:'}</span>
                  <span className="font-bold text-blue-600">{aiConfig.model_name || 'gemini-3.5-flash'}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span>{isFa ? 'کلید API هوش مصنوعی:' : 'AI Key Status:'}</span>
                  <span className={`font-bold ${aiConfig.has_api_key ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {aiConfig.has_api_key ? (isFa ? 'فعال و پیکربندی شده' : 'Configured') : (isFa ? 'تنظیم نشده (Gemini پیش‌فرض)' : 'Default')}
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleTestAi}
                  disabled={isTestingAi}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold text-xs transition-colors cursor-pointer"
                >
                  <Sparkles className={`w-4 h-4 ${isTestingAi ? 'animate-spin' : ''}`} />
                  <span>{isTestingAi ? (isFa ? 'در حال تست هوش مصنوعی...' : 'Testing Model...') : (isFa ? 'تست اتصال هوش مصنوعی' : 'Test AI Connection')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: BACKUP & RESTORE */}
      {activeTab === 'backup' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Export Full Backup Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
                <Download className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  {isFa ? 'دریافت فایل پشتیبان کامل (Export Backup)' : 'Export Full Backup'}
                </h3>
                <p className="text-xs text-slate-500">
                  {isFa 
                    ? 'دانلود فوری کلیه داده‌های کاتالوگ، کاربران، نامه‌ها، پروپوزال‌ها، پایگاه دانش و تنظیمات در قالب یک فایل استاندارد JSON'
                    : 'Download a complete JSON snapshot containing all equipment, letters, proposals, users, and settings.'}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-2 text-slate-600">
              <div className="flex items-center gap-2 font-bold text-slate-700">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>{isFa ? 'پشتیبان‌گیری آنی و بدون قطعی سیستم' : 'Zero-downtime snapshot'}</span>
              </div>
              <div className="flex items-center gap-2 font-bold text-slate-700">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>{isFa ? 'رمزنگاری و حفاظت از کلمات عبور' : 'Hashed credentials preserved safely'}</span>
              </div>
              <div className="flex items-center gap-2 font-bold text-slate-700">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>{isFa ? 'قابل انتقال به سرورها یا سیستم‌های دیگر' : 'Full cross-instance portability'}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleExportBackup}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{isFa ? 'دانلود فایل پشتیبان (JSON)' : 'Download Backup File (JSON)'}</span>
            </button>
          </div>

          {/* Import / Restore Backup Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  {isFa ? 'بازیابی داده‌ها از فایل پشتیبان (Restore)' : 'Restore from Backup'}
                </h3>
                <p className="text-xs text-slate-500">
                  {isFa ? 'بازگرداندن اطلاعات سیستم بدون نیاز به ورود به ترمینال یا سرور' : 'Restore system data from a previously exported JSON backup file.'}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {isFa ? 'انتخاب حالت بازیابی:' : 'Restore Mode:'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRestoreMode('merge')}
                    className={`p-3 rounded-xl border text-xs font-bold text-right transition-all cursor-pointer ${
                      restoreMode === 'merge'
                        ? 'border-blue-500 bg-blue-50/50 text-blue-700 shadow-xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-bold">{isFa ? 'ادغام اقلام (Merge)' : 'Merge (Recommended)'}</div>
                    <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                      {isFa ? 'افزودن اقلام جدید بدون حذف داده‌های فعلی' : 'Add new items without deleting existing'}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRestoreMode('overwrite')}
                    className={`p-3 rounded-xl border text-xs font-bold text-right transition-all cursor-pointer ${
                      restoreMode === 'overwrite'
                        ? 'border-rose-500 bg-rose-50/50 text-rose-700 shadow-xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-bold text-rose-700">{isFa ? 'جایگزینی کامل (Overwrite)' : 'Full Overwrite'}</div>
                    <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                      {isFa ? 'جایگزینی کامل تمام جداول با داده‌های فایل' : 'Replace all tables with backup data'}
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {isFa ? 'انتخاب فایل JSON پشتیبان:' : 'Select JSON Backup File:'}
                </label>
                <input
                  type="file"
                  accept=".json"
                  onChange={(e) => setRestoreFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-500 file:mr-2 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer border border-slate-200 rounded-xl p-1"
                />
              </div>

              <button
                type="button"
                onClick={handleImportBackup}
                disabled={!restoreFile || isRestoring}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                <Upload className={`w-4 h-4 ${isRestoring ? 'animate-spin' : ''}`} />
                <span>{isRestoring ? (isFa ? 'در حال بازیابی...' : 'Restoring...') : (isFa ? 'شروع بازیابی اطلاعات' : 'Start Restore Process')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: AI & PROMPT ENGINEERING CONFIG */}
      {activeTab === 'ai-models' && (
        <form onSubmit={handleSaveAiConfig} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-800">
                {isFa ? 'تنظیمات موتور هوش مصنوعی و پرامپت‌ها' : 'AI Engine & Prompt Engineering'}
              </h3>
              <p className="text-xs text-slate-500">
                {isFa ? 'امکان تغییر آزادانه ارائه‌دهنده، مدل، پرامپت‌های سیستمی و دمای پاسخ‌دهی' : 'Switch providers, models, temperature and custom system prompt overrides.'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTestAi}
                disabled={isTestingAi}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isTestingAi ? 'animate-spin' : ''}`} />
                <span>{isFa ? 'تست زنده اتصال' : 'Live Ping Test'}</span>
              </button>
            </div>
          </div>

          {/* Test Result Banner */}
          {aiTestResult && (
            <div className={`p-4 rounded-xl text-xs flex items-start gap-3 border ${
              aiTestResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              {aiTestResult.success ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" /> : <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />}
              <div className="space-y-1">
                <div className="font-bold">{aiTestResult.message}</div>
                {aiTestResult.response && (
                  <div className="font-mono text-[11px] bg-white/80 p-2 rounded border border-emerald-200">
                    {aiTestResult.response}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Provider */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {isFa ? 'ارائه‌دهنده هوش مصنوعی (Provider):' : 'AI Provider:'}
              </label>
              <select
                value={aiConfig.provider || 'gemini'}
                onChange={(e) => {
                  const val = e.target.value;
                  let defBase = aiConfig.base_url;
                  let defModel = aiConfig.model_name;
                  if (val === 'gemini') {
                    defBase = 'https://generativelanguage.googleapis.com';
                    defModel = 'gemini-3.5-flash';
                  } else if (val === 'openrouter') {
                    defBase = 'https://openrouter.ai/api/v1';
                    defModel = 'google/gemini-2.0-flash-001';
                  } else if (val === 'openai') {
                    defBase = 'https://api.openai.com/v1';
                    defModel = 'gpt-4o-mini';
                  } else if (val === 'deepseek') {
                    defBase = 'https://api.deepseek.com/v1';
                    defModel = 'deepseek-chat';
                  }
                  setAiConfig({ ...aiConfig, provider: val, base_url: defBase, model_name: defModel });
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs bg-white text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 outline-hidden"
              >
                <option value="gemini">Google Gemini (پیش‌فرض)</option>
                <option value="openrouter">OpenRouter.ai (پشتیبانی از تمام مدل‌ها)</option>
                <option value="openai">OpenAI (ChatGPT / GPT-4o)</option>
                <option value="deepseek">DeepSeek API</option>
                <option value="custom">سفارشی / سرور محلی (Ollama / Local LLM)</option>
              </select>
            </div>

            {/* Model Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {isFa ? 'نام دقیق مدل (Model Name):' : 'Model Identifier:'}
              </label>
              <input
                type="text"
                value={aiConfig.model_name}
                onChange={(e) => setAiConfig({ ...aiConfig, model_name: e.target.value })}
                placeholder="e.g. gemini-3.5-flash or gpt-4o-mini"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono text-slate-800 focus:ring-2 focus:ring-blue-500 outline-hidden"
              />
            </div>

            {/* Base URL */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {isFa ? 'آدرس پایه API (Base URL):' : 'API Base URL:'}
              </label>
              <input
                type="text"
                value={aiConfig.base_url}
                onChange={(e) => setAiConfig({ ...aiConfig, base_url: e.target.value })}
                placeholder="https://openrouter.ai/api/v1"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono text-slate-800 focus:ring-2 focus:ring-blue-500 outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* API Key */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {isFa ? 'کلید احراز هویت (Secret API Key):' : 'Secret API Key:'}
              </label>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={aiConfig.api_key}
                  onChange={(e) => setAiConfig({ ...aiConfig, api_key: e.target.value })}
                  placeholder={aiConfig.has_api_key ? '••••••••••••••••' : (isFa ? 'کلید API جدید را وارد کنید...' : 'Enter new API key...')}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono text-slate-800 focus:ring-2 focus:ring-blue-500 outline-hidden pl-10"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
                >
                  {showApiKey ? (isFa ? 'مخفی' : 'Hide') : (isFa ? 'نمایش' : 'Show')}
                </button>
              </div>
            </div>

            {/* Temperature */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {isFa ? `دمای هوش مصنوعی (Temperature: ${aiConfig.temperature ?? 0.3})` : `Temperature (${aiConfig.temperature ?? 0.3}):`}
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={aiConfig.temperature ?? 0.3}
                onChange={(e) => setAiConfig({ ...aiConfig, temperature: parseFloat(e.target.value) })}
                className="w-full cursor-pointer accent-blue-600 mt-2"
              />
            </div>
          </div>

          {/* System Prompt Overrides */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-800">
              {isFa ? 'شخصی‌سازی پرامپت‌های سیستمی (System Prompts Override)' : 'System Prompt Overrides'}
            </h4>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                {isFa ? 'دستورالعمل سیستمی چت‌بات مهندسی F&G:' : 'AI Engineering Assistant System Prompt:'}
              </label>
              <textarea
                rows={3}
                value={aiConfig.system_prompt_overrides?.assistant || ''}
                onChange={(e) => setAiConfig({
                  ...aiConfig,
                  system_prompt_overrides: {
                    ...(aiConfig.system_prompt_overrides || {}),
                    assistant: e.target.value
                  }
                })}
                placeholder={isFa ? 'شما یک دستیار فنی مهندسی ارشد سیستم‌های اعلام و اطفاء حریق بر اساس NFPA 72 و NFPA 2001 هستید...' : 'Default assistant prompt...'}
                className="w-full p-3 rounded-xl border border-slate-200 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 outline-hidden font-sans"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              {isFa ? 'ذخیره تنظیمات هوش مصنوعی' : 'Save AI Settings'}
            </button>
          </div>
        </form>
      )}

      {/* TAB 4: KNOWLEDGE BASE (NFPA RAG MEMORY) */}
      {activeTab === 'knowledge-base' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-800">
                {isFa ? 'پایگاه دانش مهندسی و استانداردهای RAG' : 'Engineering Knowledge Base (RAG Memory)'}
              </h3>
              <p className="text-xs text-slate-500">
                {isFa ? 'هوش مصنوعی سامانه برای پاسخ‌دهی به کاربران مستقیماً از این قوانین مهندسی و استانداردهای NFPA بهره می‌گیرد.' : 'Rules and guidelines that the AI Assistant uses for RAG contextual generation.'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setEditingKb(null);
                setKbFormData({ concept: '', details: '', system_type: 'both', keywords: '', source_file: 'admin_console' });
                setIsKbModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>{isFa ? 'افزودن مفهوم/استاندارد جدید' : 'Add Knowledge Rule'}</span>
            </button>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={kbSearch}
                onChange={(e) => setKbSearch(e.target.value)}
                placeholder={isFa ? 'جستجو در مفاهیم، جزئیات، کلیدواژه‌ها یا رفرنس‌های NFPA...' : 'Search concepts, details, keywords...'}
                className="w-full pr-9 pl-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-hidden"
              />
            </div>

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
              <button
                onClick={() => setKbFilter('all')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${kbFilter === 'all' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600'}`}
              >
                {isFa ? 'همه' : 'All'}
              </button>
              <button
                onClick={() => setKbFilter('alarm')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${kbFilter === 'alarm' ? 'bg-amber-500/10 text-amber-700 font-bold' : 'text-slate-600'}`}
              >
                {isFa ? 'اعلام حریق' : 'Alarm'}
              </button>
              <button
                onClick={() => setKbFilter('fighting')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${kbFilter === 'fighting' ? 'bg-emerald-500/10 text-emerald-700 font-bold' : 'text-slate-600'}`}
              >
                {isFa ? 'اطفاء حریق' : 'Fighting'}
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3 w-12 text-center">#</th>
                  <th className="p-3">{isFa ? 'عنوان مفهوم / استاندارد' : 'Concept / Rule'}</th>
                  <th className="p-3">{isFa ? 'دسته سیستم' : 'System'}</th>
                  <th className="p-3 max-w-md">{isFa ? 'شرح و الزامات فنی' : 'Technical Details'}</th>
                  <th className="p-3">{isFa ? 'کلیدواژه‌ها' : 'Keywords'}</th>
                  <th className="p-3 w-24 text-center">{isFa ? 'عملیات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredKb.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-slate-400">
                      {isFa ? 'هیچ قانونی یافت نشد.' : 'No knowledge items found.'}
                    </td>
                  </tr>
                ) : (
                  filteredKb.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                      <td className="p-3 font-bold text-slate-800">{item.concept}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          item.system_type === 'alarm' 
                            ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                            : item.system_type === 'fighting'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}>
                          {item.system_type === 'alarm' ? (isFa ? 'اعلام' : 'Alarm') : item.system_type === 'fighting' ? (isFa ? 'اطفاء' : 'Fighting') : (isFa ? 'هردو' : 'Both')}
                        </span>
                      </td>
                      <td className="p-3 text-slate-600 max-w-md leading-relaxed line-clamp-2">
                        {item.details}
                      </td>
                      <td className="p-3 text-slate-500 font-mono text-[11px]">
                        {item.keywords || '-'}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingKb(item);
                              setKbFormData({
                                concept: item.concept,
                                details: item.details,
                                system_type: item.system_type,
                                keywords: item.keywords,
                                source_file: item.source_file
                              });
                              setIsKbModalOpen(true);
                            }}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title={isFa ? 'ویرایش' : 'Edit'}
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteKb(item.id)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title={isFa ? 'حذف' : 'Delete'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: COMPANY PROFILE & COMMERCIAL MULTIPLIERS */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-800">
              {isFa ? 'اطلاعات شرکتی، سربرگ و ضرایب بازرگانی پیش‌فرض' : 'Company Info & Default Commercial Multipliers'}
            </h3>
            <p className="text-xs text-slate-500">
              {isFa ? 'این مقادیر در خروجی پروپوزال‌ها، سربرگ نامه‌ها و آنالیزهای قیمت به صورت پیش‌فرض اعمال می‌شوند.' : 'These values are automatically applied to proposals, official letter headers, and pricing sheets.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {isFa ? 'نام شرکت (فارسی):' : 'Company Name (FA):'}
              </label>
              <input
                type="text"
                value={settings.company_name_fa}
                onChange={(e) => setSettings({ ...settings, company_name_fa: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {isFa ? 'نام شرکت (انگلیسی):' : 'Company Name (EN):'}
              </label>
              <input
                type="text"
                value={settings.company_name_en}
                onChange={(e) => setSettings({ ...settings, company_name_en: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {isFa ? 'شماره تماس:' : 'Phone:'}
              </label>
              <input
                type="text"
                value={settings.company_phone}
                onChange={(e) => setSettings({ ...settings, company_phone: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {isFa ? 'ایمیل رسمی:' : 'Official Email:'}
              </label>
              <input
                type="email"
                value={settings.company_email}
                onChange={(e) => setSettings({ ...settings, company_email: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 outline-hidden"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {isFa ? 'آدرس پستی رسمی:' : 'Official Postal Address:'}
              </label>
              <input
                type="text"
                value={settings.company_address}
                onChange={(e) => setSettings({ ...settings, company_address: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 outline-hidden"
              />
            </div>
          </div>

          {/* Multipliers Box */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <h4 className="text-xs font-bold text-slate-800">
              {isFa ? 'ضرایب پیش‌فرض آنالیز قیمت و بازرگانی پروپوزال‌ها' : 'Default Commercial Multipliers'}
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  {isFa ? 'ضریب گمرک و ترخیص:' : 'Customs (e.g. 1.15):'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={settings.default_multipliers?.customsFactor ?? 1.15}
                  onChange={(e) => setSettings({
                    ...settings,
                    default_multipliers: {
                      ...settings.default_multipliers,
                      customsFactor: parseFloat(e.target.value) || 1
                    }
                  })}
                  className="w-full p-2 bg-white rounded-lg border border-slate-200 text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  {isFa ? 'ضریب حمل و بیمه:' : 'Logistics (e.g. 1.05):'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={settings.default_multipliers?.logisticsFactor ?? 1.05}
                  onChange={(e) => setSettings({
                    ...settings,
                    default_multipliers: {
                      ...settings.default_multipliers,
                      logisticsFactor: parseFloat(e.target.value) || 1
                    }
                  })}
                  className="w-full p-2 bg-white rounded-lg border border-slate-200 text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  {isFa ? 'سود و بالاسری:' : 'Overhead & Profit:'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={settings.default_multipliers?.overheadProfit ?? 1.20}
                  onChange={(e) => setSettings({
                    ...settings,
                    default_multipliers: {
                      ...settings.default_multipliers,
                      overheadProfit: parseFloat(e.target.value) || 1
                    }
                  })}
                  className="w-full p-2 bg-white rounded-lg border border-slate-200 text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  {isFa ? 'ضریب ریسک ارز:' : 'FX Risk Factor:'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={settings.default_multipliers?.currencyRisk ?? 1.05}
                  onChange={(e) => setSettings({
                    ...settings,
                    default_multipliers: {
                      ...settings.default_multipliers,
                      currencyRisk: parseFloat(e.target.value) || 1
                    }
                  })}
                  className="w-full p-2 bg-white rounded-lg border border-slate-200 text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  {isFa ? 'ضریب تخفیف تجاری:' : 'Discount Factor:'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={settings.default_multipliers?.discountFactor ?? 0.95}
                  onChange={(e) => setSettings({
                    ...settings,
                    default_multipliers: {
                      ...settings.default_multipliers,
                      discountFactor: parseFloat(e.target.value) || 1
                    }
                  })}
                  className="w-full p-2 bg-white rounded-lg border border-slate-200 text-xs font-bold"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              {isFa ? 'ذخیره مشخصات شرکتی و ضرایب' : 'Save Company Settings'}
            </button>
          </div>
        </form>
      )}

      {/* TAB 6: AUDIT & ACTIVITY LOGS */}
      {activeTab === 'logs' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-800">
                {isFa ? 'ردپای فعالیت‌ها و لاگ‌های امنیتی سیستم (Audit Logs)' : 'Security & Audit Logs Timeline'}
              </h3>
              <p className="text-xs text-slate-500">
                {isFa ? 'ثبت زنده ورود کاربران، تغییرات پایگاه داده، پشتیبان‌گیری و تنظیمات هوش مصنوعی' : 'Realtime record of user logins, database changes, AI tuning, and backups.'}
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                placeholder={isFa ? 'فیلتر رویداد یا کاربر...' : 'Filter action or user...'}
                className="w-full pr-9 pl-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-hidden"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 max-h-[500px] overflow-y-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  <th className="p-3 w-12 text-center">#</th>
                  <th className="p-3">{isFa ? 'زمان رویداد' : 'Timestamp'}</th>
                  <th className="p-3">{isFa ? 'کاربر' : 'User'}</th>
                  <th className="p-3">{isFa ? 'نوع عملیات' : 'Action'}</th>
                  <th className="p-3">{isFa ? 'شرح و جزئیات' : 'Details'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-400">
                      {isFa ? 'هیچ لاگی یافت نشد.' : 'No audit logs recorded yet.'}
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log, idx) => (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                      <td className="p-3 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString(isFa ? 'fa-IR' : 'en-US')}
                      </td>
                      <td className="p-3 font-bold text-slate-800">
                        <span className="px-2 py-0.5 bg-slate-100 rounded-md text-[11px]">
                          {log.username}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md text-[10px] font-bold font-mono">
                          {log.action}
                        </span>
                      </td>
                      <td className="p-3 text-slate-700 leading-relaxed font-medium">
                        {log.details}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* KNOWLEDGE BASE MODAL */}
      <AnimatePresence>
        {isKbModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-6 w-full max-w-xl shadow-2xl border border-slate-200 space-y-4"
              dir={isFa ? 'rtl' : 'ltr'}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-800">
                  {editingKb ? (isFa ? 'ویرایش قانون پایگاه دانش' : 'Edit Knowledge Rule') : (isFa ? 'افزودن قانون/استاندارد مهندسی جدید' : 'Add Knowledge Rule')}
                </h3>
                <button
                  onClick={() => setIsKbModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveKb} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isFa ? 'عنوان مفهوم / رفرنس استاندارد (مثال: نصب دتکتور شعله بر اساس NFPA 72):' : 'Concept Title:'}
                  </label>
                  <input
                    type="text"
                    required
                    value={kbFormData.concept}
                    onChange={(e) => setKbFormData({ ...kbFormData, concept: e.target.value })}
                    placeholder={isFa ? 'عنوان مفهوم...' : 'Rule title...'}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 font-bold focus:ring-2 focus:ring-blue-500 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isFa ? 'دسته سیستم:' : 'System Category:'}
                  </label>
                  <select
                    value={kbFormData.system_type}
                    onChange={(e) => setKbFormData({ ...kbFormData, system_type: e.target.value as any })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-white text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 outline-hidden"
                  >
                    <option value="both">{isFa ? 'جامع (اعلام و اطفاء)' : 'Both (Alarm & Fighting)'}</option>
                    <option value="alarm">{isFa ? 'اعلام حریق (Fire Alarm / NFPA 72)' : 'Fire Alarm'}</option>
                    <option value="fighting">{isFa ? 'اطفاء حریق (Fire Fighting / NFPA 2001)' : 'Fire Fighting'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isFa ? 'متن کامل استاندارد / محاسبات فنی:' : 'Full Rule Description:'}
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={kbFormData.details}
                    onChange={(e) => setKbFormData({ ...kbFormData, details: e.target.value })}
                    placeholder={isFa ? 'شرح دقیق الزامات مهندسی و استاندارد...' : 'Enter standard rule specifications...'}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 outline-hidden leading-relaxed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isFa ? 'کلیدواژه‌های جستجوی هوشمند (جدا شده با کاما):' : 'Keywords (comma separated):'}
                  </label>
                  <input
                    type="text"
                    value={kbFormData.keywords}
                    onChange={(e) => setKbFormData({ ...kbFormData, keywords: e.target.value })}
                    placeholder="nfpa 72, دتکتور, شعله, فاصله نصب"
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 outline-hidden"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsKbModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    {isFa ? 'انصراف' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm cursor-pointer"
                  >
                    {isFa ? 'ذخیره در پایگاه دانش' : 'Save Rule'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
