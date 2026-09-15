import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, 
  Search, 
  Plus, 
  Trash2, 
  Download, 
  Sliders, 
  Calculator, 
  Sparkles, 
  Eye, 
  Check, 
  FileCheck, 
  Euro, 
  Building2, 
  Layers, 
  ArrowRight, 
  DollarSign, 
  ShieldAlert, 
  Percent, 
  Printer,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Sparkle,
  Database,
  FolderArchive,
  Save,
  Bookmark,
  FileCode2,
  FileSpreadsheet,
  Palette,
  Mail,
  Send
} from 'lucide-react';
import { Equipment, User, ProposalItem, ProposalMultipliers, ProposalConfig, SavedProposal, ProposalTemplate } from '../types';
import { exportProposalToDocx } from '../utils/docxExporter';
import { exportProposalToPdf } from '../utils/pdfExporter';
import { authenticatedFetch } from '../utils/api';
import { TemplateManagerModal } from './TemplateManagerModal';
import { SendEmailModal } from './SendEmailModal';
import { EmailHistoryModal } from './EmailHistoryModal';

interface ProposalViewProps {
  currentUser: User;
  equipmentList: Equipment[];
  lang: 'fa' | 'en';
}

const DEFAULT_MULTIPLIERS: ProposalMultipliers = {
  customsFactor: 1.15,  // 15% customs
  logisticsFactor: 1.05, // 5% logistics & insurance
  overheadProfit: 1.20,  // 20% overhead & margin
  currencyRisk: 1.05,    // 5% currency fluctuation risk
  discountFactor: 1.00   // 0% discount default
};

export const ProposalView: React.FC<ProposalViewProps> = ({
  currentUser,
  equipmentList,
  lang
}) => {
  // Templates Management State
  const [templates, setTemplates] = useState<ProposalTemplate[]>([]);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

  // Proposal Configuration State
  const [config, setConfig] = useState<ProposalConfig>({
    title: lang === 'fa' ? 'پروپوزال سیستم اعلام و اطفاء حریق F&G' : 'F&G Fire System Technical Proposal',
    clientName: lang === 'fa' ? 'شرکت صنایع پتروشیمی' : 'Petrochemical Industries Co.',
    projectCode: 'IP-2026-F&G-01',
    date: new Date().toISOString().slice(0, 10),
    language: lang,
    currency: 'EUR',
    showPrices: currentUser.price_access === 1,
    showPriceAnalysis: true,
    deliveryTime: lang === 'fa' ? '۴ الی ۶ هفته کاری پس از ابلاغ قرارداد' : '4 to 6 working weeks upon order placement',
    warranty: lang === 'fa' ? '۱۲ ماه پس از تحویل و ۱۰ سال خدمات پس از فروش' : '12 months warranty & 10 years after-sales support',
    validityDays: '30',
    paymentTerms: lang === 'fa' ? '۵۰٪ پیش‌پرداخت، ۴۰٪ هنگام تحویل کالا، ۱۰٪ پس از راه‌اندازی' : '50% Advance, 40% On Delivery, 10% Post Commissioning',
    introText: '',
    templateId: undefined
  });

  // Fetch Templates
  const fetchTemplates = async () => {
    try {
      const res = await authenticatedFetch('/api/proposals/templates');
      if (res.ok) {
        const data: ProposalTemplate[] = await res.json();
        setTemplates(data);
        // If config has no templateId, set default template
        const defaultTmpl = data.find(t => t.is_default) || data[0];
        if (defaultTmpl && !config.templateId) {
          setConfig(prev => ({ ...prev, templateId: defaultTmpl.id }));
        }
      }
    } catch (e) {
      console.error('Error fetching proposal templates:', e);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  // Active Template object
  const activeTemplate = useMemo(() => {
    if (!templates.length) return undefined;
    return templates.find(t => t.id === config.templateId) || templates.find(t => t.is_default) || templates[0];
  }, [templates, config.templateId]);

  // Apply template to current proposal config
  const handleApplyTemplate = (tmpl: ProposalTemplate) => {
    let populatedIntro = tmpl.intro_template || '';
    populatedIntro = populatedIntro
      .replace(/\{\{PROJECT_NAME\}\}/g, config.title || '')
      .replace(/\{\{CLIENT_NAME\}\}/g, config.clientName || '')
      .replace(/\{\{PROJECT_CODE\}\}/g, config.projectCode || '')
      .replace(/\{\{DATE\}\}/g, config.date || new Date().toISOString().slice(0, 10));

    setConfig(prev => ({
      ...prev,
      templateId: tmpl.id,
      introText: populatedIntro,
      warranty: tmpl.warranty_template || prev.warranty,
      paymentTerms: tmpl.payment_terms_template || prev.paymentTerms,
      deliveryTime: tmpl.delivery_time_template || prev.deliveryTime,
      validityDays: tmpl.validity_template ? tmpl.validity_template.replace(/[^0-9]/g, '') || prev.validityDays : prev.validityDays,
      showPriceAnalysis: tmpl.show_price_analysis_table ?? prev.showPriceAnalysis
    }));
  };

  // Selected Proposal Items
  const [proposalItems, setProposalItems] = useState<ProposalItem[]>([]);

  // Search & Catalog Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [brandFilter, setBrandFilter] = useState('همه');
  const [systemFilter, setSystemFilter] = useState<'all' | 'alarm' | 'fighting'>('all');
  
  const [catalogPage, setCatalogPage] = useState(1);
  const CATALOG_ITEMS_PER_PAGE = 30;

  // Reset catalog page on filter change
  useEffect(() => {
    setCatalogPage(1);
  }, [searchQuery, brandFilter, systemFilter]);

  // Multiplier Edit Drawer State
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);

  // Global Multiplier Batch Application State
  const [globalMultipliers, setGlobalMultipliers] = useState<ProposalMultipliers>({ ...DEFAULT_MULTIPLIERS });
  const [showGlobalMultipliers, setShowGlobalMultipliers] = useState(false);

  // AI Generating State
  const [isGeneratingIntro, setIsGeneratingIntro] = useState(false);

  // Preview Modal State
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Saved Proposals DB State
  const [savedProposals, setSavedProposals] = useState<SavedProposal[]>([]);
  const [isSavingToDb, setIsSavingToDb] = useState(false);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [saveDbMsg, setSaveDbMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Email Dispatch Modal State
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isEmailHistoryOpen, setIsEmailHistoryOpen] = useState(false);

  const handleExportPdf = async () => {
    setIsExportingPdf(true);
    try {
      await exportProposalToPdf(config, proposalItems, activeTemplate);
    } catch (e) {
      console.error('PDF export error:', e);
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Fetch saved proposals
  const fetchSavedProposals = async () => {
    try {
      const res = await authenticatedFetch('/api/proposals');
      if (res.ok) {
        const data = await res.json();
        setSavedProposals(data);
      }
    } catch (e) {
      console.error('Error fetching saved proposals:', e);
    }
  };

  React.useEffect(() => {
    fetchSavedProposals();
  }, []);

  // Save current proposal to database
  const handleSaveToDatabase = async () => {
    if (proposalItems.length === 0) {
      setSaveDbMsg({ type: 'error', text: lang === 'fa' ? 'لطفاً ابتدا حداقل یک تجهیز به پروپوزال اضافه کنید.' : 'Please add at least one item first.' });
      setTimeout(() => setSaveDbMsg(null), 4000);
      return;
    }

    setIsSavingToDb(true);
    setSaveDbMsg(null);
    try {
      const res = await authenticatedFetch('/api/proposals', {
        method: 'POST',
        body: JSON.stringify({
          ...config,
          items: proposalItems,
          created_by: currentUser.username
        })
      });
      if (res.ok) {
        setSaveDbMsg({ type: 'success', text: lang === 'fa' ? 'پروپوزال با موفقیت در دیتابیس ثبت شد.' : 'Proposal successfully saved to database.' });
        fetchSavedProposals();
      } else {
        const err = await res.json();
        setSaveDbMsg({ type: 'error', text: err.error || (lang === 'fa' ? 'خطا در ذخیره‌سازی پروپوزال' : 'Error saving proposal') });
      }
    } catch (e) {
      setSaveDbMsg({ type: 'error', text: lang === 'fa' ? 'خطا در برقراری ارتباط با سرور' : 'Server connection error' });
    } finally {
      setIsSavingToDb(false);
      setTimeout(() => setSaveDbMsg(null), 5000);
    }
  };

  // Load a saved proposal into editor
  const handleLoadSavedProposal = (prop: SavedProposal) => {
    setConfig({
      title: prop.title,
      clientName: prop.clientName,
      projectCode: prop.projectCode,
      date: prop.date,
      language: prop.language,
      currency: prop.currency as any,
      showPrices: prop.showPrices,
      showPriceAnalysis: prop.showPriceAnalysis,
      deliveryTime: prop.deliveryTime,
      warranty: prop.warranty,
      validityDays: String(prop.validityDays),
      paymentTerms: prop.paymentTerms,
      introText: prop.introText || ''
    });
    setProposalItems(prop.items || []);
    setIsArchiveOpen(false);
    setSaveDbMsg({ type: 'success', text: lang === 'fa' ? `پروپوزال کد "${prop.projectCode}" بازیابی شد.` : `Proposal "${prop.projectCode}" loaded.` });
    setTimeout(() => setSaveDbMsg(null), 4000);
  };

  // Delete saved proposal from database
  const handleDeleteSavedProposal = async (id: number) => {
    if (!confirm(lang === 'fa' ? 'آیا از حذف این پروپوزال از دیتابیس اطمینان دارید؟' : 'Are you sure you want to delete this proposal?')) return;
    try {
      const res = await authenticatedFetch(`/api/proposals/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchSavedProposals();
      }
    } catch (e) {
      console.error('Error deleting proposal:', e);
    }
  };

  // Unique Brands
  const availableBrands = ['همه', ...Array.from(new Set(equipmentList.map(e => e.brand)))];

  // Filtered Catalog Items
  const filteredCatalog = useMemo(() => {
    return equipmentList.filter(e => {
      const matchSearch = e.part_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          e.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          e.equipment_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          e.technical_specifications.toLowerCase().includes(searchQuery.toLowerCase());
      const matchBrand = brandFilter === 'همه' || e.brand === brandFilter;
      const matchSystem = systemFilter === 'all' || e.system_type === systemFilter;
      return matchSearch && matchBrand && matchSystem;
    });
  }, [equipmentList, searchQuery, brandFilter, systemFilter]);

  const catalogTotalPages = Math.ceil(filteredCatalog.length / CATALOG_ITEMS_PER_PAGE);
  const paginatedCatalog = filteredCatalog.slice((catalogPage - 1) * CATALOG_ITEMS_PER_PAGE, catalogPage * CATALOG_ITEMS_PER_PAGE);

  // Add Item to Proposal
  const handleAddItem = (eq: Equipment) => {
    const existingIndex = proposalItems.findIndex(i => i.equipment.part_number === eq.part_number);
    if (existingIndex >= 0) {
      const updated = [...proposalItems];
      updated[existingIndex].quantity += 1;
      setProposalItems(updated);
    } else {
      setProposalItems([
        ...proposalItems,
        {
          equipment: eq,
          quantity: 1,
          customBasePriceEur: eq.price ?? 0,
          drawingRef: eq.drawing_ref || '',
          tagNumber: '',
          multipliers: { ...globalMultipliers }
        }
      ]);
    }
  };

  // Remove Item
  const handleRemoveItem = (index: number) => {
    const updated = [...proposalItems];
    updated.splice(index, 1);
    setProposalItems(updated);
  };

  // Update Item Quantity
  const handleUpdateQuantity = (index: number, newQty: number) => {
    if (newQty <= 0) return;
    const updated = [...proposalItems];
    updated[index].quantity = newQty;
    setProposalItems(updated);
  };

  // Update Custom Base Price
  const handleUpdateBasePrice = (index: number, price: number) => {
    const updated = [...proposalItems];
    updated[index].customBasePriceEur = Math.max(0, price);
    setProposalItems(updated);
  };

  // Update Drawing Ref and Tag Number
  const handleUpdateDrawingRef = (index: number, val: string) => {
    const updated = [...proposalItems];
    updated[index].drawingRef = val;
    setProposalItems(updated);
  };

  const handleUpdateTagNumber = (index: number, val: string) => {
    const updated = [...proposalItems];
    updated[index].tagNumber = val;
    setProposalItems(updated);
  };

  // Update Individual Item Multipliers
  const handleUpdateItemMultiplier = (index: number, field: keyof ProposalMultipliers, value: number) => {
    const updated = [...proposalItems];
    updated[index].multipliers = {
      ...updated[index].multipliers,
      [field]: Math.max(0, value)
    };
    setProposalItems(updated);
  };

  // Apply Global Multipliers to All Items
  const handleApplyGlobalMultipliers = () => {
    const updated = proposalItems.map(item => ({
      ...item,
      multipliers: { ...globalMultipliers }
    }));
    setProposalItems(updated);
  };

  // Calculations Helper
  const getItemCompoundMultiplier = (m: ProposalMultipliers) => {
    return m.customsFactor * m.logisticsFactor * m.overheadProfit * m.currencyRisk * m.discountFactor;
  };

  const getItemFinalUnitPrice = (item: ProposalItem) => {
    const base = item.customBasePriceEur ?? item.equipment.price ?? 0;
    return base * getItemCompoundMultiplier(item.multipliers);
  };

  // Summary Totals
  const totalBasePurchasePriceEur = proposalItems.reduce((acc, item) => {
    const base = item.customBasePriceEur ?? item.equipment.price ?? 0;
    return acc + (base * item.quantity);
  }, 0);

  const totalFinalProposalPriceEur = proposalItems.reduce((acc, item) => {
    return acc + (getItemFinalUnitPrice(item) * item.quantity);
  }, 0);

  const totalAddedValueEur = totalFinalProposalPriceEur - totalBasePurchasePriceEur;
  const overallMultiplierRatio = totalBasePurchasePriceEur > 0 ? (totalFinalProposalPriceEur / totalBasePurchasePriceEur) : 1;

  // Language Switch Handler
  const handleDocumentLanguageChange = (newLang: 'fa' | 'en') => {
    if (newLang === 'en') {
      setConfig(prev => ({
        ...prev,
        language: 'en',
        title: (prev.title === 'پروپوزال سیستم اعلام و اطفاء حریق F&G' || !prev.title) ? 'F&G Fire System Technical Proposal' : prev.title,
        clientName: (prev.clientName === 'شرکت صنایع پتروشیمی' || !prev.clientName) ? 'Petrochemical Industries Co.' : prev.clientName,
        deliveryTime: '4 to 6 working weeks upon order placement',
        paymentTerms: '50% Advance, 40% On Delivery, 10% Post Commissioning',
        warranty: '12 months warranty & 10 years after-sales support',
        introText: prev.introText && /[\u0600-\u06FF]/.test(prev.introText) ? '' : prev.introText
      }));
    } else {
      setConfig(prev => ({
        ...prev,
        language: 'fa',
        title: (prev.title === 'F&G Fire System Technical Proposal' || !prev.title) ? 'پروپوزال سیستم اعلام و اطفاء حریق F&G' : prev.title,
        clientName: (prev.clientName === 'Petrochemical Industries Co.' || !prev.clientName) ? 'شرکت صنایع پتروشیمی' : prev.clientName,
        deliveryTime: '۴ الی ۶ هفته کاری پس از ابلاغ قرارداد',
        paymentTerms: '۵۰٪ پیش‌پرداخت، ۴۰٪ هنگام تحویل کالا، ۱۰٪ پس از راه‌اندازی',
        warranty: '۱۲ ماه پس از تحویل و ۱۰ سال خدمات پس از فروش'
      }));
    }
  };

  // AI Assistant Intro Generator
  const handleGenerateAIIntro = async () => {
    if (proposalItems.length === 0) return;
    setIsGeneratingIntro(true);
    try {
      const itemsListText = proposalItems.map(i => `${i.quantity}x ${i.equipment.brand} ${i.equipment.part_number} (${i.equipment.equipment_type})`).join(', ');
      const isEnglish = config.language === 'en';
      const queryPrompt = isEnglish 
        ? `Write an executive technical intro and brief background summary strictly in 100% ENGLISH language (using standard ASCII Latin characters ONLY, NO Persian or Arabic characters) for a Fire & Gas (F&G) technical proposal. Title: "${config.title}". Client: "${config.clientName}". Equipment list: ${itemsListText}. Maximum 2 to 3 concise, highly professional engineering paragraphs.`
        : `یک مقدمه و شرح فنی رسمی و حرفه‌ای به زبان فارسی برای یک پروپوزال فنی مهندسی سیستم‌های اعلام و اطفاء حریق (F&G) بنویس. پروژه: ${config.title} برای کارفرمای ${config.clientName}. تجهیزات شامل: ${itemsListText}. متن حداکثر ۳ پاراگراف جذاب، فنی و با لحن مهندسی رسمی باشد.`;

      const res = await authenticatedFetch('/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          query: queryPrompt,
          history: [],
          systemAccess: currentUser.system_access,
          priceAccess: currentUser.price_access
        })
      });

      if (res.ok) {
        const data = await res.json();
        const lastMsg = data.history[data.history.length - 1];
        if (lastMsg && lastMsg.content) {
          const cleanedText = lastMsg.content
            .replace(/\*\*/g, '')
            .replace(/###\s*/g, '')
            .replace(/##\s*/g, '')
            .replace(/\*/g, '');
          setConfig(prev => ({ ...prev, introText: cleanedText }));
        }
      }
    } catch (e) {
      console.error('AI Intro Generation failed:', e);
    } finally {
      setIsGeneratingIntro(false);
    }
  };

  return (
    <div className="space-y-6 pb-12" dir={lang === 'fa' ? 'rtl' : 'ltr'}>
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold">
              <FileCheck className="w-3.5 h-3.5" />
              <span>{lang === 'fa' ? 'مولد پروپوزال فنی و مالی + آنالیز قیمت' : 'Technical & Commercial Proposal Engine'}</span>
            </div>
            <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">
              {lang === 'fa' ? 'تنظیم پیشنهاد فنی، استعلام و آنالیز ضرایب قیمت' : 'Proposal Builder & Price Multiplier Analyzer'}
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              {lang === 'fa' 
                ? 'جستجوی تجهیزات، افزودن اقلام به اقلام پیشنهاد، اعمال ضرایب قیمت‌گذاری خرید/فروش، آنالیز سود و دریافت خروجی استاندارد Word (.docx) و PDF.' 
                : 'Select equipment, customize pricing multipliers, generate detailed price analysis, and export ready-to-sign Word (.docx) and PDF proposals.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => setIsPreviewOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-bold border border-slate-700 transition-all cursor-pointer flex items-center gap-2"
            >
              <Eye className="w-4 h-4 text-blue-400" />
              <span>{lang === 'fa' ? 'پیش‌نمایش زنده' : 'Live Preview'}</span>
            </button>

            <button
              onClick={handleSaveToDatabase}
              disabled={isSavingToDb || proposalItems.length === 0}
              className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-amber-600/30 transition-all cursor-pointer flex items-center gap-2"
            >
              <Save className="w-4 h-4 text-amber-200" />
              <span>{isSavingToDb ? (lang === 'fa' ? 'در حال ذخیره‌سازی...' : 'Saving...') : (lang === 'fa' ? 'ذخیره در دیتابیس' : 'Save to DB')}</span>
            </button>

            <button
              onClick={() => setIsTemplateModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-600 text-white text-xs font-bold shadow-lg shadow-purple-700/30 transition-all cursor-pointer flex items-center gap-2"
            >
              <FileCode2 className="w-4 h-4 text-purple-200" />
              <span>{lang === 'fa' ? `قالب‌های سازمانی (${templates.length})` : `Templates (${templates.length})`}</span>
            </button>

            <button
              onClick={() => { fetchSavedProposals(); setIsArchiveOpen(true); }}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer flex items-center gap-2"
            >
              <FolderArchive className="w-4 h-4 text-indigo-200" />
              <span>{lang === 'fa' ? `آرشیو دیتابیس (${savedProposals.length})` : `Saved DB (${savedProposals.length})`}</span>
            </button>

            <button
              onClick={() => setIsEmailModalOpen(true)}
              disabled={proposalItems.length === 0}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-sky-600/30 transition-all cursor-pointer flex items-center gap-2"
              title={lang === 'fa' ? 'ارسال پروپوزال با ایمیل' : 'Send via Email'}
            >
              <Mail className="w-4 h-4 text-sky-200" />
              <span>{lang === 'fa' ? 'ارسال با ایمیل' : 'Send Email'}</span>
            </button>

            <button
              onClick={() => setIsEmailHistoryOpen(true)}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
              title={lang === 'fa' ? 'آرشیو ایمیل‌های ارسالی' : 'Email History'}
            >
              <Mail className="w-4 h-4 text-slate-400" />
              <span className="hidden sm:inline">{lang === 'fa' ? 'سوابق ایمیل' : 'Email Logs'}</span>
            </button>

            <button
              onClick={() => exportProposalToDocx(config, proposalItems, activeTemplate)}
              disabled={proposalItems.length === 0}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition-all cursor-pointer flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>{lang === 'fa' ? 'دانلود Word' : 'Export Word'}</span>
            </button>

            <button
              onClick={handleExportPdf}
              disabled={proposalItems.length === 0 || isExportingPdf}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition-all cursor-pointer flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>{isExportingPdf ? (lang === 'fa' ? 'در حال ایجاد PDF...' : 'Generating PDF...') : (lang === 'fa' ? 'دانلود PDF' : 'Export PDF')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Toast message for Database save actions */}
      {saveDbMsg && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between shadow-lg ${
            saveDbMsg.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
          }`}
        >
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{saveDbMsg.text}</span>
          </div>
          <button onClick={() => setSaveDbMsg(null)} className="text-white/80 hover:text-white text-xs font-mono">✕</button>
        </motion.div>
      )}

      {/* Template Selection & AI Custom Template Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white rounded-2xl p-4 shadow-md border border-indigo-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/20 border border-indigo-400/30 rounded-xl text-indigo-300 shrink-0">
            <FileCode2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-xs md:text-sm text-white">
                {lang === 'fa' ? 'قالب ساختار پروپوزال فنی و مالی:' : 'Active Proposal Template:'}
              </h3>
              <span className="bg-indigo-500/30 text-indigo-200 text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-400/20">
                {activeTemplate?.title || (lang === 'fa' ? 'قالب پیش‌فرض سیستم' : 'Default Template')}
              </span>
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5 line-clamp-1">
              {activeTemplate?.description || (lang === 'fa' ? 'قالب استاندارد مهندسی اعلام و اطفاء حریق' : 'Standard Engineering F&G template')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Quick template selector */}
          <select
            value={config.templateId || ''}
            onChange={(e) => {
              const tmplId = parseInt(e.target.value, 10);
              const tmpl = templates.find(t => t.id === tmplId);
              if (tmpl) {
                handleApplyTemplate(tmpl);
              }
            }}
            className="bg-slate-800/90 border border-slate-700 text-white text-xs rounded-xl px-3 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {templates.map(t => (
              <option key={t.id} value={t.id}>
                {t.title} {t.is_default ? '★' : ''}
              </option>
            ))}
          </select>

          {/* Open Template Manager Modal */}
          <button
            onClick={() => setIsTemplateModalOpen(true)}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
            <span>{lang === 'fa' ? 'استخراج و مدیریت قالب‌ها' : 'AI Extract & Manage Templates'}</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Layout (2 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Equipment Catalog Picker (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-200/80 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  {lang === 'fa' ? 'انتخاب تجهیزات از کاتالوگ' : 'Select Equipment from Catalog'}
                </h3>
              </div>
              <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                {filteredCatalog.length} {lang === 'fa' ? 'کالا' : 'items'}
              </span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={lang === 'fa' ? 'جستجوی پارت نامبر، برند یا مشخصات فنی...' : 'Search part number, brand or specs...'}
                className="w-full custom-input pr-9 pl-4 py-2 text-xs text-slate-900"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            </div>

            {/* System & Brand Filter Pills */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs">
                <button
                  onClick={() => setSystemFilter('all')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                    systemFilter === 'all' 
                      ? 'bg-slate-900 text-white' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {lang === 'fa' ? 'همه سیستم‌ها' : 'All Systems'}
                </button>
                <button
                  onClick={() => setSystemFilter('alarm')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                    systemFilter === 'alarm' 
                      ? 'bg-amber-500 text-white' 
                      : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                  }`}
                >
                  {lang === 'fa' ? 'اعلام حریق' : 'Fire Alarm'}
                </button>
                <button
                  onClick={() => setSystemFilter('fighting')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                    systemFilter === 'fighting' 
                      ? 'bg-emerald-600 text-white' 
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  {lang === 'fa' ? 'اطفاء حریق' : 'Fire Fighting'}
                </button>
              </div>

              {/* Brand Filter */}
              <select
                value={brandFilter}
                onChange={(e) => setBrandFilter(e.target.value)}
                className="w-full custom-input py-1.5 px-3 text-xs text-slate-800 bg-slate-50"
              >
                {availableBrands.map(b => (
                  <option key={b} value={b}>
                    {lang === 'fa' ? `برند: ${b}` : `Brand: ${b}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Catalog List */}
            <div className="max-h-[500px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {filteredCatalog.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs font-medium">
                  {lang === 'fa' ? 'هیچ تجهیزی یافت نشد.' : 'No equipment found.'}
                </div>
              ) : (
                paginatedCatalog.map(item => {
                  const isAdded = proposalItems.some(i => i.equipment.part_number === item.part_number);
                  return (
                    <div
                      key={item.part_number}
                      className="p-3 rounded-2xl border border-slate-200 hover:border-blue-300 bg-slate-50/50 hover:bg-blue-50/30 transition-all flex items-start justify-between gap-3 group"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs text-slate-900 group-hover:text-blue-600 transition-colors">
                            {item.part_number}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                            {item.brand}
                          </span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            item.system_type === 'alarm' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {item.system_type === 'alarm' ? (lang === 'fa' ? 'اعلام' : 'Alarm') : (lang === 'fa' ? 'اطفاء' : 'Fighting')}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 line-clamp-1">
                          {item.equipment_type}
                        </p>
                        {item.price !== null && currentUser.price_access === 1 && (
                          <div className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 pt-0.5">
                            <Euro className="w-3 h-3" />
                            <span>{item.price.toLocaleString()} {item.currency || 'EUR'}</span>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => handleAddItem(item)}
                        className={`p-2 rounded-xl transition-all cursor-pointer shrink-0 ${
                          isAdded 
                            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' 
                            : 'bg-blue-600 text-white hover:bg-blue-500 shadow-xs'
                        }`}
                        title={lang === 'fa' ? 'افزودن به پروپوزال' : 'Add to proposal'}
                      >
                        {isAdded ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Pagination Controls */}
            {catalogTotalPages > 1 && (
              <div className="p-3 border-t border-slate-100 flex items-center justify-center gap-3">
                <button
                  onClick={() => setCatalogPage(prev => Math.max(prev - 1, 1))}
                  disabled={catalogPage === 1}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-50 transition-colors"
                >
                  {lang === 'fa' ? 'قبلی' : 'Prev'}
                </button>
                <div className="text-[11px] font-bold text-slate-500">
                  {lang === 'fa' ? `صفحه ${catalogPage} از ${catalogTotalPages}` : `Page ${catalogPage} of ${catalogTotalPages}`}
                </div>
                <button
                  onClick={() => setCatalogPage(prev => Math.max(prev + 1, 1))}
                  disabled={catalogPage === catalogTotalPages}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-50 transition-colors"
                >
                  {lang === 'fa' ? 'بعدی' : 'Next'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Selected Proposal Table & Price Analysis (7 cols) */}
        <div className="lg:col-span-7 space-y-6">

          {/* Proposal Meta Controls */}
          <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-200/80 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  {lang === 'fa' ? 'مشخصات پروژه و شرایط تجاری' : 'Project & Proposal Details'}
                </h3>
              </div>

              {/* AI Intro Generator Button */}
              <button
                onClick={handleGenerateAIIntro}
                disabled={isGeneratingIntro || proposalItems.length === 0}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold shadow-xs hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isGeneratingIntro ? 'animate-spin' : ''}`} />
                <span>{lang === 'fa' ? 'تولید متن فنی هوشمند (AI)' : 'Generate AI Intro'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  {lang === 'fa' ? 'عنوان پروژه / پیشنهاد:' : 'Proposal Title:'}
                </label>
                <input
                  type="text"
                  value={config.title}
                  onChange={(e) => setConfig({ ...config, title: e.target.value })}
                  className="w-full custom-input px-3 py-2 text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  {lang === 'fa' ? 'نام خریدار / کارفرما:' : 'Client / Customer Name:'}
                </label>
                <input
                  type="text"
                  value={config.clientName}
                  onChange={(e) => setConfig({ ...config, clientName: e.target.value })}
                  className="w-full custom-input px-3 py-2 text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  {lang === 'fa' ? 'کد استعلام / رفرنس:' : 'Reference Code:'}
                </label>
                <input
                  type="text"
                  value={config.projectCode}
                  onChange={(e) => setConfig({ ...config, projectCode: e.target.value })}
                  className="w-full custom-input px-3 py-2 text-xs text-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  {lang === 'fa' ? 'زبان سند خروجی:' : 'Document Language:'}
                </label>
                <select
                  value={config.language}
                  onChange={(e) => handleDocumentLanguageChange(e.target.value as 'fa' | 'en')}
                  className="w-full custom-input px-3 py-2 text-xs text-slate-900 font-medium"
                >
                  <option value="fa">فارسی (Persian)</option>
                  <option value="en">English (انگلیسی)</option>
                </select>
              </div>
            </div>

            {/* Price Display Toggles */}
            <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-slate-100 text-xs font-medium">
              <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                <input
                  type="checkbox"
                  checked={config.showPrices}
                  onChange={(e) => setConfig({ ...config, showPrices: e.target.checked })}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>{lang === 'fa' ? 'نمایش قیمت‌ها در پروپوزال' : 'Include Prices in Proposal'}</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                <input
                  type="checkbox"
                  checked={config.showPriceAnalysis}
                  onChange={(e) => setConfig({ ...config, showPriceAnalysis: e.target.checked })}
                  className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                />
                <span>{lang === 'fa' ? 'نمایش جدول آنالیز ضرایب قیمت در سند' : 'Include Multiplier Analysis Table'}</span>
              </label>
            </div>

            {/* AI Generated Intro text if present */}
            {config.introText && (
              <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-2xl space-y-1.5">
                <div className="flex items-center justify-between text-blue-900 text-xs font-bold">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>{lang === 'fa' ? 'شرح و مقدمه فنی هوشمند:' : 'AI Executive Summary:'}</span>
                  </span>
                  <button
                    onClick={() => setConfig({ ...config, introText: '' })}
                    className="text-slate-400 hover:text-slate-600 text-[10px]"
                  >
                    {lang === 'fa' ? 'حذف' : 'Clear'}
                  </button>
                </div>
                <textarea
                  value={config.introText}
                  onChange={(e) => setConfig({ ...config, introText: e.target.value })}
                  rows={3}
                  className="w-full text-xs text-slate-700 bg-white/80 p-2 rounded-xl border border-blue-200/60 custom-scrollbar"
                />
              </div>
            )}
          </div>

          {/* Global Multipliers Control Accordion */}
          <div className="bg-amber-50/80 border border-amber-200/80 rounded-3xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-800 flex items-center justify-center font-bold">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-amber-950">
                    {lang === 'fa' ? 'تنظیم همزمان ضرایب قیمت‌گذاری (Global Multipliers)' : 'Global Multipliers Settings'}
                  </h3>
                  <p className="text-[11px] text-amber-800 font-medium">
                    {lang === 'fa' ? 'اعمال ضریب گمرک، ترخیص، سود و ریسک به تمام اقلام پروپوزال' : 'Set default import, customs, margin & currency risk factors'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowGlobalMultipliers(!showGlobalMultipliers)}
                className="p-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 transition-colors cursor-pointer"
              >
                {showGlobalMultipliers ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            {showGlobalMultipliers && (
              <div className="space-y-4 pt-2 border-t border-amber-200/60">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-amber-900 mb-1">
                      {lang === 'fa' ? 'ضریب گمرک و ترخیص:' : 'Customs Factor:'}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={globalMultipliers.customsFactor}
                      onChange={(e) => setGlobalMultipliers({ ...globalMultipliers, customsFactor: parseFloat(e.target.value) || 1 })}
                      className="w-full custom-input px-3 py-1.5 text-xs text-slate-900 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-amber-900 mb-1">
                      {lang === 'fa' ? 'ضریب حمل و نقل و بیمه:' : 'Logistics Factor:'}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={globalMultipliers.logisticsFactor}
                      onChange={(e) => setGlobalMultipliers({ ...globalMultipliers, logisticsFactor: parseFloat(e.target.value) || 1 })}
                      className="w-full custom-input px-3 py-1.5 text-xs text-slate-900 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-amber-900 mb-1">
                      {lang === 'fa' ? 'ضریب سود و بالاسری:' : 'Overhead/Margin:'}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={globalMultipliers.overheadProfit}
                      onChange={(e) => setGlobalMultipliers({ ...globalMultipliers, overheadProfit: parseFloat(e.target.value) || 1 })}
                      className="w-full custom-input px-3 py-1.5 text-xs text-slate-900 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-amber-900 mb-1">
                      {lang === 'fa' ? 'ضریب ریسک نوسان ارز:' : 'Currency Risk Factor:'}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={globalMultipliers.currencyRisk}
                      onChange={(e) => setGlobalMultipliers({ ...globalMultipliers, currencyRisk: parseFloat(e.target.value) || 1 })}
                      className="w-full custom-input px-3 py-1.5 text-xs text-slate-900 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-amber-900 mb-1">
                      {lang === 'fa' ? 'ضریب تخفیف:' : 'Discount Factor:'}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={globalMultipliers.discountFactor}
                      onChange={(e) => setGlobalMultipliers({ ...globalMultipliers, discountFactor: parseFloat(e.target.value) || 1 })}
                      className="w-full custom-input px-3 py-1.5 text-xs text-slate-900 bg-white"
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      onClick={handleApplyGlobalMultipliers}
                      className="w-full py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>{lang === 'fa' ? 'اعمال به تمام اقلام' : 'Apply to All Items'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Selected Proposal Items Table */}
          <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-200/80 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  {lang === 'fa' ? 'اقلام انتخاب‌شده پروپوزال' : 'Proposal Equipment Items'}
                </h3>
              </div>
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
                {proposalItems.length} {lang === 'fa' ? 'قلم کالا' : 'items'}
              </span>
            </div>

            {proposalItems.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 space-y-2">
                <FileText className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs text-slate-500 font-medium">
                  {lang === 'fa' ? 'هنوز هیچ تجهیزی به پروپوزال اضافه نشده است.' : 'No equipment added to proposal yet.'}
                </p>
                <p className="text-[11px] text-slate-400">
                  {lang === 'fa' ? 'از منوی سمت راست کالاها را جستجو و روی دکمه + کلیک کنید.' : 'Search items on the left and click + to add.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                      <th className="p-2.5 rounded-r-xl">#</th>
                      <th className="p-2.5">{lang === 'fa' ? 'پارت نامبر / تجهیز' : 'Part Number / Type'}</th>
                      <th className="p-2.5">{lang === 'fa' ? 'رفرنس نقشه / Tag' : 'DWG Ref / Tag'}</th>
                      <th className="p-2.5 text-center">{lang === 'fa' ? 'تعداد' : 'Qty'}</th>
                      {currentUser.price_access === 1 && (
                        <>
                          <th className="p-2.5 text-center">{lang === 'fa' ? 'قیمت خرید (€)' : 'Base EUR'}</th>
                          <th className="p-2.5 text-center">{lang === 'fa' ? 'ضریب نهایی' : 'Factor'}</th>
                          <th className="p-2.5 text-center">{lang === 'fa' ? 'قیمت فروش (€)' : 'Final EUR'}</th>
                          <th className="p-2.5 text-center">{lang === 'fa' ? 'مبلغ کل (€)' : 'Total EUR'}</th>
                        </>
                      )}
                      <th className="p-2.5 rounded-l-xl text-center">{lang === 'fa' ? 'عملیات' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {proposalItems.map((item, idx) => {
                      const compoundFactor = getItemCompoundMultiplier(item.multipliers);
                      const finalUnitPrice = getItemFinalUnitPrice(item);
                      const lineTotal = finalUnitPrice * item.quantity;
                      const basePrice = item.customBasePriceEur ?? item.equipment.price ?? 0;

                      return (
                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-2.5 font-bold text-slate-500">{idx + 1}</td>
                          <td className="p-2.5">
                            <div className="font-bold text-slate-900">{item.equipment.part_number}</div>
                            <div className="text-[10px] text-slate-500">{item.equipment.brand} • {item.equipment.equipment_type}</div>
                          </td>

                          {/* Drawing Ref / Tag Number */}
                          <td className="p-2.5">
                            <input
                              type="text"
                              value={item.drawingRef || ''}
                              onChange={(e) => handleUpdateDrawingRef(idx, e.target.value)}
                              placeholder={lang === 'fa' ? 'شماره نقشه / رفرنس...' : 'DWG Ref No...'}
                              className="w-28 custom-input px-2 py-1 text-[11px] font-mono text-indigo-700 bg-white"
                            />
                          </td>

                          {/* Quantity Controls */}
                          <td className="p-2.5 text-center">
                            <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                              <button
                                onClick={() => handleUpdateQuantity(idx, item.quantity - 1)}
                                className="w-5 h-5 rounded-lg bg-white hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center cursor-pointer"
                              >
                                -
                              </button>
                              <span className="w-7 text-center font-bold text-slate-900">{item.quantity}</span>
                              <button
                                onClick={() => handleUpdateQuantity(idx, item.quantity + 1)}
                                className="w-5 h-5 rounded-lg bg-white hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                          </td>

                          {/* Price columns */}
                          {currentUser.price_access === 1 && (
                            <>
                              <td className="p-2.5 text-center">
                                <input
                                  type="number"
                                  value={basePrice}
                                  onChange={(e) => handleUpdateBasePrice(idx, parseFloat(e.target.value) || 0)}
                                  className="w-20 custom-input px-2 py-1 text-xs text-center font-mono text-slate-900 bg-white"
                                />
                              </td>
                              <td className="p-2.5 text-center">
                                <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                                  {compoundFactor.toFixed(3)}x
                                </span>
                              </td>
                              <td className="p-2.5 text-center font-bold text-slate-900 font-mono">
                                {finalUnitPrice.toLocaleString('en-US', { maximumFractionDigits: 1 })}
                              </td>
                              <td className="p-2.5 text-center font-bold text-emerald-600 font-mono">
                                {lineTotal.toLocaleString('en-US', { maximumFractionDigits: 1 })}
                              </td>
                            </>
                          )}

                          {/* Action Buttons */}
                          <td className="p-2.5 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {currentUser.price_access === 1 && (
                                <button
                                  onClick={() => setEditingItemIndex(editingItemIndex === idx ? null : idx)}
                                  className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 cursor-pointer"
                                  title={lang === 'fa' ? 'ویرایش ضرایب این کالا' : 'Edit item multipliers'}
                                >
                                  <Sliders className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                onClick={() => handleRemoveItem(idx)}
                                className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 cursor-pointer"
                                title={lang === 'fa' ? 'حذف کالا' : 'Remove item'}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Individual Item Multiplier Drawer if open */}
            {editingItemIndex !== null && proposalItems[editingItemIndex] && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                  <span>
                    {lang === 'fa' ? `ویرایش ضرایب اختصاصی: ${proposalItems[editingItemIndex].equipment.part_number}` : `Custom Multipliers for ${proposalItems[editingItemIndex].equipment.part_number}`}
                  </span>
                  <button
                    onClick={() => setEditingItemIndex(null)}
                    className="text-slate-400 hover:text-slate-600 text-[10px]"
                  >
                    بستن
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-7 gap-2 text-xs">
                  <div>
                    <label className="block text-[10px] text-slate-600 mb-1">رفرنس نقشه:</label>
                    <input
                      type="text"
                      value={proposalItems[editingItemIndex].drawingRef || ''}
                      onChange={(e) => handleUpdateDrawingRef(editingItemIndex, e.target.value)}
                      placeholder="DWG-101"
                      className="w-full custom-input p-1 text-center text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-600 mb-1">کد تگ (Tag):</label>
                    <input
                      type="text"
                      value={proposalItems[editingItemIndex].tagNumber || ''}
                      onChange={(e) => handleUpdateTagNumber(editingItemIndex, e.target.value)}
                      placeholder="TAG-01"
                      className="w-full custom-input p-1 text-center text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-600 mb-1">گمرک:</label>
                    <input
                      type="number"
                      step="0.01"
                      value={proposalItems[editingItemIndex].multipliers.customsFactor}
                      onChange={(e) => handleUpdateItemMultiplier(editingItemIndex, 'customsFactor', parseFloat(e.target.value) || 1)}
                      className="w-full custom-input p-1 text-center text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-600 mb-1">حمل و بیمه:</label>
                    <input
                      type="number"
                      step="0.01"
                      value={proposalItems[editingItemIndex].multipliers.logisticsFactor}
                      onChange={(e) => handleUpdateItemMultiplier(editingItemIndex, 'logisticsFactor', parseFloat(e.target.value) || 1)}
                      className="w-full custom-input p-1 text-center text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-600 mb-1">سود/بالاسری:</label>
                    <input
                      type="number"
                      step="0.01"
                      value={proposalItems[editingItemIndex].multipliers.overheadProfit}
                      onChange={(e) => handleUpdateItemMultiplier(editingItemIndex, 'overheadProfit', parseFloat(e.target.value) || 1)}
                      className="w-full custom-input p-1 text-center text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-600 mb-1">ریسک ارز:</label>
                    <input
                      type="number"
                      step="0.01"
                      value={proposalItems[editingItemIndex].multipliers.currencyRisk}
                      onChange={(e) => handleUpdateItemMultiplier(editingItemIndex, 'currencyRisk', parseFloat(e.target.value) || 1)}
                      className="w-full custom-input p-1 text-center text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-600 mb-1">تخفیف:</label>
                    <input
                      type="number"
                      step="0.01"
                      value={proposalItems[editingItemIndex].multipliers.discountFactor}
                      onChange={(e) => handleUpdateItemMultiplier(editingItemIndex, 'discountFactor', parseFloat(e.target.value) || 1)}
                      className="w-full custom-input p-1 text-center text-xs"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Price Analysis Dashboard Summary Cards */}
          {currentUser.price_access === 1 && proposalItems.length > 0 && (
            <div className="bg-gradient-to-br from-slate-900 to-blue-950 rounded-3xl p-6 text-white shadow-xl space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
                <Calculator className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">
                  {lang === 'fa' ? 'خلاصه آنالیز مالی و حاشیه سود پروپوزال' : 'Financial & Profit Margin Breakdown'}
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Total Base Cost */}
                <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-1">
                  <span className="text-[11px] text-slate-400 font-semibold block">
                    {lang === 'fa' ? 'جمع قیمت خرید اولیه (Base Purchase):' : 'Total Base Purchase:'}
                  </span>
                  <div className="text-lg font-black text-white font-mono">
                    € {totalBasePurchasePriceEur.toLocaleString('en-US', { maximumFractionDigits: 1 })}
                  </div>
                </div>

                {/* Total Added Value & Profit */}
                <div className="p-4 rounded-2xl bg-blue-900/60 border border-blue-700/80 space-y-1">
                  <span className="text-[11px] text-blue-300 font-semibold block">
                    {lang === 'fa' ? 'افزوده ضرایب و سود (Added Value):' : 'Multipliers & Profit:'}
                  </span>
                  <div className="text-lg font-black text-amber-300 font-mono">
                    € {totalAddedValueEur.toLocaleString('en-US', { maximumFractionDigits: 1 })}
                  </div>
                </div>

                {/* Total Final Proposal Commercial Price */}
                <div className="p-4 rounded-2xl bg-emerald-900/60 border border-emerald-600/80 space-y-1">
                  <span className="text-[11px] text-emerald-300 font-semibold block">
                    {lang === 'fa' ? 'مبلغ کل پیش‌فاکتور (Grand Total):' : 'Commercial Grand Total:'}
                  </span>
                  <div className="text-xl font-black text-emerald-400 font-mono">
                    € {totalFinalProposalPriceEur.toLocaleString('en-US', { maximumFractionDigits: 1 })}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-300 pt-2 border-t border-slate-800">
                <span>
                  {lang === 'fa' ? 'ضریب میانگین کل پروپوزال:' : 'Average Overall Factor:'}
                </span>
                <span className="font-extrabold text-amber-400 font-mono text-sm">
                  {overallMultiplierRatio.toFixed(3)}x
                </span>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Live Document Printable Preview Modal */}
      <AnimatePresence>
        {isPreviewOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md" dir={config.language === 'fa' ? 'rtl' : 'ltr'}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-4xl max-h-[90vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Modal Top Bar */}
              <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-blue-400" />
                  <span className="font-bold text-sm">
                    {lang === 'fa' ? 'پیش‌نمایش سند رسمی پروپوزال' : 'Official Proposal Document Preview'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.print()}
                    className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>چاپ / Print</span>
                  </button>
                  <button
                    onClick={() => setIsPreviewOpen(false)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
                  >
                    بستن
                  </button>
                </div>
              </div>

              {/* Printable Document Sheet Container */}
              <div className="flex-1 overflow-y-auto p-8 sm:p-12 bg-slate-100 font-sans">
                <div className="max-w-3xl mx-auto bg-white p-8 sm:p-12 shadow-md rounded-xl border border-slate-200 space-y-6 text-slate-900">
                  
                  {/* Header */}
                  <div className="text-center pb-6 border-b-2 border-blue-900 space-y-1">
                    <h1 className="text-xl font-black text-blue-900">
                      {activeTemplate?.header_title || (config.language === 'fa' ? 'شرکت مهندسی ایساتیس پارس تجهیز' : 'ISATIS PARS TAJHIZ ENGINEERING CO.')}
                    </h1>
                    <p className="text-xs text-slate-600 font-semibold">
                      {activeTemplate?.header_subtitle || (config.language === 'fa' ? 'پیشنهاد فنی و مالی سیستم‌های اعلام و اطفاء حریق (F&G)' : 'Technical & Commercial Proposal - Fire & Gas Systems')}
                    </p>
                  </div>

                  {/* Document Info */}
                  <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200" dir={config.language === 'fa' ? 'rtl' : 'ltr'}>
                    <div><strong>{config.language === 'fa' ? 'عنوان پروژه:' : 'Project Title:'}</strong> {config.title}</div>
                    <div><strong>{config.language === 'fa' ? 'خریدار / کارفرما:' : 'Client / Customer:'}</strong> {config.clientName}</div>
                    <div><strong>{config.language === 'fa' ? 'کد رفرنس:' : 'Ref Code:'}</strong> {config.projectCode}</div>
                    <div><strong>{config.language === 'fa' ? 'تاریخ:' : 'Date:'}</strong> {config.date}</div>
                  </div>

                  {/* Intro */}
                  {config.introText && (
                    <div className="space-y-2" dir={config.language === 'fa' ? 'rtl' : 'ltr'}>
                      <h3 className="text-xs font-bold text-blue-900">
                        {config.language === 'fa' ? 'شرح و مقدمه فنی:' : 'Executive Summary:'}
                      </h3>
                      <p className="text-xs text-slate-700 leading-relaxed bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                        {config.introText}
                      </p>
                    </div>
                  )}

                  {/* Technical Notes from Template */}
                  {activeTemplate?.technical_notes && (
                    <div className="space-y-2" dir={config.language === 'fa' ? 'rtl' : 'ltr'}>
                      <h3 className="text-xs font-bold text-blue-900">
                        {config.language === 'fa' ? 'الزامات فنی و استانداردها:' : 'Technical Compliance Notes:'}
                      </h3>
                      <div className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200 whitespace-pre-line">
                        {activeTemplate.technical_notes}
                      </div>
                    </div>
                  )}

                  {/* Equipment Table */}
                  <div className="space-y-2" dir={config.language === 'fa' ? 'rtl' : 'ltr'}>
                    <h3 className="text-xs font-bold text-blue-900">
                      {config.language === 'fa' ? 'جدول مشخصات تجهیزات (BOQ):' : 'Bill of Quantities & Specifications (BOQ):'}
                    </h3>
                    <table className="w-full text-xs text-left border-collapse border border-slate-200">
                      <thead>
                        <tr className="bg-blue-900 text-white font-bold">
                          <th className="p-2 border border-blue-900 text-center">#</th>
                          <th className="p-2 border border-blue-900">{config.language === 'fa' ? 'پارت نامبر' : 'Part Number'}</th>
                          <th className="p-2 border border-blue-900">{config.language === 'fa' ? 'رفرنس نقشه / Tag' : 'DWG Ref / Tag'}</th>
                          <th className="p-2 border border-blue-900">{config.language === 'fa' ? 'برند' : 'Brand'}</th>
                          <th className="p-2 border border-blue-900">{config.language === 'fa' ? 'نوع تجهیز' : 'Type'}</th>
                          <th className="p-2 border border-blue-900 text-center">{config.language === 'fa' ? 'تعداد' : 'Qty'}</th>
                          {config.showPrices && (
                            <>
                              <th className="p-2 border border-blue-900 text-center">{config.language === 'fa' ? 'قیمت واحد (€)' : 'Unit (€)'}</th>
                              <th className="p-2 border border-blue-900 text-center">{config.language === 'fa' ? 'مبلغ کل (€)' : 'Total (€)'}</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {proposalItems.map((item, idx) => {
                          const unitPrice = getItemFinalUnitPrice(item);
                          const total = unitPrice * item.quantity;
                          return (
                            <tr key={idx} className="border-b border-slate-200">
                              <td className="p-2 border border-slate-200 text-center">{idx + 1}</td>
                              <td className="p-2 border border-slate-200 font-bold">{item.equipment.part_number}</td>
                              <td className="p-2 border border-slate-200 font-mono text-[11px] text-indigo-800">{item.drawingRef || item.tagNumber || item.equipment.drawing_ref || '-'}</td>
                              <td className="p-2 border border-slate-200">{item.equipment.brand}</td>
                              <td className="p-2 border border-slate-200">{item.equipment.equipment_type}</td>
                              <td className="p-2 border border-slate-200 text-center font-bold">{item.quantity}</td>
                              {config.showPrices && (
                                <>
                                  <td className="p-2 border border-slate-200 text-center font-mono">{unitPrice.toLocaleString('en-US', { maximumFractionDigits: 1 })}</td>
                                  <td className="p-2 border border-slate-200 text-center font-bold font-mono">{total.toLocaleString('en-US', { maximumFractionDigits: 1 })}</td>
                                </>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Grand total */}
                  {config.showPrices && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-left text-xs font-bold text-emerald-800">
                      {config.language === 'fa' ? 'مبلغ کل پیشنهادی:' : 'Grand Total:'} € {totalFinalProposalPriceEur.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                    </div>
                  )}

                  {/* Price Analysis Table if enabled */}
                  {config.showPrices && config.showPriceAnalysis && (
                    <div className="space-y-2 pt-4 border-t border-slate-200" dir={config.language === 'fa' ? 'rtl' : 'ltr'}>
                      <h3 className="text-xs font-bold text-amber-900">
                        {config.language === 'fa' ? 'جدول آنالیز شفاف ضرایب قیمت:' : 'Transparent Multiplier Breakdown Table:'}
                      </h3>
                      <table className="w-full text-[10px] text-left border-collapse border border-amber-200">
                        <thead>
                          <tr className="bg-amber-900 text-white font-bold">
                            <th className="p-1.5 border border-amber-900">{config.language === 'fa' ? 'پارت نامبر' : 'Part Number'}</th>
                            <th className="p-1.5 border border-amber-900 text-center">{config.language === 'fa' ? 'خرید اولیه' : 'Base Eur'}</th>
                            <th className="p-1.5 border border-amber-900 text-center">{config.language === 'fa' ? 'گمرک' : 'Customs'}</th>
                            <th className="p-1.5 border border-amber-900 text-center">{config.language === 'fa' ? 'حمل' : 'Logistics'}</th>
                            <th className="p-1.5 border border-amber-900 text-center">{config.language === 'fa' ? 'سود' : 'Overhead'}</th>
                            <th className="p-1.5 border border-amber-900 text-center">{config.language === 'fa' ? 'ارز' : 'Currency'}</th>
                            <th className="p-1.5 border border-amber-900 text-center">{config.language === 'fa' ? 'ضریب کل' : 'Total Factor'}</th>
                            <th className="p-1.5 border border-amber-900 text-center">{config.language === 'fa' ? 'فروش پیشنهادی' : 'Final Selling'}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {proposalItems.map((item, idx) => {
                            const base = item.customBasePriceEur ?? item.equipment.price ?? 0;
                            const m = item.multipliers;
                            const factor = getItemCompoundMultiplier(m);
                            const finalP = base * factor;
                            return (
                              <tr key={idx} className="border-b border-amber-100 bg-amber-50/30">
                                <td className="p-1.5 border border-amber-200 font-bold">{item.equipment.part_number}</td>
                                <td className="p-1.5 border border-amber-200 text-center font-mono">€{base}</td>
                                <td className="p-1.5 border border-amber-200 text-center">{m.customsFactor}x</td>
                                <td className="p-1.5 border border-amber-200 text-center">{m.logisticsFactor}x</td>
                                <td className="p-1.5 border border-amber-200 text-center">{m.overheadProfit}x</td>
                                <td className="p-1.5 border border-amber-200 text-center">{m.currencyRisk}x</td>
                                <td className="p-1.5 border border-amber-200 text-center font-bold text-amber-800">{factor.toFixed(3)}x</td>
                                <td className="p-1.5 border border-amber-200 text-center font-bold font-mono">€{finalP.toLocaleString('en-US', { maximumFractionDigits: 1 })}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Commercial Terms */}
                  <div className="pt-4 border-t border-slate-200 space-y-1 text-xs text-slate-700" dir={config.language === 'fa' ? 'rtl' : 'ltr'}>
                    <h3 className="font-bold text-blue-900 mb-2">
                      {config.language === 'fa' ? 'شرایط و الزام تجاری:' : 'Commercial Terms & Guarantee:'}
                    </h3>
                    <div>• <strong>{config.language === 'fa' ? 'زمان تحویل:' : 'Delivery Time:'}</strong> {config.deliveryTime}</div>
                    <div>• <strong>{config.language === 'fa' ? 'شرایط پرداخت:' : 'Payment Terms:'}</strong> {config.paymentTerms}</div>
                    <div>• <strong>{config.language === 'fa' ? 'مدت اعتبار پیشنهاد:' : 'Proposal Validity:'}</strong> {config.validityDays} {config.language === 'fa' ? 'روز' : 'Days'}</div>
                    <div>• <strong>{config.language === 'fa' ? 'گارانتی و خدمات:' : 'Warranty:'}</strong> {config.warranty}</div>
                  </div>

                  {/* Signature Section from Template */}
                  <div className="pt-8 border-t border-slate-200 grid grid-cols-2 gap-8 text-center text-xs text-slate-700" dir={config.language === 'fa' ? 'rtl' : 'ltr'}>
                    <div className="border border-dashed border-slate-300 rounded-xl p-4 space-y-4">
                      <div className="font-bold text-slate-900">
                        {activeTemplate?.signature_section?.prepared_by_title || (config.language === 'fa' ? 'کارشناس ارشد مهندسی فروش' : 'Sales Engineering Specialist')}
                      </div>
                      <div className="text-slate-400 text-[11px] font-mono">...................................</div>
                    </div>
                    <div className="border border-dashed border-slate-300 rounded-xl p-4 space-y-4">
                      <div className="font-bold text-slate-900">
                        {activeTemplate?.signature_section?.approved_by_title || (config.language === 'fa' ? 'مدیریت مهندسی و بازرگانی' : 'Engineering & Commercial Director')}
                      </div>
                      <div className="text-slate-400 text-[11px] font-mono">...................................</div>
                    </div>
                  </div>

                  <div className="text-center text-[10px] text-slate-400 pt-4 border-t border-slate-100">
                    {activeTemplate?.signature_section?.company_seal_text || (config.language === 'fa' ? 'شرکت مهندسی ایساتیس پارس تجهیز' : 'Isatis Pars Tajhiz Engineering Co.')}
                  </div>

                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Template Manager Modal */}
      <TemplateManagerModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        templates={templates}
        activeTemplateId={config.templateId}
        onSelectTemplate={(tmpl) => handleApplyTemplate(tmpl)}
        onRefreshTemplates={fetchTemplates}
        lang={lang}
      />

      {/* Saved Proposals Archive Modal */}
      <AnimatePresence>
        {isArchiveOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md" dir={lang === 'fa' ? 'rtl' : 'ltr'}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-4xl max-h-[90vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FolderArchive className="w-5 h-5 text-indigo-400" />
                  <h2 className="font-bold text-sm">
                    {lang === 'fa' ? 'آرشیو دیتابیس پروپوزال‌های ثبت‌شده' : 'Saved Proposals Database Archive'}
                  </h2>
                  <span className="text-xs bg-indigo-500/30 text-indigo-300 px-2 py-0.5 rounded-full font-mono">
                    {savedProposals.length}
                  </span>
                </div>
                <button
                  onClick={() => setIsArchiveOpen(false)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  {lang === 'fa' ? 'بستن' : 'Close'}
                </button>
              </div>

              {/* Proposals List Grid */}
              <div className="p-6 flex-1 overflow-y-auto space-y-4 bg-slate-50">
                {savedProposals.length === 0 ? (
                  <div className="text-center py-16 space-y-3 bg-white rounded-2xl border border-slate-200">
                    <Database className="w-10 h-10 text-slate-300 mx-auto" />
                    <p className="text-xs font-bold text-slate-600">
                      {lang === 'fa' ? 'هنوز هیچ پروپوزالی در دیتابیس ذخیره نشده است.' : 'No saved proposals in database.'}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {lang === 'fa' ? 'پس از تنظیم پروپوزال، روی دکمه "ذخیره در دیتابیس" کلیک کنید.' : 'Click "Save to DB" after composing a proposal.'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {savedProposals.map((prop) => (
                      <div
                        key={prop.id}
                        className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition-all space-y-3 flex flex-col justify-between"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-mono font-bold border border-indigo-100">
                              {prop.projectCode || 'IP-2026-F&G-01'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {new Date(prop.created_at).toLocaleDateString(lang === 'fa' ? 'fa-IR' : 'en-US')}
                            </span>
                          </div>

                          <h3 className="font-bold text-slate-900 text-sm line-clamp-1">
                            {prop.title}
                          </h3>

                          <div className="text-xs text-slate-600 space-y-1">
                            <div><strong>{lang === 'fa' ? 'کارفرما:' : 'Client:'}</strong> {prop.clientName || '-'}</div>
                            <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-1">
                              <span>• {prop.items?.length || 0} {lang === 'fa' ? 'قلم تجهیز' : 'items'}</span>
                              <span>• {prop.language === 'fa' ? 'فارسی' : 'English'}</span>
                              <span>• {prop.currency}</span>
                            </div>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                          <button
                            onClick={() => handleLoadSavedProposal(prop)}
                            className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>{lang === 'fa' ? 'بارگذاری مجدد در فرم' : 'Load to Form'}</span>
                          </button>

                          <button
                            onClick={() => handleDeleteSavedProposal(prop.id)}
                            className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold transition-all cursor-pointer"
                            title={lang === 'fa' ? 'حذف از دیتابیس' : 'Delete from DB'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Send Proposal via Email Modal */}
      <SendEmailModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        type="proposal"
        data={{
          ...config,
          items: proposalItems,
          template: activeTemplate
        }}
        lang={lang}
        onSuccess={() => {
          setSaveDbMsg({
            type: 'success',
            text: lang === 'fa' ? 'ایمیل پروپوزال با موفقیت ارسال شد و در تاریخچه ثبت گردید.' : 'Proposal email sent and logged successfully.'
          });
          setTimeout(() => setSaveDbMsg(null), 4000);
        }}
      />

      {/* Email History Logs Modal */}
      <EmailHistoryModal
        isOpen={isEmailHistoryOpen}
        onClose={() => setIsEmailHistoryOpen(false)}
        lang={lang}
        isAdmin={currentUser.role === 'admin'}
      />

    </div>
  );
};
