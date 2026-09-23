import React, { useState } from 'react';
import { 
  MessageSquare, 
  Plus, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  FileSpreadsheet, 
  Edit3, 
  Trash2, 
  X, 
  Check, 
  SendHorizontal,
  ChevronDown
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { EDMSComment, EDMSDocument, User } from '../../types';
import { authenticatedFetch } from '../../utils/api';

interface CRSManagerProps {
  comments: EDMSComment[];
  documents: EDMSDocument[];
  currentUser: User;
  onRefresh: () => void;
  lang: 'fa' | 'en';
}

export const CRSManager: React.FC<CRSManagerProps> = ({
  comments,
  documents,
  currentUser,
  onRefresh,
  lang
}) => {
  const [search, setSearch] = useState('');
  const [docFilter, setDocFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [replyModalComment, setReplyModalComment] = useState<EDMSComment | null>(null);

  // Form State for New Comment
  const [newCommentForm, setNewCommentForm] = useState<{
    doc_id: number;
    doc_number: string;
    revision: string;
    transmittal_number: string;
    item_no: number;
    page_or_sheet: string;
    client_comment: string;
    contractor_response: string;
    status: 'open' | 'resolved' | 'pending';
    resolution_code: 'Code 1' | 'Code 2' | 'Code 3';
    commented_by: string;
  }>({
    doc_id: documents[0]?.id || 0,
    doc_number: documents[0]?.doc_number || '',
    revision: documents[0]?.current_revision || 'Rev 0',
    transmittal_number: '',
    item_no: 1,
    page_or_sheet: 'صفحه ۳، بند ۴.۲',
    client_comment: '',
    contractor_response: '',
    status: 'open',
    resolution_code: 'Code 2',
    commented_by: 'دستگاه نظارت مهندسی کارفرما'
  });
  const [savingComment, setSavingComment] = useState(false);

  // Form State for Reply
  const [replyText, setReplyText] = useState('');
  const [replyStatus, setReplyStatus] = useState<'open' | 'resolved' | 'pending'>('resolved');
  const [replyResolutionCode, setReplyResolutionCode] = useState<'Code 1' | 'Code 2' | 'Code 3'>('Code 1');
  const [savingReply, setSavingReply] = useState(false);

  // Filtered comments
  const filteredComments = React.useMemo(() => {
    return comments.filter(c => {
      const matchSearch = 
        !search ||
        c.doc_number.toLowerCase().includes(search.toLowerCase()) ||
        c.client_comment.toLowerCase().includes(search.toLowerCase()) ||
        c.contractor_response.toLowerCase().includes(search.toLowerCase()) ||
        c.page_or_sheet.toLowerCase().includes(search.toLowerCase());

      const matchDoc = docFilter === 'all' || String(c.doc_id) === docFilter;
      const matchStatus = statusFilter === 'all' || c.status === statusFilter;

      return matchSearch && matchDoc && matchStatus;
    });
  }, [comments, search, docFilter, statusFilter]);

  // Export to Excel
  const handleExportExcel = () => {
    const data = filteredComments.map((c, idx) => ({
      'ردیف': idx + 1,
      'شماره آیتم': c.item_no,
      'شماره مدرک': c.doc_number,
      'رویژن': c.revision,
      'صفحه / شیت / بخش': c.page_or_sheet,
      'متن کامنت کارفرما': c.client_comment,
      'پاسخ پیمانکار (DCC/مهندسی)': c.contractor_response,
      'وضعیت پاسخ': c.status === 'resolved' ? 'پاسخ داده شد' : 'در انتظار پاسخ',
      'کد رزولوشن': c.resolution_code || 'Pending',
      'کامنت‌گذار': c.commented_by || '',
      'پاسخ‌دهنده': c.responded_by || '',
      'تاریخ ایجاد': c.created_at
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'CRS');
    XLSX.writeFile(workbook, `CRS_Isatis_EDMS_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleOpenAdd = () => {
    const firstDoc = documents[0];
    setNewCommentForm({
      doc_id: firstDoc ? firstDoc.id : 0,
      doc_number: firstDoc ? firstDoc.doc_number : '',
      revision: firstDoc ? firstDoc.current_revision : 'Rev 0',
      transmittal_number: '',
      item_no: comments.length + 1,
      page_or_sheet: '',
      client_comment: '',
      contractor_response: '',
      status: 'open',
      resolution_code: 'Code 2',
      commented_by: 'دستگاه نظارت مهندسی'
    });
    setAddModalOpen(true);
  };

  const handleDocSelectChange = (docId: number) => {
    const doc = documents.find(d => d.id === docId);
    if (doc) {
      setNewCommentForm(prev => ({
        ...prev,
        doc_id: doc.id,
        doc_number: doc.doc_number,
        revision: doc.current_revision
      }));
    }
  };

  const handleSaveComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentForm.client_comment) {
      alert('متن کامنت کارفرما الزامی است.');
      return;
    }

    setSavingComment(true);
    try {
      const res = await authenticatedFetch('/api/edms/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCommentForm)
      });
      if (!res.ok) throw new Error('خطا در ثبت کامنت');

      setAddModalOpen(false);
      onRefresh();
    } catch (e: any) {
      alert(e.message || 'خطا در ثبت');
    } finally {
      setSavingComment(false);
    }
  };

  const handleOpenReply = (c: EDMSComment) => {
    setReplyModalComment(c);
    setReplyText(c.contractor_response || '');
    setReplyStatus(c.status || 'resolved');
    setReplyResolutionCode(c.resolution_code || 'Code 1');
  };

  const handleSaveReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyModalComment) return;

    setSavingReply(true);
    try {
      const res = await authenticatedFetch(`/api/edms/comments/${replyModalComment.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractor_response: replyText,
          status: replyStatus,
          resolution_code: replyResolutionCode
        })
      });
      if (!res.ok) throw new Error('خطا در ثبت پاسخ');

      setReplyModalComment(null);
      onRefresh();
    } catch (e: any) {
      alert(e.message || 'خطا در ثبت پاسخ');
    } finally {
      setSavingReply(false);
    }
  };

  const handleDeleteComment = async (id: number) => {
    if (!window.confirm('آیا از حذف این ردیف کامنت اطمینان دارید؟')) return;
    try {
      const res = await authenticatedFetch(`/api/edms/comments/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) onRefresh();
    } catch (e) {
      alert('خطا در حذف');
    }
  };

  return (
    <div className="space-y-4" dir={lang === 'fa' ? 'rtl' : 'ltr'}>
      {/* Top Filter and Actions */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={lang === 'fa' ? 'جستجو در متن کامنت، پاسخ، شماره سند...' : 'Search comment, reply, doc no...'}
            className="w-full pr-9 pl-4 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Document Filter */}
          <select
            value={docFilter}
            onChange={e => setDocFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer max-w-[200px]"
          >
            <option value="all">همه مدارک</option>
            {documents.map(d => (
              <option key={d.id} value={String(d.id)}>{d.doc_number}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
          >
            <option value="all">همه وضعیت‌ها</option>
            <option value="open">پاسخ داده نشده (Open)</option>
            <option value="resolved">پاسخ داده شده (Resolved)</option>
            <option value="pending">در حال بررسی (Pending)</option>
          </select>

          {/* Export Excel */}
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all cursor-pointer shadow-2xs"
            title="خروجی اکسل برگه CRS"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>خروجی CRS اکسل</span>
          </button>

          {/* Add Comment */}
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>ثبت نظر کارفرما (CRS)</span>
          </button>
        </div>
      </div>

      {/* CRS Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-700 font-bold">
                <th className="py-3 px-3 text-center w-12">#</th>
                <th className="py-3 px-4 w-44">شماره سند / رویژن</th>
                <th className="py-3 px-3 w-28">شیت / بند</th>
                <th className="py-3 px-4 min-w-[240px]">کامنت و نظر کارفرما / مشاور</th>
                <th className="py-3 px-4 min-w-[240px]">پاسخ پیمانکار (IPT Engineering Response)</th>
                <th className="py-3 px-3 text-center w-28">وضعیت</th>
                <th className="py-3 px-3 text-center w-24">رزولوشن</th>
                <th className="py-3 px-3 text-center w-24">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredComments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    هیچ کامنتی با شرایط مورد نظر یافت نشد.
                  </td>
                </tr>
              ) : (
                filteredComments.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-3 text-center font-mono text-slate-400 font-bold">
                      {c.item_no}
                    </td>

                    <td className="py-3 px-4 font-mono">
                      <strong className="text-blue-700 block direction-ltr text-left">
                        {c.doc_number}
                      </strong>
                      <span className="text-[11px] text-amber-700 font-bold">
                        {c.revision}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-slate-600 font-medium">
                      {c.page_or_sheet || '-'}
                    </td>

                    <td className="py-3 px-4">
                      <div className="p-2.5 rounded-xl bg-rose-50/40 border border-rose-100/80 text-rose-950 font-medium leading-relaxed">
                        {c.client_comment}
                      </div>
                      {c.commented_by && (
                        <span className="text-[10px] text-slate-400 block mt-1">
                          توسط: {c.commented_by}
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      {c.contractor_response ? (
                        <div className="p-2.5 rounded-xl bg-emerald-50/40 border border-emerald-100/80 text-emerald-950 font-medium leading-relaxed">
                          {c.contractor_response}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">
                          هنوز پاسخی ثبت نشده است.
                        </span>
                      )}
                      {c.responded_by && (
                        <span className="text-[10px] text-slate-400 block mt-1">
                          پاسخ‌دهنده: {c.responded_by}
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        c.status === 'resolved' 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : c.status === 'pending'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {c.status === 'resolved' ? 'پاسخ داده شد' : c.status === 'pending' ? 'در حال بررسی' : 'پاسخ داده نشده'}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span className="font-bold text-[11px] font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        {c.resolution_code || 'Pending'}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {(currentUser.role === 'admin' || currentUser.role === 'manager') && (
                          <button
                            onClick={() => handleOpenReply(c)}
                            className="p-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer"
                            title="پاسخ به کامنت (مدیر و ادمین)"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        )}
                        {currentUser.role === 'admin' && (
                          <button
                            onClick={() => handleDeleteComment(c.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="حذف کامنت (ادمین)"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add New Comment */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col" dir="rtl">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-400" />
                <h3 className="text-sm font-extrabold">ثبت نظر جدید در برگه کامنت‌ها (CRS)</h3>
              </div>
              <button
                onClick={() => setAddModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveComment} className="p-5 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-slate-700 font-bold mb-1">انتخاب مدرک مهندسی *</label>
                  <select
                    value={newCommentForm.doc_id}
                    onChange={e => handleDocSelectChange(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none cursor-pointer"
                  >
                    {documents.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.doc_number} - {d.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">شماره آیتم (Item No.)</label>
                  <input
                    type="number"
                    value={newCommentForm.item_no}
                    onChange={e => setNewCommentForm({ ...newCommentForm, item_no: parseInt(e.target.value, 10) || 1 })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-mono outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">صفحه / شیت / سکشن</label>
                  <input
                    type="text"
                    value={newCommentForm.page_or_sheet}
                    onChange={e => setNewCommentForm({ ...newCommentForm, page_or_sheet: e.target.value })}
                    placeholder="e.g. صفحه ۲ بند ۴"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 outline-none"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-slate-700 font-bold mb-1">متن نظر یا کامنت دستگاه نظارت / کارفرما *</label>
                  <textarea
                    rows={3}
                    required
                    value={newCommentForm.client_comment}
                    onChange={e => setNewCommentForm({ ...newCommentForm, client_comment: e.target.value })}
                    placeholder="شرح کامل ایراد، مغایرت با استاندارد یا درخواست تغییر"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-slate-700 font-bold mb-1">پاسخ اولیه پیمانکار (در صورت وجود)</label>
                  <textarea
                    rows={2}
                    value={newCommentForm.contractor_response}
                    onChange={e => setNewCommentForm({ ...newCommentForm, contractor_response: e.target.value })}
                    placeholder="پاسخ فنی و استنادات استانداردی"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={savingComment}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all disabled:opacity-50 cursor-pointer"
                >
                  {savingComment ? 'در حال ثبت...' : 'ثبت در CRS'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Reply to Comment */}
      {replyModalComment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col" dir="rtl">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="text-sm font-extrabold">
                پاسخ به کامنت شماره {replyModalComment.item_no} ({replyModalComment.doc_number})
              </h3>
              <button
                onClick={() => setReplyModalComment(null)}
                className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveReply} className="p-5 space-y-3.5 text-xs">
              <div className="p-3 rounded-xl bg-rose-50/60 border border-rose-150 text-rose-950">
                <span className="text-[10px] font-bold text-rose-700 block mb-1">کامنت دستگاه نظارت:</span>
                <p className="leading-relaxed">{replyModalComment.client_comment}</p>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">پاسخ فنی مهندسی پیمانکار (DCC Response) *</label>
                <textarea
                  rows={4}
                  required
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  placeholder="پاسخ فنی و استنادات استانداردی (NFPA/IPS) و اعلام اصلاح نقشه در رویژن جدید"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">وضعیت پیگیری</label>
                  <select
                    value={replyStatus}
                    onChange={e => setReplyStatus(e.target.value as any)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 outline-none cursor-pointer"
                  >
                    <option value="resolved">برطرف و پاسخ داده شد (Resolved)</option>
                    <option value="pending">در دست بررسی دیسیپلین (Pending)</option>
                    <option value="open">باز (Open)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">کد تایید درخواستی</label>
                  <select
                    value={replyResolutionCode}
                    onChange={e => setReplyResolutionCode(e.target.value as any)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 outline-none cursor-pointer"
                  >
                    <option value="Code 1">Code 1 (Approved)</option>
                    <option value="Code 2">Code 2 (Approved w/ Comments)</option>
                    <option value="Code 3">Code 3 (Revise & Resubmit)</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReplyModalComment(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={savingReply}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all disabled:opacity-50 cursor-pointer"
                >
                  {savingReply ? 'در حال ثبت...' : 'ثبت قطعی پاسخ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
