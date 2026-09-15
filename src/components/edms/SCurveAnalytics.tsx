import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Clock, 
  AlertTriangle, 
  Calendar, 
  DollarSign, 
  ShieldAlert, 
  CheckCircle2, 
  FileSpreadsheet, 
  ArrowUpRight, 
  ArrowDownRight,
  PieChart as PieChartIcon,
  RefreshCw,
  Users,
  Info
} from 'lucide-react';
import { authenticatedFetch } from '../../utils/api';
import { EDMSDocument } from '../../types';

interface SCurveAnalyticsProps {
  documents: EDMSDocument[];
  lang: 'fa' | 'en';
}

interface SCurvePeriod {
  name: string;
  planCutoff: string;
  planned: number;
  actual: number | null;
}

interface SCurveDataResponse {
  periods: SCurvePeriod[];
  totalPlanManHours: number;
  totalActualManHours: number;
  totalCBSValue: number;
  earnedMonetaryValue: number;
  totalHoldDocs: number;
  contractorDelayDays: number;
  clientDelayDays: number;
  varianceProgress: number;
}

export const SCurveAnalytics: React.FC<SCurveAnalyticsProps> = ({ documents, lang }) => {
  const [data, setData] = useState<SCurveDataResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);

  const fetchSCurve = async () => {
    setLoading(true);
    try {
      const res = await authenticatedFetch('/api/edms/scurve');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error('Failed to load S-Curve:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSCurve();
  }, []);

  const holdDocuments = documents.filter(d => d.is_hold);

  // SVG dimensions for S-Curve chart
  const periods = data?.periods || [
    { name: 'اردیبهشت', planCutoff: '1405/02', planned: 12, actual: 11.5 },
    { name: 'خرداد', planCutoff: '1405/03', planned: 28, actual: 26.0 },
    { name: 'تیر', planCutoff: '1405/04', planned: 48, actual: 44.5 },
    { name: 'مرداد', planCutoff: '1405/05', planned: 68, actual: 62.0 },
    { name: 'شهریور', planCutoff: '1405/06', planned: 82, actual: 74.5 },
    { name: 'مهر', planCutoff: '1405/07', planned: 92, actual: null },
    { name: 'آبان', planCutoff: '1405/08', planned: 98, actual: null },
    { name: 'آذر', planCutoff: '1405/09', planned: 100, actual: null }
  ];

  const svgWidth = 800;
  const svgHeight = 280;
  const paddingLeft = 50;
  const paddingRight = 40;
  const paddingTop = 25;
  const paddingBottom = 40;
  const chartW = svgWidth - paddingLeft - paddingRight;
  const chartH = svgHeight - paddingTop - paddingBottom;

  const getX = (idx: number) => paddingLeft + (idx / (periods.length - 1)) * chartW;
  const getY = (val: number) => paddingTop + chartH - (val / 100) * chartH;

  // Build planned polyline & area path
  const planPoints = periods.map((p, i) => `${getX(i)},${getY(p.planned)}`);
  const planPath = planPoints.join(' ');
  const planAreaPath = `${getX(0)},${getY(0)} ${planPath} ${getX(periods.length - 1)},${getY(0)}`;

  // Build actual polyline & area path (only for points with actual != null)
  const actualPeriods = periods.filter(p => p.actual !== null);
  const actualPoints = actualPeriods.map((p, i) => `${getX(i)},${getY(p.actual!)}`);
  const actualPath = actualPoints.join(' ');
  const actualAreaPath = actualPeriods.length > 0
    ? `${getX(0)},${getY(0)} ${actualPath} ${getX(actualPeriods.length - 1)},${getY(0)}`
    : '';

  return (
    <div className="space-y-6" dir={lang === 'fa' ? 'rtl' : 'ltr'}>
      {/* Top 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Planned vs Actual */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">
              {lang === 'fa' ? 'پیشرفت تجمعی (Plan vs Actual)' : 'Progress Variance'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">۷۴.۵٪</span>
            <span className="text-xs font-bold text-slate-400">واقعی</span>
            <span className="text-xs text-slate-300">/</span>
            <span className="text-sm font-bold text-slate-500">۸۲.۰٪ برنامه</span>
          </div>
          <div className="mt-2 flex items-center gap-1 text-[11px] font-bold text-rose-600">
            <ArrowDownRight className="w-3.5 h-3.5" />
            <span>انحراف از برنامه (Variance): -۷.۵٪</span>
          </div>
        </div>

        {/* Man-Hours Accounting */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">
              {lang === 'fa' ? 'کارکرد نفر-ساعت مهندسی' : 'Man-Hours Accounting'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">
              {data ? data.totalActualManHours.toLocaleString('fa-IR') : '۲,۸۴۰'}
            </span>
            <span className="text-xs font-bold text-slate-500">ساعت محقق‌شده</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 font-medium">
            برنامه مصوب: {data ? data.totalPlanManHours.toLocaleString('fa-IR') : '۳,۸۵۰'} نفر-ساعت
          </div>
        </div>

        {/* Earned Value / CBS */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">
              {lang === 'fa' ? 'ارزش وزنی احراز شده (CBS / EV)' : 'Earned Value (CBS)'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-xl font-black text-slate-900">
              {data ? (data.earnedMonetaryValue / 1000000).toLocaleString('fa-IR') : '۲,۶۸۲'}
            </span>
            <span className="text-xs font-bold text-slate-500">میلیون ریال</span>
          </div>
          <div className="mt-2 text-[11px] font-bold text-emerald-600">
            ارزش کل بسته مهندسی: ۳,۶۰۰ م ریال
          </div>
        </div>

        {/* Delay Matrix / Hold Documents */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">
              {lang === 'fa' ? 'وضعیت تاخیرات و اسناد Hold' : 'Delay Analysis & Hold'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-600">
              {data ? data.clientDelayDays.toLocaleString('fa-IR') : '۱۴'}
            </span>
            <span className="text-xs font-bold text-slate-600">روز تاخیر کارفرما (CRS)</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 font-semibold">
            <span>تاخیر پیمانکار: ۴ روز</span>
            <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-bold">
              {holdDocuments.length} مدرک معلق
            </span>
          </div>
        </div>
      </div>

      {/* Main S-Curve Chart (Custom Vector SVG) */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-slate-900">
                {lang === 'fa' ? 'منحنی پیشرفت تجمعی پروژه مهندسی (S-Curve)' : 'Project Progress S-Curve'}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200/60 font-mono">
                Plan vs Actual Cumulative
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              محاسبه ریاضی مبتنی بر ضریب وزنی مدارک مهندسی (MDR Weight Factors) و تاریخ‌های کات‌آف ماهانه
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* Chart Legend */}
            <div className="flex items-center gap-4 text-xs font-bold">
              <div className="flex items-center gap-1.5 text-slate-500">
                <span className="w-4 h-0.5 bg-slate-400 border-b-2 border-dashed border-slate-400 inline-block" />
                <span>برنامه‌ای (Plan)</span>
              </div>
              <div className="flex items-center gap-1.5 text-blue-600">
                <span className="w-4 h-1 bg-blue-600 rounded-full inline-block" />
                <span>واقعی (Actual)</span>
              </div>
            </div>

            <button
              onClick={fetchSCurve}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>به‌روزرسانی</span>
            </button>
          </div>
        </div>

        {/* SVG Container */}
        <div className="w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-auto max-h-80 select-none"
          >
            <defs>
              <linearGradient id="scurveActualGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563eb" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="scurvePlanGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#94a3b8" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid lines & Y-Axis Labels */}
            {[0, 20, 40, 60, 80, 100].map(val => {
              const y = getY(val);
              return (
                <g key={val}>
                  <line
                    x1={paddingLeft}
                    y1={y}
                    x2={svgWidth - paddingRight}
                    y2={y}
                    stroke="#f1f5f9"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={paddingLeft - 10}
                    y={y + 4}
                    textAnchor="end"
                    fontSize="11"
                    fontFamily="monospace"
                    fill="#94a3b8"
                  >
                    {val}%
                  </text>
                </g>
              );
            })}

            {/* Planned Gradient Fill & Line */}
            <polygon points={planAreaPath} fill="url(#scurvePlanGrad)" />
            <polyline
              points={planPoints.join(' ')}
              fill="none"
              stroke="#94a3b8"
              strokeWidth="2.5"
              strokeDasharray="5 4"
            />

            {/* Actual Gradient Fill & Line */}
            {actualAreaPath && <polygon points={actualAreaPath} fill="url(#scurveActualGrad)" />}
            {actualPoints.length > 0 && (
              <polyline
                points={actualPoints.join(' ')}
                fill="none"
                stroke="#2563eb"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Data Points and X-Axis Labels */}
            {periods.map((p, i) => {
              const x = getX(i);
              const yPlan = getY(p.planned);
              const yAct = p.actual !== null ? getY(p.actual) : null;
              const isHovered = hoveredPoint === i;

              return (
                <g 
                  key={p.name} 
                  onMouseEnter={() => setHoveredPoint(i)}
                  onMouseLeave={() => setHoveredPoint(null)}
                  className="cursor-pointer"
                >
                  {/* Vertical Guide */}
                  <line
                    x1={x}
                    y1={paddingTop}
                    x2={x}
                    y2={paddingTop + chartH}
                    stroke={isHovered ? '#cbd5e1' : '#f8fafc'}
                    strokeWidth="1.5"
                  />

                  {/* Planned Point */}
                  <circle
                    cx={x}
                    cy={yPlan}
                    r={isHovered ? 5 : 3.5}
                    fill="#ffffff"
                    stroke="#64748b"
                    strokeWidth="2"
                  />

                  {/* Actual Point */}
                  {yAct !== null && (
                    <circle
                      cx={x}
                      cy={yAct}
                      r={isHovered ? 6 : 4.5}
                      fill="#2563eb"
                      stroke="#ffffff"
                      strokeWidth="2"
                    />
                  )}

                  {/* Month Label on X-Axis */}
                  <text
                    x={x}
                    y={svgHeight - 12}
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight={isHovered ? 'bold' : 'normal'}
                    fill={isHovered ? '#0f172a' : '#64748b'}
                  >
                    {p.name}
                  </text>

                  {/* Hover Tooltip Popup */}
                  {isHovered && (
                    <g transform={`translate(${x > svgWidth - 140 ? x - 120 : x + 10}, ${Math.min(yPlan, yAct ?? yPlan) - 10})`}>
                      <rect
                        width="110"
                        height="52"
                        rx="8"
                        fill="#0f172a"
                        opacity="0.9"
                      />
                      <text x="10" y="16" fill="#ffffff" fontSize="10" fontWeight="bold">
                        {p.name} ({p.planCutoff})
                      </text>
                      <text x="10" y="32" fill="#94a3b8" fontSize="9">
                        برنامه‌ای: <tspan fill="#f1f5f9" fontWeight="bold">{p.planned}%</tspan>
                      </text>
                      {p.actual !== null && (
                        <text x="10" y="45" fill="#93c5fd" fontSize="9">
                          واقعی: <tspan fill="#ffffff" fontWeight="bold">{p.actual}%</tspan>
                        </text>
                      )}
                    </g>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Delay Breakdown & Hold Management */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Delay Causes & Responsibility */}
        <div className="lg:col-span-2 bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              تحلیل تاخیرات مجاز و غیرمجاز مهندسی (Delay Claims)
            </h3>
            <span className="text-[11px] font-bold text-slate-400 font-mono">FIDIC Red/Silver Clause 8.4</span>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            محاسبه خودکار انحرافات زمانی بر اساس تاریخ‌های ارسال ترانزمیتال، مهلت‌های قراردادی پاسخ کارفرما (۱۴ روز کاری طبق رویه هماهنگی)، و توقف‌های ناشی از تغییرات دیسیپلین‌های دیگر (IDC / FEED Revision).
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/60">
              <div className="flex items-center justify-between text-xs font-bold text-amber-900 mb-1">
                <span>تاخیرات مجاز (کارفرما / مشاور)</span>
                <span className="text-sm font-black text-amber-700">۱۴ روز</span>
              </div>
              <p className="text-[11px] text-amber-800 leading-normal">
                تاخیر در ابلاغ نتایج بررسی (CRS) مدارک ترانزمیتال TR-001 بیش از سقف مجاز ۱۴ روزه، تغییر فلسفه کنترل سیستم F&G.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200/60">
              <div className="flex items-center justify-between text-xs font-bold text-rose-900 mb-1">
                <span>تاخیرات پیمانکار (داخلی)</span>
                <span className="text-sm font-black text-rose-700">۴ روز</span>
              </div>
              <p className="text-[11px] text-rose-800 leading-normal">
                زمان‌بر بودن مدل‌سازی ۳D سینی‌کابل‌ها و رفع تداخل (Clash Resolution) با پایپ‌های آب آتش‌نشانی.
              </p>
            </div>
          </div>
        </div>

        {/* Hold Documents List */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              اسناد در وضعیت تعلیق (Hold)
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold font-mono">
              {holdDocuments.length} مدرک
            </span>
          </div>

          <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
            {holdDocuments.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                هیچ مدرکی در وضعیت تعلیق (Hold) قرار ندارد.
              </div>
            ) : (
              holdDocuments.map(doc => (
                <div key={doc.id} className="py-2.5">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-mono text-xs font-bold text-blue-700">{doc.doc_number}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900">
                      HOLD
                    </span>
                  </div>
                  <p className="text-xs text-slate-800 line-clamp-1 mt-0.5">{doc.title}</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    علت: {doc.hold_reason || 'منتظر تایید P&ID نهایی واحد فرآیند'}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
