import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Plus, 
  Search, 
  Filter, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  FileText, 
  Tag, 
  Lightbulb, 
  Trash2,
  RefreshCw,
  X
} from 'lucide-react';
import { EDMSLessonLearned, EDMSDocument, User } from '../../types';
import { authenticatedFetch } from '../../utils/api';

interface KnowledgeBaseProps {
  documents: EDMSDocument[];
  currentUser: User;
  lang: 'fa' | 'en';
}

const CATEGORY_COLORS: Record<string, { badge: string; fa: string }> = {
  'Design Error': { badge: 'bg-rose-50 text-rose-700 border-rose-200', fa: 'خطای طراحی' },
  'Construction Conflict': { badge: 'bg-amber-50 text-amber-700 border-amber-200', fa: 'تداخل اجرایی / سایت' },
  'Standard Non-Compliance': { badge: 'bg-purple-50 text-purple-700 border-purple-200', fa: 'عدم انطباق با استاندارد' },
  'Client Requirement': { badge: 'bg-blue-50 text-blue-700 border-blue-200', fa: 'الزامات خاص کارفرما' },
  'Commissioning Issue': { badge: 'bg-teal-50 text-teal-700 border-teal-200', fa: 'چالش‌های راه‌اندازی (SAT)' }
};

export const KnowledgeBase: React.FC<KnowledgeBaseProps> = ({
  documents,
  currentUser,
  lang
}) => {
  const [lessons, setLessons] = useState<EDMSLessonLearned[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<'Design Error' | 'Construction Conflict' | 'Standard Non-Compliance' | 'Client Requirement' | 'Commissioning Issue'>('Design Error');
  const [docId, setDocId] = useState<number>(documents[0]?.id || 0);
  const [problem, setProblem] = useState('');
  const [rootCause, setRootCause] = useState('');
  const [preventive, setPreventive] = useState('');
  const [standards, setStandards] = useState('NFPA 72, IPS-E-IN-100');
  const [submitting, setSubmitting] = useState(false);

  const fetchLessons = async () => {
    setLoading(true);
    try {
      const res = await authenticatedFetch('/api/edms/lessons');
      if (res.ok) {
        const json = await res.json();
        setLessons(json);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLessons();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const doc = documents.find(d => d.id === Number(docId));

    setSubmitting(true);
    try {
      const stdList = standards.split(',').map(s => s.trim()).filter(Boolean);
      const res = await authenticatedFetch('/api/edms/lessons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doc_id: doc?.id,
          doc_number: doc?.doc_number,
          project_code: 'PRJ-SP14-FG',
          category,
          title: title.trim(),
          problem_description: problem.trim(),
          root_cause: rootCause.trim(),
          preventive_action: preventive.trim(),
          standards_referenced: stdList
        })
      });

      if (res.ok) {
        setModalOpen(false);
        setTitle('');
        setProblem('');
        setRootCause('');
        setPreventive('');
        fetchLessons();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('آیا از حذف این درس‌آموخته اطمینان دارید؟')) return;
    try {
      const res = await authenticatedFetch(`/api/edms/lessons/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchLessons();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filtered = lessons.filter(l => {
    const matchSearch = !search ||
      l.title.toLowerCase().includes(search.toLowerCase()) ||
      l.problem_description.toLowerCase().includes(search.toLowerCase()) ||
      l.preventive_action.toLowerCase().includes(search.toLowerCase()) ||
      (l.doc_number && l.doc_number.toLowerCase().includes(search.toLowerCase()));

    const matchCat = categoryFilter === 'all' || l.category === categoryFilter;
    return matchSearch && matchCat;
  });

  return (
    <div className="space-y-6" dir={lang === 'fa' ? 'rtl' : 'ltr'}>
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black text-slate-900">
              {lang === 'fa' ? 'مدیریت دانش و درس‌آموخته‌های مهندسی (Lessons Learned)' : 'Lessons Learned'}
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200/60 font-mono">
              Knowledge Repository
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            ثبت تجارب فنی، علل ریشه‌ای خطاها، راهکارهای پیشگیرانه و چک‌لیست‌های انطباق با استانداردهای NFPA و IPS
          </p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>ثبت درس‌آموخته جدید</span>
          </button>

          <button
            onClick={fetchLessons}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 cursor-pointer shadow-2xs"
            title="به‌روزرسانی"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute right-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="جستجو در تجارب فنی، شرح خطا، استانداردها..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pr-10 pl-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium cursor-pointer w-full md:w-auto"
        >
          <option value="all">همه دسته‌بندی‌ها</option>
          <option value="Design Error">خطای طراحی</option>
          <option value="Construction Conflict">تداخل اجرایی / سایت</option>
          <option value="Standard Non-Compliance">عدم انطباق با استاندارد</option>
          <option value="Client Requirement">الزامات خاص کارفرما</option>
          <option value="Commissioning Issue">چالش‌های راه‌اندازی (SAT)</option>
        </select>
      </div>

      {/* Lessons Cards */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-3xl border border-slate-200 text-slate-400 text-xs">
            موردی در بانک درس‌آموخته‌ها یافت نشد.
          </div>
        ) : (
          filtered.map(lesson => {
            const catInfo = CATEGORY_COLORS[lesson.category] || { badge: 'bg-slate-100', fa: lesson.category };

            return (
              <div 
                key={lesson.id}
                className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${catInfo.badge}`}>
                      {catInfo.fa}
                    </span>
                    {lesson.doc_number && (
                      <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200/60">
                        مدرک مرجع: {lesson.doc_number}
                      </span>
                    )}
                    <span className="text-[11px] text-slate-400 font-mono">
                      ثبت: {lesson.created_by}
                    </span>
                  </div>

                  {currentUser.role === 'admin' && (
                    <button
                      onClick={() => handleDelete(lesson.id)}
                      className="text-slate-400 hover:text-rose-600 p-1 rounded-lg self-end sm:self-auto cursor-pointer"
                      title="حذف درس‌آموخته"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-500 shrink-0" />
                  {lesson.title}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs pt-1">
                  <div className="p-3 rounded-xl bg-rose-50/50 border border-rose-100 space-y-1">
                    <strong className="text-rose-900 font-bold block flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                      شرح مشکل روی داده:
                    </strong>
                    <p className="text-slate-700 leading-relaxed text-[11px]">
                      {lesson.problem_description}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-amber-50/50 border border-amber-100 space-y-1">
                    <strong className="text-amber-900 font-bold block">
                      علت ریشه‌ای (Root Cause):
                    </strong>
                    <p className="text-slate-700 leading-relaxed text-[11px]">
                      {lesson.root_cause}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-100 space-y-1">
                    <strong className="text-emerald-900 font-bold block flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      اقدام پیشگیرانه و اصلاح رویه:
                    </strong>
                    <p className="text-slate-700 leading-relaxed text-[11px]">
                      {lesson.preventive_action}
                    </p>
                  </div>
                </div>

                {lesson.standards_referenced && lesson.standards_referenced.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] text-slate-500">
                    <Tag className="w-3.5 h-3.5 text-slate-400" />
                    <span>استانداردهای مرتبط:</span>
                    {lesson.standards_referenced.map(std => (
                      <span key={std} className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono text-[10px] font-bold">
                        {std}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modal Add Lesson */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-amber-500" />
                ثبت درس‌آموخته جدید مهندسی
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">عنوان درس‌آموخته:</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="مثال: رعایت فاصله جداسازی سینی کابل‌های سیگنالینگ از قدرت"
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">دسته‌بندی موضوعی:</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                  >
                    <option value="Design Error">خطای طراحی</option>
                    <option value="Construction Conflict">تداخل اجرایی / سایت</option>
                    <option value="Standard Non-Compliance">عدم انطباق با استاندارد</option>
                    <option value="Client Requirement">الزامات خاص کارفرما</option>
                    <option value="Commissioning Issue">چالش‌های راه‌اندازی (SAT)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">مدرک مهندسی مرتبط (اختیاری):</label>
                  <select
                    value={docId}
                    onChange={e => setDocId(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs"
                  >
                    <option value={0}>بدون ارتباط با مدرک خاص</option>
                    {documents.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.doc_number} - {d.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">شرح مشکل روی‌داده / عدم انطباق:</label>
                <textarea
                  rows={2}
                  value={problem}
                  onChange={e => setProblem(e.target.value)}
                  placeholder="شرح کامل مساله ایجاد شده در پروژه یا سایت"
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs resize-none"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">علت ریشه‌ای مشکل (Root Cause):</label>
                <textarea
                  rows={2}
                  value={rootCause}
                  onChange={e => setRootCause(e.target.value)}
                  placeholder="دلیل اصلی بروز خطا یا عدم پیش‌بینی در فاز طراحی اولیه"
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs resize-none"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">اقدام پیشگیرانه برای پروژه‌های آتی:</label>
                <textarea
                  rows={2}
                  value={preventive}
                  onChange={e => setPreventive(e.target.value)}
                  placeholder="راهکار، اصلاح چک‌لیست بازرسی، یا ارتقای رویه هماهنگی مهندسی"
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs resize-none"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">استانداردهای مرجع (با کاما جدا کنید):</label>
                <input
                  type="text"
                  value={standards}
                  onChange={e => setStandards(e.target.value)}
                  placeholder="NFPA 72, IPS-E-IN-100, API RP 14C"
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'در حال ثبت...' : 'ثبت درس‌آموخته'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
