import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mail, 
  Send, 
  X, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  FileText, 
  User, 
  Plus, 
  Trash2, 
  RefreshCw,
  Building,
  Info,
  Clock
} from 'lucide-react';
import { ProposalConfig, ProposalItem, Letter, Equipment } from '../types';

interface SendEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'proposal' | 'letter' | 'equipment' | 'custom';
  data?: any;
  defaultRecipient?: string;
  defaultSubject?: string;
  lang?: 'fa' | 'en';
  onSuccess?: (result: any) => void;
}

export const SendEmailModal: React.FC<SendEmailModalProps> = ({
  isOpen,
  onClose,
  type,
  data,
  defaultRecipient = '',
  defaultSubject = '',
  lang = 'fa',
  onSuccess
}) => {
  const [toInput, setToInput] = useState(defaultRecipient);
  const [recipients, setRecipients] = useState<string[]>([]);
  const [ccInput, setCcInput] = useState('');
  const [ccList, setCcList] = useState<string[]>([]);
  const [showCc, setShowCc] = useState(false);
  const [subject, setSubject] = useState(defaultSubject);
  const [customMessage, setCustomMessage] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  
  // AI Drafting state
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiTone, setAiTone] = useState<'formal' | 'commercial' | 'urgent'>('formal');
  
  // Sending state
  const [isSending, setIsSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Auto-fill defaults when modal opens or data changes
  useEffect(() => {
    if (isOpen) {
      setStatusMessage(null);
      
      if (defaultRecipient) {
        setRecipients([defaultRecipient]);
        setToInput('');
      } else {
        setRecipients([]);
        setToInput('');
      }

      if (defaultSubject) {
        setSubject(defaultSubject);
      } else {
        if (type === 'proposal' && data) {
          setSubject(`پیشنهاد فنی و مالی پروژه ${data.title || ''} (${data.projectCode || ''})`);
        } else if (type === 'letter' && data) {
          setSubject(`ارسال نامه شماره ${data.letter_number} - ${data.subject || ''}`);
        } else if (type === 'equipment' && data) {
          setSubject(`مشخصات فنی تجهیز ${data.part_number} (${data.brand || ''})`);
        } else {
          setSubject('مکاتبه مهندسی - شرکت ایساتیس پارس تجهیز');
        }
      }

      // Default introductory note
      if (type === 'proposal' && data) {
        setCustomMessage(`با سلام و احترام،\nپیرو مذاکرات انجام‌شده، پیشنهاد فنی و مالی پکیج سیستم‌های F&G پروژه ${data.title || ''} جهت استحضار و بررسی ارسال می‌گردد.\nخواهشمند است پس از بررسی دستور مقتضی صادر فرمایید.`);
      } else if (type === 'letter' && data) {
        setCustomMessage(`با سلام و احترام،\nنامه اداری شماره ${data.letter_number} مورخ ${data.letter_date} به پیوست تقدیم می‌گردد.`);
      } else if (type === 'equipment' && data) {
        setCustomMessage(`با سلام و احترام،\nاطلاعات و مشخصات فنی استاندارد تجهیز ${data.part_number} تقدیم حضور می‌گردد.`);
      } else {
        setCustomMessage('');
      }
    }
  }, [isOpen, type, data, defaultRecipient, defaultSubject]);

  if (!isOpen) return null;

  const handleAddRecipient = (e?: React.KeyboardEvent | React.MouseEvent) => {
    if (e && 'key' in e && e.key !== 'Enter' && e.key !== ',') return;
    if (e && 'preventDefault' in e) e.preventDefault();

    const trimmed = toInput.trim().replace(',', '');
    if (trimmed && !recipients.includes(trimmed)) {
      setRecipients([...recipients, trimmed]);
      setToInput('');
    }
  };

  const handleRemoveRecipient = (email: string) => {
    setRecipients(recipients.filter(r => r !== email));
  };

  const handleAddCc = (e?: React.KeyboardEvent | React.MouseEvent) => {
    if (e && 'key' in e && e.key !== 'Enter' && e.key !== ',') return;
    if (e && 'preventDefault' in e) e.preventDefault();

    const trimmed = ccInput.trim().replace(',', '');
    if (trimmed && !ccList.includes(trimmed)) {
      setCcList([...ccList, trimmed]);
      setCcInput('');
    }
  };

  const handleRemoveCc = (email: string) => {
    setCcList(ccList.filter(r => r !== email));
  };

  // AI draft generator handler
  const handleGenerateAiDraft = async () => {
    setIsGeneratingAi(true);
    try {
      let recipientName = recipients[0] || (data?.clientName) || (data?.recipient) || 'کارفرمای محترم';
      let summaryDetails = '';

      if (type === 'proposal' && data) {
        summaryDetails = `پروپوزال فنی و مالی پروژه ${data.title} (کد: ${data.projectCode})، تعداد ${data.items?.length || 0} قلم تجهیز F&G، مدت تحویل ${data.deliveryTime || 'طبق توافق'}`;
      } else if (type === 'letter' && data) {
        summaryDetails = `نامه شماره ${data.letter_number} با موضوع "${data.subject}" و محتوای: ${data.content?.slice(0, 100)}`;
      } else if (type === 'equipment' && data) {
        summaryDetails = `دتایل تجهیز ${data.part_number} برند ${data.brand} نوع ${data.equipment_type} استاندارد ${data.nfpa_reference || 'NFPA'}`;
      } else {
        summaryDetails = subject;
      }

      const res = await fetch('/api/email/generate-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientName,
          contextType: type,
          summaryDetails,
          tone: aiTone,
          language: lang
        })
      });

      const json = await res.json();
      if (json.draft) {
        setCustomMessage(json.draft);
      }
    } catch (err) {
      console.error('Failed to generate AI draft', err);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Submit email sending
  const handleSendEmail = async () => {
    const allRecipients = [...recipients];
    if (toInput.trim()) {
      allRecipients.push(toInput.trim());
    }

    if (allRecipients.length === 0) {
      setStatusMessage({
        type: 'error',
        text: lang === 'fa' ? 'لطفاً حداقل یک آدرس ایمیل گیرنده وارد نمایید.' : 'Please enter at least one recipient email address.'
      });
      return;
    }

    if (!subject.trim()) {
      setStatusMessage({
        type: 'error',
        text: lang === 'fa' ? 'موضوع ایمیل نمی‌تواند خالی باشد.' : 'Subject cannot be empty.'
      });
      return;
    }

    setIsSending(true);
    setStatusMessage(null);

    try {
      let endpoint = '/api/email/send';
      let payload: any = {
        to: allRecipients,
        cc: ccList.length > 0 ? ccList : undefined,
        subject,
        customMessage,
        type
      };

      if (type === 'proposal' && data) {
        endpoint = '/api/email/send-proposal';
        payload.proposal = data;
      } else if (type === 'letter' && data) {
        endpoint = '/api/email/send-letter';
        payload.letter = data;
      } else if (type === 'equipment' && data) {
        endpoint = '/api/email/send-equipment';
        payload.equipment = data;
      } else {
        payload.text = customMessage;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'خطا در ارسال ایمیل');
      }

      setStatusMessage({
        type: 'success',
        text: result.message || (lang === 'fa' ? 'ایمیل با موفقیت ارسال شد.' : 'Email sent successfully.')
      });

      if (onSuccess) {
        onSuccess(result);
      }

      setTimeout(() => {
        onClose();
      }, 2000);

    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || (lang === 'fa' ? 'خطا در ارسال ایمیل رخ داد.' : 'Failed to send email.')
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden text-slate-800 dark:text-slate-100"
          dir={lang === 'fa' ? 'rtl' : 'ltr'}
        >
          {/* Header */}
          <div className="px-6 py-4 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white flex items-center justify-between border-b border-indigo-500/20">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-500/20 rounded-xl border border-blue-400/30 text-blue-300">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold">
                  {lang === 'fa' ? 'ارسال اطلاعات و اسناد از طریق ایمیل' : 'Send Information & Documents via Email'}
                </h2>
                <p className="text-xs text-blue-200/80">
                  {type === 'proposal' ? (lang === 'fa' ? 'ارسال پیشنهاد فنی و مالی' : 'Proposal Dispatch') :
                   type === 'letter' ? (lang === 'fa' ? 'ارسال نامه و مکاتبه رسمی' : 'Official Letter Dispatch') :
                   type === 'equipment' ? (lang === 'fa' ? 'ارسال دیتاشیت تجهیز' : 'Equipment Specs Dispatch') :
                   (lang === 'fa' ? 'ارسال پیام و گزارش' : 'General Communication')}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body content */}
          <div className="p-6 overflow-y-auto space-y-4 flex-1">
            
            {/* Alert / Status Bar */}
            {statusMessage && (
              <div className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-3 ${
                statusMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300' :
                statusMessage.type === 'error' ? 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300' :
                'bg-blue-50 text-blue-800 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300'
              }`}>
                {statusMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500" /> :
                 statusMessage.type === 'error' ? <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" /> :
                 <Info className="w-5 h-5 shrink-0 text-blue-500" />}
                <span>{statusMessage.text}</span>
              </div>
            )}

            {/* Recipient Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-blue-600" />
                  <span>{lang === 'fa' ? 'گیرندگان (To):' : 'Recipients (To):'}</span>
                </label>
                {!showCc && (
                  <button
                    type="button"
                    onClick={() => setShowCc(true)}
                    className="text-[11px] text-blue-600 hover:text-blue-700 dark:text-blue-400 font-semibold"
                  >
                    + {lang === 'fa' ? 'افزودن رونوشت (Cc)' : 'Add Cc'}
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 p-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
                {recipients.map((email) => (
                  <span
                    key={email}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 text-xs font-medium border border-blue-200 dark:border-blue-700"
                  >
                    <span>{email}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveRecipient(email)}
                      className="text-blue-600 hover:text-blue-900 dark:text-blue-300 ml-1"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}

                <input
                  type="email"
                  value={toInput}
                  onChange={(e) => setToInput(e.target.value)}
                  onKeyDown={handleAddRecipient}
                  placeholder={recipients.length === 0 ? (lang === 'fa' ? 'آدرس ایمیل گیرنده را وارد کرده و Enter بزنید...' : 'Enter recipient email and press Enter...') : (lang === 'fa' ? 'ایمیل بعدی...' : 'Next email...')}
                  className="flex-1 min-w-[200px] bg-transparent text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none py-1"
                />

                {toInput && (
                  <button
                    type="button"
                    onClick={() => handleAddRecipient()}
                    className="p-1 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900 rounded"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* CC Field if enabled */}
            {showCc && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {lang === 'fa' ? 'رونوشت (Cc):' : 'Carbon Copy (Cc):'}
                  </label>
                  <button
                    type="button"
                    onClick={() => { setShowCc(false); setCcList([]); }}
                    className="text-[11px] text-rose-500 hover:text-rose-600 font-semibold"
                  >
                    {lang === 'fa' ? 'حذف رونوشت' : 'Remove Cc'}
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2 p-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  {ccList.map((email) => (
                    <span
                      key={email}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200 text-xs font-medium border border-indigo-200"
                    >
                      <span>{email}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCc(email)}
                        className="text-indigo-600 ml-1"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}

                  <input
                    type="email"
                    value={ccInput}
                    onChange={(e) => setCcInput(e.target.value)}
                    onKeyDown={handleAddCc}
                    placeholder={lang === 'fa' ? 'ایمیل رونوشت...' : 'Cc email address...'}
                    className="flex-1 min-w-[180px] bg-transparent text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none py-1"
                  />
                </div>
              </div>
            )}

            {/* Subject Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {lang === 'fa' ? 'موضوع ایمیل:' : 'Subject:'}
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={lang === 'fa' ? 'موضوع ایمیل...' : 'Email Subject...'}
                className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* AI Assistant Toolbar for Message Body */}
            <div className="space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{lang === 'fa' ? 'متن همراه و پیام ارسالی:' : 'Email Message Body:'}</span>
                </label>

                <div className="flex items-center gap-2">
                  <select
                    value={aiTone}
                    onChange={(e: any) => setAiTone(e.target.value)}
                    className="text-[11px] bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1"
                  >
                    <option value="formal">{lang === 'fa' ? 'لحن رسمی اداری' : 'Formal Tone'}</option>
                    <option value="commercial">{lang === 'fa' ? 'لحن بازرگانی و فروش' : 'Commercial Tone'}</option>
                    <option value="urgent">{lang === 'fa' ? 'لحن فوری و پیگیری' : 'Urgent Follow-up'}</option>
                  </select>

                  <button
                    type="button"
                    onClick={handleGenerateAiDraft}
                    disabled={isGeneratingAi}
                    className="px-2.5 py-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-sm disabled:opacity-50"
                  >
                    <Sparkles className={`w-3.5 h-3.5 ${isGeneratingAi ? 'animate-spin' : ''}`} />
                    <span>{isGeneratingAi ? (lang === 'fa' ? 'در حال نگارش...' : 'Drafting...') : (lang === 'fa' ? 'نگارش با هوش مصنوعی' : 'AI Draft')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowPreview(!showPreview)}
                    className="px-2.5 py-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-200 rounded-lg text-[11px] font-bold flex items-center gap-1"
                  >
                    {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showPreview ? (lang === 'fa' ? 'ویرایش متن' : 'Edit Text') : (lang === 'fa' ? 'پیش‌نمایش سازمانی' : 'Preview')}</span>
                  </button>
                </div>
              </div>

              {!showPreview ? (
                <textarea
                  rows={5}
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder={lang === 'fa' ? 'متن ایمیل را وارد فرمایید یا با دکمه هوش مصنوعی تولید کنید...' : 'Enter message text or generate with AI...'}
                  className="w-full p-3.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-xs leading-relaxed focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              ) : (
                <div className="p-4 border border-blue-200 dark:border-blue-900 rounded-xl bg-blue-50/40 dark:bg-slate-800/80 text-xs space-y-3">
                  <div className="flex items-center gap-2 text-blue-900 dark:text-blue-300 font-bold border-b border-blue-200/50 pb-2">
                    <Building className="w-4 h-4" />
                    <span>{lang === 'fa' ? 'شرکت مهندسی ایساتیس پارس تجهیز - پیش‌نمایش ایمیل' : 'Isatis Pars Tajhiz - Email Preview'}</span>
                  </div>
                  <div className="whitespace-pre-line text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
                    {customMessage || (lang === 'fa' ? '(متنی وارد نشده است)' : '(No message content)')}
                  </div>
                  {data && type === 'proposal' && (
                    <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px]">
                      <div className="font-bold text-slate-900 dark:text-white mb-1">
                        {lang === 'fa' ? 'اقلام پیشنهادی پکیج:' : 'Proposal BOQ Items:'} {data.items?.length || 0} {lang === 'fa' ? 'قلم' : 'items'}
                      </div>
                      <div className="text-slate-500">
                        {lang === 'fa' ? 'جدول کامل مشخصات فنی و شرایط تجاری در قالب HTML ایمیل تعبیه شده است.' : 'Full technical table and commercial terms are embedded in the responsive HTML template.'}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quick Context Summary Card */}
            {data && (
              <div className="p-3 bg-slate-100 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    {type === 'proposal' ? `${lang === 'fa' ? 'پروپوزال پروژه:' : 'Project Proposal:'} ${data.title || data.projectCode}` :
                     type === 'letter' ? `${lang === 'fa' ? 'نامه اداری:' : 'Letter No:'} ${data.letter_number}` :
                     type === 'equipment' ? `${lang === 'fa' ? 'تجهیز F&G:' : 'Equipment:'} ${data.part_number} (${data.brand})` :
                     (lang === 'fa' ? 'سند پیوست' : 'Attached Document')}
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                  {lang === 'fa' ? 'قالب رسمی شرکت' : 'Corporate HTML Template'}
                </span>
              </div>
            )}

          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>{lang === 'fa' ? 'ثبت خودکار در لاگ مکاتبات سیستم' : 'Auto-recorded in communications log'}</span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSending}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
              >
                {lang === 'fa' ? 'انصراف' : 'Cancel'}
              </button>

              <button
                type="button"
                onClick={handleSendEmail}
                disabled={isSending || recipients.length === 0 && !toInput.trim()}
                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-600/30 disabled:opacity-50 transition-all cursor-pointer"
              >
                {isSending ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{lang === 'fa' ? 'در حال ارسال ایمیل...' : 'Sending Email...'}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>{lang === 'fa' ? 'ارسال ایمیل' : 'Send Email'}</span>
                  </>
                )}
              </button>
            </div>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
};
