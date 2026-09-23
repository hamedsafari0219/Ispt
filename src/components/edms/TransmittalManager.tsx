import React, { useState } from 'react';
import { 
  Send, 
  Plus, 
  FileText, 
  Mail, 
  Printer, 
  CheckCircle2, 
  Clock, 
  Trash2, 
  Edit3, 
  X, 
  Check, 
  Eye, 
  Search, 
  Building2, 
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { EDMSTransmittal, EDMSDocument, EDMSTransmittalDocItem, User } from '../../types';
import { authenticatedFetch } from '../../utils/api';
import { TransparentLogo } from '../TransparentLogo';

interface TransmittalManagerProps {
  transmittals: EDMSTransmittal[];
  documents: EDMSDocument[];
  currentUser: User;
  onRefresh: () => void;
  lang: 'fa' | 'en';
}

export const TransmittalManager: React.FC<TransmittalManagerProps> = ({
  transmittals,
  documents,
  currentUser,
  onRefresh,
  lang
}) => {
  const [search, setSearch] = useState('');
  const [activeTabFilter, setActiveTabFilter] = useState<'all' | 'outgoing' | 'incoming'>('all');

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [previewTransmittal, setPreviewTransmittal] = useState<EDMSTransmittal | null>(null);
  const [emailModalTransmittal, setEmailModalTransmittal] = useState<EDMSTransmittal | null>(null);

  // New Transmittal Form State
  const [formData, setFormData] = useState<{
    transmittal_number: string;
    transmittal_date: string;
    project_code: string;
    project_name: string;
    sender: string;
    sender_contact: string;
    recipient: string;
    attention_to: string;
    recipient_email: string;
    subject: string;
    transmittal_type: 'outgoing' | 'incoming';
    issue_purpose: 'IFA' | 'IFR' | 'IFC' | 'IFI' | 'AFC' | 'OTHER';
    delivery_method: 'Email' | 'Official Courier' | 'Client Portal' | 'Hand Delivered';
    remarks: string;
    prepared_by: string;
    approved_by: string;
    selectedDocIds: number[];
  }>({
    transmittal_number: `TR-IPT-FG-${new Date().getFullYear()}-${String(transmittals.length + 1).padStart(3, '0')}`,
    transmittal_date: '۱۴۰۳/۰۵/۲۲',
    project_code: 'PRJ-SP14-FG',
    project_name: 'پروژه فاز ۱۴ پارس جنوبی (سیستم اعلام و اطفاء حریق)',
    sender: 'شرکت مهندسی ایساتیس پارس تجهیز (IPT)',
    sender_contact: 'دپارتمان کنترل مدارک و اسناد مهندسی (DCC)',
    recipient: 'شرکت نفت و گاز پارس (POGC) / قرارگاه خاتم',
    attention_to: 'مهندس احمدی - سرپرست محترم نظارت مهندسی F&G',
    recipient_email: '',
    subject: 'ارسال مدارک مهندسی جهت بازبینی و تایید (IFR/IFA)',
    transmittal_type: 'outgoing',
    issue_purpose: 'IFR',
    delivery_method: 'Email',
    remarks: 'خواهشمند است پس از بررسی فنی مدارک پیوست، ظرف مدت مجاز طبق قرارداد نظر نظارت (CRS) ارسال گردد.',
    prepared_by: 'واحد کنترل مدارک مهندسی (DCC)',
    approved_by: 'مدیر مهندسی و پروژه‌ها',
    selectedDocIds: []
  });

  const [savingTrans, setSavingTrans] = useState(false);

  // Filtered
  const filteredTransmittals = React.useMemo(() => {
    return transmittals.filter(t => {
      const matchSearch = 
        !search ||
        t.transmittal_number.toLowerCase().includes(search.toLowerCase()) ||
        t.recipient.toLowerCase().includes(search.toLowerCase()) ||
        t.subject.toLowerCase().includes(search.toLowerCase());

      const matchType = activeTabFilter === 'all' || t.transmittal_type === activeTabFilter;
      return matchSearch && matchType;
    });
  }, [transmittals, search, activeTabFilter]);

  const handleOpenCreate = () => {
    setFormData({
      transmittal_number: `TR-IPT-FG-${new Date().getFullYear()}-${String(transmittals.length + 1).padStart(3, '0')}`,
      transmittal_date: '۱۴۰۳/۰۵/۲۲',
      project_code: documents[0]?.project_code || 'PRJ-SP14-FG',
      project_name: documents[0]?.project_name || 'پروژه فاز ۱۴ پارس جنوبی (سیستم F&G)',
      sender: 'شرکت مهندسی ایساتیس پارس تجهیز (IPT)',
      sender_contact: 'دپارتمان کنترل مدارک و اسناد مهندسی (DCC)',
      recipient: 'شرکت مهندسی و ساخت تاسیسات دریایی / شرکت نفت و گاز',
      attention_to: 'سرپرست مهندسی ابزار دقیق و F&G',
      recipient_email: '',
      subject: 'ارسال مدارک مهندسی بازنگری شده',
      transmittal_type: 'outgoing',
      issue_purpose: 'IFR',
      delivery_method: 'Email',
      remarks: 'پیرو جلسات هماهنگی، مدارک تفصیلی پیوست جهت بررسی و اخذ تاییدیه ارسال می‌گردد.',
      prepared_by: 'مهندس کنترل مدارک (DCC)',
      approved_by: 'مدیر دپارتمان مهندسی',
      selectedDocIds: documents.slice(0, 2).map(d => d.id)
    });
    setCreateModalOpen(true);
  };

  const handleToggleDoc = (id: number) => {
    setFormData(prev => {
      const exists = prev.selectedDocIds.includes(id);
      return {
        ...prev,
        selectedDocIds: exists 
          ? prev.selectedDocIds.filter(x => x !== id)
          : [...prev.selectedDocIds, id]
      };
    });
  };

  const handleSaveTransmittal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.transmittal_number || !formData.recipient || !formData.subject) {
      alert('شماره ترانزمیتال، گیرنده و موضوع الزامی هستند.');
      return;
    }

    if (formData.selectedDocIds.length === 0) {
      alert('لطفاً حداقل یک مدرک مهندسی را جهت الصاق به ترانزمیتال انتخاب نمایید.');
      return;
    }

    // Build attached doc items
    const docItems: EDMSTransmittalDocItem[] = formData.selectedDocIds.map(id => {
      const doc = documents.find(d => d.id === id);
      return {
        doc_id: id,
        doc_number: doc ? doc.doc_number : 'DOC-UNKNOWN',
        doc_title: doc ? doc.title : 'عنوان نامشخص',
        revision: doc ? doc.current_revision : '0',
        copies: 1,
        format: 'PDF',
        status: doc ? doc.current_status : 'IFR'
      };
    });

    const payload = {
      transmittal_number: formData.transmittal_number,
      transmittal_date: formData.transmittal_date,
      project_code: formData.project_code,
      project_name: formData.project_name,
      sender: formData.sender,
      sender_contact: formData.sender_contact,
      recipient: formData.recipient,
      attention_to: formData.attention_to,
      recipient_email: formData.recipient_email,
      subject: formData.subject,
      transmittal_type: formData.transmittal_type,
      issue_purpose: formData.issue_purpose,
      delivery_method: formData.delivery_method,
      documents: docItems,
      remarks: formData.remarks,
      prepared_by: formData.prepared_by,
      approved_by: formData.approved_by,
      status: 'draft'
    };

    setSavingTrans(true);
    try {
      const res = await authenticatedFetch('/api/edms/transmittals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('خطا در ذخیره ترانزمیتال');

      setCreateModalOpen(false);
      onRefresh();
    } catch (e: any) {
      alert(e.message || 'خطا در ثبت ترانزمیتال');
    } finally {
      setSavingTrans(false);
    }
  };

  const handleDeleteTransmittal = async (id: number, num: string) => {
    if (!window.confirm(`آیا از حذف ترانزمیتال شماره ${num} اطمینان دارید؟`)) return;
    try {
      const res = await authenticatedFetch(`/api/edms/transmittals/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        onRefresh();
      }
    } catch (e) {
      alert('خطا در حذف ترانزمیتال');
    }
  };

  return (
    <div className="space-y-4" dir={lang === 'fa' ? 'rtl' : 'ltr'}>
      {/* Top Actions & Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={lang === 'fa' ? 'جستجو در شماره ترانزمیتال، گیرنده، موضوع...' : 'Search transmittal no, recipient, subject...'}
            className="w-full pr-9 pl-4 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        {/* Filter & Add Button */}
        <div className="flex items-center gap-2">
          {/* Type Filter */}
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-medium border border-slate-200">
            <button
              onClick={() => setActiveTabFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTabFilter === 'all' ? 'bg-white text-blue-700 font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {lang === 'fa' ? 'همه' : 'All'}
            </button>
            <button
              onClick={() => setActiveTabFilter('outgoing')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTabFilter === 'outgoing' ? 'bg-white text-blue-700 font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {lang === 'fa' ? 'صادره (Outgoing)' : 'Outgoing'}
            </button>
            <button
              onClick={() => setActiveTabFilter('incoming')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTabFilter === 'incoming' ? 'bg-white text-blue-700 font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {lang === 'fa' ? 'وارده (Incoming)' : 'Incoming'}
            </button>
          </div>

          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{lang === 'fa' ? 'صدور ترانزمیتال رسمی' : 'New Transmittal'}</span>
          </button>
        </div>
      </div>

      {/* Transmittal Cards / List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTransmittals.length === 0 ? (
          <div className="col-span-full py-16 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
            {lang === 'fa' ? 'هیچ ترانزمیتالی ثبت نشده است.' : 'No transmittals found.'}
          </div>
        ) : (
          filteredTransmittals.map((t) => (
            <div 
              key={t.id}
              className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <span className="font-mono text-xs font-bold text-blue-700 block direction-ltr text-left">
                      {t.transmittal_number}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {t.transmittal_date}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      t.status === 'issued' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {t.status === 'issued' ? 'ارسال شده' : 'پیش‌نویس'}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-blue-700">
                      {t.issue_purpose}
                    </span>
                  </div>
                </div>

                {/* Body Details */}
                <div className="py-3 space-y-2 text-xs">
                  <div>
                    <span className="text-slate-400 text-[11px] block">گیرنده:</span>
                    <strong className="text-slate-800 line-clamp-1">{t.recipient}</strong>
                    {t.attention_to && (
                      <span className="text-[11px] text-slate-500 block line-clamp-1">
                        عطف به: {t.attention_to}
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="text-slate-400 text-[11px] block">موضوع:</span>
                    <p className="text-slate-700 line-clamp-2 leading-relaxed font-medium">
                      {t.subject}
                    </p>
                  </div>

                  {/* Attached Documents Count */}
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-150 flex items-center justify-between">
                    <span className="text-[11px] text-slate-600 font-medium">مدارک پیوست شده:</span>
                    <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {t.documents?.length || 0} مدرک
                    </span>
                  </div>

                  {t.emailed_at && (
                    <div className="text-[10px] text-emerald-700 flex items-center gap-1 font-mono">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>ایمیل رسمی ارسال شد</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-1">
                <div className="flex items-center gap-1">
                  {/* View / Print Official Sheet */}
                  <button
                    onClick={() => setPreviewTransmittal(t)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold transition-colors cursor-pointer"
                    title="مشاهده فرم رسمی ترانزمیتال"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>مشاهده فرم</span>
                  </button>

                  {/* Send via Email */}
                  <button
                    onClick={() => setEmailModalTransmittal(t)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-bold transition-colors cursor-pointer"
                    title="ارسال مستقیم با ایمیل سازمانی"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>ارسال ایمیل</span>
                  </button>
                </div>

                {currentUser.role === 'admin' && (
                  <button
                    onClick={() => handleDeleteTransmittal(t.id, t.transmittal_number)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    title="حذف ترانزمیتال (ادمین)"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal: Create Official Transmittal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div 
            className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
            dir={lang === 'fa' ? 'rtl' : 'ltr'}
          >
            {/* Header */}
            <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Send className="w-5 h-5 text-blue-400" />
                <h3 className="text-base font-extrabold">
                  {lang === 'fa' ? 'صدور برگه ارسال مدارک مهندسی (EDMS Transmittal)' : 'Issue Engineering Transmittal'}
                </h3>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSaveTransmittal} className="p-5 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">شماره ترانزمیتال *</label>
                  <input
                    type="text"
                    required
                    value={formData.transmittal_number}
                    onChange={e => setFormData({ ...formData, transmittal_number: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono outline-none direction-ltr text-left"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">تاریخ ترانزمیتال</label>
                  <input
                    type="text"
                    value={formData.transmittal_date}
                    onChange={e => setFormData({ ...formData, transmittal_date: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">پروژه</label>
                  <input
                    type="text"
                    value={formData.project_name}
                    onChange={e => setFormData({ ...formData, project_name: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">هدف صدور (Purpose)</label>
                  <select
                    value={formData.issue_purpose}
                    onChange={e => setFormData({ ...formData, issue_purpose: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 outline-none cursor-pointer"
                  >
                    <option value="IFR">IFR - جهت بررسی (For Review)</option>
                    <option value="IFA">IFA - جهت تایید و تصویب (For Approval)</option>
                    <option value="IFC">IFC - جهت اجرا و ساخت (For Construction)</option>
                    <option value="IFI">IFI - جهت اطلاع (For Information)</option>
                    <option value="AFC">AFC - تایید شده برای ساخت</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">گیرنده (سازمان / شرکت کارفرما) *</label>
                  <input
                    type="text"
                    required
                    value={formData.recipient}
                    onChange={e => setFormData({ ...formData, recipient: e.target.value })}
                    placeholder="e.g. شرکت نفت و گاز پارس (POGC)"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">عطف به (Attention To)</label>
                  <input
                    type="text"
                    value={formData.attention_to}
                    onChange={e => setFormData({ ...formData, attention_to: e.target.value })}
                    placeholder="e.g. مهندس رضایی - سرپرست دستگاه نظارت"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">آدرس ایمیل گیرنده (جهت ارسال خودکار)</label>
                  <input
                    type="email"
                    value={formData.recipient_email}
                    onChange={e => setFormData({ ...formData, recipient_email: e.target.value })}
                    placeholder="e.g. dcc@client-project.com"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono outline-none direction-ltr text-left"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">موضوع ترانزمیتال *</label>
                  <input
                    type="text"
                    required
                    value={formData.subject}
                    onChange={e => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="e.g. ارسال نقشه‌ها و محاسبات سیستم اطفا فاز ۱۴"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">توضیحات و اقدامات درخواستی</label>
                  <textarea
                    rows={2}
                    value={formData.remarks}
                    onChange={e => setFormData({ ...formData, remarks: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 outline-none"
                  />
                </div>
              </div>

              {/* Document Picker from MDR */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-extrabold text-slate-800">
                    انتخاب مدارک مهندسی الصاق شده به این ترانزمیتال ({formData.selectedDocIds.length} انتخاب شده) *
                  </label>
                  <span className="text-[11px] text-slate-400">
                    بر اساس ماتریس اسناد (MDR)
                  </span>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto divide-y divide-slate-100">
                  {documents.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">
                      هیچ مدرکی در MDR موجود نیست.
                    </div>
                  ) : (
                    documents.map(doc => {
                      const isSelected = formData.selectedDocIds.includes(doc.id);
                      return (
                        <div 
                          key={doc.id}
                          onClick={() => handleToggleDoc(doc.id)}
                          className={`p-2.5 text-xs flex items-center justify-between cursor-pointer transition-colors ${
                            isSelected ? 'bg-blue-50/70 text-blue-900 font-bold' : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <input 
                              type="checkbox" 
                              checked={isSelected}
                              onChange={() => {}}
                              className="rounded text-blue-600 pointer-events-none"
                            />
                            <div>
                              <span className="font-mono text-blue-700 block direction-ltr text-left">
                                {doc.doc_number}
                              </span>
                              <span className="text-[11px] text-slate-500 font-normal">
                                {doc.title}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 text-[11px] font-mono">
                            <span className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold">
                              {doc.current_revision}
                            </span>
                            <span className="bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded">
                              {doc.discipline}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Sign-offs */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">تهیه کننده (DCC)</label>
                  <input
                    type="text"
                    value={formData.prepared_by}
                    onChange={e => setFormData({ ...formData, prepared_by: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">تایید کننده مهندسی</label>
                  <input
                    type="text"
                    value={formData.approved_by}
                    onChange={e => setFormData({ ...formData, approved_by: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 outline-none"
                  />
                </div>
              </div>

              {/* Submit */}
              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={savingTrans}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {savingTrans ? 'در حال صدور...' : 'صدور و ثبت ترانزمیتال'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Official Transmittal Sheet Preview (Printable) */}
      {previewTransmittal && (
        <TransmittalPrintModal
          transmittal={previewTransmittal}
          onClose={() => setPreviewTransmittal(null)}
          lang={lang}
        />
      )}

      {/* Modal: Send Transmittal via Email */}
      {emailModalTransmittal && (
        <TransmittalEmailModal
          transmittal={emailModalTransmittal}
          onClose={() => setEmailModalTransmittal(null)}
          onSuccess={() => {
            setEmailModalTransmittal(null);
            onRefresh();
          }}
          lang={lang}
        />
      )}
    </div>
  );
};

/**
 * TransmittalPrintModal:
 * Displays official DCC engineering transmittal sheet formatted for print and official record.
 */
interface TransmittalPrintModalProps {
  transmittal: EDMSTransmittal;
  onClose: () => void;
  lang: 'fa' | 'en';
}

const TransmittalPrintModal: React.FC<TransmittalPrintModalProps> = ({
  transmittal,
  onClose,
  lang
}) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div 
        className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-300 overflow-hidden flex flex-col my-8"
        dir="rtl"
      >
        {/* Top Control Bar (Hidden on print) */}
        <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-extrabold">برگه رسمی ترانزمیتال مهندسی (Official Document Transmittal)</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>چاپ / ذخیره PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Engineering Sheet */}
        <div className="p-8 bg-white text-slate-900 text-xs font-sans space-y-5 print:p-0">
          {/* Header Block with Border */}
          <div className="border-2 border-slate-800 rounded-lg p-4">
            <div className="flex items-center justify-between border-b-2 border-slate-800 pb-3">
              {/* Company Logo & Identity */}
              <div className="flex items-center gap-3">
                <TransparentLogo src="/logo.png" alt="IPT Logo" className="h-12 w-auto object-contain" tolerance={50} />
                <div>
                  <h1 className="text-base font-black text-slate-900 leading-tight">شرکت مهندسی ایساتیس پارس تجهیز</h1>
                  <span className="text-xs text-slate-600 font-bold block">ISATIS PARS TAJHIZ ENGINEERING CO.</span>
                  <span className="text-[10px] text-blue-700 font-bold">دپارتمان کنترل مدارک مهندسی (DCC)</span>
                </div>
              </div>

              {/* Document Title Center */}
              <div className="text-center">
                <span className="inline-block px-3 py-1 rounded bg-slate-900 text-white font-extrabold text-sm tracking-wider">
                  برگه ارسال مدارک مهندسی (TRANSMITTAL)
                </span>
                <span className="block text-[11px] text-slate-500 font-mono mt-1">STANDARD EDMS FORM</span>
              </div>

              {/* Transmittal No & Date Box */}
              <div className="border border-slate-300 rounded p-2 text-right bg-slate-50 text-[11px] min-w-[200px]">
                <div><strong>شماره ترانزمیتال:</strong> <span className="font-mono font-bold text-blue-700 direction-ltr inline-block">{transmittal.transmittal_number}</span></div>
                <div><strong>تاریخ صدور:</strong> {transmittal.transmittal_date}</div>
                <div><strong>هدف صدور:</strong> <span className="font-bold text-indigo-700">{transmittal.issue_purpose}</span></div>
              </div>
            </div>

            {/* Project & Client Metadata Grid */}
            <div className="grid grid-cols-2 gap-3 pt-3 text-[11px]">
              <div>
                <p><strong>پروژه:</strong> {transmittal.project_name} ({transmittal.project_code})</p>
                <p><strong>ارسال‌کننده (From):</strong> {transmittal.sender}</p>
                <p><strong>تماس ارسال‌کننده:</strong> {transmittal.sender_contact || '-'}</p>
              </div>
              <div>
                <p><strong>گیرنده (To):</strong> {transmittal.recipient}</p>
                <p><strong>عطف به (Attn):</strong> {transmittal.attention_to || '-'}</p>
                <p><strong>روش ارسال:</strong> {transmittal.delivery_method}</p>
              </div>
            </div>

            <div className="border-t border-slate-200 mt-2 pt-2 text-[11px]">
              <strong>موضوع:</strong> {transmittal.subject}
            </div>
          </div>

          {/* Attached Documents Table */}
          <div>
            <h3 className="text-xs font-bold text-slate-800 mb-1.5">
              فهرست نقشه‌ها و اسناد مهندسی پیوست (Attached Engineering Documents)
            </h3>
            <table className="w-full border-2 border-slate-800 text-center border-collapse text-[11px]">
              <thead>
                <tr className="bg-slate-100 border-b-2 border-slate-800 font-bold">
                  <th className="border-r border-slate-400 py-2 px-2 w-10">ردیف</th>
                  <th className="border-r border-slate-400 py-2 px-3 text-left w-48">Document No.</th>
                  <th className="border-r border-slate-400 py-2 px-4 text-right">عنوان مدرک مهندسی</th>
                  <th className="border-r border-slate-400 py-2 px-2 w-16">Rev.</th>
                  <th className="border-r border-slate-400 py-2 px-2 w-20">هدف</th>
                  <th className="border-r border-slate-400 py-2 px-2 w-16">تعداد</th>
                  <th className="py-2 px-2 w-20">فرمت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300">
                {transmittal.documents.map((doc, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="border-r border-slate-300 py-2 px-2 font-mono">{idx + 1}</td>
                    <td className="border-r border-slate-300 py-2 px-3 font-mono font-bold text-left text-blue-700 direction-ltr">
                      {doc.doc_number}
                    </td>
                    <td className="border-r border-slate-300 py-2 px-4 text-right font-medium">
                      {doc.doc_title}
                    </td>
                    <td className="border-r border-slate-300 py-2 px-2 font-mono font-bold text-amber-700">
                      {doc.revision}
                    </td>
                    <td className="border-r border-slate-300 py-2 px-2 font-bold text-teal-700">
                      {doc.status || transmittal.issue_purpose}
                    </td>
                    <td className="border-r border-slate-300 py-2 px-2 font-mono">
                      {doc.copies || 1}
                    </td>
                    <td className="py-2 px-2 font-mono text-slate-600">
                      {doc.format || 'PDF'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Remarks */}
          {transmittal.remarks && (
            <div className="border border-slate-300 rounded p-3 bg-slate-50 text-[11px] leading-relaxed">
              <strong>توضیحات و مهلت بررسی:</strong> {transmittal.remarks}
            </div>
          )}

          {/* Sign-offs Blocks */}
          <div className="grid grid-cols-3 gap-3 border-2 border-slate-800 rounded-lg p-3 text-center text-[11px]">
            <div>
              <span className="text-slate-500 font-bold block mb-1">تهیه کننده (DCC IPT)</span>
              <strong className="block text-slate-800">{transmittal.prepared_by || 'واحد کنترل مدارک'}</strong>
              <div className="h-10 border-b border-dashed border-slate-300 my-1"></div>
              <span className="text-[10px] text-slate-400">امضاء و تاریخ</span>
            </div>

            <div className="border-r border-slate-200">
              <span className="text-slate-500 font-bold block mb-1">تایید کننده فنی مهندسی</span>
              <strong className="block text-slate-800">{transmittal.approved_by || 'مدیر فنی و مهندسی'}</strong>
              <div className="h-10 border-b border-dashed border-slate-300 my-1"></div>
              <span className="text-[10px] text-slate-400">امضاء و تاریخ</span>
            </div>

            <div className="border-r border-slate-200">
              <span className="text-slate-500 font-bold block mb-1">رسید و دریافت گیرنده</span>
              <strong className="block text-slate-800">دستگاه نظارت / کارفرما</strong>
              <div className="h-10 border-b border-dashed border-slate-300 my-1"></div>
              <span className="text-[10px] text-slate-400">نام، امضاء و تاریخ دریافت</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * TransmittalEmailModal:
 * Allows the user to officially send the transmittal with HTML email to the client!
 */
interface TransmittalEmailModalProps {
  transmittal: EDMSTransmittal;
  onClose: () => void;
  onSuccess: () => void;
  lang: 'fa' | 'en';
}

const TransmittalEmailModal: React.FC<TransmittalEmailModalProps> = ({
  transmittal,
  onClose,
  onSuccess,
  lang
}) => {
  const [toEmail, setToEmail] = useState(transmittal.recipient_email || 'client.dcc@project.com');
  const [ccEmail, setCcEmail] = useState('');
  const [customMsg, setCustomMsg] = useState('لطفاً رسید دریافت مدارک پیوست را اعلام فرمایید.');
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toEmail) {
      alert('لطفاً ایمیل گیرنده را وارد نمایید.');
      return;
    }

    setSending(true);
    setFeedback(null);
    try {
      const res = await authenticatedFetch(`/api/edms/transmittals/${transmittal.id}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: toEmail,
          cc: ccEmail,
          customMessage: customMsg
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'خطا در ارسال ایمیل ترانزمیتال');

      setFeedback({ type: 'success', msg: 'ترانزمیتال با موفقیت ارسال و در لاگ سیستم ثبت گردید.' });
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (e: any) {
      setFeedback({ type: 'error', msg: e.message || 'خطا در ارسال ایمیل' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div 
        className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
        dir="rtl"
      >
        <div className="p-4 bg-indigo-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-indigo-300" />
            <h3 className="text-sm font-extrabold">ارسال ایمیل رسمی ترانزمیتال</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-indigo-200 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSend} className="p-5 space-y-3.5 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="font-mono font-bold text-blue-700 block direction-ltr text-left">
              {transmittal.transmittal_number}
            </span>
            <span className="text-[11px] text-slate-600 block mt-0.5">
              موضوع: {transmittal.subject}
            </span>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">گیرنده (To) *</label>
            <input
              type="email"
              required
              value={toEmail}
              onChange={e => setToEmail(e.target.value)}
              placeholder="client.dcc@project.com"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono outline-none direction-ltr text-left"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">رونوشت (CC)</label>
            <input
              type="text"
              value={ccEmail}
              onChange={e => setCcEmail(e.target.value)}
              placeholder="project.manager@client.com"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono outline-none direction-ltr text-left"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">پیام همراه ترانزمیتال</label>
            <textarea
              rows={3}
              value={customMsg}
              onChange={e => setCustomMsg(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none"
            />
          </div>

          {feedback && (
            <div className={`p-3 rounded-xl text-xs font-bold ${
              feedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}>
              {feedback.msg}
            </div>
          )}

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 cursor-pointer"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={sending}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            >
              <Send className="w-4 h-4" />
              <span>{sending ? 'در حال ارسال...' : 'ارسال قطعی ترانزمیتال'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
