import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  LayoutDashboard, 
  Send, 
  MessageSquare, 
  RefreshCw, 
  Layers, 
  TrendingUp, 
  Building,
  CheckCircle2,
  ShoppingCart,
  Clock,
  DollarSign,
  BookOpen,
  GitFork
} from 'lucide-react';
import { EDMSDocument, EDMSTransmittal, EDMSComment, EDMSStats, User } from '../types';
import { authenticatedFetch } from '../utils/api';
import { EDMSDashboard } from './edms/EDMSDashboard';
import { MDRTable } from './edms/MDRTable';
import { TransmittalManager } from './edms/TransmittalManager';
import { CRSManager } from './edms/CRSManager';
import { CirculationWorkflow } from './edms/CirculationWorkflow';
import { SCurveAnalytics } from './edms/SCurveAnalytics';
import { ProcurementEngineering } from './edms/ProcurementEngineering';
import { TimesheetManager } from './edms/TimesheetManager';
import { CBSBillingManager } from './edms/CBSBillingManager';
import { KnowledgeBase } from './edms/KnowledgeBase';

interface EDMSViewProps {
  currentUser: User;
  lang: 'fa' | 'en';
}

type EDMSSubTab = 
  | 'dashboard' 
  | 'mdr' 
  | 'circulation'
  | 'scurve'
  | 'transmittals' 
  | 'crs' 
  | 'procurement' 
  | 'timesheet' 
  | 'cbs' 
  | 'knowledge';

export const EDMSView: React.FC<EDMSViewProps> = ({
  currentUser,
  lang
}) => {
  const [activeSubTab, setActiveSubTab] = useState<EDMSSubTab>('dashboard');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<EDMSStats | null>(null);
  const [documents, setDocuments] = useState<EDMSDocument[]>([]);
  const [transmittals, setTransmittals] = useState<EDMSTransmittal[]>([]);
  const [comments, setComments] = useState<EDMSComment[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadAllEDMSData = async (showLoadingSpinner = false) => {
    if (showLoadingSpinner) setLoading(true);
    setIsRefreshing(true);
    try {
      const [statsRes, docsRes, transRes, commentsRes] = await Promise.all([
        authenticatedFetch('/api/edms/stats'),
        authenticatedFetch('/api/edms/documents'),
        authenticatedFetch('/api/edms/transmittals'),
        authenticatedFetch('/api/edms/comments')
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
      if (docsRes.ok) {
        const docsData = await docsRes.json();
        setDocuments(docsData);
      }
      if (transRes.ok) {
        const transData = await transRes.json();
        setTransmittals(transData);
      }
      if (commentsRes.ok) {
        const commentsData = await commentsRes.json();
        setComments(commentsData);
      }
    } catch (e) {
      console.error('Failed to load EDMS data:', e);
    } finally {
      if (showLoadingSpinner) setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadAllEDMSData(true);
  }, []);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-12" dir={lang === 'fa' ? 'rtl' : 'ltr'}>
      {/* Top Banner & Header */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60 text-[11px] font-extrabold tracking-wide">
              {lang === 'fa' ? 'سامانه یکپارچه مهندسی و مدارک AFAM / EDMS' : 'AFAM Enterprise EDMS & Project Engineering'}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              ISO 9001 / IPS-E-PR-440 / NFPA
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {lang === 'fa' ? 'سامانه کنترل مدارک، گردش کار و مهندسی پروژه' : 'Enterprise Engineering Document Management System'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {lang === 'fa' 
              ? 'ماتریس اسناد (MDR)، دستگردانی داخلی (IDC)، تحلیل S-Curve، ترانزمیتال، مهندسی خرید (MR/TBE)، تایم‌شیت، صورت‌وضعیت (CBS) و درس‌آموخته‌ها'
              : 'MDR register, internal circulation workflows, S-Curve delays, transmittals, procurement engineering, timesheets, CBS billings, and lessons learned.'}
          </p>
        </div>

        {/* Refresh & Navigation Tabs */}
        <div className="flex items-center gap-2 self-stretch md:self-auto justify-between md:justify-end">
          <button
            onClick={() => loadAllEDMSData(false)}
            disabled={isRefreshing}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-all cursor-pointer shadow-2xs disabled:opacity-50"
            title="به‌روزرسانی داده‌ها"
          >
            <RefreshCw className={`w-4 h-4 text-slate-600 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Enterprise Sub-Navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1.5 bg-slate-200/60 rounded-2xl border border-slate-200/80 overflow-x-auto text-xs font-bold scrollbar-thin">
        {/* 1. Dashboard */}
        <button
          onClick={() => setActiveSubTab('dashboard')}
          className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'dashboard'
              ? 'bg-white text-blue-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>{lang === 'fa' ? 'داشبورد' : 'Dashboard'}</span>
        </button>

        {/* 2. MDR */}
        <button
          onClick={() => setActiveSubTab('mdr')}
          className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'mdr'
              ? 'bg-white text-blue-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>{lang === 'fa' ? 'ماتریس اسناد (MDR)' : 'MDR Matrix'}</span>
          <span className="px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-800 text-[10px] font-mono">
            {documents.length}
          </span>
        </button>

        {/* 3. Circulation & Workflow */}
        <button
          onClick={() => setActiveSubTab('circulation')}
          className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'circulation'
              ? 'bg-white text-blue-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
          }`}
        >
          <Layers className="w-4 h-4 text-blue-600" />
          <span>{lang === 'fa' ? 'گردش کار و ارجاعات (IDC)' : 'Circulation & IDC'}</span>
        </button>

        {/* 4. S-Curve Analytics */}
        <button
          onClick={() => setActiveSubTab('scurve')}
          className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'scurve'
              ? 'bg-white text-blue-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
          }`}
        >
          <TrendingUp className="w-4 h-4 text-emerald-600" />
          <span>{lang === 'fa' ? 'منحنی S و تاخیرات' : 'S-Curve & Delays'}</span>
        </button>

        {/* 5. Transmittals */}
        <button
          onClick={() => setActiveSubTab('transmittals')}
          className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'transmittals'
              ? 'bg-white text-blue-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
          }`}
        >
          <Send className="w-4 h-4" />
          <span>{lang === 'fa' ? 'ترانزمیتال‌ها' : 'Transmittals'}</span>
          <span className="px-1.5 py-0.2 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-mono">
            {transmittals.length}
          </span>
        </button>

        {/* 6. CRS Comments */}
        <button
          onClick={() => setActiveSubTab('crs')}
          className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'crs'
              ? 'bg-white text-blue-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>{lang === 'fa' ? 'پاسخ کامنت‌ها (CRS)' : 'CRS Comments'}</span>
          {stats && stats.pendingCommentsCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 text-[10px] font-mono font-bold">
              {stats.pendingCommentsCount}
            </span>
          )}
        </button>

        {/* 7. Procurement Engineering */}
        <button
          onClick={() => setActiveSubTab('procurement')}
          className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'procurement'
              ? 'bg-white text-blue-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
          }`}
        >
          <ShoppingCart className="w-4 h-4 text-purple-600" />
          <span>{lang === 'fa' ? 'مهندسی خرید (MR/TBE)' : 'Procurement'}</span>
        </button>

        {/* 8. Timesheets */}
        <button
          onClick={() => setActiveSubTab('timesheet')}
          className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'timesheet'
              ? 'bg-white text-blue-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
          }`}
        >
          <Clock className="w-4 h-4 text-blue-600" />
          <span>{lang === 'fa' ? 'تایم‌شیت نفر-ساعت' : 'Timesheets'}</span>
        </button>

        {/* 9. CBS & Billing */}
        <button
          onClick={() => setActiveSubTab('cbs')}
          className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'cbs'
              ? 'bg-white text-blue-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
          }`}
        >
          <DollarSign className="w-4 h-4 text-emerald-600" />
          <span>{lang === 'fa' ? 'صورت‌وضعیت (CBS)' : 'CBS & Billing'}</span>
        </button>

        {/* 10. Knowledge & Lessons Learned */}
        <button
          onClick={() => setActiveSubTab('knowledge')}
          className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'knowledge'
              ? 'bg-white text-blue-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
          }`}
        >
          <BookOpen className="w-4 h-4 text-amber-600" />
          <span>{lang === 'fa' ? 'درس‌آموخته‌ها' : 'Lessons Learned'}</span>
        </button>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3 bg-white rounded-3xl border border-slate-200">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-xs text-slate-500 font-medium">
            {lang === 'fa' ? 'در حال بارگذاری اطلاعات سامانه مدارک مهندسی...' : 'Loading EDMS records...'}
          </p>
        </div>
      ) : (
        <>
          {activeSubTab === 'dashboard' && (
            <EDMSDashboard
              stats={stats}
              documents={documents}
              onSelectTab={(tab) => setActiveSubTab(tab as any)}
              lang={lang}
            />
          )}

          {activeSubTab === 'mdr' && (
            <MDRTable
              documents={documents}
              onRefresh={() => loadAllEDMSData(false)}
              lang={lang}
            />
          )}

          {activeSubTab === 'circulation' && (
            <CirculationWorkflow
              documents={documents}
              currentUser={currentUser}
              lang={lang}
            />
          )}

          {activeSubTab === 'scurve' && (
            <SCurveAnalytics
              documents={documents}
              lang={lang}
            />
          )}

          {activeSubTab === 'transmittals' && (
            <TransmittalManager
              transmittals={transmittals}
              documents={documents}
              onRefresh={() => loadAllEDMSData(false)}
              lang={lang}
            />
          )}

          {activeSubTab === 'crs' && (
            <CRSManager
              comments={comments}
              documents={documents}
              onRefresh={() => loadAllEDMSData(false)}
              lang={lang}
            />
          )}

          {activeSubTab === 'procurement' && (
            <ProcurementEngineering
              documents={documents}
              currentUser={currentUser}
              lang={lang}
            />
          )}

          {activeSubTab === 'timesheet' && (
            <TimesheetManager
              documents={documents}
              currentUser={currentUser}
              lang={lang}
            />
          )}

          {activeSubTab === 'cbs' && (
            <CBSBillingManager
              documents={documents}
              currentUser={currentUser}
              lang={lang}
            />
          )}

          {activeSubTab === 'knowledge' && (
            <KnowledgeBase
              documents={documents}
              currentUser={currentUser}
              lang={lang}
            />
          )}
        </>
      )}
    </div>
  );
};
