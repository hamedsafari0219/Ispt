import React from 'react';
import { 
  FileText, 
  Send, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  TrendingUp, 
  Layers, 
  CheckCheck,
  AlertCircle,
  BarChart3
} from 'lucide-react';
import { EDMSStats, EDMSDocument } from '../../types';

interface EDMSDashboardProps {
  stats: EDMSStats | null;
  documents: EDMSDocument[];
  onSelectTab: (tab: 'mdr' | 'transmittals' | 'crs' | 'circulation' | 'scurve') => void;
  lang: 'fa' | 'en';
}

export const EDMSDashboard: React.FC<EDMSDashboardProps> = ({
  stats,
  documents,
  onSelectTab,
  lang
}) => {
  const overallProgress = stats?.overallProgress ?? 0;

  // Calculate discipline progress
  const disciplineStats = React.useMemo(() => {
    const map: Record<string, { total: number; weightedProgress: number; totalWeight: number }> = {};
    documents.forEach(doc => {
      const disc = doc.discipline || 'General';
      if (!map[disc]) {
        map[disc] = { total: 0, weightedProgress: 0, totalWeight: 0 };
      }
      map[disc].total += 1;
      const weight = doc.weight_factor || 1;
      map[disc].totalWeight += weight;
      map[disc].weightedProgress += weight * ((doc.progress || 0) / 100);
    });

    return Object.entries(map).map(([name, data]) => ({
      name,
      count: data.total,
      progress: data.totalWeight > 0 ? Math.round((data.weightedProgress / data.totalWeight) * 100) : 0
    })).sort((a, b) => b.count - a.count);
  }, [documents]);

  return (
    <div className="space-y-6" dir={lang === 'fa' ? 'rtl' : 'ltr'}>
      {/* Top Hero KPI Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Documents in MDR */}
        <div 
          onClick={() => onSelectTab('mdr')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {lang === 'fa' ? 'کل مدارک مهندسی (MDR)' : 'Total Documents'}
            </span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{stats?.totalDocuments ?? 0}</span>
            <span className="text-xs text-slate-500 font-medium">{lang === 'fa' ? 'مدرک ثبت‌شده' : 'items'}</span>
          </div>
          <div className="mt-2 text-xs text-blue-600 font-semibold flex items-center gap-1">
            <span>{lang === 'fa' ? 'مشاهده ماتریس اسناد (MDR)' : 'View MDR'}</span>
            <span>&larr;</span>
          </div>
        </div>

        {/* Weighted Physical Progress */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {lang === 'fa' ? 'پیشرفت فیزیکی مهندسی (وزنی)' : 'Weighted Progress'}
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-600">{overallProgress}%</span>
            <span className="text-xs text-slate-500 font-medium">{lang === 'fa' ? 'مجموع پیشرفت وزنی' : 'overall'}</span>
          </div>
          {/* Progress bar */}
          <div className="mt-3 w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
            <div 
              className="bg-emerald-500 h-full rounded-full transition-all duration-700 ease-out"
              style={{ width: `${Math.min(100, Math.max(0, overallProgress))}%` }}
            />
          </div>
        </div>

        {/* Transmittals */}
        <div 
          onClick={() => onSelectTab('transmittals')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {lang === 'fa' ? 'ترانزمیتال‌های ارسالی/دریافتی' : 'Transmittals'}
            </span>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Send className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{stats?.totalTransmittals ?? 0}</span>
            <span className="text-xs text-slate-500 font-medium">{lang === 'fa' ? 'برگه رسمی' : 'records'}</span>
          </div>
          <div className="mt-2 text-xs text-indigo-600 font-semibold flex items-center gap-1">
            <span>{lang === 'fa' ? 'مدیریت و ارسال ترانزمیتال' : 'Manage Transmittals'}</span>
            <span>&larr;</span>
          </div>
        </div>

        {/* CRS Pending Comments */}
        <div 
          onClick={() => onSelectTab('crs')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {lang === 'fa' ? 'کامنت‌های در انتظار پاسخ (CRS)' : 'Pending Comments'}
            </span>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform ${
              (stats?.pendingCommentsCount ?? 0) > 0 ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-400'
            }`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-3xl font-black ${
              (stats?.pendingCommentsCount ?? 0) > 0 ? 'text-amber-600' : 'text-slate-900'
            }`}>
              {stats?.pendingCommentsCount ?? 0}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              {lang === 'fa' ? `از مجموع ${stats?.totalComments ?? 0} کامنت` : `of ${stats?.totalComments ?? 0} total`}
            </span>
          </div>
          <div className="mt-2 text-xs text-amber-600 font-semibold flex items-center gap-1">
            <span>{lang === 'fa' ? 'مشاهده برگه نظرات (CRS)' : 'View CRS'}</span>
            <span>&larr;</span>
          </div>
        </div>
      </div>

      {/* Review Code Status & Disciplines Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Client Review Codes Status */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs lg:col-span-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <CheckCheck className="w-4 h-4 text-blue-600" />
                <span>{lang === 'fa' ? 'وضعیت کدهای تاییدیه نظارت' : 'Review Codes'}</span>
              </h3>
              <span className="text-[11px] text-slate-400 font-mono">Status Codes</span>
            </div>

            <div className="space-y-3">
              {/* Code 1 */}
              <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500 text-white font-black text-xs flex items-center justify-center shrink-0">
                    1
                  </div>
                  <div>
                    <span className="text-xs font-bold text-emerald-950 block">Code 1 (Approved)</span>
                    <span className="text-[11px] text-emerald-700">{lang === 'fa' ? 'تایید کامل بدون کامنت' : 'Approved as submitted'}</span>
                  </div>
                </div>
                <span className="text-base font-black text-emerald-700">
                  {stats?.reviewCodeCounts?.['Code 1'] ?? 0}
                </span>
              </div>

              {/* Code 2 */}
              <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-amber-500 text-white font-black text-xs flex items-center justify-center shrink-0">
                    2
                  </div>
                  <div>
                    <span className="text-xs font-bold text-amber-950 block">Code 2 (Approved w/ Comments)</span>
                    <span className="text-[11px] text-amber-700">{lang === 'fa' ? 'تایید مشروط به اعمال کامنت‌ها' : 'Approved with comments'}</span>
                  </div>
                </div>
                <span className="text-base font-black text-amber-700">
                  {stats?.reviewCodeCounts?.['Code 2'] ?? 0}
                </span>
              </div>

              {/* Code 3 */}
              <div className="p-3 rounded-xl bg-rose-50/60 border border-rose-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-rose-500 text-white font-black text-xs flex items-center justify-center shrink-0">
                    3
                  </div>
                  <div>
                    <span className="text-xs font-bold text-rose-950 block">Code 3 (Revise & Resubmit)</span>
                    <span className="text-[11px] text-rose-700">{lang === 'fa' ? 'رد شده - اصلاح و ارسال مجدد' : 'Revise and resubmit'}</span>
                  </div>
                </div>
                <span className="text-base font-black text-rose-700">
                  {stats?.reviewCodeCounts?.['Code 3'] ?? 0}
                </span>
              </div>

              {/* Pending */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-slate-400 text-white font-black text-xs flex items-center justify-center shrink-0">
                    P
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Pending Review</span>
                    <span className="text-[11px] text-slate-500">{lang === 'fa' ? 'در انتظار بررسی دستگاه نظارت' : 'Under Client Review'}</span>
                  </div>
                </div>
                <span className="text-base font-black text-slate-700">
                  {stats?.reviewCodeCounts?.['Pending'] ?? 0}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
            <span>{lang === 'fa' ? 'تطبیق بر اساس استاندارد نفت و گاز ایران (IPS)' : 'Compliant with IPS standard'}</span>
            <span className="font-mono text-blue-600 font-bold">IPS-E-PR-440</span>
          </div>
        </div>

        {/* Engineering Disciplines Progress */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              <span>{lang === 'fa' ? 'تفکیک دیسیپلین‌های مهندسی و پیشرفت' : 'Disciplines & Progress Breakdown'}</span>
            </h3>
            <span className="text-xs text-slate-500 font-medium">
              {disciplineStats.length} {lang === 'fa' ? 'دیسیپلین فعال' : 'Disciplines'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {disciplineStats.map(disc => (
              <div 
                key={disc.name}
                className="p-3.5 rounded-xl border border-slate-150 hover:border-slate-300 bg-slate-50/50 hover:bg-white transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    {disc.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-500 bg-slate-200/80 px-2 py-0.5 rounded-md font-mono font-medium">
                      {disc.count} {lang === 'fa' ? 'مدرک' : 'docs'}
                    </span>
                    <span className="text-xs font-black text-blue-700 font-mono">
                      {disc.progress}%
                    </span>
                  </div>
                </div>
                <div className="w-full bg-slate-200/70 rounded-full h-2 overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500 ease-out"
                    style={{ 
                      width: `${disc.progress}%`,
                      backgroundColor: disc.progress >= 90 ? '#10b981' : disc.progress >= 60 ? '#0284c7' : '#f59e0b'
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Quick Help Callout */}
          <div className="mt-5 p-4 rounded-xl bg-gradient-to-r from-blue-50/70 to-indigo-50/70 border border-blue-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-extrabold text-blue-950">
                  {lang === 'fa' ? 'مدیریت استاندارد مدارک پروژه (DCC)' : 'Standard Project DCC Management'}
                </h4>
                <p className="text-[11px] text-blue-800 mt-0.5">
                  {lang === 'fa' 
                    ? 'امکان صدور مستقیم فرم ترانزمیتال رسمی با سربرگ شرکتی، ارسال خودکار ایمیل به کارفرما، و پیگیری کامنت‌ها (CRS).'
                    : 'Issue official transmittals with letterhead, email to clients, and resolve review comments.'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => onSelectTab('circulation')}
                className="px-3.5 py-1.5 bg-white hover:bg-slate-50 text-blue-700 border border-blue-200 text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-2xs"
              >
                {lang === 'fa' ? 'کارتابل و ارجاعات' : 'Cartable'}
              </button>
              <button
                onClick={() => onSelectTab('mdr')}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-xs"
              >
                {lang === 'fa' ? 'ورود به جدول MDR' : 'Open MDR'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
