import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  Plus, 
  CheckCircle2, 
  Clock, 
  FileSpreadsheet, 
  TrendingUp, 
  Download, 
  RefreshCw,
  X,
  CreditCard,
  Building,
  Calendar
} from 'lucide-react';
import { EDMSBillingCertificate, EDMSDocument, User } from '../../types';
import { authenticatedFetch } from '../../utils/api';

interface CBSBillingManagerProps {
  documents: EDMSDocument[];
  currentUser: User;
  lang: 'fa' | 'en';
}

const STATUS_MAP: Record<string, { fa: string; en: string; badge: string }> = {
  draft: { fa: 'پیش‌نویس صورت‌وضعیت', en: 'Draft', badge: 'bg-slate-100 text-slate-800' },
  submitted: { fa: 'ارسال به کارفرما / نظارت', en: 'Submitted', badge: 'bg-blue-100 text-blue-800' },
  certified: { fa: 'تایید و قطعی شده (Certified)', en: 'Certified', badge: 'bg-amber-100 text-amber-800' },
  paid: { fa: 'وصول و پرداخت شده (Paid)', en: 'Paid', badge: 'bg-emerald-100 text-emerald-800' }
};

export const CBSBillingManager: React.FC<CBSBillingManagerProps> = ({
  documents,
  currentUser,
  lang
}) => {
  const [billings, setBillings] = useState<EDMSBillingCertificate[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [certNo, setCertNo] = useState('IPC-IPT-SP14-04');
  const [period, setPeriod] = useState('مرداد ۱۴۰۵');
  const [prevProgress, setPrevProgress] = useState<number>(74.5);
  const [currProgress, setCurrProgress] = useState<number>(78.0);
  const [contractValue, setContractValue] = useState<number>(3600000000);
  const [status, setStatus] = useState<'draft' | 'submitted' | 'certified' | 'paid'>('submitted');
  const [submitting, setSubmitting] = useState(false);

  const fetchBillings = async () => {
    setLoading(true);
    try {
      const res = await authenticatedFetch('/api/edms/billings');
      if (res.ok) {
        const json = await res.json();
        setBillings(json);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBillings();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const periodProg = Math.max(0, currProgress - prevProgress);
    const certifiedAmt = Math.round((periodProg / 100) * contractValue);

    setSubmitting(true);
    try {
      const res = await authenticatedFetch('/api/edms/billings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          certificate_no: certNo.trim(),
          period: period.trim(),
          project_code: 'PRJ-SP14-FG',
          total_mdr_weight: 100,
          previous_progress: Number(prevProgress),
          current_progress: Number(currProgress),
          period_progress: Number(periodProg.toFixed(1)),
          total_contract_value: Number(contractValue),
          certified_amount: Number(certifiedAmt),
          status
        })
      });

      if (res.ok) {
        setModalOpen(false);
        fetchBillings();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: number, newStatus: 'draft' | 'submitted' | 'certified' | 'paid') => {
    try {
      const res = await authenticatedFetch(`/api/edms/billings/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        fetchBillings();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const totalCertifiedAmount = billings.reduce((acc, b) => acc + (b.certified_amount || 0), 0);
  const totalPaidAmount = billings.filter(b => b.status === 'paid').reduce((acc, b) => acc + (b.certified_amount || 0), 0);

  return (
    <div className="space-y-6" dir={lang === 'fa' ? 'rtl' : 'ltr'}>
      {/* Top Banner & Actions */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black text-slate-900">
              {lang === 'fa' ? 'ساختار شکست هزینه و صورت‌وضعیت مهندسی (CBS & Billing)' : 'CBS & Billing'}
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200/60 font-mono">
              Interim Payment Certificates (IPC)
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            ارتباط مستقیم وزن فاکتور اسناد مهندسی (MDR Weight Factor) با مبالغ صورت‌وضعیت‌های کارکرد دوره‌ای پیمانکار
          </p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>صدور صورت‌وضعیت دوره جدید (IPC)</span>
          </button>

          <button
            onClick={fetchBillings}
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
          <span className="text-xs font-bold text-slate-500">مجموع مبالغ تایید شده (Certified)</span>
          <div className="mt-2 text-2xl font-black text-slate-900">
            {(totalCertifiedAmount / 1000000).toLocaleString('fa-IR')} <span className="text-xs font-bold text-slate-500">میلیون ریال</span>
          </div>
          <div className="mt-1 text-[11px] text-blue-600 font-semibold">
            معادل ۷۴.۵٪ از ارزش کل قرارداد مهندسی
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold text-slate-500">مجموع مبالغ وصول‌شده (Paid)</span>
          <div className="mt-2 text-2xl font-black text-emerald-600">
            {(totalPaidAmount / 1000000).toLocaleString('fa-IR')} <span className="text-xs font-bold text-slate-500">میلیون ریال</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            وصول موفق در دوره‌های گذشته
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold text-slate-500">ارزش کل قرارداد بسته مهندسی F&G</span>
          <div className="mt-2 text-2xl font-black text-slate-900">
            ۳,۶۰۰ <span className="text-xs font-bold text-slate-500">میلیون ریال</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            پروژه پالایشگاهی فاز ۱۴ پارس جنوبی
          </div>
        </div>
      </div>

      {/* Billing Certificates Cards */}
      <div className="space-y-3">
        {billings.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-3xl border border-slate-200 text-slate-400 text-xs">
            صورت‌وضعیتی ثبت نشده است.
          </div>
        ) : (
          billings.map(cert => {
            const statusInfo = STATUS_MAP[cert.status] || { fa: cert.status, en: cert.status, badge: 'bg-slate-100' };

            return (
              <div 
                key={cert.id}
                className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-black text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200/60">
                      {cert.certificate_no}
                    </span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono">
                      دوره: {cert.period}
                    </span>
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${statusInfo.badge}`}>
                      {statusInfo.fa}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-[10px] text-slate-400 block">پیشرفت قبلی:</span>
                      <strong className="text-slate-700 font-mono">{cert.previous_progress}%</strong>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-[10px] text-slate-400 block">پیشرفت تجمعی:</span>
                      <strong className="text-blue-700 font-mono">{cert.current_progress}%</strong>
                    </div>

                    <div className="p-2 rounded-xl bg-blue-50/60 border border-blue-100">
                      <span className="text-[10px] text-blue-700 block font-bold">پیشرفت این دوره:</span>
                      <strong className="text-blue-800 font-mono font-black">{cert.period_progress}%</strong>
                    </div>

                    <div className="p-2 rounded-xl bg-emerald-50/60 border border-emerald-100">
                      <span className="text-[10px] text-emerald-700 block font-bold">مبلغ دوره:</span>
                      <strong className="text-emerald-800 font-mono font-black">
                        {(cert.certified_amount / 1000000).toLocaleString('fa-IR')} م ریال
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-end md:self-center">
                  {cert.status === 'submitted' && (
                    <button
                      onClick={() => handleUpdateStatus(cert.id, 'certified')}
                      className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-2xs cursor-pointer"
                    >
                      تایید کارفرما (Certified)
                    </button>
                  )}
                  {cert.status === 'certified' && (
                    <button
                      onClick={() => handleUpdateStatus(cert.id, 'paid')}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs cursor-pointer flex items-center gap-1"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>ثبت وصول وجه (Paid)</span>
                    </button>
                  )}
                  {cert.status === 'paid' && (
                    <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                      <CheckCircle2 className="w-4 h-4" />
                      تسویه و وصول شده
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Add Billing */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-blue-600" />
                صدور صورت‌وضعیت جدید مهندسی (IPC)
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">شماره صورت‌وضعیت:</label>
                  <input
                    type="text"
                    value={certNo}
                    onChange={e => setCertNo(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">دوره کارکرد:</label>
                  <input
                    type="text"
                    value={period}
                    onChange={e => setPeriod(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">پیشرفت تجمعی قبلی (%):</label>
                  <input
                    type="number"
                    step={0.1}
                    value={prevProgress}
                    onChange={e => setPrevProgress(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">پیشرفت تجمعی جدید (%):</label>
                  <input
                    type="number"
                    step={0.1}
                    value={currProgress}
                    onChange={e => setCurrProgress(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">مبلغ کل قرارداد پکیج مهندسی (ریال):</label>
                <input
                  type="number"
                  step={10000000}
                  value={contractValue}
                  onChange={e => setContractValue(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs"
                  required
                />
              </div>

              <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl space-y-1 text-[11px] text-blue-900">
                <div className="flex justify-between">
                  <span>پیشرفت ناخالص این دوره:</span>
                  <strong>{Math.max(0, currProgress - prevProgress).toFixed(1)}%</strong>
                </div>
                <div className="flex justify-between">
                  <span>مبلغ برآوردی صورت‌وضعیت این دوره:</span>
                  <strong>
                    {(Math.round((Math.max(0, currProgress - prevProgress) / 100) * contractValue) / 1000000).toLocaleString('fa-IR')} میلیون ریال
                  </strong>
                </div>
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
                  {submitting ? 'در حال صدور...' : 'ثبت صورت‌وضعیت'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
