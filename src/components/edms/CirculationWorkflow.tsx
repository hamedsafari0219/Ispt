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
  Send, 
  Inbox, 
  SendHorizontal, 
  History as HistoryIcon, 
  UserPlus, 
  ShieldAlert, 
  CheckCircle, 
  CornerDownLeft, 
  AlertTriangle,
  FileCheck2,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { EDMSCirculationItem, EDMSCirculationHistoryItem, EDMSDocument, User } from '../../types';
import { authenticatedFetch } from '../../utils/api';

interface SystemUserDirectoryItem {
  id: number;
  username: string;
  role: string;
  name?: string;
}

interface CirculationWorkflowProps {
  documents: EDMSDocument[];
  currentUser: User;
  lang: 'fa' | 'en';
  preSelectedDocId?: number;
  onRefreshStats?: () => void;
}

const STEP_LABELS: Record<string, { fa: string; en: string; color: string }> = {
  drafting: { fa: 'طراحی و مدل‌سازی (Drafting)', en: 'Drafting', color: 'bg-slate-100 text-slate-800' },
  discipline_lead: { fa: 'بررسی سرپرست دیسیپلین (Lead Review)', en: 'Discipline Lead', color: 'bg-blue-100 text-blue-800' },
  inter_discipline: { fa: 'هماهنگی بین‌رشته‌ای (IDC)', en: 'Inter-Discipline (IDC)', color: 'bg-indigo-100 text-indigo-800' },
  dcc_check: { fa: 'کنترل فرمت و مدارک (DCC Review)', en: 'DCC Review', color: 'bg-purple-100 text-purple-800' },
  engineering_manager: { fa: 'تایید مدیر مهندسی / پروژه', en: 'Eng. Manager Approval', color: 'bg-amber-100 text-amber-800' },
  client_review: { fa: 'بررسی کارفرما / مشاور (Client Review)', en: 'Client Review', color: 'bg-emerald-100 text-emerald-800' },
  completed: { fa: 'تکمیل چرخه گردش (Completed)', en: 'Completed', color: 'bg-teal-100 text-teal-800' }
};

const ACTION_TYPES = [
  'بررسی و تایید فنی مهندسی',
  'اعمال کامنت‌های کارفرما و اصلاح مدارک',
  'هماهنگی بین‌رشته‌ای (IDC Check)',
  'کنترل فرمت و صدور نهایی DCC',
  'بررسی قیمت و انطباق فنی خرید (TBE)',
  'جهت استحضار و پیگیری'
];

const STATUS_BADGES: Record<string, { fa: string; en: string; badge: string; icon: any }> = {
  in_progress: { fa: 'در حال اقدام', en: 'In Progress', badge: 'bg-blue-50 text-blue-700 border-blue-200', icon: Clock },
  approved: { fa: 'تایید و تکمیل شده', en: 'Approved', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  rejected: { fa: 'عودت جهت اصلاح', en: 'Revision Required', badge: 'bg-rose-50 text-rose-700 border-rose-200', icon: AlertCircle },
  on_hold: { fa: 'معلق', en: 'On Hold', badge: 'bg-amber-50 text-amber-700 border-amber-200', icon: AlertTriangle }
};

const PRIORITY_BADGES: Record<string, { fa: string; en: string; badge: string; dot: string }> = {
  normal: { fa: 'عادی', en: 'Normal', badge: 'bg-slate-100 text-slate-700 border-slate-200', dot: 'bg-slate-400' },
  urgent: { fa: 'فوری', en: 'Urgent', badge: 'bg-amber-100 text-amber-800 border-amber-300', dot: 'bg-amber-500' },
  immediate: { fa: 'آنی (اقدام فوری)', en: 'Immediate', badge: 'bg-rose-100 text-rose-800 border-rose-300 animate-pulse', dot: 'bg-rose-600' }
};

export const CirculationWorkflow: React.FC<CirculationWorkflowProps> = ({
  documents,
  currentUser,
  lang,
  preSelectedDocId,
  onRefreshStats
}) => {
  const [items, setItems] = useState<EDMSCirculationItem[]>([]);
  const [usersList, setUsersList] = useState<SystemUserDirectoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Cartable Sub-view: 'inbox' (کارتابل من) | 'outbox' (ارجاعات ارسالی من) | 'all' (کل چرخه گردش)
  const [cartableView, setCartableView] = useState<'inbox' | 'outbox' | 'all'>('inbox');

  // Search & Filter
  const [search, setSearch] = useState('');
  const [stepFilter, setStepFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  // Modal 1: New Referral Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<number>(preSelectedDocId || documents[0]?.id || 0);
  const [newStep, setNewStep] = useState('discipline_lead');
  const [targetUser, setTargetUser] = useState('');
  const [targetRole, setTargetRole] = useState('Lead Engineer');
  const [actionType, setActionType] = useState(ACTION_TYPES[0]);
  const [priority, setPriority] = useState<'normal' | 'urgent' | 'immediate'>('normal');
  const [dueDate, setDueDate] = useState('1405/06/20');
  const [comments, setComments] = useState('');
  const [manHours, setManHours] = useState<number>(8);
  const [submitting, setSubmitting] = useState(false);

  // Modal 2: Forward / Reply Referral Modal
  const [forwardModalItem, setForwardModalItem] = useState<EDMSCirculationItem | null>(null);
  const [forwardToUser, setForwardToUser] = useState('');
  const [forwardActionType, setForwardActionType] = useState(ACTION_TYPES[0]);
  const [forwardNote, setForwardNote] = useState('');
  const [forwardStatus, setForwardStatus] = useState<'in_progress' | 'approved' | 'rejected'>('in_progress');

  // Modal 3: History / Audit Trail Modal
  const [historyModalItem, setHistoryModalItem] = useState<EDMSCirculationItem | null>(null);

  // Load active system users directory
  const loadUsersDirectory = async () => {
    try {
      const res = await authenticatedFetch('/api/users/directory');
      if (res.ok) {
        const users = await res.json();
        setUsersList(users);
        if (users.length > 0 && !targetUser) {
          // default to someone other than currentUser if possible
          const other = users.find((u: any) => u.username.toLowerCase() !== currentUser.username.toLowerCase());
          if (other) {
            setTargetUser(other.username);
            setTargetRole(other.role === 'admin' ? 'Project Manager' : (other.role === 'manager' ? 'Lead Engineer' : 'Designer'));
          } else {
            setTargetUser(users[0].username);
          }
        }
      } else {
        // Fallback default system users
        setUsersList([
          { id: 1, username: 'admin', role: 'admin' },
          { id: 2, username: 'manager', role: 'manager' },
          { id: 3, username: 'user', role: 'user' }
        ]);
      }
    } catch {
      setUsersList([
        { id: 1, username: 'admin', role: 'admin' },
        { id: 2, username: 'manager', role: 'manager' },
        { id: 3, username: 'user', role: 'user' }
      ]);
    }
  };

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
    loadUsersDirectory();
  }, []);

  useEffect(() => {
    if (preSelectedDocId) {
      setSelectedDocId(preSelectedDocId);
      setCreateModalOpen(true);
    }
  }, [preSelectedDocId]);

  // Handle Create Referral
  const handleCreateCirculation = async (e: React.FormEvent) => {
    e.preventDefault();
    const doc = documents.find(d => d.id === Number(selectedDocId));
    if (!doc) return;

    if (!targetUser) {
      alert('لطفاً کاربر دریافت‌کننده ارجاع را انتخاب فرمایید.');
      return;
    }

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
          assigned_to: targetUser.trim(),
          assigned_by: currentUser.username,
          assigned_role: targetRole,
          action_type: actionType,
          priority: priority,
          due_date: dueDate,
          status: 'in_progress',
          comments: comments.trim(),
          man_hours_spent: Number(manHours) || 0
        })
      });

      if (res.ok) {
        setCreateModalOpen(false);
        setComments('');
        await fetchCirculations();
        if (onRefreshStats) onRefreshStats();
      } else {
        const err = await res.json();
        alert(err.error || 'خطا در ثبت ارجاع');
      }
    } catch (err) {
      console.error(err);
      alert('خطا در برقراری ارتباط با سرور.');
    } finally {
      setSubmitting(false);
    }
  };

  // Quick Approve
  const handleDirectApprove = async (item: EDMSCirculationItem) => {
    const confirmApprove = window.confirm(`آیا از تایید نهایی و تکمیل ارجاع مدرک ${item.doc_number} اطمینان دارید؟`);
    if (!confirmApprove) return;

    try {
      const res = await authenticatedFetch(`/api/edms/circulations/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'approved',
          completed_date: '1405/05/18',
          reply_note: 'اقدام تایید و خاتمه ارجاع توسط کاربر در کارتابل'
        })
      });
      if (res.ok) {
        await fetchCirculations();
        if (onRefreshStats) onRefreshStats();
      } else {
        const err = await res.json();
        alert(err.error || 'خطا در تایید ارجاع');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Quick Reject / Return for revision
  const handleDirectReject = async (item: EDMSCirculationItem) => {
    const reason = window.prompt(`علت عودت و نیاز به اصلاح مدرک ${item.doc_number} را وارد فرمایید:`, 'نیاز به بازنگری محاسبات و اعمال کامنت‌ها');
    if (!reason) return;

    try {
      const res = await authenticatedFetch(`/api/edms/circulations/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'rejected',
          reply_note: `عودت جهت اصلاح: ${reason}`
        })
      });
      if (res.ok) {
        await fetchCirculations();
        if (onRefreshStats) onRefreshStats();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Forward / Reply Modal Submit
  const handleForwardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forwardModalItem) return;

    setSubmitting(true);
    try {
      const res = await authenticatedFetch(`/api/edms/circulations/${forwardModalItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          forward_to: forwardToUser.trim() || undefined,
          action_type: forwardActionType,
          status: forwardStatus,
          reply_note: forwardNote.trim() || 'ارجاع مجدد در کارتابل'
        })
      });

      if (res.ok) {
        setForwardModalItem(null);
        setForwardNote('');
        await fetchCirculations();
        if (onRefreshStats) onRefreshStats();
      } else {
        const err = await res.json();
        alert(err.error || 'خطا در ارجاع مجدد');
      }
    } catch (err) {
      console.error(err);
      alert('خطا در ارسال ارجاع.');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Forward Modal
  const openForwardModal = (item: EDMSCirculationItem) => {
    setForwardModalItem(item);
    // default to original sender if replying
    const sender = item.assigned_by || 'admin';
    setForwardToUser(sender);
    setForwardActionType('اعمال کامنت‌های کارفرما و اصلاح مدارک');
    setForwardStatus('in_progress');
    setForwardNote('');
  };

  // Filtering calculations
  const myUsername = currentUser.username.toLowerCase();

  const myInboxItems = items.filter(item => 
    item.assigned_to?.toLowerCase() === myUsername ||
    item.assigned_to?.toLowerCase().includes(myUsername)
  );

  const myPendingTasksCount = myInboxItems.filter(i => i.status === 'in_progress').length;

  const myOutboxItems = items.filter(item => 
    item.assigned_by?.toLowerCase() === myUsername ||
    item.assigned_by?.toLowerCase().includes(myUsername)
  );

  const urgentTasksCount = items.filter(i => 
    (i.priority === 'urgent' || i.priority === 'immediate') && i.status === 'in_progress'
  ).length;

  const completedCount = items.filter(i => i.status === 'approved').length;

  // Items to display based on selected tab
  let displayBaseItems = items;
  if (cartableView === 'inbox') {
    displayBaseItems = myInboxItems;
  } else if (cartableView === 'outbox') {
    displayBaseItems = myOutboxItems;
  }

  const filteredItems = displayBaseItems.filter(item => {
    const q = search.toLowerCase();
    const matchSearch = !search || 
      item.doc_number.toLowerCase().includes(q) ||
      item.doc_title.toLowerCase().includes(q) ||
      item.assigned_to?.toLowerCase().includes(q) ||
      (item.assigned_by && item.assigned_by.toLowerCase().includes(q)) ||
      (item.comments && item.comments.toLowerCase().includes(q));

    const matchStep = stepFilter === 'all' || item.step === stepFilter;
    const matchStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchPriority = priorityFilter === 'all' || item.priority === priorityFilter;

    return matchSearch && matchStep && matchStatus && matchPriority;
  });

  return (
    <div className="space-y-6" dir={lang === 'fa' ? 'rtl' : 'ltr'}>
      {/* Top Banner & Header */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Inbox className="w-5 h-5 text-blue-600" />
              <span>{lang === 'fa' ? 'کارتابل و ارجاعات اسناد مهندسی (EDMS Cartable)' : 'Engineering Document Cartable & Workflow'}</span>
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[11px] font-bold border border-blue-200/60 font-mono">
              RBAC & User Assignment
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            ارجاع اسناد به کاربران، گردش کار بین‌رشته‌ای (IDC)، پیگیری دستورکارها و کارتابل اختصاصی اقدام هر کارشناس
          </p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
          <button
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{lang === 'fa' ? 'ارجاع جدید مدرک به کاربر' : 'New Document Referral'}</span>
          </button>

          <button
            onClick={fetchCirculations}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 cursor-pointer shadow-2xs transition-colors"
            title="به‌روزرسانی کارتابل"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Cartable Metrics & KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: My Cartable Pending */}
        <div 
          onClick={() => setCartableView('inbox')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            cartableView === 'inbox' 
              ? 'bg-blue-50/70 border-blue-300 ring-2 ring-blue-500/20 shadow-xs' 
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">کارتابل من (اقدام من)</span>
            <span className="p-2 rounded-xl bg-blue-100/70 text-blue-700">
              <Inbox className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 font-mono">{myPendingTasksCount}</span>
            <span className="text-[11px] text-slate-500 font-medium">مدرک منتظر اقدام</span>
          </div>
          {myPendingTasksCount > 0 && (
            <div className="mt-2 text-[10px] text-blue-700 font-bold bg-blue-100/60 px-2 py-0.5 rounded-md inline-block">
              نیاز به بررسی و تایید شما
            </div>
          )}
        </div>

        {/* Card 2: Outbox Tasks */}
        <div 
          onClick={() => setCartableView('outbox')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            cartableView === 'outbox' 
              ? 'bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-500/20 shadow-xs' 
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">ارجاعات ارسالی من</span>
            <span className="p-2 rounded-xl bg-indigo-100/70 text-indigo-700">
              <SendHorizontal className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 font-mono">{myOutboxItems.length}</span>
            <span className="text-[11px] text-slate-500 font-medium">مدرک در حال پیگیری</span>
          </div>
          <div className="mt-2 text-[10px] text-indigo-700 font-medium">
            ارجاع شده به سایر همکاران
          </div>
        </div>

        {/* Card 3: Urgent / Immediate */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">ارجاعات با اولویت فوری</span>
            <span className="p-2 rounded-xl bg-rose-100/70 text-rose-700">
              <ShieldAlert className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-rose-600 font-mono">{urgentTasksCount}</span>
            <span className="text-[11px] text-slate-500 font-medium">مورد نیازمند شتاب</span>
          </div>
          <div className="mt-2 text-[10px] text-rose-600 font-bold">
            اولویت آنی و اقدام اضطراری
          </div>
        </div>

        {/* Card 4: Total Completed */}
        <div 
          onClick={() => setCartableView('all')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            cartableView === 'all' 
              ? 'bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-500/20 shadow-xs' 
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">کل گردش کار پروژه</span>
            <span className="p-2 rounded-xl bg-emerald-100/70 text-emerald-700">
              <CheckCircle className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 font-mono">{items.length}</span>
            <span className="text-[11px] text-slate-500 font-medium">کل ارجاعات ثبت‌شده</span>
          </div>
          <div className="mt-2 text-[10px] text-emerald-700 font-medium">
            {completedCount} مورد تکمیل و تایید شده
          </div>
        </div>
      </div>

      {/* Cartable View Mode Tabs */}
      <div className="flex items-center gap-1.5 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200 text-xs font-bold">
        <button
          onClick={() => setCartableView('inbox')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
            cartableView === 'inbox'
              ? 'bg-white text-blue-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Inbox className="w-4 h-4 text-blue-600" />
          <span>کارتابل من (ارجاعات به من)</span>
          {myPendingTasksCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-mono font-bold animate-pulse">
              {myPendingTasksCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setCartableView('outbox')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
            cartableView === 'outbox'
              ? 'bg-white text-indigo-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <SendHorizontal className="w-4 h-4 text-indigo-600" />
          <span>ارجاعات ارسالی من (پیگیری)</span>
          <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-mono">
            {myOutboxItems.length}
          </span>
        </button>

        <button
          onClick={() => setCartableView('all')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
            cartableView === 'all'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Layers className="w-4 h-4 text-slate-500" />
          <span>کل چرخه گردش کار پروژه</span>
          <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 text-[10px] font-mono">
            {items.length}
          </span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute right-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="جستجو در شماره مدرک، عنوان، نام گیرنده، ارجاع‌دهنده و دستورکار..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pr-10 pl-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Priority filter */}
          <select
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium cursor-pointer"
          >
            <option value="all">همه اولویت‌ها</option>
            <option value="immediate">آنی (فوری‌ترین)</option>
            <option value="urgent">فوری</option>
            <option value="normal">عادی</option>
          </select>

          {/* Step filter */}
          <select
            value={stepFilter}
            onChange={e => setStepFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium cursor-pointer"
          >
            <option value="all">همه مراحل گردش</option>
            <option value="discipline_lead">بررسی سرپرست دیسیپلین</option>
            <option value="inter_discipline">هماهنگی بین‌رشته‌ای (IDC)</option>
            <option value="drafting">طراحی و مدل‌سازی</option>
            <option value="dcc_check">کنترل مدارک DCC</option>
            <option value="engineering_manager">تایید مدیر مهندسی</option>
            <option value="client_review">بررسی کارفرما</option>
            <option value="completed">تکمیل شده</option>
          </select>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium cursor-pointer"
          >
            <option value="all">همه وضعیت‌ها</option>
            <option value="in_progress">در حال اقدام</option>
            <option value="approved">تایید و تکمیل شده</option>
            <option value="rejected">عودت جهت اصلاح</option>
            <option value="on_hold">معلق</option>
          </select>
        </div>
      </div>

      {/* Cartable Document Cards */}
      <div className="space-y-3.5">
        {loading ? (
          <div className="py-16 text-center bg-white rounded-3xl border border-slate-200 text-slate-400 text-xs flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
            <span>در حال دریافت اطلاعات کارتابل...</span>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-3xl border border-slate-200 text-slate-400 text-xs space-y-2">
            <Inbox className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="font-bold text-slate-600">
              {cartableView === 'inbox' 
                ? 'کارتابل شما در حال حاضر خالی است و مدرکی در انتظار اقدام ندارید.' 
                : cartableView === 'outbox'
                ? 'هیچ ارجاع ارسالی توسط شما در این فیلتر ثبت نشده است.'
                : 'موردی با مشخصات جستجو شده یافت نشد.'}
            </p>
            <p className="text-[11px] text-slate-400">
              برای ارجاع مدرک به همکاران می‌توانید از دکمه «ارجاع جدید مدرک به کاربر» یا از جدول MDR اقدام فرمایید.
            </p>
          </div>
        ) : (
          filteredItems.map(item => {
            const stepInfo = STEP_LABELS[item.step] || { fa: item.step, en: item.step, color: 'bg-slate-100 text-slate-800' };
            const statusInfo = STATUS_BADGES[item.status] || { fa: item.status, en: item.status, badge: 'bg-slate-100 text-slate-800', icon: Clock };
            const priorityInfo = PRIORITY_BADGES[item.priority || 'normal'] || PRIORITY_BADGES.normal;
            const StatusIcon = statusInfo.icon;

            const isAssignedToMe = item.assigned_to?.toLowerCase() === myUsername;
            const isSentByMe = item.assigned_by?.toLowerCase() === myUsername;

            return (
              <div 
                key={item.id} 
                className={`bg-white p-5 rounded-3xl border transition-all flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 ${
                  isAssignedToMe && item.status === 'in_progress'
                    ? 'border-blue-300/80 shadow-xs ring-1 ring-blue-500/10'
                    : 'border-slate-200 shadow-2xs hover:border-slate-300'
                }`}
              >
                <div className="space-y-2.5 flex-1 w-full">
                  {/* Top Badges */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-black text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200/60">
                      {item.doc_number}
                    </span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono">
                      {item.revision}
                    </span>
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${stepInfo.color}`}>
                      {stepInfo.fa}
                    </span>
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${statusInfo.badge}`}>
                      <StatusIcon className="w-3.5 h-3.5" />
                      {statusInfo.fa}
                    </span>
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 ${priorityInfo.badge}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${priorityInfo.dot}`} />
                      اولویت: {priorityInfo.fa}
                    </span>
                    {item.action_type && (
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200/60">
                        {item.action_type}
                      </span>
                    )}
                  </div>

                  {/* Document Title */}
                  <h3 className="text-sm font-black text-slate-900 leading-snug">
                    {item.doc_title}
                  </h3>

                  {/* Referral Comments / Work instructions */}
                  {item.comments && (
                    <div className="text-xs text-slate-700 bg-slate-50 p-3 rounded-2xl border border-slate-200/60 leading-relaxed flex items-start gap-2">
                      <MessageSquare className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                      <div>
                        <span className="font-bold text-slate-800">دستورکار و شرح ارجاع:</span> {item.comments}
                      </div>
                    </div>
                  )}

                  {/* Routing info: From -> To, Role, Due Date */}
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <Send className="w-3.5 h-3.5 text-indigo-500" />
                      <span>ارجاع‌دهنده:</span>
                      <strong className={`font-bold ${isSentByMe ? 'text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded' : 'text-slate-800'}`}>
                        {item.assigned_by || 'سیستم'}
                      </strong>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <ArrowRight className="w-3 h-3 text-slate-400 rtl:rotate-180" />
                      <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                      <span>گیرنده در کارتابل:</span>
                      <strong className={`font-bold ${isAssignedToMe ? 'text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded' : 'text-slate-800'}`}>
                        {item.assigned_to}
                      </strong>
                      <span className="text-slate-400">({item.assigned_role})</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>مهلت اقدام:</span>
                      <strong className="text-slate-700 font-mono">{item.due_date}</strong>
                    </div>

                    {item.man_hours_spent ? (
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-emerald-600" />
                        <span>نفر-ساعت:</span>
                        <strong className="text-slate-700">{item.man_hours_spent} ساعت</strong>
                      </div>
                    ) : null}

                    {item.history && item.history.length > 0 && (
                      <button
                        onClick={() => setHistoryModalItem(item)}
                        className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-bold cursor-pointer hover:underline"
                      >
                        <HistoryIcon className="w-3.5 h-3.5" />
                        <span>سوابق چرخه ({item.history.length})</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Direct Cartable Actions */}
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full lg:w-auto justify-end border-t lg:border-t-0 pt-3 lg:pt-0">
                  {item.status === 'in_progress' ? (
                    <>
                      {/* 1. Complete / Approve */}
                      <button
                        onClick={() => handleDirectApprove(item)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                        title="تایید و خاتمه اقدام در این مرحله"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>تایید و تکمیل</span>
                      </button>

                      {/* 2. Forward / Reply */}
                      <button
                        onClick={() => openForwardModal(item)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold text-xs transition-colors cursor-pointer"
                        title="ارجاع به همکار دیگر یا پاسخ به ارجاع‌دهنده"
                      >
                        <CornerDownLeft className="w-3.5 h-3.5" />
                        <span>ارجاع مجدد / پاسخ</span>
                      </button>

                      {/* 3. Reject / Revision required */}
                      <button
                        onClick={() => handleDirectReject(item)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition-colors cursor-pointer"
                        title="اعلام نیاز به اصلاح و عودت"
                      >
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>عودت</span>
                      </button>
                    </>
                  ) : item.status === 'approved' ? (
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                        <CheckCircle2 className="w-4 h-4" />
                        اقدام تایید شده
                      </span>
                      <button
                        onClick={() => openForwardModal(item)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-slate-500 hover:bg-slate-100 text-xs font-medium cursor-pointer"
                        title="ارجاع به مرحله بعد"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>ارجاع به مرحله بعد</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200">
                        <AlertCircle className="w-4 h-4" />
                        عودت داده شده
                      </span>
                      <button
                        onClick={() => openForwardModal(item)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer shadow-xs"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>ارجاع اصلاح‌شده</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal 1: Create New Document Referral */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Send className="w-5 h-5 text-blue-600" />
                <span>ارجاع مدرک مهندسی به کاربر (کارتابل)</span>
              </h3>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCirculation} className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
              {/* Document selector */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  انتخاب مدرک مهندسی از ماتریس اسناد (MDR):
                </label>
                <select
                  value={selectedDocId}
                  onChange={e => setSelectedDocId(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                  required
                >
                  {documents.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.doc_number} - {d.title} ({d.discipline} | {d.current_revision})
                    </option>
                  ))}
                </select>
              </div>

              {/* Recipient User and Role */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <UserPlus className="w-3.5 h-3.5 text-blue-600" />
                    <span>کاربر ارجاع‌شونده (گیرنده):</span>
                  </label>
                  <select
                    value={targetUser}
                    onChange={e => {
                      setTargetUser(e.target.value);
                      const u = usersList.find(x => x.username === e.target.value);
                      if (u) {
                        setTargetRole(u.role === 'admin' ? 'Project Manager' : (u.role === 'manager' ? 'Lead Engineer' : 'Designer'));
                      }
                    }}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold focus:bg-white"
                    required
                  >
                    <option value="">-- انتخاب کاربر از سامانه --</option>
                    {usersList.map(u => (
                      <option key={u.id} value={u.username}>
                        {u.username} ({u.role === 'admin' ? 'مدیر سیستم' : (u.role === 'manager' ? 'مدیر مهندسی' : 'کارشناس')})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">سمت / دیسیپلین گیرنده:</label>
                  <select
                    value={targetRole}
                    onChange={e => setTargetRole(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:bg-white"
                  >
                    <option value="Lead Engineer">Lead Engineer (سرپرست دیسیپلین)</option>
                    <option value="Designer">Designer (مهندس محاسب / طراح)</option>
                    <option value="Project Manager">Project Manager (مدیر پروژه)</option>
                    <option value="DCC Controller">DCC Controller (کنترل مدارک)</option>
                    <option value="Client / Consultant">Client / Consultant (دستگاه نظارت)</option>
                  </select>
                </div>
              </div>

              {/* Action type & Priority */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">نوع اقدام مورد انتظار:</label>
                  <select
                    value={actionType}
                    onChange={e => setActionType(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:bg-white"
                  >
                    {ACTION_TYPES.map(a => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">اولویت ارجاع:</label>
                  <select
                    value={priority}
                    onChange={e => setPriority(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold focus:bg-white"
                  >
                    <option value="normal">عادی (Normal)</option>
                    <option value="urgent">فوری (Urgent)</option>
                    <option value="immediate">آنی - اقدام اضطراری (Immediate)</option>
                  </select>
                </div>
              </div>

              {/* Step & Due Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">مرحله چرخه مهندسی:</label>
                  <select
                    value={newStep}
                    onChange={e => setNewStep(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:bg-white"
                  >
                    <option value="discipline_lead">بررسی سرپرست دیسیپلین</option>
                    <option value="inter_discipline">هماهنگی بین‌رشته‌ای (IDC)</option>
                    <option value="drafting">طراحی و اصلاح مدل/نقشه</option>
                    <option value="dcc_check">کنترل فرمت و ثبت DCC</option>
                    <option value="engineering_manager">تایید مدیر مهندسی</option>
                    <option value="client_review">بررسی کارفرما / مشاور</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">مهلت اقدام (Due Date شمسی):</label>
                  <input
                    type="text"
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    placeholder="1405/06/20"
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono"
                    required
                  />
                </div>
              </div>

              {/* Man-hours estimation */}
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

              {/* Instructions and notes */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">شرح دستورکار و کامنت‌های ارجاع:</label>
                <textarea
                  rows={3}
                  value={comments}
                  onChange={e => setComments(e.target.value)}
                  placeholder="لطفاً الزامات استاندارد NFPA 72 و پوشش دتکتورها بررسی و نتیجه در کارتابل ثبت گردد."
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs resize-none focus:bg-white"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submitting ? 'در حال ثبت ارجاع...' : 'ثبت و ارسال به کارتابل کاربر'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Forward / Reply Modal */}
      {forwardModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <CornerDownLeft className="w-5 h-5 text-blue-600" />
                <span>ارجاع مجدد یا پاسخ به ارجاع‌دهنده</span>
              </h3>
              <button
                onClick={() => setForwardModalItem(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleForwardSubmit} className="p-5 space-y-4 text-xs">
              <div className="bg-blue-50 p-3 rounded-2xl border border-blue-200/60 text-blue-900">
                <div className="font-mono font-bold">{forwardModalItem.doc_number}</div>
                <div className="text-[11px] mt-0.5">{forwardModalItem.doc_title}</div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  ارجاع به کاربر (پاسخ به فرستنده یا پاس به همکار دیگر):
                </label>
                <select
                  value={forwardToUser}
                  onChange={e => setForwardToUser(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold focus:bg-white"
                  required
                >
                  {usersList.map(u => (
                    <option key={u.id} value={u.username}>
                      {u.username} ({u.role === 'admin' ? 'مدیر سیستم' : (u.role === 'manager' ? 'مدیر مهندسی' : 'کارشناس')})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">نوع اقدام درخواستی:</label>
                <select
                  value={forwardActionType}
                  onChange={e => setForwardActionType(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:bg-white"
                >
                  {ACTION_TYPES.map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">وضعیت ارجاع:</label>
                <select
                  value={forwardStatus}
                  onChange={e => setForwardStatus(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:bg-white"
                >
                  <option value="in_progress">در حال اقدام (In Progress)</option>
                  <option value="approved">تایید و تکمیل شده (Approved)</option>
                  <option value="rejected">عودت جهت اصلاح (Rejected)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">یادداشت ارجاع یا گزارش اقدام:</label>
                <textarea
                  rows={3}
                  value={forwardNote}
                  onChange={e => setForwardNote(e.target.value)}
                  placeholder="توضیحات و اقدامات انجام شده را شرح دهید..."
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs resize-none focus:bg-white"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setForwardModalItem(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs cursor-pointer flex items-center gap-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submitting ? 'در حال ارسال...' : 'ثبت و ارسال ارجاع'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: History / Audit Trail Modal */}
      {historyModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden max-h-[85vh] flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <HistoryIcon className="w-5 h-5 text-blue-600" />
                <span>سوابق و تاریخچه ارجاعات مدرک</span>
              </h3>
              <button
                onClick={() => setHistoryModalItem(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <div className="font-mono font-bold text-slate-900">{historyModalItem.doc_number}</div>
                <div className="text-slate-600 text-[11px] mt-0.5">{historyModalItem.doc_title}</div>
              </div>

              <div className="relative border-r-2 border-blue-200 pr-4 space-y-6">
                {historyModalItem.history && historyModalItem.history.length > 0 ? (
                  historyModalItem.history.map((h, idx) => (
                    <div key={h.id || idx} className="relative">
                      <div className="absolute -right-[23px] top-0.5 w-3.5 h-3.5 rounded-full bg-blue-600 border-2 border-white" />
                      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-blue-700 flex items-center gap-1">
                            <span>از: {h.from}</span>
                            <ArrowRight className="w-3 h-3 rtl:rotate-180" />
                            <span>به: {h.to}</span>
                          </span>
                          <span className="font-mono text-slate-400">{h.date}</span>
                        </div>
                        {h.action_type && (
                          <div className="text-[10px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded inline-block font-semibold">
                            {h.action_type}
                          </div>
                        )}
                        <p className="text-slate-700 text-xs bg-slate-50 p-2 rounded-lg leading-relaxed">
                          {h.note}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-400 text-xs">سوابق ارجاع چندگانه ثبت نشده است.</p>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setHistoryModalItem(null)}
                className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
