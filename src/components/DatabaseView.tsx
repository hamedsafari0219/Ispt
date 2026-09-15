import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  PlusCircle, 
  Database, 
  Trash2, 
  RefreshCw, 
  Save, 
  Plus, 
  FileDown, 
  CheckCircle2, 
  AlertCircle,
  Sparkles,
  Layers,
  Tag,
  Mail
} from 'lucide-react';
import { Equipment, User } from '../types';
import { SendEmailModal } from './SendEmailModal';

interface DatabaseViewProps {
  currentUser: User;
  editedEquipment: Equipment[];
  setEditedEquipment: React.Dispatch<React.SetStateAction<Equipment[]>>;
  isSavingDb: boolean;
  newEqForm: {
    part_number: string;
    brand: string;
    equipment_type: string;
    price: string;
    currency: string;
    nfpa_reference: string;
    technical_specifications: string;
    drawing_ref?: string;
    system_type: 'alarm' | 'fighting';
  };
  setNewEqForm: React.Dispatch<React.SetStateAction<{
    part_number: string;
    brand: string;
    equipment_type: string;
    price: string;
    currency: string;
    nfpa_reference: string;
    technical_specifications: string;
    drawing_ref?: string;
    system_type: 'alarm' | 'fighting';
  }>>;
  formMsg: { type: 'success' | 'error'; text: string } | null;
  onAddEquipmentManual: (e: React.FormEvent) => Promise<void>;
  onSpreadsheetSave: () => Promise<void>;
  lang: 'fa' | 'en';
}

export const DatabaseView: React.FC<DatabaseViewProps> = ({
  currentUser,
  editedEquipment,
  setEditedEquipment,
  isSavingDb,
  newEqForm,
  setNewEqForm,
  formMsg,
  onAddEquipmentManual,
  onSpreadsheetSave,
  lang
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'spreadsheet' | 'manual'>('spreadsheet');
  const [currentPage, setCurrentPage] = useState(1);
  const [emailEquipment, setEmailEquipment] = useState<Equipment | null>(null);
  const ITEMS_PER_PAGE = 30;

  const totalPages = Math.ceil(editedEquipment.length / ITEMS_PER_PAGE);
  const paginatedEditedEquipment = editedEquipment.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Cell edit helper
  const handleCellEdit = (index: number, field: keyof Equipment, value: any) => {
    const updated = [...editedEquipment];
    if (field === 'price') {
      updated[index] = { ...updated[index], price: value === '' ? null : Number(value) };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setEditedEquipment(updated);
  };

  // Delete Row
  const handleSpreadsheetDelete = (index: number) => {
    const updated = [...editedEquipment];
    updated.splice(index, 1);
    setEditedEquipment(updated);
  };

  // Add Row
  const handleSpreadsheetAddRow = () => {
    const newRow: Equipment = {
      part_number: '',
      brand: '',
      equipment_type: '',
      price: null,
      currency: 'USD',
      nfpa_reference: '',
      technical_specifications: '',
      drawing_ref: '',
      system_type: currentUser?.system_access === 'both' ? 'alarm' : currentUser?.system_access as any
    };
    setEditedEquipment([newRow, ...editedEquipment]);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
      dir={lang === 'fa' ? 'rtl' : 'ltr'}
    >
      {/* Sub-tab Navigation Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-200 pb-3 gap-3">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-blue-600 shrink-0" />
          <h2 className="text-base sm:text-lg font-bold text-slate-900">
            {lang === 'fa' ? 'مدیریت پایگاه داده و کاتالوگ تجهیزات' : 'Database & Catalog Management'}
          </h2>
        </div>

        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold w-full sm:w-auto justify-stretch">
          <button
            type="button"
            onClick={() => setActiveSubTab('spreadsheet')}
            className={`flex-1 sm:flex-none px-3 py-2 rounded-lg transition-all cursor-pointer text-center min-h-[38px] ${
              activeSubTab === 'spreadsheet' ? 'bg-white text-blue-600 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {lang === 'fa' ? 'ویرایشگر صفحه‌گسترده' : 'Spreadsheet Editor'}
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('manual')}
            className={`flex-1 sm:flex-none px-3 py-2 rounded-lg transition-all cursor-pointer text-center min-h-[38px] ${
              activeSubTab === 'manual' ? 'bg-white text-blue-600 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {lang === 'fa' ? 'ثبت کالا به صورت دستی' : 'Add Equipment Form'}
          </button>
        </div>
      </div>

      {/* SUB-VIEW 1: MANUAL EQUIPMENT FORM */}
      {activeSubTab === 'manual' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.99 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/90 shadow-xs space-y-6"
        >
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <PlusCircle className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {lang === 'fa' ? 'فرم افزودن تجهیز جدید به پایگاه داده' : 'Manual Equipment Entry'}
              </h3>
              <p className="text-xs text-slate-500">
                {lang === 'fa' ? 'ورود دقیق پارت‌نامبر، برند، مشخصات فنی و استانداردهای NFPA' : 'Enter part number, brand, technical specs and NFPA standards'}
              </p>
            </div>
          </div>

          <form onSubmit={onAddEquipmentManual} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {lang === 'fa' ? 'پارت‌نامبر (نام کالا) *' : 'Part Number *'}
                </label>
                <input
                  type="text"
                  value={newEqForm.part_number}
                  onChange={(e) => setNewEqForm({ ...newEqForm, part_number: e.target.value })}
                  placeholder="مانند: FR-880-P"
                  className="w-full custom-input px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {lang === 'fa' ? 'برند سازنده *' : 'Brand *'}
                </label>
                <input
                  type="text"
                  value={newEqForm.brand}
                  onChange={(e) => setNewEqForm({ ...newEqForm, brand: e.target.value })}
                  placeholder="مانند: Notifier"
                  className="w-full custom-input px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {lang === 'fa' ? 'نوع تجهیز *' : 'Equipment Type *'}
                </label>
                <input
                  type="text"
                  value={newEqForm.equipment_type}
                  onChange={(e) => setNewEqForm({ ...newEqForm, equipment_type: e.target.value })}
                  placeholder="مانند: دتکتور شعله ضد انفجار"
                  className="w-full custom-input px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {lang === 'fa' ? 'شماره / رفرنس نقشه (DWG Ref)' : 'Drawing Ref No.'}
                </label>
                <input
                  type="text"
                  value={newEqForm.drawing_ref || ''}
                  onChange={(e) => setNewEqForm({ ...newEqForm, drawing_ref: e.target.value })}
                  placeholder="DWG-F&G-101-REV02"
                  className="w-full custom-input px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {lang === 'fa' ? 'قیمت' : 'Price'}
                </label>
                <input
                  type="number"
                  value={newEqForm.price}
                  onChange={(e) => setNewEqForm({ ...newEqForm, price: e.target.value })}
                  placeholder="120.00"
                  className="w-full custom-input px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {lang === 'fa' ? 'ارز' : 'Currency'}
                </label>
                <select
                  value={newEqForm.currency}
                  onChange={(e) => setNewEqForm({ ...newEqForm, currency: e.target.value })}
                  className="w-full custom-input px-3 py-2.5 text-xs text-slate-800 cursor-pointer font-medium"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="Rials">Rials</option>
                  <option value="AED">AED</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {lang === 'fa' ? 'مرجع استاندارد NFPA' : 'NFPA Reference'}
                </label>
                <input
                  type="text"
                  value={newEqForm.nfpa_reference}
                  onChange={(e) => setNewEqForm({ ...newEqForm, nfpa_reference: e.target.value })}
                  placeholder="مانند: NFPA 72"
                  className="w-full custom-input px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {lang === 'fa' ? 'نوع سیستم' : 'System Category'}
                </label>
                <select
                  value={newEqForm.system_type}
                  onChange={(e) => setNewEqForm({ ...newEqForm, system_type: e.target.value as any })}
                  className="w-full custom-input px-3 py-2.5 text-xs text-slate-800 cursor-pointer font-medium"
                >
                  <option value="alarm">{lang === 'fa' ? 'اعلام حریق' : 'Fire Alarm'}</option>
                  <option value="fighting">{lang === 'fa' ? 'اطفاء حریق' : 'Fire Fighting'}</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {lang === 'fa' ? 'مشخصات فنی و استانداردهای طراحی' : 'Technical Specifications & Guidelines'}
              </label>
              <textarea
                value={newEqForm.technical_specifications}
                onChange={(e) => setNewEqForm({ ...newEqForm, technical_specifications: e.target.value })}
                rows={3}
                placeholder={lang === 'fa' ? "توضیحات فنی، حساسیت سنسور، ولتاژ کاری یا استاندارد نصب..." : "Technical details, sensitivity, operating voltage..."}
                className="w-full custom-input p-3 text-xs text-slate-900 placeholder-slate-400"
              />
            </div>

            {formMsg && (
              <div className={`p-3 rounded-xl text-xs font-semibold text-center border flex items-center justify-center gap-2 ${
                formMsg.type === 'success' 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                  : 'bg-rose-50 border-rose-200 text-rose-700'
              }`}>
                {formMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                <span>{formMsg.text}</span>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 px-6 rounded-xl text-xs shadow-md shadow-blue-600/20 transition-all flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{lang === 'fa' ? 'ذخیره کالا در پایگاه داده' : 'Save Equipment'}</span>
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* SUB-VIEW 2: SPREADSHEET LIVE EDITOR */}
      {activeSubTab === 'spreadsheet' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.99 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-4"
        >
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Database className="w-4 h-4 text-blue-600" />
                <span>{lang === 'fa' ? 'ویرایشگر آنلاین پایگاه داده (Grid Editor)' : 'Live Grid Spreadsheet'}</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {lang === 'fa' ? 'ویرایش مستقیم سلول‌ها و همگام‌سازی یکباره با سرور' : 'Directly edit cells and synchronize with server'}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSpreadsheetAddRow}
                className="bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 font-semibold py-2 px-3 rounded-xl text-xs cursor-pointer transition-colors flex items-center gap-1"
              >
                <Plus className="w-4 h-4 text-blue-600" />
                <span>{lang === 'fa' ? 'افزودن ردیف' : 'Add Row'}</span>
              </button>

              <button
                type="button"
                onClick={onSpreadsheetSave}
                disabled={isSavingDb}
                className={`py-2 px-4 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  isSavingDb 
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/20 cursor-pointer'
                }`}
              >
                {isSavingDb ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>{lang === 'fa' ? 'در حال همگام‌سازی...' : 'Syncing...'}</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>{lang === 'fa' ? 'ذخیره و همگام‌سازی نهایی' : 'Save & Sync Grid'}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Spreadsheet Table */}
          <div className="overflow-x-auto border border-slate-200 bg-white rounded-xl shadow-2xs">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-800 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-2.5 text-center border-x border-slate-200/50 w-10">#</th>
                  <th className="p-2.5 text-center border-x border-slate-200/50 w-12">{lang === 'fa' ? 'حذف' : 'Del'}</th>
                  <th className="p-2.5 text-center border-x border-slate-200/50 w-12">{lang === 'fa' ? 'ایمیل' : 'Email'}</th>
                  <th className="p-2.5 border-x border-slate-200/50 min-w-[130px]">{lang === 'fa' ? 'پارت نامبر' : 'Part Number'}</th>
                  <th className="p-2.5 border-x border-slate-200/50 min-w-[140px]">{lang === 'fa' ? 'شماره / رفرنس نقشه' : 'DWG Ref / Tag'}</th>
                  <th className="p-2.5 border-x border-slate-200/50 min-w-[110px]">{lang === 'fa' ? 'برند' : 'Brand'}</th>
                  <th className="p-2.5 border-x border-slate-200/50 min-w-[140px]">{lang === 'fa' ? 'نوع تجهیز' : 'Type'}</th>
                  <th className="p-2.5 text-center border-x border-slate-200/50 min-w-[100px]">{lang === 'fa' ? 'سیستم' : 'System'}</th>
                  <th className="p-2.5 border-x border-slate-200/50 min-w-[120px]">{lang === 'fa' ? 'مرجع NFPA' : 'NFPA Standard'}</th>
                  <th className="p-2.5 border-x border-slate-200/50 min-w-[200px]">{lang === 'fa' ? 'مشخصات فنی' : 'Technical Specs'}</th>
                  {currentUser.price_access === 1 && (
                    <>
                      <th className="p-2.5 border-x border-slate-200/50 min-w-[100px]">{lang === 'fa' ? 'قیمت' : 'Price'}</th>
                      <th className="p-2.5 text-center border-x border-slate-200/50 min-w-[80px]">{lang === 'fa' ? 'ارز' : 'Currency'}</th>
                    </>
                  )}
                  <th className="p-2.5 text-center border-x border-slate-200/50 min-w-[110px]">{lang === 'fa' ? 'تاریخ ثبت' : 'Date'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                {editedEquipment.length === 0 ? (
                  <tr>
                    <td colSpan={currentUser.price_access === 1 ? 11 : 9} className="p-8 text-center text-slate-400">
                      {lang === 'fa' ? 'جدول خالی است.' : 'Grid is empty.'}
                    </td>
                  </tr>
                ) : (
                  paginatedEditedEquipment.map((eq, localIdx) => {
                    const absoluteIdx = (currentPage - 1) * ITEMS_PER_PAGE + localIdx;
                    return (
                    <tr key={absoluteIdx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-2 text-center font-bold text-slate-400">{absoluteIdx + 1}</td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleSpreadsheetDelete(absoluteIdx)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => setEmailEquipment(eq)}
                          className="text-slate-400 hover:text-sky-600 p-1 rounded-lg hover:bg-sky-50 cursor-pointer transition-colors"
                          title={lang === 'fa' ? 'ارسال مشخصات با ایمیل' : 'Send via Email'}
                        >
                          <Mail className="w-3.5 h-3.5 text-sky-600" />
                        </button>
                      </td>
                      <td className="p-1.5">
                        <input
                          type="text"
                          value={eq.part_number}
                          onChange={(e) => handleCellEdit(absoluteIdx, 'part_number', e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg px-2 py-1 text-slate-900 font-bold font-mono text-xs"
                        />
                      </td>
                      <td className="p-1.5">
                        <input
                          type="text"
                          value={eq.drawing_ref || ''}
                          onChange={(e) => handleCellEdit(absoluteIdx, 'drawing_ref', e.target.value)}
                          placeholder="DWG-101..."
                          className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg px-2 py-1 text-indigo-700 font-mono text-xs"
                        />
                      </td>
                      <td className="p-1.5">
                        <input
                          type="text"
                          value={eq.brand}
                          onChange={(e) => handleCellEdit(absoluteIdx, 'brand', e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg px-2 py-1 text-blue-600 font-semibold text-xs"
                        />
                      </td>
                      <td className="p-1.5">
                        <input
                          type="text"
                          value={eq.equipment_type}
                          onChange={(e) => handleCellEdit(absoluteIdx, 'equipment_type', e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg px-2 py-1 text-slate-800 text-xs"
                        />
                      </td>
                      <td className="p-1.5 text-center">
                        <select
                          value={eq.system_type}
                          onChange={(e) => handleCellEdit(absoluteIdx, 'system_type', e.target.value)}
                          className="bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg px-1.5 py-1 text-slate-800 text-xs cursor-pointer font-medium"
                        >
                          <option value="alarm">{lang === 'fa' ? 'اعلام' : 'Alarm'}</option>
                          <option value="fighting">{lang === 'fa' ? 'اطفاء' : 'Fighting'}</option>
                        </select>
                      </td>
                      <td className="p-1.5">
                        <input
                          type="text"
                          value={eq.nfpa_reference}
                          onChange={(e) => handleCellEdit(absoluteIdx, 'nfpa_reference', e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg px-2 py-1 text-amber-700 font-bold text-xs"
                        />
                      </td>
                      <td className="p-1.5">
                        <input
                          type="text"
                          value={eq.technical_specifications}
                          onChange={(e) => handleCellEdit(absoluteIdx, 'technical_specifications', e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg px-2 py-1 text-slate-600 text-xs"
                        />
                      </td>
                      {currentUser.price_access === 1 && (
                        <>
                          <td className="p-1.5">
                            <input
                              type="number"
                              value={eq.price === null ? '' : eq.price}
                              onChange={(e) => handleCellEdit(absoluteIdx, 'price', e.target.value)}
                              placeholder="—"
                              className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg px-2 py-1 text-emerald-700 font-bold text-left text-xs"
                            />
                          </td>
                          <td className="p-1.5 text-center">
                            <select
                              value={eq.currency}
                              onChange={(e) => handleCellEdit(absoluteIdx, 'currency', e.target.value)}
                              className="bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg px-1 py-1 text-slate-800 text-xs cursor-pointer"
                            >
                              <option value="USD">USD</option>
                              <option value="EUR">EUR</option>
                              <option value="GBP">GBP</option>
                              <option value="Rials">Rials</option>
                              <option value="AED">AED</option>
                            </select>
                          </td>
                        </>
                      )}
                      <td className="p-1.5 text-center">
                        <input
                          type="text"
                          value={eq.created_at || ''}
                          onChange={(e) => handleCellEdit(absoluteIdx, 'created_at', e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg px-2 py-1 text-slate-400 text-center text-[10px]"
                          dir="ltr"
                        />
                      </td>
                    </tr>
                  )})
                )}
              </tbody>
            </table>
          </div>
          
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
        </motion.div>
      )}

      {/* Send Equipment Specs Email Modal */}
      {emailEquipment && (
        <SendEmailModal
          isOpen={!!emailEquipment}
          onClose={() => setEmailEquipment(null)}
          type="equipment"
          data={emailEquipment}
          lang={lang}
        />
      )}
    </motion.div>
  );
};
