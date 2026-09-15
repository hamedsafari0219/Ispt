import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Plus, 
  Calendar, 
  Users, 
  CheckCircle2, 
  FileText, 
  TrendingUp, 
  Search, 
  Filter, 
  RefreshCw,
  X
} from 'lucide-react';
import { EDMSTimesheetEntry, EDMSDocument, User } from '../../types';
import { authenticatedFetch } from '../../utils/api';

interface TimesheetManagerProps {
  documents: EDMSDocument[];
  currentUser: User;
  lang: 'fa' | 'en';
}

export const TimesheetManager: React.FC<TimesheetManagerProps> = ({
  documents,
  currentUser,
  lang
}) => {
  const [entries, setEntries] = useState<EDMSTimesheetEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDocId, setSelectedDocId] = useState<string>('all');
  const [search, setSearch] = useState('');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [formDocId, setFormDocId] = useState<number>(documents[0]?.id || 0);
  const [discipline, setDiscipline] = useState<'F&G' | 'Electrical' | 'Mechanical' | 'Telecom' | 'General'>('F&G');
  const [hours, setHours] = useState<number>(8);
  const [date, setDate] = useState('1405/05/10');
  const [activity, setActivity] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchTimesheets = async () => {
    setLoading(true);
    try {
      const url = selectedDocId === 'all' 
        ? '/api/edms/timesheets' 
        : `/api/edms/timesheets?doc_id=${selectedDocId}`;
      const res = await authenticatedFetch(url);
      if (res.ok) {
        const json = await res.json();
        setEntries(json);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimesheets();
  }, [selectedDocId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const doc = documents.find(d => d.id === Number(formDocId));
    if (!doc) return;

    setSubmitting(true);
    try {
      const res = await authenticatedFetch('/api/edms/timesheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doc_id: doc.id,
          doc_number: doc.doc_number,
          discipline,
          hours: Number(hours),
          activity_description: activity.trim(),
          date
        })
      });

      if (res.ok) {
        setModalOpen(false);
        setActivity('');
        fetchTimesheets();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const totalLoggedHours = entries.reduce((acc, e) => acc + (Number(e.hours) || 0), 0);
  const filtered = entries.filter(e => {
    return !search ||
      e.doc_number.toLowerCase().includes(search.toLowerCase()) ||
      e.activity_description.toLowerCase().includes(search.toLowerCase()) ||
      e.username.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="space-y-6" dir={lang === 'fa' ? 'rtl' : 'ltr'}>
      {/* Header & Controls */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black text-slate-900">
              {lang === 'fa' ? 'تایم‌شیت و کارکرد نفر-ساعت مهندسی (Timesheet)' : 'Engineering Timesheets'}
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200/60 font-mono">
              Man-Hours Accounting
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            ثبت کارکرد روزانه به تفکیک مدرک مهندسی، دیسیپلین، فعالیت طراحی و مقایسه با نفر-ساعت برنامه‌ای مصوب
          </p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>ثبت کارکرد جدید (تایم‌شیت)</span>
          </button>

          <button
            onClick={fetchTimesheets}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 cursor-pointer shadow-2xs"
            title="به‌روزرسانی"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold text-slate-500">مجموع نفر-ساعت ثبت‌شده</span>
          <div className="mt-2 text-2xl font-black text-blue-700">
            {totalLoggedHours.toLocaleString('fa-IR')} <span className="text-xs font-bold text-slate-500">ساعت</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            در قالب {entries.length} رکورد کارکرد روزانه
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold text-slate-500">کاربر فعال جاری</span>
          <div className="mt-2 text-xl font-black text-slate-900">{currentUser.username}</div>
          <div className="mt-1 text-[11px] text-emerald-600 font-bold">
            دسترسی مهندسی: {currentUser.role}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold text-slate-500">مدارک دارای تخصیص نفر-ساعت</span>
          <div className="mt-2 text-2xl font-black text-slate-900">{documents.length} مدرک</div>
          <div className="mt-1 text-[11px] text-slate-500">MDR Package PRJ-SP14-FG</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute right-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="جستجو در شرح فعالیت‌ها، شماره مدرک، نام کارشناس..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pr-10 pl-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <select
          value={selectedDocId}
          onChange={e => setSelectedDocId(e.target.value)}
          className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium cursor-pointer w-full md:w-auto font-mono"
        >
          <option value="all">همه مدارک مهندسی</option>
          {documents.map(d => (
            <option key={d.id} value={d.id}>
              {d.doc_number} ({d.discipline})
            </option>
          ))}
        </select>
      </div>

      {/* Timesheet Entries List */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between font-bold text-xs text-slate-700 bg-slate-50/50">
          <span>لیست سوابق کارکرد مهندسی ثبت‌شده</span>
          <span className="text-[11px] text-slate-400 font-mono font-normal">
            تعداد ردیف‌ها: {filtered.length}
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              هیچ سابقه کارکردی ثبت نشده است.
            </div>
          ) : (
            filtered.map(entry => (
              <div key={entry.id} className="p-4 hover:bg-slate-50/70 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200/60">
                      {entry.doc_number}
                    </span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">
                      {entry.discipline}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      📅 {entry.date}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      👤 {entry.username}
                    </span>
                  </div>

                  <p className="text-xs text-slate-800 leading-relaxed font-medium">
                    {entry.activity_description}
                  </p>
                </div>

                <div className="self-end sm:self-center flex items-center gap-2">
                  <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 font-black text-xs border border-emerald-200/60 flex items-center gap-1 font-mono">
                    <Clock className="w-3.5 h-3.5 text-emerald-600" />
                    {entry.hours} ساعت
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal Add Timesheet */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                ثبت کارکرد نفر-ساعت مهندسی
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">انتخاب مدرک مهندسی:</label>
                <select
                  value={formDocId}
                  onChange={e => setFormDocId(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs focus:bg-white"
                  required
                >
                  {documents.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.doc_number} - {d.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">دیسیپلین:</label>
                  <select
                    value={discipline}
                    onChange={e => setDiscipline(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                  >
                    <option value="F&G">F&G (اعلام و اطفاء)</option>
                    <option value="Electrical">Electrical (برق)</option>
                    <option value="Mechanical">Mechanical (مکانیک)</option>
                    <option value="Telecom">Telecom (مخابرات)</option>
                    <option value="General">General (عمومی)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">میزان ساعت کارکرد:</label>
                  <input
                    type="number"
                    step={0.5}
                    min={0.5}
                    max={24}
                    value={hours}
                    onChange={e => setHours(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">تاریخ کارکرد (شمسی):</label>
                <input
                  type="text"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">شرح تفصیلی فعالیت مهندسی:</label>
                <textarea
                  rows={3}
                  value={activity}
                  onChange={e => setActivity(e.target.value)}
                  placeholder="مثال: طراحی نقشه لوپ دیاگرام، اعمال کامنت‌های رویژن B، محاسبات هیدرولیکی نازل‌ها..."
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs resize-none"
                  required
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
                  {submitting ? 'در حال ثبت...' : 'ثبت تایم‌شیت'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
