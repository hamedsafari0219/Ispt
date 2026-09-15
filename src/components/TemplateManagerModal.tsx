import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileCode2, 
  Sparkles, 
  Plus, 
  Check, 
  Trash2, 
  Edit3, 
  Copy, 
  FileText, 
  Upload, 
  Star, 
  Layers, 
  X, 
  ShieldCheck, 
  RefreshCw,
  AlertCircle,
  HelpCircle,
  CheckCircle2
} from 'lucide-react';
import { ProposalTemplate } from '../types';
import { authenticatedFetch } from '../utils/api';

interface TemplateManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  templates: ProposalTemplate[];
  activeTemplateId?: number;
  onSelectTemplate: (template: ProposalTemplate) => void;
  onRefreshTemplates: () => Promise<void>;
  lang: 'fa' | 'en';
}

export const TemplateManagerModal: React.FC<TemplateManagerModalProps> = ({
  isOpen,
  onClose,
  templates,
  activeTemplateId,
  onSelectTemplate,
  onRefreshTemplates,
  lang
}) => {
  const isFa = lang === 'fa';
  const [activeTab, setActiveTab] = useState<'list' | 'ai_extract' | 'editor'>('list');
  const [selectedTemplateForEdit, setSelectedTemplateForEdit] = useState<Partial<ProposalTemplate> | null>(null);

  // AI Extraction State
  const [sampleText, setSampleText] = useState('');
  const [sampleFile, setSampleFile] = useState<{ name: string; base64: string; mimeType: string } | null>(null);
  const [aiTemplateTitle, setAiTemplateTitle] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [extractedTemplate, setExtractedTemplate] = useState<Partial<ProposalTemplate> | null>(null);

  // Action status message
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Helper to show temporary status
  const showStatus = (type: 'success' | 'error', text: string) => {
    setStatusMsg({ type, text });
    setTimeout(() => setStatusMsg(null), 4000);
  };

  // Handle File Upload for AI Extraction
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const resultStr = reader.result as string;
      const base64 = resultStr.split(',')[1];
      setSampleFile({
        name: file.name,
        base64,
        mimeType: file.type || 'application/pdf'
      });
      if (!aiTemplateTitle) {
        setAiTemplateTitle(`قالب استخراج شده از ${file.name.replace(/\.[^/.]+$/, '')}`);
      }
    };
    reader.readAsDataURL(file);
  };

  // Run AI Extraction
  const handleRunAiExtraction = async () => {
    if (!sampleText.trim() && !sampleFile) {
      setExtractionError('لطفاً متن نمونه پروپوزال را وارد نمایید یا فایل PDF/Word آن را بارگذاری کنید.');
      return;
    }

    setIsExtracting(true);
    setExtractionError(null);

    try {
      const res = await authenticatedFetch('/api/proposals/templates/extract-ai', {
        method: 'POST',
        body: JSON.stringify({
          sampleText: sampleText.trim() || undefined,
          fileBase64: sampleFile?.base64,
          mimeType: sampleFile?.mimeType,
          templateTitle: aiTemplateTitle.trim() || 'قالب اختصاصی سازمانی'
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'خطا در استخراج قالب');
      }

      const data = await res.json();
      if (data.template) {
        setExtractedTemplate(data.template);
        setSelectedTemplateForEdit(data.template);
        setActiveTab('editor');
        showStatus('success', 'ساختار قالب با هوش مصنوعی شناسایی شد. لطفاً بررسی و ذخیره نمایید.');
      }
    } catch (err: any) {
      setExtractionError(err.message || 'خطا در ارتباط با سرور هوش مصنوعی.');
    } finally {
      setIsExtracting(false);
    }
  };

  // Open Editor for New Template
  const handleCreateNew = () => {
    setSelectedTemplateForEdit({
      title: 'قالب جدید پروپوزال',
      description: 'قالب سفارشی سازی شده برای پروژه‌های خاص',
      category: 'custom',
      is_default: false,
      header_title: 'شرکت مهندسی ایساتیس پارس تجهیز',
      header_subtitle: 'پیشنهاد فنی و مالی سیستم‌های اعلام و اطفاء حریق (F&G)',
      intro_template: 'پیرو درخواست استعلام جهت پروژه {{PROJECT_NAME}} (کد: {{PROJECT_CODE}})، این پیشنهاد فنی و مالی تقدیم حضور خریدار محترم {{CLIENT_NAME}} می‌گردد.',
      technical_notes: '• تمامی تجهیزات دارای استاندارد بین‌المللی و تاییدیه رسمی سازنده می‌باشند.\n• مدارک فنی و کاتالوگ‌های مهندسی به پیوست ارسال می‌گردد.',
      boq_columns: ['row', 'part_number', 'dwg_tag', 'brand', 'type', 'specs', 'qty', 'unit_price', 'total_price'],
      show_price_analysis_table: true,
      warranty_template: '۱۲ ماه از تاریخ تحویل و ۱۰ سال خدمات تامین قطعات یدکی',
      payment_terms_template: '۵۰٪ پیش‌پرداخت، ۴۰٪ هنگام تحویل کالا، ۱۰٪ پس از تحویل نهایی',
      delivery_time_template: '۴ الی ۶ هفته کاری پس از ابلاغ رسمی سفارش',
      validity_template: '۳۰ روز از تاریخ صدور',
      closing_remarks: 'با تشکر و احترام،\nشرکت مهندسی ایساتیس پارس تجهیز',
      signature_section: {
        prepared_by_title: 'کارشناس ارشد مهندسی فروش',
        approved_by_title: 'مدیریت مهندسی و بازرگانی',
        company_seal_text: 'شرکت مهندسی ایساتیس پارس تجهیز'
      }
    });
    setActiveTab('editor');
  };

  // Open Editor for Existing Template
  const handleEditTemplate = (tmpl: ProposalTemplate) => {
    setSelectedTemplateForEdit({ ...tmpl });
    setActiveTab('editor');
  };

  // Save (Create or Update) Template
  const handleSaveTemplate = async () => {
    if (!selectedTemplateForEdit || !selectedTemplateForEdit.title || !selectedTemplateForEdit.header_title) {
      showStatus('error', 'عنوان قالب و نام سربرگ الزامی هستند.');
      return;
    }

    setIsSaving(true);
    try {
      const isExisting = Boolean(selectedTemplateForEdit.id);
      const url = isExisting 
        ? `/api/proposals/templates/${selectedTemplateForEdit.id}`
        : '/api/proposals/templates';
      const method = isExisting ? 'PUT' : 'POST';

      const res = await authenticatedFetch(url, {
        method,
        body: JSON.stringify(selectedTemplateForEdit)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'خطا در ذخیره قالب');
      }

      const saved = await res.json();
      await onRefreshTemplates();
      showStatus('success', `قالب "${saved.title}" با موفقیت ذخیره شد.`);
      setActiveTab('list');
    } catch (err: any) {
      showStatus('error', err.message || 'خطا در ذخیره قالب.');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Template
  const handleDeleteTemplate = async (tmpl: ProposalTemplate) => {
    if (!window.confirm(`آیا از حذف قالب "${tmpl.title}" اطمینان دارید؟`)) return;

    try {
      const res = await authenticatedFetch(`/api/proposals/templates/${tmpl.id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        await onRefreshTemplates();
        showStatus('success', 'قالب با موفقیت حذف شد.');
      }
    } catch (err: any) {
      showStatus('error', 'خطا در حذف قالب.');
    }
  };

  // Set Template as Default
  const handleSetDefault = async (tmpl: ProposalTemplate) => {
    try {
      const res = await authenticatedFetch(`/api/proposals/templates/${tmpl.id}`, {
        method: 'PUT',
        body: JSON.stringify({ is_default: true })
      });
      if (res.ok) {
        await onRefreshTemplates();
        showStatus('success', `قالب "${tmpl.title}" به عنوان قالب پیش‌فرض تنظیم شد.`);
      }
    } catch (err: any) {
      showStatus('error', 'خطا در تنظیم پیش‌فرض.');
    }
  };

  // Helper for inserting merge tag into intro template
  const insertMergeTag = (tag: string) => {
    if (!selectedTemplateForEdit) return;
    const currentIntro = selectedTemplateForEdit.intro_template || '';
    setSelectedTemplateForEdit({
      ...selectedTemplateForEdit,
      intro_template: currentIntro + ' ' + tag
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/30 rounded-xl border border-blue-400/30 text-blue-300">
              <FileCode2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
                موتور مدیریت و سفارشی‌سازی قالب‌های پروپوزال
                <span className="text-xs bg-blue-500/30 text-blue-200 px-2 py-0.5 rounded-full border border-blue-400/20 font-medium">
                  {templates.length} قالب آماده
                </span>
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                تعریف و استخراج هوشمند قالب‌های سازمانی، فرمت‌های استعلام قیمت، شرایط فنی و ضرایب مالی
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Toast */}
        {statusMsg && (
          <div className={`p-3 text-xs font-semibold flex items-center justify-between ${
            statusMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-b border-emerald-200' : 'bg-rose-50 text-rose-800 border-b border-rose-200'
          }`}>
            <span className="flex items-center gap-2">
              {statusMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
              {statusMsg.text}
            </span>
            <button onClick={() => setStatusMsg(null)} className="text-slate-400 hover:text-slate-600">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Modal Navigation Tabs */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-2.5 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('list')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
                activeTab === 'list' 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Layers className="w-4 h-4" />
              کتابخانه قالب‌ها ({templates.length})
            </button>
            <button
              onClick={() => setActiveTab('ai_extract')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
                activeTab === 'ai_extract' 
                  ? 'bg-indigo-600 text-white shadow-sm' 
                  : 'bg-white text-indigo-700 hover:bg-indigo-50 border border-indigo-200'
              }`}
            >
              <Sparkles className="w-4 h-4 text-indigo-300 animate-pulse" />
              استخراج هوشمند قالب با هوش مصنوعی
            </button>
            <button
              onClick={handleCreateNew}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
                activeTab === 'editor' && !selectedTemplateForEdit?.id
                  ? 'bg-emerald-600 text-white shadow-sm' 
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Plus className="w-4 h-4" />
              طراحی قالب دستی جدید
            </button>
          </div>

          {activeTab === 'editor' && selectedTemplateForEdit?.id && (
            <span className="text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1 rounded-md border border-amber-200 flex items-center gap-1.5">
              <Edit3 className="w-3.5 h-3.5" />
              در حال ویرایش: {selectedTemplateForEdit.title}
            </span>
          )}
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
          {/* 1. LIST TAB */}
          {activeTab === 'list' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {templates.map(tmpl => {
                  const isActive = activeTemplateId === tmpl.id;
                  return (
                    <div 
                      key={tmpl.id}
                      className={`bg-white rounded-xl border p-4.5 transition-all flex flex-col justify-between ${
                        isActive 
                          ? 'border-blue-500 shadow-md ring-2 ring-blue-500/20' 
                          : 'border-slate-200 hover:border-slate-300 shadow-sm'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-extrabold text-sm text-slate-900">{tmpl.title}</h3>
                              {tmpl.is_default && (
                                <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                                  پیش‌فرض سیستم
                                </span>
                              )}
                              {isActive && (
                                <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <Check className="w-3 h-3 text-blue-600" />
                                  قالب فعال فعلی
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{tmpl.description}</p>
                          </div>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                            {tmpl.category}
                          </span>
                        </div>

                        {/* Template Details Summary */}
                        <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100 text-[11px] text-slate-600 space-y-1 my-3">
                          <div className="flex justify-between">
                            <span className="text-slate-400">عنوان سربرگ:</span>
                            <span className="font-medium truncate max-w-[200px]">{tmpl.header_title}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">ستون‌های BOQ:</span>
                            <span className="font-mono">{tmpl.boq_columns?.length || 9} ستون</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">جدول آنالیز ضرایب:</span>
                            <span className="font-medium text-emerald-600">{tmpl.show_price_analysis_table ? 'فعال' : 'غیرفعال'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center justify-between pt-3 border-t border-slate-100 gap-2">
                        <button
                          onClick={() => {
                            onSelectTemplate(tmpl);
                            onClose();
                          }}
                          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 ${
                            isActive 
                              ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                          {isActive ? 'انتخاب شده' : 'اعمال این قالب'}
                        </button>

                        <div className="flex items-center gap-1">
                          {!tmpl.is_default && (
                            <button
                              onClick={() => handleSetDefault(tmpl)}
                              title="تنظیم به عنوان قالب پیش‌فرض"
                              className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors"
                            >
                              <Star className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleEditTemplate(tmpl)}
                            title="ویرایش مشخصات قالب"
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          {tmpl.category === 'custom' && (
                            <button
                              onClick={() => handleDeleteTemplate(tmpl)}
                              title="حذف قالب سفارشی"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. AI EXTRACTOR TAB */}
          {activeTab === 'ai_extract' && (
            <div className="space-y-5">
              <div className="bg-indigo-50/80 border border-indigo-200 rounded-xl p-4 flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div className="text-xs text-indigo-900 leading-relaxed">
                  <strong className="font-bold">استخراج هوشمند قالب سازمانی شما با هوش مصنوعی:</strong>
                  <p className="mt-1 text-indigo-700">
                    شما می‌توانید متن یا فایل یکی از پروپوزال‌های استاندارد قبلی شرکت یا کارفرمای خود را اینجا قرار دهید. موتور هوش مصنوعی ساختار سربرگ، مقدمه، الزامات فنی، شرایط گارانتی، نحوه پرداخت و امضاها را تشخیص داده و با جایگذاری تگ‌های استاندارد (<code className="bg-indigo-100 px-1 rounded font-mono text-[11px] font-bold">{'{{PROJECT_NAME}}'}</code>، <code className="bg-indigo-100 px-1 rounded font-mono text-[11px] font-bold">{'{{CLIENT_NAME}}'}</code> و...) یک قالب آماده تولید می‌کند.
                  </p>
                </div>
              </div>

              {extractionError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  {extractionError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* File Upload Box */}
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <label className="block text-xs font-bold text-slate-700 mb-2 flex items-center gap-2">
                    <Upload className="w-4 h-4 text-blue-600" />
                    روش اول: بارگذاری فایل پروپوزال نمونه (PDF یا DOCX)
                  </label>
                  <div className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-xl p-6 text-center transition-colors">
                    <input 
                      type="file" 
                      accept=".pdf,.docx,.doc" 
                      onChange={handleFileUpload}
                      className="hidden" 
                      id="proposal-sample-upload"
                    />
                    <label htmlFor="proposal-sample-upload" className="cursor-pointer flex flex-col items-center">
                      <FileText className="w-10 h-10 text-slate-400 mb-2" />
                      <span className="text-xs font-bold text-blue-600 hover:underline">
                        برای انتخاب فایل کلیک کنید
                      </span>
                      <span className="text-[11px] text-slate-400 mt-1">
                        فرمت‌های پشتیبانی شده: PDF, Word (DOCX)
                      </span>
                    </label>
                    {sampleFile && (
                      <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 font-medium">
                        <Check className="w-3.5 h-3.5 text-blue-600" />
                        {sampleFile.name}
                      </div>
                    )}
                  </div>
                </div>

                {/* Direct Text Paste Box */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col">
                  <label className="block text-xs font-bold text-slate-700 mb-2 flex items-center gap-2">
                    <FileCode2 className="w-4 h-4 text-indigo-600" />
                    روش دوم: الصاق مستقیم متن کامل پروپوزال نمونه
                  </label>
                  <textarea
                    rows={8}
                    value={sampleText}
                    onChange={(e) => setSampleText(e.target.value)}
                    placeholder="متن نمونه پروپوزال فنی/مالی خود را اینجا Paste کنید..."
                    className="w-full flex-1 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs leading-relaxed focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>

              {/* Template Name and Extraction Trigger */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between flex-wrap gap-3">
                <div className="flex-1 min-w-[280px]">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    نام پیشنهادی برای این قالب جدید:
                  </label>
                  <input
                    type="text"
                    value={aiTemplateTitle}
                    onChange={(e) => setAiTemplateTitle(e.target.value)}
                    placeholder="مثال: قالب استعلام شرکت ملی گاز ایران"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <button
                  onClick={handleRunAiExtraction}
                  disabled={isExtracting}
                  className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-2 disabled:opacity-50"
                >
                  {isExtracting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      در حال تحلیل و استخراج ساختار توسط هوش مصنوعی...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      تحلیل و استخراج هوشمند قالب
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* 3. EDITOR TAB */}
          {activeTab === 'editor' && selectedTemplateForEdit && (
            <div className="space-y-5 bg-white border border-slate-200 rounded-xl p-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-black text-sm text-slate-900">
                    {selectedTemplateForEdit.id ? 'ویرایش مشخصات قالب' : 'طراحی قالب جدید'}
                  </h3>
                  <p className="text-xs text-slate-500">تنظیم پارامترهای سربرگ، مقدمه، جداول و بندهای حقوقی</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab('list')}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold"
                  >
                    انصراف
                  </button>
                  <button
                    onClick={handleSaveTemplate}
                    disabled={isSaving}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                  >
                    {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    ذخیره قالب
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">عنوان قالب:</label>
                  <input
                    type="text"
                    value={selectedTemplateForEdit.title || ''}
                    onChange={(e) => setSelectedTemplateForEdit({ ...selectedTemplateForEdit, title: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">دسته‌بندی:</label>
                  <select
                    value={selectedTemplateForEdit.category || 'custom'}
                    onChange={(e) => setSelectedTemplateForEdit({ ...selectedTemplateForEdit, category: e.target.value as any })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="oil_gas">نفت و گاز (EPC)</option>
                    <option value="fast_inquiry">استعلام سریع بازرگانی</option>
                    <option value="fm200_fire_fighting">سیستم‌های اطفاء حریق FM-200</option>
                    <option value="alarm_system">سیستم‌های اعلام حریق و F&G</option>
                    <option value="custom">سفارشی سازمانی</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">توضیح کوتاه:</label>
                  <input
                    type="text"
                    value={selectedTemplateForEdit.description || ''}
                    onChange={(e) => setSelectedTemplateForEdit({ ...selectedTemplateForEdit, description: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Header Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">عنوان اصلی سربرگ (نام شرکت):</label>
                  <input
                    type="text"
                    value={selectedTemplateForEdit.header_title || ''}
                    onChange={(e) => setSelectedTemplateForEdit({ ...selectedTemplateForEdit, header_title: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">زیرعنوان سربرگ:</label>
                  <input
                    type="text"
                    value={selectedTemplateForEdit.header_subtitle || ''}
                    onChange={(e) => setSelectedTemplateForEdit({ ...selectedTemplateForEdit, header_subtitle: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Intro Text Template with Merge Tag Helper Buttons */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    متن مقدمه / چکیده مدیریتی (Intro Template):
                  </label>
                  <div className="flex items-center gap-1 text-[11px]">
                    <span className="text-slate-400">افزودن تگ:</span>
                    <button 
                      type="button" 
                      onClick={() => insertMergeTag('{{PROJECT_NAME}}')}
                      className="px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded hover:bg-blue-100 font-mono text-[10px]"
                    >
                      + نام پروژه
                    </button>
                    <button 
                      type="button" 
                      onClick={() => insertMergeTag('{{CLIENT_NAME}}')}
                      className="px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded hover:bg-blue-100 font-mono text-[10px]"
                    >
                      + کارفرما
                    </button>
                    <button 
                      type="button" 
                      onClick={() => insertMergeTag('{{PROJECT_CODE}}')}
                      className="px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded hover:bg-blue-100 font-mono text-[10px]"
                    >
                      + کد پروژه
                    </button>
                    <button 
                      type="button" 
                      onClick={() => insertMergeTag('{{DATE}}')}
                      className="px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded hover:bg-blue-100 font-mono text-[10px]"
                    >
                      + تاریخ
                    </button>
                  </div>
                </div>
                <textarea
                  rows={3}
                  value={selectedTemplateForEdit.intro_template || ''}
                  onChange={(e) => setSelectedTemplateForEdit({ ...selectedTemplateForEdit, intro_template: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs leading-relaxed focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans"
                />
              </div>

              {/* Technical Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  توضیحات و الزامات فنی / استانداردهای رعایت شده (Technical Compliance Notes):
                </label>
                <textarea
                  rows={2}
                  value={selectedTemplateForEdit.technical_notes || ''}
                  onChange={(e) => setSelectedTemplateForEdit({ ...selectedTemplateForEdit, technical_notes: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs leading-relaxed focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Commercial Terms Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">شرایط گارانتی و خدمات:</label>
                  <input
                    type="text"
                    value={selectedTemplateForEdit.warranty_template || ''}
                    onChange={(e) => setSelectedTemplateForEdit({ ...selectedTemplateForEdit, warranty_template: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">شرایط پرداخت:</label>
                  <input
                    type="text"
                    value={selectedTemplateForEdit.payment_terms_template || ''}
                    onChange={(e) => setSelectedTemplateForEdit({ ...selectedTemplateForEdit, payment_terms_template: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">مدت زمان تحویل کالا:</label>
                  <input
                    type="text"
                    value={selectedTemplateForEdit.delivery_time_template || ''}
                    onChange={(e) => setSelectedTemplateForEdit({ ...selectedTemplateForEdit, delivery_time_template: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">مدت اعتبار پیشنهاد:</label>
                  <input
                    type="text"
                    value={selectedTemplateForEdit.validity_template || ''}
                    onChange={(e) => setSelectedTemplateForEdit({ ...selectedTemplateForEdit, validity_template: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Toggles & Options */}
              <div className="flex items-center gap-6 pt-2 border-t border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={selectedTemplateForEdit.show_price_analysis_table ?? true}
                    onChange={(e) => setSelectedTemplateForEdit({ ...selectedTemplateForEdit, show_price_analysis_table: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  نمایش جدول تفکیکی آنالیز ضرایب (گمرک، سود، حمل و ریسک)
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={selectedTemplateForEdit.is_default ?? false}
                    onChange={(e) => setSelectedTemplateForEdit({ ...selectedTemplateForEdit, is_default: e.target.checked })}
                    className="w-4 h-4 text-amber-600 rounded"
                  />
                  تنظیم به عنوان قالب پیش‌فرض
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-100 border-t border-slate-200 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>پشتیبانی کامل از استانداردهای مهندسی F&G و ضرایب بازرگانی</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors"
          >
            بستن پنجره
          </button>
        </div>
      </motion.div>
    </div>
  );
};
