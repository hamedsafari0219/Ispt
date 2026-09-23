import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, 
  Plus, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  Tag, 
  FileText, 
  Building2, 
  AlertCircle,
  RefreshCw,
  X,
  Calendar,
  ExternalLink
} from 'lucide-react';
import { EDMSProcurementItem, EDMSProcurementStage, EDMSDocument, User } from '../../types';
import { authenticatedFetch } from '../../utils/api';

interface ProcurementEngineeringProps {
  documents: EDMSDocument[];
  currentUser: User;
  lang: 'fa' | 'en';
}

const STAGE_LABELS: Record<string, { fa: string; en: string; badge: string }> = {
  MTO_PREPARATION: { fa: 'تهیه برآورد متریال (MTO)', en: 'MTO Prep', badge: 'bg-slate-100 text-slate-800' },
  MR_ISSUED: { fa: 'صدور تقاضای خرید (MR)', en: 'MR Issued', badge: 'bg-blue-100 text-blue-800' },
  TBE_IN_PROGRESS: { fa: 'ارزیابی فنی پیشنهادات (TBE)', en: 'TBE in Progress', badge: 'bg-amber-100 text-amber-800' },
  TBA_APPROVED: { fa: 'تایید نهایی فنی (TBA)', en: 'TBA Approved', badge: 'bg-indigo-100 text-indigo-800' },
  PO_PLACED: { fa: 'انعقاد قرارداد / سفارش خرید (PO)', en: 'PO Placed', badge: 'bg-purple-100 text-purple-800' },
  DELIVERED: { fa: 'تحویل در سایت / انبار', en: 'Delivered', badge: 'bg-emerald-100 text-emerald-800' }
};

export const ProcurementEngineering: React.FC<ProcurementEngineeringProps> = ({
  documents,
  currentUser,
  lang
}) => {
  const [items, setItems] = useState<EDMSProcurementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('all');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [mrNumber, setMrNumber] = useState('MR-IPT-FG-2026-');
  const [mtoRef, setMtoRef] = useState('MTO-IPT-FG-');
  const [title, setTitle] = useState('');
  const [discipline, setDiscipline] = useState<'F&G' | 'Electrical' | 'Mechanical' | 'Telecom' | 'General'>('F&G');
  const [estimatedCost, setEstimatedCost] = useState<number>(1200000000);
  const [targetPoDate, setTargetPoDate] = useState('1405/07/15');
  const [stage, setStage] = useState<EDMSProcurementStage>('TBE_IN_PROGRESS');
  const [vendorsCount, setVendorsCount] = useState<number>(3);
  const [selectedVendor, setSelectedVendor] = useState('');
  const [linkedTags, setLinkedTags] = useState('');
  const [tbeStatus, setTbeStatus] = useState('Under Review');
  const [clarifications, setClarifications] = useState<number>(1);
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchProcurements = async () => {
    setLoading(true);
    try {
      const res = await authenticatedFetch('/api/edms/procurements');
      if (res.ok) {
        const json = await res.json();
        setItems(json);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProcurements();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const tags = linkedTags.split(',').map(t => t.trim()).filter(Boolean);
      const res = await authenticatedFetch('/api/edms/procurements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mr_number: mrNumber.trim(),
          mto_ref: mtoRef.trim(),
          title: title.trim(),
          discipline,
          estimated_cost: Number(estimatedCost),
          target_po_date: targetPoDate,
          stage,
          vendors_count: Number(vendorsCount),
          selected_vendor: selectedVendor.trim(),
          linked_equipment_tags: tags,
          tbe_status: tbeStatus,
          clarifications_count: Number(clarifications),
          remarks: remarks.trim()
        })
      });

      if (res.ok) {
        setModalOpen(false);
        setTitle('');
        setRemarks('');
        fetchProcurements();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdvanceStage = async (item: EDMSProcurementItem, nextStage: EDMSProcurementStage) => {
    try {
      const res = await authenticatedFetch(`/api/edms/procurements/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: nextStage })
      });
      if (res.ok) {
        fetchProcurements();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filtered = items.filter(item => {
    const matchSearch = !search ||
      item.mr_number.toLowerCase().includes(search.toLowerCase()) ||
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      (item.selected_vendor && item.selected_vendor.toLowerCase().includes(search.toLowerCase())) ||
      (item.linked_equipment_tags && item.linked_equipment_tags.some(t => t.toLowerCase().includes(search.toLowerCase())));

    const matchStage = stageFilter === 'all' || item.stage === stageFilter;
    return matchSearch && matchStage;
  });

  const totalEstimatedCost = items.reduce((acc, i) => acc + (i.estimated_cost || 0), 0);

  return (
    <div className="space-y-6" dir={lang === 'fa' ? 'rtl' : 'ltr'}>
      {/* Top Banner & Action */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black text-slate-900">
              {lang === 'fa' ? 'مهندسی خرید و تدارکات (Procurement Engineering)' : 'Procurement Engineering'}
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200/60 font-mono">
              MTO / MR / TBE / TBA
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            یکپارچه‌سازی متریال تیک‌آف (MTO)، تقاضای خرید اقلام (MR)، ارزیابی فنی پیشنهادات (TBE) و تاییدیه خرید (TBA) با تگ‌های تجهیزات F&G
          </p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>ثبت تقاضای خرید جدید (MR)</span>
          </button>

          <button
            onClick={fetchProcurements}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 cursor-pointer shadow-2xs"
            title="به‌روزرسانی"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold text-slate-500">تعداد پکیج‌های خرید (MRs)</span>
          <div className="mt-2 text-2xl font-black text-slate-900">{items.length} پکیج</div>
          <div className="mt-1 text-[11px] text-blue-600 font-semibold">پوشش کامل تگ‌های ابزار دقیق و اطفاء</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold text-slate-500">مجموع برآورد ریالی پکیج‌ها</span>
          <div className="mt-2 text-2xl font-black text-slate-900">
            {(totalEstimatedCost / 1000000).toLocaleString('fa-IR')} <span className="text-xs font-bold text-slate-500">میلیون ریال</span>
          </div>
          <div className="mt-1 text-[11px] text-emerald-600 font-semibold">تخصیص یافته در بودجه CBS پروژه</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold text-slate-500">وضعیت ارزیابی فنی (TBE/TBA)</span>
          <div className="mt-2 text-2xl font-black text-amber-600">
            {items.filter(i => i.stage === 'TBE_IN_PROGRESS').length} <span className="text-xs font-bold text-slate-500">در حال ارزیابی</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            {items.filter(i => i.stage === 'TBA_APPROVED' || i.stage === 'PO_PLACED').length} مورد تایید و سفارش‌گذاری شده
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute right-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="جستجوی شماره MR، عنوان پکیج، نام وندور یا تگ تجهیزات..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pr-10 pl-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <select
          value={stageFilter}
          onChange={e => setStageFilter(e.target.value)}
          className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium cursor-pointer w-full md:w-auto"
        >
          <option value="all">همه مراحل خرید</option>
          <option value="MTO_PREPARATION">تهیه MTO</option>
          <option value="MR_ISSUED">صدور تقاضای خرید (MR)</option>
          <option value="TBE_IN_PROGRESS">ارزیابی فنی (TBE)</option>
          <option value="TBA_APPROVED">تاییدیه فنی (TBA)</option>
          <option value="PO_PLACED">سفارش قطعی (PO)</option>
          <option value="DELIVERED">تحویل شده</option>
        </select>
      </div>

      {/* Procurement Cards */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-3xl border border-slate-200 text-slate-400 text-xs">
            هیچ پکیج خریدی یافت نشد.
          </div>
        ) : (
          filtered.map(item => {
            const stageInfo = STAGE_LABELS[item.stage] || { fa: item.stage, en: item.stage, badge: 'bg-slate-100' };

            return (
              <div 
                key={item.id}
                className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-black text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200/60">
                      {item.mr_number}
                    </span>
                    <span className="font-mono text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                      Ref: {item.mto_ref}
                    </span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700">
                      {item.discipline}
                    </span>
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${stageInfo.badge}`}>
                      {stageInfo.fa}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <span className="text-xs font-black text-slate-900">
                      {(item.estimated_cost / 1000000).toLocaleString('fa-IR')} <span className="text-[11px] font-normal text-slate-500">میلیون ریال</span>
                    </span>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>
                  {item.remarks && (
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed bg-slate-50 p-2.5 rounded-xl">
                      {item.remarks}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-[11px] text-slate-500 border-t border-slate-100">
                  <div className="flex flex-wrap items-center gap-4">
                    {item.selected_vendor && (
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-blue-600" />
                        وندور منتخب: <strong className="text-slate-800">{item.selected_vendor}</strong>
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      تعداد پیشنهادات (Bids): <strong className="text-slate-700">{item.vendors_count} شرکت</strong>
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      هدف صدور PO: <strong className="text-slate-700 font-mono">{item.target_po_date}</strong>
                    </span>
                  </div>

                  {item.linked_equipment_tags && item.linked_equipment_tags.length > 0 && (
                    <div className="flex items-center gap-1">
                      <Tag className="w-3.5 h-3.5 text-indigo-500" />
                      <span>تگ‌های مرتبط:</span>
                      <div className="flex flex-wrap gap-1">
                        {item.linked_equipment_tags.map(t => (
                          <span key={t} className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-800 font-mono text-[10px] font-bold">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Stage Progression Buttons - Manager & Admin only */}
                {(currentUser.role === 'admin' || currentUser.role === 'manager') && (
                  <div className="flex items-center justify-end gap-2 pt-2">
                    {item.stage === 'TBE_IN_PROGRESS' && (
                      <button
                        onClick={() => handleAdvanceStage(item, 'TBA_APPROVED')}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer shadow-2xs flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>تایید ارزیابی فنی (صدور TBA)</span>
                      </button>
                    )}
                    {item.stage === 'TBA_APPROVED' && (
                      <button
                        onClick={() => handleAdvanceStage(item, 'PO_PLACED')}
                        className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs cursor-pointer shadow-2xs flex items-center gap-1"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        <span>انعقاد قرارداد و سفارش (PO Placed)</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modal Add MR */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-blue-600" />
                ثبت تقاضای خرید متریال مهندسی (Material Requisition)
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">شماره تقاضای خرید (MR Number):</label>
                  <input
                    type="text"
                    value={mrNumber}
                    onChange={e => setMrNumber(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">مدرک مرجع MTO:</label>
                  <input
                    type="text"
                    value={mtoRef}
                    onChange={e => setMtoRef(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">عنوان بسته خرید / متریال:</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="مثال: خرید دتکتورهای شعله و گاز LEL ضدانفجار"
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">دیسیپلین مهندسی:</label>
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
                  <label className="block font-bold text-slate-700 mb-1">مرحله جاری:</label>
                  <select
                    value={stage}
                    onChange={e => setStage(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                  >
                    <option value="MR_ISSUED">صدور MR</option>
                    <option value="TBE_IN_PROGRESS">ارزیابی فنی (TBE)</option>
                    <option value="TBA_APPROVED">تاییدیه فنی (TBA)</option>
                    <option value="PO_PLACED">سفارش قطعی (PO)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">برآورد ریالی (ریال):</label>
                  <input
                    type="number"
                    value={estimatedCost}
                    onChange={e => setEstimatedCost(Number(e.target.value))}
                    step={10000000}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">تاریخ هدف عقد قرارداد (PO):</label>
                  <input
                    type="text"
                    value={targetPoDate}
                    onChange={e => setTargetPoDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">تگ‌های تجهیزات مرتبط (جدا شده با کاما):</label>
                <input
                  type="text"
                  value={linkedTags}
                  onChange={e => setLinkedTags(e.target.value)}
                  placeholder="FD-101, GD-102, FM-200-CYL"
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">توضیحات و الزامات بازرسی / استاندارد:</label>
                <textarea
                  rows={2}
                  value={remarks}
                  onChange={e => setRemarks(e.target.value)}
                  placeholder="نیازمند گواهینامه ATEX Zone 1 و استاندارد SIL-2 و تست FAT در کارخانه سازنده"
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
                  {submitting ? 'در حال ثبت...' : 'ثبت تقاضای خرید'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
