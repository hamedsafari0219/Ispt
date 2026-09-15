import React, { useState } from 'react';
import { 
  Search, 
  Plus, 
  Download, 
  Filter, 
  History, 
  Sparkles, 
  Edit3, 
  Trash2, 
  FileSpreadsheet, 
  Clock, 
  Tag, 
  CheckCircle2, 
  AlertCircle,
  X,
  ExternalLink,
  ChevronDown,
  PauseCircle,
  PlayCircle,
  Layers
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { EDMSDocument, EDMSRevision, EDMSDocStatus, EDMSReviewCode } from '../../types';
import { authenticatedFetch } from '../../utils/api';
import { AIReviewModal } from './AIReviewModal';

interface MDRTableProps {
  documents: EDMSDocument[];
  onRefresh: () => void;
  lang: 'fa' | 'en';
}

export const MDRTable: React.FC<MDRTableProps> = ({
  documents,
  onRefresh,
  lang
}) => {
  const [search, setSearch] = useState('');
  const [disciplineFilter, setDisciplineFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');

  // Modals state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<EDMSDocument | null>(null);
  const [aiReviewDoc, setAiReviewDoc] = useState<EDMSDocument | null>(null);
  const [revisionDoc, setRevisionDoc] = useState<EDMSDocument | null>(null);

  // Form State for Add / Edit
  const [formData, setFormData] = useState<Partial<EDMSDocument>>({
    doc_number: '',
    title: '',
    title_en: '',
    project_code: 'PRJ-SP14-FG',
    project_name: 'پروژه پالایشگاهی فاز ۱۴ پارس جنوبی',
    discipline: 'F&G',
    doc_type: 'DWG',
    weight_factor: 5.0,
    current_revision: 'Rev 0',
    current_status: 'IFR',
    progress: 50,
    planned_date: '۱۴۰۳/۰۴/۱۵',
    actual_date: '',
    remarks: '',
    equipment_tags: []
  });
  const [formTagInput, setFormTagInput] = useState('');
  const [savingDoc, setSavingDoc] = useState(false);

  // Filtered documents
  const filteredDocs = React.useMemo(() => {
    return documents.filter(doc => {
      const matchSearch = 
        !search ||
        doc.doc_number.toLowerCase().includes(search.toLowerCase()) ||
        doc.title.toLowerCase().includes(search.toLowerCase()) ||
        (doc.title_en && doc.title_en.toLowerCase().includes(search.toLowerCase())) ||
        (doc.equipment_tags && doc.equipment_tags.some(t => t.toLowerCase().includes(search.toLowerCase())));

      const matchDiscipline = disciplineFilter === 'all' || doc.discipline === disciplineFilter;
      const matchStatus = statusFilter === 'all' || doc.current_status === statusFilter;
      const matchProject = projectFilter === 'all' || doc.project_code === projectFilter;

      return matchSearch && matchDiscipline && matchStatus && matchProject;
    });
  }, [documents, search, disciplineFilter, statusFilter, projectFilter]);

  // Unique list of projects and disciplines
  const projects = Array.from(new Set(documents.map(d => d.project_code)));
  const disciplines = Array.from(new Set(documents.map(d => d.discipline)));

  // Export MDR to Excel
  const handleExportExcel = () => {
    const data = filteredDocs.map((doc, idx) => ({
      'ردیف': idx + 1,
      'شماره مدرک (Doc Number)': doc.doc_number,
      'عنوان فارسی': doc.title,
      'English Title': doc.title_en || '',
      'پروژه': doc.project_name,
      'کد پروژه': doc.project_code,
      'دیسیپلین': doc.discipline,
      'نوع مدرک': doc.doc_type,
      'رویژن جاری': doc.current_revision,
      'وضعیت مدرک': doc.current_status,
      'وزن مدرک (%)': doc.weight_factor,
      'پیشرفت فیزیکی (%)': doc.progress,
      'تاریخ برنامه‌ای': doc.planned_date,
      'تاریخ واقعی': doc.actual_date || '',
      'تگ تجهیزات مرتبط': (doc.equipment_tags || []).join(', '),
      'توضیحات': doc.remarks || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'MDR');
    XLSX.writeFile(workbook, `MDR_Isatis_EDMS_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleOpenAdd = () => {
    setEditingDoc(null);
    setFormData({
      doc_number: '',
      title: '',
      title_en: '',
      project_code: projects[0] || 'PRJ-SP14-FG',
      project_name: 'پروژه سیستم اعلام و اطفاء حریق',
      discipline: 'F&G',
      doc_type: 'DWG',
      weight_factor: 5.0,
      current_revision: 'Rev 0',
      current_status: 'IFR',
      progress: 0,
      planned_date: '۱۴۰۳/۰۵/۰۱',
      actual_date: '',
      remarks: '',
      equipment_tags: []
    });
    setFormTagInput('');
    setAddModalOpen(true);
  };

  const handleOpenEdit = (doc: EDMSDocument) => {
    setEditingDoc(doc);
    setFormData({
      ...doc,
      equipment_tags: doc.equipment_tags || []
    });
    setFormTagInput((doc.equipment_tags || []).join(', '));
    setAddModalOpen(true);
  };

  const handleSaveDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.doc_number || !formData.title) {
      alert('شماره مدرک و عنوان مدرک الزامی هستند.');
      return;
    }

    const tags = formTagInput
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    const payload = {
      ...formData,
      equipment_tags: tags
    };

    setSavingDoc(true);
    try {
      if (editingDoc) {
        const res = await authenticatedFetch(`/api/edms/documents/${editingDoc.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('خطا در به‌روزرسانی مدرک');
      } else {
        const res = await authenticatedFetch('/api/edms/documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('خطا در ایجاد مدرک');
      }

      setAddModalOpen(false);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'خطا در ثبت اطلاعات مدرک');
    } finally {
      setSavingDoc(false);
    }
  };

  const handleDeleteDoc = async (id: number, docNum: string) => {
    if (!window.confirm(`آیا از حذف مدرک مهندسی ${docNum} اطمینان دارید؟`)) return;
    try {
      const res = await authenticatedFetch(`/api/edms/documents/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        onRefresh();
      } else {
        alert('خطا در حذف مدرک');
      }
    } catch (e) {
      alert('خطا در ارتباط با سرور');
    }
  };

  const handleToggleHold = async (doc: EDMSDocument) => {
    const newHold = !doc.is_hold;
    let reason = doc.hold_reason || '';
    if (newHold) {
      const input = prompt(
        lang === 'fa' 
          ? 'علت تعلیق (Hold) این مدرک مهندسی را وارد فرمایید:' 
          : 'Please enter hold reason for this document:',
        'تغییرات در طراحی فرآیندی / منتظر نتایج شبیه‌سازی حریق'
      );
      if (input === null) return;
      reason = input.trim();
    }
    try {
      const res = await authenticatedFetch(`/api/edms/documents/${doc.id}/hold`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_hold: newHold, hold_reason: reason })
      });
      if (res.ok) {
        onRefresh();
      }
    } catch (e) {
      console.error('Error updating hold status:', e);
    }
  };

  return (
    <div className="space-y-4" dir={lang === 'fa' ? 'rtl' : 'ltr'}>
      {/* Top Filter and Action Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={lang === 'fa' ? 'جستجو در شماره مدرک، عنوان، تگ تجهیز...' : 'Search document no, title, tag...'}
            className="w-full pr-9 pl-4 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>

        {/* Filters and Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Discipline Select */}
          <select
            value={disciplineFilter}
            onChange={e => setDisciplineFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
          >
            <option value="all">{lang === 'fa' ? 'همه دیسیپلین‌ها' : 'All Disciplines'}</option>
            {disciplines.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          {/* Status Select */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
          >
            <option value="all">{lang === 'fa' ? 'همه وضعیت‌ها' : 'All Statuses'}</option>
            <option value="IFR">IFR (جهت بررسی)</option>
            <option value="IFA">IFA (جهت تصویب)</option>
            <option value="IFC">IFC (جهت ساخت/اجرا)</option>
            <option value="AFC">AFC (تصویب برای ساخت)</option>
            <option value="AS_BUILT">AS BUILT (چون ساخت)</option>
            <option value="APPROVED">APPROVED (تایید شده)</option>
          </select>

          {/* Export to Excel */}
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all cursor-pointer shadow-2xs"
            title="خروجی اکسل ماتریس اسناد مهندسی"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>{lang === 'fa' ? 'خروجی MDR اکسل' : 'Excel Export'}</span>
          </button>

          {/* Add Document Button */}
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>{lang === 'fa' ? 'ثبت مدرک جدید' : 'New Document'}</span>
          </button>
        </div>
      </div>

      {/* MDR Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-600 font-bold">
                <th className="py-3 px-3 text-center w-12">#</th>
                <th className="py-3 px-4 w-44">{lang === 'fa' ? 'شماره مدرک (Doc No)' : 'Doc Number'}</th>
                <th className="py-3 px-4 min-w-[220px]">{lang === 'fa' ? 'عنوان مدرک مهندسی' : 'Document Title'}</th>
                <th className="py-3 px-3 text-center w-24">{lang === 'fa' ? 'دیسیپلین' : 'Discipline'}</th>
                <th className="py-3 px-3 text-center w-20">{lang === 'fa' ? 'نوع' : 'Type'}</th>
                <th className="py-3 px-3 text-center w-20">{lang === 'fa' ? 'رویژن' : 'Rev'}</th>
                <th className="py-3 px-3 text-center w-24">{lang === 'fa' ? 'وضعیت' : 'Status'}</th>
                <th className="py-3 px-3 text-center w-28">{lang === 'fa' ? 'پیشرفت (%)' : 'Progress'}</th>
                <th className="py-3 px-3 text-center w-24">{lang === 'fa' ? 'وزن مدرک' : 'Weight'}</th>
                <th className="py-3 px-3 text-center w-28">{lang === 'fa' ? 'تاریخ برنامه' : 'Plan Date'}</th>
                <th className="py-3 px-4 text-center w-36">{lang === 'fa' ? 'عملیات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    {lang === 'fa' ? 'هیچ مدرک مهندسی با فیلترهای انتخابی یافت نشد.' : 'No documents match your filter.'}
                  </td>
                </tr>
              ) : (
                filteredDocs.map((doc, index) => (
                  <tr 
                    key={doc.id}
                    className="hover:bg-blue-50/30 transition-colors group"
                  >
                    {/* Index */}
                    <td className="py-3 px-3 text-center font-mono text-slate-400">
                      {index + 1}
                    </td>

                    {/* Doc Number */}
                    <td className="py-3 px-4 font-mono font-bold text-blue-700 direction-ltr text-left">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span>{doc.doc_number}</span>
                        {doc.is_hold && (
                          <span 
                            className="px-1.5 py-0.5 rounded text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-0.5"
                            title={`علت تعلیق (Hold): ${doc.hold_reason || 'تعیین نشده'}`}
                          >
                            <PauseCircle className="w-3 h-3 text-rose-600" />
                            HOLD
                          </span>
                        )}
                        {doc.wbs_code && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 font-mono">
                            {doc.wbs_code}
                          </span>
                        )}
                      </div>
                      {doc.equipment_tags && doc.equipment_tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {doc.equipment_tags.map(tag => (
                            <span key={tag} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-mono">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>

                    {/* Title */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 leading-snug">
                        {doc.title}
                      </div>
                      {doc.title_en && (
                        <div className="text-[11px] text-slate-400 font-sans mt-0.5" dir="ltr">
                          {doc.title_en}
                        </div>
                      )}
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {doc.project_name} ({doc.project_code})
                      </div>
                    </td>

                    {/* Discipline */}
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700">
                        {doc.discipline}
                      </span>
                    </td>

                    {/* Doc Type */}
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-indigo-50 text-indigo-700">
                        {doc.doc_type}
                      </span>
                    </td>

                    {/* Revision */}
                    <td className="py-3 px-3 text-center font-mono font-bold text-amber-700">
                      <span className="px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200">
                        {doc.current_revision}
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                        doc.current_status === 'IFC' || doc.current_status === 'AFC'
                          ? 'bg-emerald-100 text-emerald-800'
                          : doc.current_status === 'APPROVED'
                          ? 'bg-blue-100 text-blue-800'
                          : doc.current_status === 'IFA'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {doc.current_status}
                      </span>
                    </td>

                    {/* Progress with Visual Bar */}
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className="bg-blue-600 h-full rounded-full transition-all duration-300"
                            style={{ width: `${doc.progress}%` }}
                          />
                        </div>
                        <span className="font-mono font-bold text-slate-700 text-[11px] w-8 text-left">
                          {doc.progress}%
                        </span>
                      </div>
                    </td>

                    {/* Weight Factor */}
                    <td className="py-3 px-3 text-center font-mono text-slate-600">
                      {doc.weight_factor}%
                    </td>

                    {/* Planned Date */}
                    <td className="py-3 px-3 text-center text-slate-500 font-mono text-[11px]">
                      {doc.planned_date}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {/* Revision History & Lifecycle */}
                        <button
                          onClick={() => setRevisionDoc(doc)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                          title="تاریخچه رویژن‌ها و ثبت بازنگری جدید"
                        >
                          <History className="w-4 h-4" />
                        </button>

                        {/* AI Review Checkpoint */}
                        <button
                          onClick={() => setAiReviewDoc(doc)}
                          className="p-1.5 rounded-lg text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 transition-colors cursor-pointer"
                          title="کنترل هوشمند الزامات استاندارد با AI"
                        >
                          <Sparkles className="w-4 h-4" />
                        </button>

                        {/* Hold / Unhold Action */}
                        <button
                          onClick={() => handleToggleHold(doc)}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            doc.is_hold 
                              ? 'text-rose-600 hover:bg-rose-50' 
                              : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                          }`}
                          title={doc.is_hold ? 'خروج مدرک از وضعیت تعلیق (Unhold)' : 'تعلیق مدرک (Hold)'}
                        >
                          {doc.is_hold ? <PlayCircle className="w-4 h-4" /> : <PauseCircle className="w-4 h-4" />}
                        </button>

                        {/* Edit Doc */}
                        <button
                          onClick={() => handleOpenEdit(doc)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                          title="ویرایش مشخصات مدرک"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        {/* Delete Doc */}
                        <button
                          onClick={() => handleDeleteDoc(doc.id, doc.doc_number)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="حذف مدرک"
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

      {/* Modal: Add / Edit Document in MDR */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div 
            className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
            dir={lang === 'fa' ? 'rtl' : 'ltr'}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="text-base font-extrabold flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-blue-400" />
                <span>
                  {editingDoc 
                    ? (lang === 'fa' ? `ویرایش مدرک مهندسی ${editingDoc.doc_number}` : 'Edit Engineering Document')
                    : (lang === 'fa' ? 'ثبت مدرک جدید در ماتریس اسناد مهندسی (MDR)' : 'Register Document in MDR')}
                </span>
              </h3>
              <button
                onClick={() => setAddModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveDoc} className="p-5 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Doc Number */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === 'fa' ? 'شماره سند مهندسی (Doc Number) *' : 'Document Number *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.doc_number || ''}
                    onChange={e => setFormData({ ...formData, doc_number: e.target.value })}
                    placeholder="e.g. IPT-SP14-FG-DWG-001"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none direction-ltr text-left"
                  />
                </div>

                {/* Project Code */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === 'fa' ? 'کد پروژه *' : 'Project Code *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.project_code || ''}
                    onChange={e => setFormData({ ...formData, project_code: e.target.value })}
                    placeholder="PRJ-SP14-FG"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  />
                </div>

                {/* Persian Title */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === 'fa' ? 'عنوان فارسی مدرک یا نقشه *' : 'Document Title (Persian) *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title || ''}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. نقشه جانمایی تجهیزات اعلام حریق واحد ۱۰۴"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  />
                </div>

                {/* English Title */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === 'fa' ? 'عنوان انگلیسی مدرک (اختیاری)' : 'English Document Title'}
                  </label>
                  <input
                    type="text"
                    value={formData.title_en || ''}
                    onChange={e => setFormData({ ...formData, title_en: e.target.value })}
                    placeholder="e.g. Fire & Gas Equipment Layout Plan - Unit 104"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-sans focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none direction-ltr text-left"
                  />
                </div>

                {/* Discipline */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === 'fa' ? 'دیسیپلین مهندسی' : 'Discipline'}
                  </label>
                  <select
                    value={formData.discipline || 'F&G'}
                    onChange={e => setFormData({ ...formData, discipline: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none cursor-pointer"
                  >
                    <option value="F&G">F&G (اعلام و اطفاء حریق)</option>
                    <option value="Instrumentation">Instrumentation (ابزار دقیق)</option>
                    <option value="Electrical">Electrical (برق)</option>
                    <option value="Mechanical">Mechanical (مکانیک)</option>
                    <option value="Safety">Safety & HSE (ایمنی)</option>
                    <option value="Process">Process (فرآیند)</option>
                    <option value="Telecom">Telecom (مخابرات)</option>
                    <option value="General">General (عمومی)</option>
                  </select>
                </div>

                {/* Doc Type */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === 'fa' ? 'نوع مدرک (Doc Type)' : 'Document Type'}
                  </label>
                  <select
                    value={formData.doc_type || 'DWG'}
                    onChange={e => setFormData({ ...formData, doc_type: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none cursor-pointer"
                  >
                    <option value="DWG">DWG - نقشه مهندسی (Drawing)</option>
                    <option value="DSH">DSH - دیتاشیت تجهیزات (Data Sheet)</option>
                    <option value="CAL">CAL - کتابچه محاسبات (Calculation Note)</option>
                    <option value="C&E">C&E - ماتریس علت و معلول (Cause & Effect)</option>
                    <option value="SCH">SCH - شماتیک و وایرینگ (Schematic / Wiring)</option>
                    <option value="PHI">PHI - فلسفه طراحی (Design Philosophy)</option>
                    <option value="PROC">PROC - روش اجرایی و آزمون (Procedure)</option>
                    <option value="MANUAL">MANUAL - راهنمای بهره‌برداری (Manual)</option>
                  </select>
                </div>

                {/* Current Revision */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === 'fa' ? 'رویژن جاری' : 'Current Revision'}
                  </label>
                  <input
                    type="text"
                    value={formData.current_revision || 'Rev 0'}
                    onChange={e => setFormData({ ...formData, current_revision: e.target.value })}
                    placeholder="Rev 0 یا Rev A"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === 'fa' ? 'وضعیت مدرک' : 'Status'}
                  </label>
                  <select
                    value={formData.current_status || 'IFR'}
                    onChange={e => setFormData({ ...formData, current_status: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none cursor-pointer"
                  >
                    <option value="IFR">IFR - جهت بررسی (Issued For Review)</option>
                    <option value="IFA">IFA - جهت تایید و تصویب (Issued For Approval)</option>
                    <option value="IFC">IFC - جهت ساخت و اجرا (Issued For Construction)</option>
                    <option value="AFC">AFC - تایید شده برای ساخت (Approved For Construction)</option>
                    <option value="AS_BUILT">AS BUILT - نقشه چون‌ساخت</option>
                    <option value="APPROVED">APPROVED - تایید نهایی</option>
                  </select>
                </div>

                {/* Weight Factor */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === 'fa' ? 'وزن در کل مهندسی (%)' : 'Weight Factor (%)'}
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.1"
                    max="100"
                    value={formData.weight_factor ?? 5}
                    onChange={e => setFormData({ ...formData, weight_factor: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  />
                </div>

                {/* Progress */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === 'fa' ? 'پیشرفت فیزیکی مدرک (%)' : 'Physical Progress (%)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.progress ?? 0}
                    onChange={e => setFormData({ ...formData, progress: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  />
                </div>

                {/* Planned Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === 'fa' ? 'تاریخ برنامه‌ای صدور' : 'Planned Date'}
                  </label>
                  <input
                    type="text"
                    value={formData.planned_date || ''}
                    onChange={e => setFormData({ ...formData, planned_date: e.target.value })}
                    placeholder="۱۴۰۳/۰۵/۱۵"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  />
                </div>

                {/* Actual Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === 'fa' ? 'تاریخ واقعی صدور' : 'Actual Date'}
                  </label>
                  <input
                    type="text"
                    value={formData.actual_date || ''}
                    onChange={e => setFormData({ ...formData, actual_date: e.target.value })}
                    placeholder="۱۴۰۳/۰۵/۱۰"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  />
                </div>

                {/* Equipment Tags */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === 'fa' ? 'تگ تجهیزات مرتبط (جدا شده با کاما)' : 'Linked Equipment Tags (comma separated)'}
                  </label>
                  <input
                    type="text"
                    value={formTagInput}
                    onChange={e => setFormTagInput(e.target.value)}
                    placeholder="e.g. 10-FD-101, 10-GD-202, IPT-CP-01"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  />
                </div>

                {/* Remarks */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === 'fa' ? 'توضیحات و یادداشت‌ها' : 'Remarks'}
                  </label>
                  <textarea
                    rows={2}
                    value={formData.remarks || ''}
                    onChange={e => setFormData({ ...formData, remarks: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  />
                </div>

                {/* Enterprise WBS Code */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === 'fa' ? 'کد ساختار شکست کار (WBS Code)' : 'WBS Code'}
                  </label>
                  <input
                    type="text"
                    value={formData.wbs_code || ''}
                    onChange={e => setFormData({ ...formData, wbs_code: e.target.value })}
                    placeholder="1.2.4.1"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  />
                </div>

                {/* Planned Man-Hours */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === 'fa' ? 'نفر-ساعت برآوردی مصوب (ساعت)' : 'Planned Man-Hours'}
                  </label>
                  <input
                    type="number"
                    value={formData.man_hours_plan || ''}
                    onChange={e => setFormData({ ...formData, man_hours_plan: Number(e.target.value) || 0 })}
                    placeholder="45"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  />
                </div>

                {/* CBS Value */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === 'fa' ? 'ارزش ریالی در ساختار هزینه CBS (ریال)' : 'CBS Value (IRR)'}
                  </label>
                  <input
                    type="number"
                    value={formData.cbs_value || ''}
                    onChange={e => setFormData({ ...formData, cbs_value: Number(e.target.value) || 0 })}
                    placeholder="180000000"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  />
                </div>

                {/* Hold Status & Reason */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === 'fa' ? 'وضعیت تعلیق مدرک (Hold)' : 'Hold Status'}
                  </label>
                  <div className="flex items-center gap-3 pt-1">
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={Boolean(formData.is_hold)}
                        onChange={e => setFormData({ ...formData, is_hold: e.target.checked })}
                        className="rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                      />
                      <span className="font-bold text-rose-700">مدرک در وضعیت تعلیق (Hold) قرار گیرد</span>
                    </label>
                  </div>
                </div>

                {formData.is_hold && (
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-rose-700 mb-1">
                      {lang === 'fa' ? 'علت تعلیق (Hold Reason) *' : 'Hold Reason *'}
                    </label>
                    <input
                      type="text"
                      value={formData.hold_reason || ''}
                      onChange={e => setFormData({ ...formData, hold_reason: e.target.value })}
                      placeholder="توضیح علت تعلیق یا نقص مدارک بالادستی..."
                      className="w-full px-3 py-2 text-xs rounded-xl border border-rose-300 bg-rose-50/30 text-rose-900 font-medium focus:ring-2 focus:ring-rose-500/20 outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  {lang === 'fa' ? 'انصراف' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={savingDoc}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {savingDoc 
                    ? (lang === 'fa' ? 'در حال ذخیره...' : 'Saving...')
                    : (lang === 'fa' ? 'ذخیره مدرک در MDR' : 'Save Document')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Document Revisions Lifecycle & History */}
      {revisionDoc && (
        <RevisionsModal
          document={revisionDoc}
          onClose={() => setRevisionDoc(null)}
          onRefresh={onRefresh}
          lang={lang}
        />
      )}

      {/* Modal: AI Inspection & Standards Review */}
      {aiReviewDoc && (
        <AIReviewModal
          document={aiReviewDoc}
          isOpen={Boolean(aiReviewDoc)}
          onClose={() => setAiReviewDoc(null)}
          lang={lang}
        />
      )}
    </div>
  );
};

/**
 * RevisionsModal Component:
 * Shows history of revisions for a document and allows issuing a new revision.
 */
interface RevisionsModalProps {
  document: EDMSDocument;
  onClose: () => void;
  onRefresh: () => void;
  lang: 'fa' | 'en';
}

const RevisionsModal: React.FC<RevisionsModalProps> = ({
  document,
  onClose,
  onRefresh,
  lang
}) => {
  const [revisions, setRevisions] = useState<EDMSRevision[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddRevForm, setShowAddRevForm] = useState(false);

  // New Revision Form State
  const [newRev, setNewRev] = useState({
    revision: 'Rev 1',
    issue_purpose: 'IFA' as const,
    issue_date: '۱۴۰۳/۰۵/۲۰',
    transmittal_number: '',
    review_code: 'Pending' as EDMSReviewCode,
    reviewed_by: 'دستگاه نظارت',
    revision_notes: 'اعمال کامنت‌های کارفرما مطابق برگه CRS'
  });
  const [submittingRev, setSubmittingRev] = useState(false);

  const fetchRevisions = async () => {
    setLoading(true);
    try {
      const res = await authenticatedFetch(`/api/edms/documents/${document.id}/revisions`);
      if (res.ok) {
        const data = await res.json();
        setRevisions(data);
      }
    } catch (e) {
      console.error('Fetch Revisions Error:', e);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchRevisions();
  }, [document.id]);

  const handleCreateRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingRev(true);
    try {
      const res = await authenticatedFetch(`/api/edms/documents/${document.id}/revisions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRev)
      });
      if (!res.ok) throw new Error('خطا در ثبت رویژن');

      setShowAddRevForm(false);
      fetchRevisions();
      onRefresh();
    } catch (e: any) {
      alert(e.message || 'خطا در ثبت رویژن');
    } finally {
      setSubmittingRev(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div 
        className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        dir={lang === 'fa' ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold">
                {lang === 'fa' ? 'تاریخچه چرخه حیات و بازنگری‌ها (Revisions Lifecycle)' : 'Document Revisions Lifecycle'}
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                {document.doc_number} - {document.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Action to toggle new rev form */}
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-700">
              {lang === 'fa' ? 'فهرست نسخه‌های صادر شده' : 'Issued Revisions List'}
            </h4>
            <button
              onClick={() => setShowAddRevForm(!showAddRevForm)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{showAddRevForm ? (lang === 'fa' ? 'بستن فرم صدور' : 'Close Form') : (lang === 'fa' ? 'صدور نسخه جدید (Issue Revision)' : 'Issue Revision')}</span>
            </button>
          </div>

          {/* New Rev Form */}
          {showAddRevForm && (
            <form onSubmit={handleCreateRevision} className="p-4 rounded-xl bg-blue-50/50 border border-blue-100 space-y-3">
              <h5 className="text-xs font-extrabold text-blue-900">
                {lang === 'fa' ? 'ثبت و صدور رویژن جدید مدرک' : 'Issue New Revision'}
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">شماره رویژن *</label>
                  <input
                    type="text"
                    required
                    value={newRev.revision}
                    onChange={e => setNewRev({ ...newRev, revision: e.target.value })}
                    placeholder="Rev 1 یا Rev B"
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-mono outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">دلیل صدور (Purpose) *</label>
                  <select
                    value={newRev.issue_purpose}
                    onChange={e => setNewRev({ ...newRev, issue_purpose: e.target.value as any })}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white outline-none cursor-pointer"
                  >
                    <option value="IFR">IFR (جهت بررسی)</option>
                    <option value="IFA">IFA (جهت تایید نهایی)</option>
                    <option value="IFC">IFC (جهت ساخت)</option>
                    <option value="AFC">AFC (تایید شده برای ساخت)</option>
                    <option value="AS_BUILT">AS BUILT (چون ساخت)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">تاریخ صدور</label>
                  <input
                    type="text"
                    value={newRev.issue_date}
                    onChange={e => setNewRev({ ...newRev, issue_date: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-mono outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">شماره ترانزمیتال</label>
                  <input
                    type="text"
                    value={newRev.transmittal_number}
                    onChange={e => setNewRev({ ...newRev, transmittal_number: e.target.value })}
                    placeholder="TR-IPT-FG-2026-002"
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-mono outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">کد تاییدیه نظارت</label>
                  <select
                    value={newRev.review_code}
                    onChange={e => setNewRev({ ...newRev, review_code: e.target.value as any })}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white outline-none cursor-pointer"
                  >
                    <option value="Pending">Pending (در حال بررسی)</option>
                    <option value="Code 1">Code 1 (Approved)</option>
                    <option value="Code 2">Code 2 (Approved with Comments)</option>
                    <option value="Code 3">Code 3 (Revise & Resubmit)</option>
                    <option value="Code 4">Code 4 (For Info)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">بررسی‌کننده</label>
                  <input
                    type="text"
                    value={newRev.reviewed_by}
                    onChange={e => setNewRev({ ...newRev, reviewed_by: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white outline-none"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">شرح تغییرات این نسخه</label>
                  <input
                    type="text"
                    value={newRev.revision_notes}
                    onChange={e => setNewRev({ ...newRev, revision_notes: e.target.value })}
                    placeholder="شرح اصلاحات و اصلاح نقشه"
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="submit"
                  disabled={submittingRev}
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  {submittingRev ? 'در حال ثبت...' : 'ثبت رسمی نسخه'}
                </button>
              </div>
            </form>
          )}

          {/* Revisions Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-right text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <th className="py-2.5 px-3 text-center w-16">رویژن</th>
                  <th className="py-2.5 px-3 text-center w-24">هدف صدور</th>
                  <th className="py-2.5 px-3 text-center w-28">تاریخ صدور</th>
                  <th className="py-2.5 px-3 w-40">شماره ترانزمیتال</th>
                  <th className="py-2.5 px-3 text-center w-36">کد تاییدیه نظارت</th>
                  <th className="py-2.5 px-3">توضیحات و اصلاحات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {revisions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      هنوز هیچ سابقه رویژنی ثبت نشده است.
                    </td>
                  </tr>
                ) : (
                  revisions.map((rev) => (
                    <tr key={rev.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-blue-700">
                        {rev.revision}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold text-[11px]">
                          {rev.issue_purpose}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-slate-600 text-[11px]">
                        {rev.issue_date}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-700 text-[11px] direction-ltr text-left">
                        {rev.transmittal_number || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          rev.review_code === 'Code 1' 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : rev.review_code === 'Code 2' 
                            ? 'bg-amber-100 text-amber-800'
                            : rev.review_code === 'Code 3' 
                            ? 'bg-rose-100 text-rose-800' 
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {rev.review_code || 'Pending'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                        {rev.revision_notes || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-bold hover:bg-slate-900 transition-colors cursor-pointer"
          >
            {lang === 'fa' ? 'بستن' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
