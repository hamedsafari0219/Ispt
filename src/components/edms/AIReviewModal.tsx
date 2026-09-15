import React, { useState } from 'react';
import { Sparkles, CheckCircle2, ShieldAlert, BookOpen, X, Loader2, Copy, Check } from 'lucide-react';
import { EDMSDocument } from '../../types';
import { authenticatedFetch } from '../../utils/api';

interface AIReviewModalProps {
  document: EDMSDocument | null;
  isOpen: boolean;
  onClose: () => void;
  lang: 'fa' | 'en';
}

export const AIReviewModal: React.FC<AIReviewModalProps> = ({
  document,
  isOpen,
  onClose,
  lang
}) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    checklist: string[];
    standardReferences: string[];
    reviewTips: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  React.useEffect(() => {
    if (isOpen && document) {
      fetchAiReview();
    } else {
      setResult(null);
    }
  }, [isOpen, document]);

  const fetchAiReview = async () => {
    if (!document) return;
    setLoading(true);
    try {
      const res = await authenticatedFetch('/api/edms/ai-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doc_number: document.doc_number,
          title: document.title,
          discipline: document.discipline,
          doc_type: document.doc_type,
          current_revision: document.current_revision
        })
      });
      if (res.ok) {
        const data = await res.json();
        setResult(data);
      }
    } catch (e) {
      console.error('AI Review Error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyChecklist = () => {
    if (!result) return;
    const text = [
      `چک‌لیست کنترل و بازبینی مدرک مهندسی ${document?.doc_number} (${document?.title}):`,
      '',
      'استانداردهای مرجع:',
      ...result.standardReferences.map(s => `- ${s}`),
      '',
      'موارد کنترلی:',
      ...result.checklist.map((item, idx) => `${idx + 1}. ${item}`),
      '',
      `توصیه مهندسی: ${result.reviewTips}`
    ].join('\n');

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen || !document) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div 
        className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        dir={lang === 'fa' ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 to-indigo-800 p-4 sm:p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-xs flex items-center justify-center text-amber-300">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold">
                {lang === 'fa' ? 'چک‌لیست هوشمند بازبینی مدرک (AI DCC)' : 'AI Engineering Verification'}
              </h3>
              <p className="text-xs text-blue-150 font-mono">
                {document.doc_number} - {document.current_revision}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* Doc Summary Pill */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div>
              <span className="text-slate-500 font-medium">عنوان مدرک: </span>
              <strong className="text-slate-800">{document.title}</strong>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-bold">{document.discipline}</span>
              <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 font-mono font-bold">{document.doc_type}</span>
            </div>
          </div>

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              <p className="text-xs text-slate-500 font-medium">
                {lang === 'fa' 
                  ? 'در حال آنالیز مدرک و استخراج الزامات استانداردهای NFPA و IPS...' 
                  : 'Analyzing document standards with Gemini AI...'}
              </p>
            </div>
          ) : result ? (
            <>
              {/* Standard References */}
              {result.standardReferences && result.standardReferences.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-600 mb-2 flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-indigo-600" />
                    <span>{lang === 'fa' ? 'استانداردهای مرجع الزامی:' : 'Reference Standards:'}</span>
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {result.standardReferences.map((std, i) => (
                      <span key={i} className="px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-mono font-bold">
                        {std}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Inspection Checklist */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 mb-2.5 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{lang === 'fa' ? 'چک‌لیست کنترل و صحه‌گذاری قبل از صدور (Verification Points):' : 'Pre-Issue Verification Points:'}</span>
                </h4>
                <div className="space-y-2">
                  {result.checklist.map((item, idx) => (
                    <div 
                      key={idx} 
                      className="p-3 rounded-xl bg-emerald-50/40 border border-emerald-100/80 flex items-start gap-3"
                    >
                      <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="text-xs text-slate-800 leading-relaxed font-medium">
                        {item}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tips */}
              {result.reviewTips && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block mb-0.5 font-bold">
                      {lang === 'fa' ? 'راهنمای اخذ تاییدیه بدون کامنت (Code 1):' : 'Key Tip for Code 1 Approval:'}
                    </strong>
                    <span className="leading-relaxed">{result.reviewTips}</span>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="py-8 text-center text-xs text-slate-400">
              {lang === 'fa' ? 'خطا در بارگذاری چک‌لیست هوشمند.' : 'Failed to generate AI checklist.'}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={handleCopyChecklist}
            disabled={!result || loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
            <span>{copied ? (lang === 'fa' ? 'کپی شد!' : 'Copied!') : (lang === 'fa' ? 'کپی چک‌لیست' : 'Copy Checklist')}</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-all cursor-pointer"
          >
            {lang === 'fa' ? 'بستن' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
