import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Search, 
  X, 
  Database, 
  TrendingUp, 
  HelpCircle, 
  FileSpreadsheet, 
  MessageSquare, 
  RefreshCw, 
  Sparkles, 
  FileDown, 
  Flame, 
  ShieldCheck, 
  LayoutGrid, 
  List,
  CheckCircle2,
  ExternalLink,
  Tag
} from 'lucide-react';
import { Equipment, User } from '../types';

interface DashboardViewProps {
  currentUser: User;
  equipment: Equipment[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  brandFilter: string;
  setBrandFilter: (b: string) => void;
  systemFilter: 'all' | 'alarm' | 'fighting';
  setSystemFilter: (f: 'all' | 'alarm' | 'fighting') => void;
  onExportExcel: () => void;
  onRefreshData: () => void;
  onNavigateToAssistant: () => void;
  lang: 'fa' | 'en';
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  currentUser,
  equipment,
  searchQuery,
  setSearchQuery,
  brandFilter,
  setBrandFilter,
  systemFilter,
  setSystemFilter,
  onExportExcel,
  onRefreshData,
  onNavigateToAssistant,
  lang
}) => {
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 30;

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, brandFilter, systemFilter]);

  // Filter equipment
  const filteredEquipment = useMemo(() => {
    return equipment.filter(item => {
      const matchSearch = 
        item.part_number.toLowerCase().includes(searchQuery.toLowerCase()) || 
        item.brand.toLowerCase().includes(searchQuery.toLowerCase()) || 
        item.equipment_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.technical_specifications.toLowerCase().includes(searchQuery.toLowerCase());
      const matchBrand = brandFilter === 'همه' || item.brand === brandFilter;
      const matchSystem = systemFilter === 'all' || item.system_type === systemFilter;
      return matchSearch && matchBrand && matchSystem;
    });
  }, [equipment, searchQuery, brandFilter, systemFilter]);

  // Unique brands
  const brandOptions = useMemo(() => ['همه', ...Array.from(new Set(equipment.map(e => e.brand))).filter(Boolean)], [equipment]);

  const totalAlarm = useMemo(() => equipment.filter(e => e.system_type === 'alarm').length, [equipment]);
  const totalFighting = useMemo(() => equipment.filter(e => e.system_type === 'fighting').length, [equipment]);
  const totalBrands = useMemo(() => new Set(equipment.map(e => e.brand)).size, [equipment]);

  const totalPages = Math.ceil(filteredEquipment.length / ITEMS_PER_PAGE);
  const paginatedEquipment = filteredEquipment.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
      dir={lang === 'fa' ? 'rtl' : 'ltr'}
    >
      {/* Hero Banner Section */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 rounded-3xl p-6 sm:p-10 text-white relative overflow-hidden shadow-xl border border-slate-800">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center space-y-4 relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/15 border border-blue-400/20 text-blue-300 text-xs font-semibold backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
            <span>{lang === 'fa' ? 'سامانه یکپارچه مهندسی اعلام و اطفاء حریق' : 'Integrated Fire & Gas Engineering Hub'}</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white gradient-text-blue">
            {lang === 'fa' ? 'کاتالوگ و استعلام هوشمند F&G' : 'F&G Intelligent Catalog'}
          </h1>
          <p className="text-sm sm:text-base text-slate-300 font-normal max-w-2xl mx-auto leading-relaxed">
            {lang === 'fa'
              ? 'جستجو و استعلام سریع مشخصات فنی پارت‌نامبرها، مطابقت با کدهای استاندارد NFPA 72 و NFPA 2001 و صدور صورت کالا (BOM)'
              : 'Search part numbers, verify NFPA 72 & 2001 standards compliance, and export equipment BOM'}
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5 pt-2 flex-wrap">
            <button
              type="button"
              onClick={onExportExcel}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-5 py-2.5 rounded-xl text-xs shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[44px] w-full sm:w-auto"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>{lang === 'fa' ? 'دانلود صورت کالا (BOM Excel)' : 'Export BOM Excel'}</span>
            </button>

            <button
              type="button"
              onClick={onNavigateToAssistant}
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-5 py-2.5 rounded-xl text-xs shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[44px] w-full sm:w-auto"
            >
              <MessageSquare className="w-4 h-4 text-amber-300" />
              <span>{lang === 'fa' ? 'مشاوره با دستیار AI' : 'Consult AI Assistant'}</span>
            </button>

            <button
              type="button"
              onClick={onRefreshData}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold px-4 py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer min-h-[44px] w-full sm:w-auto"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{lang === 'fa' ? 'بروزرسانی داده‌ها' : 'Refresh'}</span>
            </button>
          </div>

          {/* Quick Status Badges */}
          <div className="pt-3 flex items-center justify-center gap-2 sm:gap-4 flex-wrap text-xs text-slate-300">
            <span className="bg-slate-800/80 border border-slate-700 px-3 py-1 rounded-full flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>NFPA 72 & 2001 Compliant</span>
            </span>
            <span className="bg-slate-800/80 border border-slate-700 px-3 py-1 rounded-full flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-blue-400" />
              <span>{equipment.length} {lang === 'fa' ? 'تجهیز ثبت‌شده' : 'Items Registered'}</span>
            </span>
            <span className="bg-slate-800/80 border border-slate-700 px-3 py-1 rounded-full flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
              <span>{totalBrands} {lang === 'fa' ? 'برند معتبر' : 'Brands'}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="engineering-card p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shrink-0">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-slate-900">{filteredEquipment.length}</h3>
            <p className="text-xs text-slate-500 font-medium">
              {lang === 'fa' ? 'تجهیزات نمایش داده شده' : 'Displayed Items'}
            </p>
          </div>
        </div>

        <div className="engineering-card p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 shrink-0">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-slate-900">{totalAlarm}</h3>
            <p className="text-xs text-slate-500 font-medium">
              {lang === 'fa' ? 'تجهیزات اعلام حریق' : 'Fire Alarm Items'}
            </p>
          </div>
        </div>

        <div className="engineering-card p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-slate-900">{totalFighting}</h3>
            <p className="text-xs text-slate-500 font-medium">
              {lang === 'fa' ? 'تجهیزات اطفاء حریق' : 'Fire Fighting Items'}
            </p>
          </div>
        </div>
      </div>

      {/* Main Filter & Control Panel */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {lang === 'fa' ? 'فهرست تجهیزات و کالاهای مهندسی' : 'Equipment Inventory'}
            </h3>
            <p className="text-xs text-slate-500">
              {lang === 'fa' ? 'استعلام پارت‌نامبر، مرجع NFPA و مشخصات فنی کامل' : 'Query technical specs, part numbers & NFPA standards'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search Input with Instant Clear */}
            <div className="relative flex-1 sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute top-3 right-3 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={lang === 'fa' ? "جستجو پارت‌نامبر، برند..." : "Search part number, brand..."}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-9 pl-8 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute top-2.5 left-2.5 text-slate-400 hover:text-slate-700 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Brand select */}
            <select
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 focus:bg-white transition-all cursor-pointer font-medium"
            >
              {brandOptions.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>

            {/* View switcher (Cards vs Table) */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'cards' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
                title={lang === 'fa' ? 'نمایش کارت‌ها' : 'Card View'}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'table' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
                title={lang === 'fa' ? 'نمایش جدول' : 'Table View'}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* DATA CONTAINER: CARDS VIEW */}
        {viewMode === 'cards' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {filteredEquipment.length === 0 ? (
              <div className="col-span-full text-center py-12 text-slate-400 bg-slate-50/50 border border-dashed border-slate-200 rounded-2xl">
                {lang === 'fa' ? 'هیچ کالایی مطابق با الگوی جستجو پیدا نشد.' : 'No equipment matches the search query.'}
              </div>
            ) : (
              paginatedEquipment.map((item, idx) => (
                <motion.div
                  key={item.id || idx}
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2, delay: idx * 0.03 }}
                  className="engineering-card p-5 flex flex-col justify-between space-y-4 hover:border-blue-300 transition-all group"
                >
                  <div className="space-y-3">
                    {/* Top Row: System Badge & Brand */}
                    <div className="flex items-center justify-between gap-2">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 ${
                        item.system_type === 'alarm' 
                          ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}>
                        {item.system_type === 'alarm' ? (
                          <>
                            <Flame className="w-3 h-3 text-amber-600" />
                            <span>{lang === 'fa' ? 'اعلام حریق' : 'Fire Alarm'}</span>
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            <span>{lang === 'fa' ? 'اطفاء حریق' : 'Fire Fighting'}</span>
                          </>
                        )}
                      </span>

                      <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                        {item.brand}
                      </span>
                    </div>

                    {/* Part Number & Title */}
                    <div>
                      <h4 className="text-base font-bold text-slate-900 font-mono tracking-tight group-hover:text-blue-600 transition-colors">
                        {item.part_number}
                      </h4>
                      <p className="text-xs text-slate-600 font-semibold mt-0.5">
                        {item.equipment_type}
                      </p>
                    </div>

                    {/* NFPA Reference tag */}
                    {item.nfpa_reference && (
                      <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-xs text-amber-700 font-bold">
                        <Tag className="w-3 h-3" />
                        <span>{item.nfpa_reference}</span>
                      </div>
                    )}

                    {/* Specs text */}
                    <p className="text-xs text-slate-500 leading-relaxed line-clamp-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      {item.technical_specifications}
                    </p>
                  </div>

                  {/* Bottom Row: Financial Clearance & Download Document */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div>
                      {currentUser.price_access === 1 ? (
                        item.price ? (
                          <span className="font-bold text-emerald-700 text-sm">
                            {item.price.toLocaleString()} <span className="text-xs text-slate-500 font-normal">{item.currency}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">{lang === 'fa' ? 'بدون قیمت' : 'N/A'}</span>
                        )
                      ) : (
                        <span className="text-slate-400 bg-slate-100 px-2 py-0.5 rounded text-[10px] font-semibold">
                          🔒 {lang === 'fa' ? 'قیمت محرمانه' : 'Confidential'}
                        </span>
                      )}
                    </div>

                    {item.source_file && item.source_file !== 'manual_sync' && item.source_file !== 'manual_entry' ? (
                      <a
                        href={`/api/documents/download/${encodeURIComponent(item.source_file)}`}
                        download
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-colors font-medium text-xs"
                      >
                        <FileDown className="w-3.5 h-3.5" />
                        <span>{lang === 'fa' ? 'سند مرجع' : 'Datasheet'}</span>
                      </a>
                    ) : (
                      <span className="text-slate-400 text-[10px]">{lang === 'fa' ? 'ثبت دستی' : 'Manual'}</span>
                    )}
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}

        {/* DATA CONTAINER: TABLE VIEW */}
        {viewMode === 'table' && (
          <div className="overflow-x-auto border border-slate-200 bg-white rounded-2xl shadow-xs">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-800 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3 text-center border-x border-slate-200/50">#</th>
                  <th className="p-3 border-x border-slate-200/50">{lang === 'fa' ? 'پارت نامبر' : 'Part Number'}</th>
                  <th className="p-3 border-x border-slate-200/50">{lang === 'fa' ? 'برند' : 'Brand'}</th>
                  <th className="p-3 border-x border-slate-200/50">{lang === 'fa' ? 'نوع تجهیز' : 'Type'}</th>
                  <th className="p-3 border-x border-slate-200/50">{lang === 'fa' ? 'سیستم' : 'System'}</th>
                  <th className="p-3 border-x border-slate-200/50">{lang === 'fa' ? 'استاندارد NFPA' : 'NFPA'}</th>
                  <th className="p-3 border-x border-slate-200/50">{lang === 'fa' ? 'مشخصات فنی' : 'Technical Specs'}</th>
                  <th className="p-3 text-center border-x border-slate-200/50">{lang === 'fa' ? 'منبع/دانلود' : 'Document'}</th>
                  {currentUser.price_access === 1 && (
                    <>
                      <th className="p-3 text-left border-x border-slate-200/50">{lang === 'fa' ? 'قیمت' : 'Price'}</th>
                      <th className="p-3 text-center border-x border-slate-200/50">{lang === 'fa' ? 'ارز' : 'Currency'}</th>
                    </>
                  )}
                  <th className="p-3 text-center border-x border-slate-200/50">{lang === 'fa' ? 'تاریخ' : 'Date'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 bg-white">
                {filteredEquipment.length === 0 ? (
                  <tr>
                    <td colSpan={currentUser.price_access === 1 ? 10 : 8} className="p-8 text-center text-slate-400">
                      {lang === 'fa' ? 'هیچ کالایی مطابق با فیلتر یافت نشد.' : 'No items match the filter.'}
                    </td>
                  </tr>
                ) : (
                  paginatedEquipment.map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-bold text-slate-400 text-center">{(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}</td>
                      <td className="p-3 font-mono font-bold text-slate-900">{item.part_number}</td>
                      <td className="p-3 font-semibold text-blue-600">{item.brand}</td>
                      <td className="p-3 font-medium text-slate-700">{item.equipment_type}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.system_type === 'alarm' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {item.system_type === 'alarm' ? (lang === 'fa' ? 'اعلام' : 'Alarm') : (lang === 'fa' ? 'اطفاء' : 'Fighting')}
                        </span>
                      </td>
                      <td className="p-3 font-bold text-amber-700">{item.nfpa_reference || '—'}</td>
                      <td className="p-3 max-w-xs truncate text-slate-500" title={item.technical_specifications}>
                        {item.technical_specifications}
                      </td>
                      <td className="p-3 text-center">
                        {item.source_file && item.source_file !== 'manual_sync' && item.source_file !== 'manual_entry' ? (
                          <a
                            href={`/api/documents/download/${encodeURIComponent(item.source_file)}`}
                            download
                            className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-2 py-1 rounded transition-colors text-[11px] font-bold"
                          >
                            <FileDown className="w-3.5 h-3.5" />
                            <span>دانلود</span>
                          </a>
                        ) : (
                          <span className="text-slate-400 text-[10px]">دستی</span>
                        )}
                      </td>
                      {currentUser.price_access === 1 && (
                        <>
                          <td className="p-3 text-left font-bold text-emerald-700">{item.price ? item.price.toLocaleString() : '—'}</td>
                          <td className="p-3 text-center font-bold text-slate-500">{item.currency}</td>
                        </>
                      )}
                      <td className="p-3 text-center text-slate-400 text-[10px]" dir="ltr">{item.created_at || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              {lang === 'fa' ? 'قبلی' : 'Prev'}
            </button>
            <div className="text-sm font-medium text-slate-600 px-4">
              {lang === 'fa' ? `صفحه ${currentPage} از ${totalPages}` : `Page ${currentPage} of ${totalPages}`}
            </div>
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev + 1, 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              {lang === 'fa' ? 'بعدی' : 'Next'}
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
};
