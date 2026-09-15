import React, { useState, useEffect } from 'react';
import { 
  Layers, 
  Plus, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  UserCheck, 
  ArrowRight, 
  Filter, 
  Search, 
  FileText, 
  MessageSquare,
  RefreshCw,
  X,
  Calendar,
  Send
} from 'lucide-react';
import { EDMSCirculationItem, EDMSDocument, User } from '../../types';
import { authenticatedFetch } from '../../utils/api';

interface CirculationWorkflowProps {
  documents: EDMSDocument[];
  currentUser: User;
  lang: 'fa' | 'en';
}

const STEP_LABELS: Record<string, { fa: string; en: string; color: string }> = {
  drafting: { fa: 'طراحی و نقشه‌کشی (Drafting)', en: 'Drafting', color: 'bg-slate-100 text-slate-800' },
  discipline_lead: { fa: 'بررسی سرپرست دیسیپلین (Lead Review)', en: 'Discipline Lead', color: 'bg-blue-100 text-blue-800' },
  inter_discipline: { fa: 'هماهنگی بین‌رشته‌ای (IDC / IDC Check)', en: 'Inter-Discipline (IDC)', color: 'bg-indigo-100 text-indigo-800' },
  dcc_check: { fa: 'کنترل فرمت و مدارک (DCC Review)', en: 'DCC Review', color: 'bg-purple-100 text-purple-800' },
  project_manager: { fa: 'تایید مدیر پروژه (PM Approval)', en: 'PM Approval', color: 'bg-amber-100 text-amber-800' },
  client_review: { fa: 'بررسی کارفرما / مشاور (Client Review)', en: 'Client Review', color: 'bg-emerald-100 text-emerald-800' },
  completed: { fa: 'تکمیل چرخه گردش (Completed)', en: 'Completed', color: 'bg-teal-100 text-teal-800' }
};

const STATUS_BADGES: Record<string, { fa: string; en: string; badge: string }> = {
  in_progress: { fa: 'در گردش', en: 'In Progress', badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  approved: { fa: 'تایید شده', en: 'Approved', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  rejected: { fa: 'نیازمند اصلاح', en: 'Rejected / Revision Required', badge: 'bg-rose-50 text-rose-700 border-rose-200' },
  on_hold: { fa: 'معلق', en: 'On Hold', badge: 'bg-amber-50 text-amber-700 border-amber-200' }
};

export const CirculationWorkflow: React.FC<CirculationWorkflowProps> = ({
  documents,
  currentUser,
  lang
}) => {
  const [items, setItems] = useState<EDMSCirculationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stepFilter, setStepFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<number>(documents[0]?.id || 0);
  const [newStep, setNewStep] = useState('discipline_lead');
  const [assignedTo, setAssignedTo] = useState('');
  const [assignedRole, setAssignedRole] = useState('Lead Engineer');
  const [dueDate, setDueDate] = useState('1405/06/15');
  const [comments, setComments] = useState('');
  const [manHours, setManHours] = useState<number>(12);
  const [submitting, setSubmitting] = useState(false);

  const fetchCirculations = async () => {
    setLoading(true);
    try {
      const res = await authenticatedFetch('/api/edms/circulations');
      if (res.ok) {
        const json = await res.json();
        setItems(json);
      }
    } catch (e) {
      console.error('Error fetching circulation items:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCirculations();
  }, []);

  const handleCreateCirculation = async (e: React.FormEvent) => {
    e.preventDefault();
    const doc = documents.find(d => d.id === Number(selectedDocId));
    if (!doc) return;

    setSubmitting(true);
    try {
      const res = await authenticatedFetch('/api/edms/circulations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doc_id: doc.id,
          doc_number: doc.doc_number,
          doc_title: doc.title,
          revision: doc.current_revision,
          step: newStep,
          assigned_to: assignedTo.trim() || 'مهندس مسئول دیسیپلین',
          assigned_role: assignedRole,
          start_date: '1405/05/10',
          due_date: dueDate,
          status: 'in_progress',
          comments: comments.trim(),
          man_hours_spent: Number(manHours) || 0
        })
      });

      if (res.ok) {
        setModalOpen(false);
        setComments('');
        fetchCirculations();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: number, newStatus: 'approved' | 'rejected' | 'in_progress') => {
    try {
      const res = await authenticatedFetch(`/api/edms/circulations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          completed_date: newStatus === 'approved' ? '1405/05/12' : undefined
        })
      });
      if (res.ok) {
        fetchCirculations();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filteredItems = items.filter(item => {
    const matchSearch = !search || 
      item.doc_number.toLowerCase().includes(search.toLowerCase()) ||
      item.doc_title.toLowerCase().includes(search.toLowerCase()) ||
      item.assigned_to.toLowerCase().includes(search.toLowerCase());

    const matchStep = stepFilter === 'all' || item.step === stepFilter;
    const matchStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchSearch && matchStep && matchStatus;
  });

  return (
    <div className="space-y-6" dir={lang === 'fa' ? 'rtl' : 'ltr'}>
      {/* Header & Stats Bar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black text-slate-900">
              {lang === 'fa' ? 'دستگردانی و گردش کار داخلی اسناد (Circulation & IDC)' : 'Document Circulation & Workflow'}
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200/60 font-mono">
              Work Breakdown & Approval Steps
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            پیگیری مراحل ارجاع، کنترل چندرشته‌ای (IDC)، تایید سرپرست دیسیپلین، هماهنگی مهندسی و ارسال نهایی به کارفرما
          </p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>ارجاع جدید / شروع گردش</span>
          </button>

          <button
            onClick={fetchCirculations}
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
            placeholder="جستجوی شماره مدرک، عنوان، نام کارشناس ارجاعی..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pr-10 pl-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={stepFilter}
            onChange={e => setStepFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium cursor-pointer"
          >
            <option value="all">همه مراحل گردش</option>
            <option value="drafting">طراحی و نقشه‌کشی</option>
            <option value="discipline_lead">بررسی سرپرست دیسیپلین</option>
            <option value="inter_discipline">هماهنگی بین‌رشته‌ای (IDC)</option>
            <option value="dcc_check">کنترل DCC</option>
            <option value="project_manager">تایید مدیر پروژه</option>
            <option value="client_review">بررسی کارفرما</option>
            <option value="completed">تکمیل شده</option>
          </select>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium cursor-pointer"
          >
            <option value="all">همه وضعیت‌ها</option>
            <option value="in_progress">در حال گردش</option>
            <option value="approved">تایید شده</option>
            <option value="rejected">نیازمند اصلاح</option>
            <option value="on_hold">معلق</option>
          </select>
        </div>
      </div>

      {/* Circulation Items Cards / Table */}
      <div className="space-y-3">
        {filteredItems.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-3xl border border-slate-200 text-slate-400 text-xs">
            هیچ گردش کاری با مشخصات وارد شده یافت نشد.
          </div>
        ) : (
          filteredItems.map(item => {
            const stepInfo = STEP_LABELS[item.step] || { fa: item.step, en: item.step, color: 'bg-slate-100 text-slate-800' };
            const statusInfo = STATUS_BADGES[item.status] || { fa: item.status, en: item.status, badge: 'bg-slate-100' };

            return (
              <div 
                key={item.id} 
                className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-black text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200/60">
                      {item.doc_number}
                    </span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                      Rev {item.revision}
                    </span>
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${stepInfo.color}`}>
                      {stepInfo.fa}
                    </span>
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${statusInfo.badge}`}>
                      {statusInfo.fa}
                    </span>
                  </div>

                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                    {item.doc_title}
                  </h3>

                  {item.comments && (
                    <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 leading-relaxed">
                      💬 <span className="font-semibold text-slate-700">توضیحات و دستورکار:</span> {item.comments}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 pt-1">
                    <span className="flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                      کارشناس مسئول: <strong className="text-slate-800">{item.assigned_to}</strong> ({item.assigned_role})
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      مهلت تحویل: <strong className="text-slate-700 font-mono">{item.due_date}</strong>
                    </span>
                    {item.man_hours_spent ? (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-emerald-600" />
                        نفر-ساعت صرف‌شده: <strong className="text-slate-700">{item.man_hours_spent} ساعت</strong>
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-end md:self-center">
                  {item.status === 'in_progress' && (
                    <>
                      <button
                        onClick={() => handleUpdateStatus(item.id, 'approved')}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs cursor-pointer"
                        title="تایید این مرحله و ارسال به گام بعدی"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>تایید گام</span>
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(item.id, 'rejected')}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs cursor-pointer"
                        title="رد جهت اصلاح و بازبینی"
                      >
                        <AlertCircle className="w-4 h-4" />
                        <span>عودت جهت اصلاح</span>
                      </button>
                    </>
                  )}
                  {item.status === 'approved' && (
                    <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                      <CheckCircle2 className="w-4 h-4" />
                      تکمیل و تایید شده
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create Circulation Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-600" />
                ارجاع مدرک به چرخه گردش کار داخلی
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCirculation} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">انتخاب مدرک مهندسی از فهرست MDR:</label>
                <select
                  value={selectedDocId}
                  onChange={e => setSelectedDocId(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs focus:bg-white"
                  required
                >
                  {documents.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.doc_number} - {d.title} (Rev {d.current_revision})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">مرحله چرخه گردش:</label>
                  <select
                    value={newStep}
                    onChange={e => setNewStep(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:bg-white"
                  >
                    <option value="drafting">طراحی و مدل‌سازی</option>
                    <option value="discipline_lead">بررسی سرپرست دیسیپلین</option>
                    <option value="inter_discipline">هماهنگی بین‌رشته‌ای (IDC)</option>
                    <option value="dcc_check">کنترل مرکز اسناد DCC</option>
                    <option value="project_manager">تایید مدیر پروژه</option>
                    <option value="client_review">بررسی کارفرما / مشاور</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">مهلت اقدام (Due Date):</label>
                  <input
                    type="text"
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    placeholder="1405/06/15"
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">نام کارشناس مسئول ارجاع:</label>
                  <input
                    type="text"
                    value={assignedTo}
                    onChange={e => setAssignedTo(e.target.value)}
                    placeholder="مثال: مهندس احمدی"
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">سمت / نقش سازمانی:</label>
                  <input
                    type="text"
                    value={assignedRole}
                    onChange={e => setAssignedRole(e.target.value)}
                    placeholder="Lead Engineer / Designer / PM"
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">برآورد نفر-ساعت کارکرد (ساعت):</label>
                <input
                  type="number"
                  value={manHours}
                  onChange={e => setManHours(Number(e.target.value))}
                  min={1}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">توضیحات، کامنت‌ها و دستورکار:</label>
                <textarea
                  rows={3}
                  value={comments}
                  onChange={e => setComments(e.target.value)}
                  placeholder="لطفاً تغییرات سایزینگ شیرهای برقی سیلندر FM-200 طبق کامنت کارفرما بررسی و تایید گردد."
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs resize-none"
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
                  {submitting ? 'در حال ثبت...' : 'ثبت و ارجاع گردش کار'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
