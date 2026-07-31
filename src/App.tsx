/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  motion, 
  AnimatePresence 
} from 'motion/react';
import { 
  Search, 
  Database, 
  Send, 
  Mic, 
  Plus, 
  Trash2, 
  Download, 
  RefreshCw, 
  X, 
  Lock, 
  Unlock, 
  LogOut, 
  KeyRound, 
  FileText, 
  FileUp, 
  Sparkles, 
  Menu, 
  Share2, 
  MoreHorizontal, 
  ShieldAlert, 
  Users, 
  Cpu, 
  Clock, 
  HelpCircle,
  TrendingUp,
  FileDown,
  ChevronRight,
  PlusCircle,
  Eye,
  EyeOff,
  UserPlus,
  LayoutDashboard,
  MessageSquare,
  FileSpreadsheet
} from 'lucide-react';
import * as XLSX from 'xlsx';

// --- Types ---
interface User {
  id: number;
  username: string;
  role: 'admin' | 'user';
  system_access: 'alarm' | 'fighting' | 'both';
  price_access: number;
}

interface Equipment {
  id?: number;
  part_number: string;
  brand: string;
  equipment_type: string;
  price: number | null;
  currency: string;
  nfpa_reference: string;
  technical_specifications: string;
  source_file?: string;
  system_type: 'alarm' | 'fighting';
  created_at?: string;
  created_by?: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatArchive {
  id: number;
  title: string;
  history: ChatMessage[];
  updated_at: string;
}

interface AIConfig {
  api_key: string;
  base_url: string;
  model_name: string;
}

export default function App() {
  // --- Auth State ---
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('fg_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // --- Layout State ---
  const [activeTab, setActiveTab] = useState<'dashboard' | 'assistant' | 'database' | 'users'>('dashboard');
  const [systemFilter, setSystemFilter] = useState<'all' | 'alarm' | 'fighting'>('all');
  const [lang, setLang] = useState<'fa' | 'en'>('fa');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [aiConfigModalOpen, setAiConfigModalOpen] = useState(false);
  const [pwdModalOpen, setPwdModalOpen] = useState(false);

  // --- Change Pwd Form ---
  const [currPassword, setCurrPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState('');

  // --- Global DB States ---
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [documents, setDocuments] = useState<{ id: number; file_name: string }[]>([]);
  const [aiConfig, setAiConfig] = useState<AIConfig>({
    api_key: '',
    base_url: 'https://openrouter.ai/api/v1',
    model_name: 'google/gemma-4-31b-it:free'
  });

  // --- Search & Filters ---
  const [searchQuery, setSearchQuery] = useState('');
  const [brandFilter, setBrandFilter] = useState('همه');

  // --- Engineering Assistant Chat State ---
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [currentChatId, setCurrentChatId] = useState<number | null>(null);
  const [chatArchives, setChatArchives] = useState<ChatArchive[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [attachedFile, setAttachedFile] = useState<{ name: string; base64: string; mimeType: string } | null>(null);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // --- DB Feeder State ---
  const [uploadCategory, setUploadCategory] = useState<'alarm' | 'fighting'>('alarm');
  const [feedFile, setFeedFile] = useState<File | null>(null);
  const [isFeeding, setIsFeeding] = useState(false);
  const [feedSuccessMsg, setFeedSuccessMsg] = useState('');
  const [feedErrorMsg, setFeedErrorMsg] = useState('');

  // --- Spreadsheet Editor State ---
  const [editedEquipment, setEditedEquipment] = useState<Equipment[]>([]);
  const [isSavingDb, setIsSavingDb] = useState(false);

  // --- Manual Equipment Form State ---
  const [newEqForm, setNewEqForm] = useState({
    part_number: '',
    brand: '',
    equipment_type: '',
    price: '',
    currency: 'USD',
    nfpa_reference: '',
    technical_specifications: '',
    system_type: 'alarm' as 'alarm' | 'fighting'
  });
  const [formMsg, setFormMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // --- User Manager State ---
  const [newUserForm, setNewUserForm] = useState({
    username: '',
    password: '',
    role: 'user' as 'admin' | 'user',
    system_access: 'alarm' as 'alarm' | 'fighting' | 'both',
    price_access: true
  });
  const [userFormError, setUserFormError] = useState('');

  // --- Initial Loading ---
  const [loading, setLoading] = useState(true);

  // Auto scroll chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  // Load backend data upon authentication
  useEffect(() => {
    if (currentUser) {
      loadAllData(true);
    } else {
      setLoading(false);
    }
  }, [currentUser]);

  const loadAllData = async (showLoading = true) => {
    if (!currentUser) return;
    if (showLoading) {
      setLoading(true);
    }
    try {
      // 1. Fetch Equipment based on current user role/system access
      const eqRes = await fetch(`/api/equipment?system_access=${currentUser.system_access}&price_access=${currentUser.price_access}`);
      if (eqRes.ok) {
        const eqData = await eqRes.json();
        setEquipment(eqData);
        setEditedEquipment(eqData); // init spreadsheet rows
      }

      // 2. Fetch Chat Archives
      const chatRes = await fetch(`/api/chat-archives/${currentUser.id}`);
      if (chatRes.ok) {
        const chats = await chatRes.json();
        setChatArchives(chats);
      }

      // 3. Fetch AI Settings
      const aiRes = await fetch('/api/ai/config');
      if (aiRes.ok) {
        const config = await aiRes.json();
        setAiConfig(config);
      }

      // Fetch Documents
      const docRes = await fetch('/api/documents');
      if (docRes.ok) {
        setDocuments(await docRes.json());
      }

      // 4. If Admin, Fetch Users
      if (currentUser.role === 'admin') {
        const usersRes = await fetch('/api/users');
        if (usersRes.ok) {
          const uData = await usersRes.json();
          setUsers(uData);
        }
      }
    } catch (e) {
      console.error('Error loading backend data:', e);
    } finally {
      setLoading(false);
    }
  };

  // --- Handler Functions ---

  // Auth: Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!loginUsername || !loginPassword) {
      setAuthError('نام کاربری و رمز عبور الزامی است.');
      return;
    }
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername, password: loginPassword })
      });
      if (res.ok) {
        const user: User = await res.json();
        setCurrentUser(user);
        localStorage.setItem('fg_user', JSON.stringify(user));
        setLoginUsername('');
        setLoginPassword('');
      } else {
        const err = await res.json();
        setAuthError(err.error || 'خطا در برقراری ارتباط با سرور.');
      }
    } catch (err) {
      setAuthError('خطا در دسترسی به شبکه.');
    }
  };

  // Auth: Change password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError('');
    setPwdSuccess('');
    if (!currPassword || !newPassword || !confirmPassword) {
      setPwdError('لطفا تمام فیلدها را پر کنید.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdError('رمز عبور جدید و تکرار آن همخوانی ندارند.');
      return;
    }
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser?.id,
          currentPassword: currPassword,
          newPassword: newPassword
        })
      });
      if (res.ok) {
        setPwdSuccess('✅ رمز عبور با موفقیت تغییر یافت.');
        setCurrPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setPwdModalOpen(false), 1500);
      } else {
        const err = await res.json();
        setPwdError(err.error || 'خطا در تغییر رمز عبور.');
      }
    } catch (e) {
      setPwdError('خطا در ارتباط با شبکه.');
    }
  };

  // Auth: Logout
  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('fg_user');
    // Clear states
    setEquipment([]);
    setChatHistory([]);
    setChatArchives([]);
    setUsers([]);
    setCurrentChatId(null);
  };

  // AI Configuration Save
  const handleSaveAIConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/ai/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(aiConfig)
      });
      if (res.ok) {
        setAiConfigModalOpen(false);
        loadAllData(false);
      }
    } catch (e) {
      console.log('خطا در ذخیره تنظیمات هوش مصنوعی.');
    }
  };

  // Create User (Admin Only)
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserFormError('');
    if (!newUserForm.username || !newUserForm.password) {
      setUserFormError('نام کاربری و رمز عبور الزامی است.');
      return;
    }
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUserForm)
      });
      if (res.ok) {
        setNewUserForm({ username: '', password: '', role: 'user', system_access: 'alarm', price_access: true });
        loadAllData(false);
      } else {
        const err = await res.json();
        setUserFormError(err.error || 'خطا در ثبت کاربر.');
      }
    } catch (e) {
      setUserFormError('خطا در برقراری ارتباط با شبکه.');
    }
  };

  // Delete User
  const handleDeleteUser = async (id: number) => {
    
    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      if (res.ok) {
        loadAllData(false);
      }
    } catch (e) {
      console.log('خطا در حذف کاربر.');
    }
  };

  // Update User Permissions
  const handleUpdateUserAccess = async (user: User, system: 'alarm' | 'fighting' | 'both', price: number, role: 'admin' | 'user') => {
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, system_access: system, price_access: price === 1 })
      });
      if (res.ok) {
        loadAllData(false);
      }
    } catch (e) {
      console.log('خطا در بروزرسانی دسترسی کاربر.');
    }
  };

  // File Upload Helper (to Base64)
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64Str = (reader.result as string).split(',')[1];
        resolve(base64Str);
      };
      reader.onerror = error => reject(error);
    });
  };

  // Manual Add Equipment
  const handleAddEquipmentManual = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormMsg(null);
    if (!newEqForm.part_number || !newEqForm.brand || !newEqForm.equipment_type) {
      setFormMsg({ type: 'error', text: 'پارت‌نامبر، برند و نوع تجهیز الزامی است.' });
      return;
    }
    try {
      const res = await fetch('/api/equipment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newEqForm,
          created_by: currentUser?.username
        })
      });
      if (res.ok) {
        setFormMsg({ type: 'success', text: '✅ کالا به همراه جزییات فنی با موفقیت ذخیره شد.' });
        setNewEqForm({
          part_number: '',
          brand: '',
          equipment_type: '',
          price: '',
          currency: 'USD',
          nfpa_reference: '',
          technical_specifications: '',
          system_type: 'alarm'
        });
        loadAllData(false);
      } else {
        const err = await res.json();
        setFormMsg({ type: 'error', text: err.error || 'خطا در ثبت اطلاعات کالا.' });
      }
    } catch (e) {
      setFormMsg({ type: 'error', text: 'خطا در شبکه.' });
    }
  };

  // Excel Importer & Smart DB Memory Feeder
  const handleSmartFeed = async () => {
    if (!feedFile) {
      setFeedErrorMsg('ابتدا فایل مرجع خود را انتخاب کنید.');
      return;
    }
    setIsFeeding(true);
    setFeedSuccessMsg('');
    setFeedErrorMsg('');
    try {
      const base64 = await fileToBase64(feedFile);
      const res = await fetch('/api/ai/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileBase64: base64,
          fileName: feedFile.name,
          mimeType: feedFile.type,
          uploadCategory,
          username: currentUser?.username
        })
      });
      if (res.ok) {
        const result = await res.json();
        setFeedSuccessMsg(`✅ آموزش هوشمند تکمیل شد!\n🔸 تجهیزات استخراج و همگام‌سازی شده: ${result.equipmentCount} مورد\n🔸 استانداردهای ثبت شده در حافظه مفهومی: ${result.knowledgeCount} مورد`);
        setFeedFile(null);
        loadAllData(false);
      } else {
        const err = await res.json();
        setFeedErrorMsg(err.error || 'خطا در استخراج مشخصات از سند.');
      }
    } catch (e: any) {
      setFeedErrorMsg(`خطا در پردازش اطلاعات: ${e.message}`);
    } finally {
      setIsFeeding(false);
    }
  };

  // Spreadsheet: handle inline edits
  const handleCellEdit = (index: number, field: keyof Equipment, value: any) => {
    const updated = [...editedEquipment];
    if (field === 'price') {
      updated[index] = { ...updated[index], price: value === '' ? null : Number(value) };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setEditedEquipment(updated);
  };

  // Spreadsheet: Delete Row
  const handleSpreadsheetDelete = (index: number) => {
    const updated = [...editedEquipment];
    updated.splice(index, 1);
    setEditedEquipment(updated);
  };

  // Spreadsheet: Add Row
  const handleSpreadsheetAddRow = () => {
    const newRow: Equipment = {
      part_number: '',
      brand: '',
      equipment_type: '',
      price: null,
      currency: 'USD',
      nfpa_reference: '',
      technical_specifications: '',
      system_type: currentUser?.system_access === 'both' ? 'alarm' : currentUser?.system_access as any
    };
    setEditedEquipment([newRow, ...editedEquipment]);
  };

  // Spreadsheet: Save changes
  const handleSpreadsheetSave = async () => {
    setIsSavingDb(true);
    try {
      const res = await fetch('/api/equipment/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: editedEquipment,
          system_access: currentUser?.system_access,
          price_access: currentUser?.price_access,
          username: currentUser?.username
        })
      });
      if (res.ok) {
        console.log('✅ پایگاه داده تجهیزات با موفقیت همگام‌سازی و ذخیره شد.');
        loadAllData(false);
      } else {
        const err = await res.json();
        console.log(`❌ خطا در ذخیره: ${err.error}`);
      }
    } catch (e) {
      console.log('خطا در همگام‌سازی با سرور.');
    } finally {
      setIsSavingDb(false);
    }
  };

  // Assistant: Chat file attach helper
  const handleChatFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const base64 = await fileToBase64(file);
    setAttachedFile({
      name: file.name,
      base64,
      mimeType: file.type
    });
  };

  // Assistant: Submit Chat
  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() && !attachedFile) return;

    const userMsg = chatInput;
    setChatInput('');
    setIsSendingMessage(true);

    // Append user message instantly
    const updatedHistory: ChatMessage[] = [...chatHistory, { role: 'user', content: userMsg }];
    setChatHistory(updatedHistory);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser?.id,
          query: userMsg,
          history: chatHistory,
          systemAccess: currentUser?.system_access,
          priceAccess: currentUser?.price_access,
          fileBase64: attachedFile?.base64 || null,
          mimeType: attachedFile?.mimeType || null,
          chatId: currentChatId
        })
      });

      if (res.ok) {
        const result = await res.json();
        setChatHistory(result.history);
        setCurrentChatId(result.chatId);
        setAttachedFile(null);
        // Reload archives in background
        loadAllData(false);
      } else {
        const err = await res.json();
        setChatHistory([...updatedHistory, { role: 'assistant', content: `خطا در دریافت پاسخ: ${err.error || 'خطای ناشناخته'}` }]);
      }
    } catch (e: any) {
      setChatHistory([...updatedHistory, { role: 'assistant', content: `خطای شبکه: ${e.message}` }]);
    } finally {
      setIsSendingMessage(false);
    }
  };

  // Start new conversation
  const handleStartNewChat = () => {
    setCurrentChatId(null);
    setChatHistory([]);
    setAttachedFile(null);
  };

  // Load archived chat
  const handleLoadArchive = (archive: ChatArchive) => {
    setCurrentChatId(archive.id);
    setChatHistory(archive.history);
  };

  // Delete Chat Archive
  const handleDeleteArchive = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      const res = await fetch(`/api/chat-archives/${id}`, { method: 'DELETE' });
      if (res.ok) {
        if (currentChatId === id) {
          handleStartNewChat();
        }
        loadAllData(false);
      }
    } catch (e) {
      console.log('خطا در حذف آرشیو.');
    }
  };

  // Export to Excel File (BOM download)
  const handleExportExcel = () => {
    const filtered = filterEquipment();
    
    // Prepare table columns translated for export
    const exportData = filtered.map(e => ({
      'پارت نامبر': e.part_number,
      'برند': e.brand,
      'نوع تجهیز': e.equipment_type,
      'سیستم': e.system_type === 'alarm' ? 'اعلام حریق' : 'اطفاء حریق',
      'مرجع استاندارد NFPA': e.nfpa_reference || '',
      'مشخصات فنی': e.technical_specifications,
      'قیمت': currentUser?.price_access === 1 ? (e.price || 'ثبت نشده') : 'محرمانه',
      'ارز': currentUser?.price_access === 1 ? e.currency : 'محرمانه',
      'تاریخ ثبت': e.created_at || '',
      'کارشناس ثبت': e.created_by || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'لیست تجهیزات');
    worksheet['!dir'] = 'rtl';
    XLSX.writeFile(workbook, `F_and_G_BOM_Export_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  // Helper: Filter equipment list
  const filterEquipment = () => {
    return equipment.filter(item => {
      const matchSearch = item.part_number.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.brand.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.equipment_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.technical_specifications.toLowerCase().includes(searchQuery.toLowerCase());
      const matchBrand = brandFilter === 'همه' || item.brand === brandFilter;
      const matchSystem = systemFilter === 'all' || item.system_type === systemFilter;
      return matchSearch && matchBrand && matchSystem;
    });
  };

  // Unique brand options
  const getBrandOptions = () => {
    const brands = equipment.map(e => e.brand).filter((v, i, self) => self.indexOf(v) === i && v);
    return ['همه', ...brands];
  };

  if (loading && currentUser) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center text-slate-800" style={{ backgroundColor: '#FFFFFF' }} dir="rtl">
        <div className="relative z-10 text-center bg-white backdrop-blur-md p-8 rounded-[32px] border border-white/50 shadow-2xl">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
            className="w-16 h-16 border-4 border-t-blue-600 border-r-transparent border-b-indigo-600 border-l-transparent rounded-full mx-auto mb-6"
          />
          <h2 className="text-xl font-bold font-sans tracking-wide mb-2 text-slate-800">در حال بارگذاری پایگاه داده F&G</h2>
          <p className="text-slate-500 text-sm">لطفاً چند لحظه شکیبا باشید...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col text-[#1d1d1f] font-sans selection:bg-[#0071e3]/10 selection:text-[#0071e3] overflow-x-hidden bg-[#f5f5f7]" dir={lang === 'fa' ? 'rtl' : 'ltr'}>

      {/* --- NOT LOGGED IN VIEW --- */}
      <AnimatePresence>
        {!currentUser && (
          <div className="flex-1 flex items-center justify-center p-4 relative z-10 min-h-screen">
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-md bg-white border border-[#e5e5e7] p-8 rounded-3xl shadow-sm relative overflow-hidden text-[#1d1d1f]"
            >
              {/* Logo & Brand */}
              <div className="text-center mb-8 relative z-10">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#f5f5f7] border border-[#e5e5e7] text-[#0071e3] mb-4 shadow-none">
                  <ShieldAlert className="w-8 h-8 text-[#0071e3]" />
                </div>
                <h1 className="text-2xl font-semibold tracking-tight text-[#1d1d1f] font-sans mb-1">سامانه مهندسی F&G</h1>
                <p className="text-xs font-normal text-[#86868b] uppercase tracking-wider mt-1">Fire & Gas Engineering Platform</p>
              </div>

              {/* Form */}
              <form onSubmit={handleLogin} className="space-y-4 relative z-10">
                <div>
                  <label className="block text-xs font-medium text-[#1d1d1f]/80 mb-1.5 mr-1">نام کاربری</label>
                  <input 
                    type="text"
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    placeholder="نام کاربری سیستم"
                    className="w-full bg-[#f5f5f7] border border-[#e5e5e7] rounded-xl px-4 py-3 text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:border-[#0071e3] focus:bg-white transition-all text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#1d1d1f]/80 mb-1.5 mr-1">رمز عبور</label>
                  <input 
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#f5f5f7] border border-[#e5e5e7] rounded-xl px-4 py-3 text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:border-[#0071e3] focus:bg-white transition-all text-sm"
                  />
                </div>

                {authError && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold text-center"
                  >
                    ⚠️ {authError}
                  </motion.div>
                )}

                <button
                  type="submit"
                  className="w-full apple-btn-primary py-3 text-sm font-medium mt-2 cursor-pointer shadow-none"
                >
                  ورود به حساب کاربری
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- LOGGED IN INTERFACE --- */}
      {currentUser && (
        <div className="flex-1 flex flex-col w-full min-h-screen bg-[#f5f5f7]">
          
          {/* Top Apple Global Navigation Header */}
          <header className="w-full apple-nav sticky top-0 z-50 px-4 md:px-8 py-2.5 flex items-center justify-between text-xs font-normal text-[#1d1d1f]">
            <div className="flex items-center gap-6 overflow-x-auto no-scrollbar">
              <button onClick={() => { setActiveTab('dashboard'); setSystemFilter('all'); }} className="flex items-center gap-2 font-bold text-sm tracking-tight hover:opacity-80 transition-opacity">
                <ShieldAlert className="w-4 h-4 text-[#0071e3]" />
                <span className="font-semibold text-[#1d1d1f] whitespace-nowrap">F&G Platform</span>
              </button>
              
              <div className="flex items-center gap-5 text-[12px] whitespace-nowrap text-[#1d1d1f]/80">
                <button onClick={() => { setActiveTab('dashboard'); setSystemFilter('all'); }} className={`hover:text-black transition-colors ${activeTab === 'dashboard' && systemFilter === 'all' ? 'text-[#0071e3] font-semibold' : ''}`}>
                  {lang === 'fa' ? 'کاتالوگ کالاها' : 'Catalog'}
                </button>
                <button onClick={() => { setActiveTab('dashboard'); setSystemFilter('alarm'); }} className={`hover:text-black transition-colors ${activeTab === 'dashboard' && systemFilter === 'alarm' ? 'text-[#0071e3] font-semibold' : ''}`}>
                  {lang === 'fa' ? 'سیستم‌های اعلام' : 'Fire Alarm'}
                </button>
                <button onClick={() => { setActiveTab('dashboard'); setSystemFilter('fighting'); }} className={`hover:text-black transition-colors ${activeTab === 'dashboard' && systemFilter === 'fighting' ? 'text-[#0071e3] font-semibold' : ''}`}>
                  {lang === 'fa' ? 'سیستم‌های اطفاء' : 'Fire Fighting'}
                </button>
                <button onClick={() => setActiveTab('assistant')} className={`hover:text-black transition-colors ${activeTab === 'assistant' ? 'text-[#0071e3] font-semibold' : ''}`}>
                  {lang === 'fa' ? 'دستیار AI' : 'AI Assistant'}
                </button>
                <button onClick={() => setActiveTab('database')} className={`hover:text-black transition-colors ${activeTab === 'database' ? 'text-[#0071e3] font-semibold' : ''}`}>
                  {lang === 'fa' ? 'پایگاه داده' : 'Database'}
                </button>
                {currentUser?.role === 'admin' && (
                  <button onClick={() => setActiveTab('users')} className={`hover:text-black transition-colors ${activeTab === 'users' ? 'text-[#0071e3] font-semibold' : ''}`}>
                    {lang === 'fa' ? 'مدیریت کاربران' : 'Users'}
                  </button>
                )}
                <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="hover:text-black transition-colors flex items-center gap-1">
                  <Menu className="w-3.5 h-3.5" />
                  {lang === 'fa' ? 'آرشیو چت‌ها' : 'Archives'}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button onClick={() => setLang(lang === 'fa' ? 'en' : 'fa')} className="apple-badge hover:bg-[#d2d2d7] transition-colors cursor-pointer">
                {lang === 'fa' ? 'EN' : 'FA'}
              </button>
              <button onClick={() => setPwdModalOpen(true)} className="p-1.5 hover:bg-[#e8e8ed] rounded-full transition-colors" title="تغییر رمز عبور">
                <KeyRound className="w-4 h-4 text-[#1d1d1f]" />
              </button>
              {currentUser?.role === 'admin' && (
                <button onClick={() => setAiConfigModalOpen(true)} className="p-1.5 hover:bg-[#e8e8ed] rounded-full transition-colors" title="تنظیمات هوش مصنوعی">
                  <Cpu className="w-4 h-4 text-[#1d1d1f]" />
                </button>
              )}
              <button onClick={handleLogout} className="p-1.5 hover:bg-rose-100 rounded-full transition-colors text-rose-600" title="خروج">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* Main Layout Body */}
          <div className="flex-1 flex w-full relative min-h-0">
            
            {/* Drawer Sidebar for Archives & Catalog Feed */}
            <AnimatePresence>
              {isSidebarOpen && (
                <motion.aside
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 320, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="bg-white border-l border-[#e5e5e7] flex flex-col overflow-hidden shrink-0 h-full p-6 space-y-6 z-20 shadow-sm"
                >
                  {/* Current Profile Card inside Sidebar */}
                  <div>
                    <h3 className="text-[11px] font-semibold text-[#86868b] mb-2 uppercase tracking-wider">پروفایل کاربری</h3>
                    <div className="bg-[#f5f5f7] border border-[#e5e5e7] rounded-2xl p-4 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold text-[#1d1d1f] truncate">{currentUser.username}</h4>
                        <span className="text-[10px] text-[#86868b]">
                          {currentUser.role === 'admin' ? 'مدیر سیستم' : 'کارشناس فنی'}
                        </span>
                      </div>
                      <div className="w-9 h-9 rounded-full bg-[#0071e3] text-white flex items-center justify-center font-semibold text-sm">
                        {currentUser.username.charAt(0).toUpperCase()}
                      </div>
                    </div>
                  </div>

                  {/* Smart DB Feeder */}
                  <div className="space-y-3">
                    <h3 className="text-[11px] font-semibold text-[#86868b] uppercase tracking-wider">بارگذاری هوشمند کاتالوگ</h3>
                    <div className="bg-[#f5f5f7] border border-[#e5e5e7] p-4 rounded-2xl space-y-3">
                      <p className="text-[11px] text-[#86868b] leading-relaxed">
                        بارگذاری عکس یا کاتالوگ جهت استخراج هوشمند پارت‌نامبر و برند:
                      </p>

                      <div className="space-y-2">
                        <div className="flex bg-white rounded-xl p-0.5 border border-[#e5e5e7]">
                          <button
                            type="button"
                            onClick={() => setUploadCategory('alarm')}
                            className={`flex-1 text-[11px] font-medium py-1.5 rounded-lg transition-all cursor-pointer ${uploadCategory === 'alarm' ? 'bg-[#0071e3] text-white' : 'text-[#86868b] hover:text-[#1d1d1f]'}`}
                          >
                            اعلام حریق
                          </button>
                          <button
                            type="button"
                            onClick={() => setUploadCategory('fighting')}
                            className={`flex-1 text-[11px] font-medium py-1.5 rounded-lg transition-all cursor-pointer ${uploadCategory === 'fighting' ? 'bg-[#0071e3] text-white' : 'text-[#86868b] hover:text-[#1d1d1f]'}`}
                          >
                            اطفاء حریق
                          </button>
                        </div>

                        <div className="relative">
                          <input 
                            type="file" 
                            id="db-feeder-file"
                            accept=".png,.jpg,.jpeg,.pdf"
                            onChange={(e) => setFeedFile(e.target.files?.[0] || null)}
                            className="hidden"
                          />
                          <label 
                            htmlFor="db-feeder-file"
                            className="w-full flex flex-col items-center justify-center border border-dashed border-[#d2d2d7] rounded-xl p-4 hover:border-[#0071e3] bg-white transition-all cursor-pointer"
                          >
                            <FileUp className="w-5 h-5 text-[#0071e3] mb-1" />
                            <span className="text-[11px] text-[#1d1d1f] font-medium text-center truncate max-w-[200px]">
                              {feedFile ? feedFile.name : 'انتخاب سند (PDF/عکس)'}
                            </span>
                          </label>
                        </div>

                        {/* Feedback msgs */}
                        {feedSuccessMsg && (
                          <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-800 font-medium">
                            {feedSuccessMsg}
                          </div>
                        )}
                        {feedErrorMsg && (
                          <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-rose-700 font-medium">
                            {feedErrorMsg}
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={handleSmartFeed}
                          disabled={isFeeding || !feedFile}
                          className={`w-full py-2 rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${isFeeding ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : (feedFile ? 'apple-btn-primary cursor-pointer' : 'bg-slate-200 text-slate-400 cursor-not-allowed')}`}
                        >
                          {isFeeding ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              در حال آموزش...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3.5 h-3.5 text-white" />
                              شروع پردازش
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Chat Archives List */}
                  <div className="flex-1 flex flex-col overflow-hidden min-h-0">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-[11px] font-semibold text-[#86868b] uppercase tracking-wider">تاریخچه چت‌ها</h3>
                      <button
                        type="button"
                        onClick={handleStartNewChat}
                        className="text-[11px] text-[#0071e3] font-medium hover:underline cursor-pointer"
                      >
                        جدید ➕
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                      {chatArchives.length === 0 ? (
                        <div className="text-center py-6 text-[11px] text-[#86868b]">
                          آرشیوی یافت نشد.
                        </div>
                      ) : (
                        chatArchives.map((archive) => (
                          <div
                            key={archive.id}
                            onClick={() => {
                              handleLoadArchive(archive);
                              setActiveTab('assistant');
                            }}
                            className={`p-3 rounded-2xl border flex items-center justify-between group cursor-pointer transition-all ${currentChatId === archive.id ? 'bg-[#f5f5f7] border-[#0071e3] text-[#0071e3] font-medium' : 'bg-white border-[#e5e5e7] text-[#1d1d1f] hover:bg-[#f5f5f7]'}`}
                          >
                            <span className="text-[11px] truncate pr-2 max-w-[190px]">
                              🗨️ {archive.title}
                            </span>
                            <button
                              type="button" 
                              onClick={(e) => handleDeleteArchive(archive.id, e)}
                              className="text-[#86868b] hover:text-rose-600 p-1 rounded-lg hover:bg-slate-200 opacity-0 group-hover:opacity-100 transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </motion.aside>
              )}
            </AnimatePresence>

            {/* Main Stage */}
            <main className="flex-1 flex flex-col min-w-0 bg-[#f5f5f7] overflow-y-auto custom-scrollbar">
              
              {/* View Rendering */}
              <div className="flex-1 p-4 md:p-8 w-full space-y-6">
                  
                  {/* 1. VIEW: DASHBOARD */}
                  {activeTab === 'dashboard' && (
                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-8"
                    >
                      {/* Apple Style F&G Platform Hero Banner */}
                      <div className="bg-white rounded-3xl border border-[#e5e5e7] p-8 md:p-10 text-center relative overflow-hidden shadow-xs space-y-5">
                        <motion.div
                          initial={{ opacity: 0, scale: 0.98 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.4 }}
                          className="max-w-3xl mx-auto space-y-4"
                        >
                          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#f5f5f7] border border-[#e5e5e7] text-xs font-semibold text-[#0071e3]">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>{lang === 'fa' ? 'پلتفرم مهندسی ایمنی و اعلام و اطفاء حریق' : 'Fire & Gas Engineering Hub'}</span>
                          </div>

                          <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-[#1d1d1f]">
                            {lang === 'fa' ? 'سامانه مهندسی F&G' : 'F&G Engineering Platform'}
                          </h1>
                          <p className="text-base sm:text-lg text-[#1d1d1f]/80 font-normal leading-relaxed max-w-2xl mx-auto">
                            {lang === 'fa' 
                              ? 'استعلام هوشمند مشخصات فنی تجهیزات، استانداردهای کدهای NFPA، مدیریت کاتالوگ‌ها و صدور صورت کالا (BOM)' 
                              : 'Smart Equipment Specifications Query, NFPA Standards, Catalog Management & Equipment BOM'}
                          </p>

                          <div className="flex items-center justify-center gap-3 pt-2 flex-wrap">
                            <button
                              type="button"
                              onClick={handleExportExcel}
                              className="apple-btn-primary cursor-pointer flex items-center gap-2"
                            >
                              <FileSpreadsheet className="w-4 h-4" />
                              <span>{lang === 'fa' ? 'دانلود اکسل BOM' : 'Export BOM Excel'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setActiveTab('assistant')}
                              className="apple-btn-secondary cursor-pointer flex items-center gap-2"
                            >
                              <MessageSquare className="w-4 h-4 text-[#0071e3]" />
                              <span>{lang === 'fa' ? 'مشاوره دستیار AI' : 'Consult AI Assistant'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={loadAllData}
                              className="apple-btn-secondary cursor-pointer flex items-center gap-1.5"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              <span>{lang === 'fa' ? 'بروزرسانی داده‌ها' : 'Refresh Data'}</span>
                            </button>
                          </div>

                          {/* Apple-style Quick Feature Badges */}
                          <div className="pt-4 flex items-center justify-center gap-3 flex-wrap text-xs text-[#86868b]">
                            <span className="bg-[#f5f5f7] border border-[#e5e5e7] px-3 py-1 rounded-full font-medium">✓ NFPA 72 & 2001 Compliant</span>
                            <span className="bg-[#f5f5f7] border border-[#e5e5e7] px-3 py-1 rounded-full font-medium">✓ {equipment.length} {lang === 'fa' ? 'تجهیز ثبت شده' : 'Registered Items'}</span>
                            <span className="bg-[#f5f5f7] border border-[#e5e5e7] px-3 py-1 rounded-full font-medium">✓ {new Set(equipment.map(e => e.brand)).size} {lang === 'fa' ? 'برند معتبر' : 'Approved Brands'}</span>
                          </div>
                        </motion.div>
                      </div>

                      {/* Apple Stats Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="apple-card p-5 flex items-center gap-4">
                          <div className="w-11 h-11 rounded-2xl bg-[#f5f5f7] flex items-center justify-center text-[#0071e3] border border-[#e5e5e7]">
                            <Database className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="text-2xl font-semibold text-[#1d1d1f]">{filterEquipment().length}</h3>
                            <p className="text-[11px] font-normal text-[#86868b]">تجهیزات مجاز سیستم</p>
                          </div>
                        </div>

                        <div className="apple-card p-5 flex items-center gap-4">
                          <div className="w-11 h-11 rounded-2xl bg-[#f5f5f7] flex items-center justify-center text-[#0071e3] border border-[#e5e5e7]">
                            <TrendingUp className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="text-2xl font-semibold text-[#1d1d1f]">{new Set(equipment.map(e => e.brand)).size}</h3>
                            <p className="text-[11px] font-normal text-[#86868b]">برندهای فعال</p>
                          </div>
                        </div>

                        <div className="apple-card p-5 flex items-center gap-4">
                          <div className="w-11 h-11 rounded-2xl bg-[#f5f5f7] flex items-center justify-center text-[#0071e3] border border-[#e5e5e7]">
                            <HelpCircle className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="text-2xl font-semibold text-[#1d1d1f]">
                              {equipment.filter(e => e.system_type === 'alarm').length} / {equipment.filter(e => e.system_type === 'fighting').length}
                            </h3>
                            <p className="text-[11px] font-normal text-[#86868b]">تفکیک سیستم (اعلام / اطفاء)</p>
                          </div>
                        </div>
                      </div>

                    {/* Filters & Data Grid Table */}
                    <div className="bg-white p-6 rounded-3xl border border-[#e5e5e7] shadow-xs space-y-5">
                      <div className="flex flex-col sm:flex-row items-center gap-3 justify-between">
                        <div>
                          <h3 className="text-base font-semibold text-[#1d1d1f]">{lang === 'fa' ? 'فهرست تجهیزات و کالاهای ثبت‌شده' : 'Equipment Catalog'}</h3>
                          <p className="text-xs text-[#86868b]">{lang === 'fa' ? 'نمایش مشخصات فنی، پارت‌نامبرها و استانداردهای کدهای مربوطه' : 'Technical specifications, part numbers and standards'}</p>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
                          {/* Search Input */}
                          <div className="relative flex-1 sm:w-72">
                            <Search className="w-4 h-4 text-[#86868b] absolute top-3 right-3.5" />
                            <input
                              type="text"
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              placeholder={lang === 'fa' ? "جستجو پارت‌نامبر، برند، مشخصات..." : "Search part number, brand..."}
                              className="w-full bg-[#f5f5f7] border border-[#e5e5e7] rounded-xl pr-10 pl-4 py-2 text-xs text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:border-[#0071e3] focus:bg-white transition-all"
                            />
                          </div>

                          {/* Brand select */}
                          <select
                            value={brandFilter}
                            onChange={(e) => setBrandFilter(e.target.value)}
                            className="bg-[#f5f5f7] border border-[#e5e5e7] text-[#1d1d1f] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#0071e3] focus:bg-white transition-all cursor-pointer"
                          >
                            {getBrandOptions().map(b => (
                              <option key={b} value={b} className="bg-white text-[#1d1d1f]">{b}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Equipment List Grid */}
                      <div className="overflow-x-auto border border-[#e5e5e7] bg-white rounded-2xl shadow-none">
                        <table className="w-full text-right text-xs">
                          <thead className="bg-[#f5f5f7] text-[#1d1d1f] font-semibold border-b border-[#e5e5e7]">
                            <tr>
                              <th className="p-0 border-x border-[#e5e5e7]/50"><div className="p-3.5 resize-x overflow-hidden min-w-[50px] max-w-[80px] text-center" style={{ direction: lang === 'fa' ? 'rtl' : 'ltr' }}>{lang === 'fa' ? 'ردیف' : 'Row'}</div></th>
                              <th className="p-0 border-x border-[#e5e5e7]/50"><div className="p-3.5 resize-x overflow-hidden min-w-[120px]" style={{ direction: lang === 'fa' ? 'rtl' : 'ltr' }}>{lang === 'fa' ? 'پارت نامبر' : 'Part Number'}</div></th>
                              <th className="p-0 border-x border-[#e5e5e7]/50"><div className="p-3.5 resize-x overflow-hidden min-w-[100px]" style={{ direction: lang === 'fa' ? 'rtl' : 'ltr' }}>{lang === 'fa' ? 'برند' : 'Brand'}</div></th>
                              <th className="p-0 border-x border-[#e5e5e7]/50"><div className="p-3.5 resize-x overflow-hidden min-w-[150px]" style={{ direction: lang === 'fa' ? 'rtl' : 'ltr' }}>{lang === 'fa' ? 'نوع تجهیز' : 'Equipment Type'}</div></th>
                              <th className="p-0 border-x border-[#e5e5e7]/50"><div className="p-3.5 resize-x overflow-hidden min-w-[100px]" style={{ direction: lang === 'fa' ? 'rtl' : 'ltr' }}>{lang === 'fa' ? 'سیستم' : 'System'}</div></th>
                              <th className="p-0 border-x border-[#e5e5e7]/50"><div className="p-3.5 resize-x overflow-hidden min-w-[120px]" style={{ direction: lang === 'fa' ? 'rtl' : 'ltr' }}>{lang === 'fa' ? 'استاندارد NFPA' : 'NFPA Standard'}</div></th>
                              <th className="p-0 border-x border-[#e5e5e7]/50"><div className="p-3.5 resize-x overflow-hidden min-w-[200px]" style={{ direction: lang === 'fa' ? 'rtl' : 'ltr' }}>{lang === 'fa' ? 'مشخصات فنی' : 'Technical Specs'}</div></th>
                              <th className="p-0 border-x border-[#e5e5e7]/50"><div className="p-3.5 resize-x overflow-hidden min-w-[100px] text-center" style={{ direction: lang === 'fa' ? 'rtl' : 'ltr' }}>{lang === 'fa' ? 'سند/منبع' : 'Document'}</div></th>
                              {currentUser.price_access === 1 && (
                                <>
                                  <th className="p-0 border-x border-[#e5e5e7]/50"><div className="p-3.5 text-left resize-x overflow-hidden min-w-[100px]" style={{ direction: lang === 'fa' ? 'rtl' : 'ltr' }}>{lang === 'fa' ? 'قیمت' : 'Price'}</div></th>
                                  <th className="p-0 border-x border-[#e5e5e7]/50"><div className="p-3.5 text-center resize-x overflow-hidden min-w-[80px]" style={{ direction: lang === 'fa' ? 'rtl' : 'ltr' }}>{lang === 'fa' ? 'ارز' : 'Currency'}</div></th>
                                </>
                              )}
                              <th className="p-0 border-x border-[#e5e5e7]/50"><div className="p-3.5 resize-x overflow-hidden min-w-[100px]" style={{ direction: lang === 'fa' ? 'rtl' : 'ltr' }}>{lang === 'fa' ? 'کارشناس ثبت' : 'Added By'}</div></th>
                              <th className="p-0 border-x border-[#e5e5e7]/50"><div className="p-3.5 resize-x overflow-hidden min-w-[120px] text-center" style={{ direction: lang === 'fa' ? 'rtl' : 'ltr' }}>{lang === 'fa' ? 'تاریخ ثبت' : 'Upload Date'}</div></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-slate-700 bg-transparent">
                            {filterEquipment().length === 0 ? (
                              <tr>
                                <td colSpan={currentUser.price_access === 1 ? 12 : 10} className="p-8 text-center text-slate-400 font-sans">
                                  {lang === 'fa' ? 'هیچ کالایی مطابق فیلتر یافت نشد.' : 'No equipment found.'}
                                </td>
                              </tr>
                            ) : (
                              filterEquipment().map((item, idx) => (
                                <tr key={item.id || idx} className="hover:bg-slate-50 transition-colors border-b border-slate-100">
                                  <td className="p-3.5 font-bold text-slate-500 font-sans text-center">{idx + 1}</td>
                                  <td className="p-3.5 font-bold text-slate-900 font-mono text-xs">{item.part_number}</td>
                                  <td className="p-3.5 text-indigo-600 font-semibold">{item.brand}</td>
                                  <td className="p-3.5 font-sans text-slate-600">{item.equipment_type}</td>
                                  <td className="p-3.5">
                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${item.system_type === 'alarm' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                                      {item.system_type === 'alarm' ? (lang === 'fa' ? 'اعلام حریق' : 'Fire Alarm') : (lang === 'fa' ? 'اطفاء حریق' : 'Fire Fighting')}
                                    </span>
                                  </td>
                                  <td className="p-3.5 text-amber-600 font-semibold">{item.nfpa_reference || '—'}</td>
                                  <td className="p-3.5 max-w-xs truncate leading-relaxed text-slate-500" title={item.technical_specifications}>
                                    {item.technical_specifications}
                                  </td>
                                  <td className="p-3.5 text-center">
                                    {item.source_file && item.source_file !== 'manual_sync' && item.source_file !== 'manual_entry' ? (
                                      <a href={`/api/documents/download/${encodeURIComponent(item.source_file)}`} download className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded transition-colors" title={lang === 'fa' ? 'دانلود فایل' : 'Download File'}>
                                        <FileDown className="w-3.5 h-3.5" />
                                        <span className="text-[10px] font-bold max-w-[60px] truncate" dir="ltr">{item.source_file}</span>
                                      </a>
                                    ) : (
                                      <span className="text-slate-400 text-[10px]">{lang === 'fa' ? 'دستی' : 'Manual'}</span>
                                    )}
                                  </td>
                                  {currentUser.price_access === 1 && (
                                    <>
                                      <td className="p-3.5 text-left text-emerald-700 font-bold font-sans">{item.price ? item.price.toLocaleString() : '—'}</td>
                                      <td className="p-3.5 text-center text-slate-500 font-bold font-sans">{item.currency}</td>
                                    </>
                                  )}
                                  <td className="p-3.5 text-slate-400 text-[10px] font-sans">{item.created_by || 'سیستم'}</td>
                                  <td className="p-3.5 text-slate-400 text-[10px] font-sans text-center" dir="ltr">{item.created_at || '—'}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* 2. VIEW: ENGINEERING ASSISTANT */}
                {activeTab === 'assistant' && (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="h-[calc(100vh-230px)] flex flex-col justify-between overflow-hidden"
                  >
                    {/* Chat Messages Frame */}
                    <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1 p-4 border border-slate-200 bg-slate-50 rounded-xl shadow-inner custom-scrollbar">
                      {chatHistory.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-8">
                          <div className="w-16 h-16 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-4 text-indigo-600 shadow-sm">
                            <Sparkles className="w-8 h-8 text-indigo-600 animate-pulse" />
                          </div>
                          <h3 className="text-sm font-bold text-slate-850 mb-2">دستیار مهندسی هوشمند F&G آماده است</h3>
                          <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                            می‌توانید در خصوص پارت‌نامبر تجهیزات، استانداردهای طراحی NFPA 72 و NFPA 2001 یا سایر مراجع مهندسی سوال فرمایید.
                          </p>
                        </div>
                      ) : (
                        chatHistory.map((msg, idx) => (
                          <div 
                            key={idx} 
                            className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}
                          >
                            <div className={`max-w-[80%] rounded-xl p-4 shadow-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'}`}>
                              <span className={`block text-[10px] font-bold mb-1 ${msg.role === 'user' ? 'text-indigo-200' : 'text-indigo-600'}`}>
                                {msg.role === 'user' ? '👤 شما' : '🔥 دستیار هوشمند مهندسی'}
                              </span>
                              <div dir="auto" className={`text-xs leading-relaxed whitespace-pre-line ${msg.role === 'user' ? 'text-white' : 'text-slate-700'}`}>
                                {msg.content}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                      {isSendingMessage && (
                        <div className="flex justify-end">
                          <div className="bg-white border border-slate-200 rounded-xl rounded-tl-none p-4 shadow-sm max-w-[80%]">
                            <span className="block text-[10px] font-bold text-indigo-600 mb-1">🔥 دستیار هوشمند مهندسی</span>
                            <div className="flex items-center gap-1 py-1">
                              <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                              <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                              <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                            </div>
                          </div>
                        </div>
                      )}
                      <div ref={chatBottomRef} />
                    </div>

                    {/* Interactive Bottom Bar */}
                    <form onSubmit={handleSendChatMessage} className="relative z-10">
                      {attachedFile && (
                        <div className="absolute -top-12 right-2 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-xl px-3 py-1.5 text-[10px] flex items-center gap-1.5 shadow-md">
                          <FileText className="w-3.5 h-3.5" />
                          <span className="font-semibold truncate max-w-[150px]">{attachedFile.name}</span>
                          <button 
                            type="button"
                            onClick={() => setAttachedFile(null)}
                            className="text-slate-500 hover:text-slate-800 hover:bg-slate-150 rounded p-0.5 transition-all"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      )}

                      {/* Floating Prompt Pill */}
                      <div className="bg-white border border-slate-200 p-1.5 rounded-full flex items-center shadow-md focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/10 transition-all">
                        {/* Audio/Mic (Simulated) */}
                        <button
                          type="button"
                          onClick={() => console.log('تجهیزات شنیداری صوتی در نسخه وب فعال نیست.')}
                          className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-slate-50 transition-all cursor-pointer shrink-0"
                        >
                          <Mic className="w-5 h-5" />
                        </button>

                        {/* Plus Attach File Button */}
                        <div className="relative shrink-0">
                          <input
                            type="file"
                            id="chat-attach-file"
                            accept=".png,.jpg,.jpeg,.pdf"
                            onChange={handleChatFileSelect}
                            className="hidden"
                          />
                          <label
                            htmlFor="chat-attach-file"
                            className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-slate-50 transition-all cursor-pointer"
                          >
                            <Plus className="w-5 h-5" />
                          </label>
                        </div>

                        {/* Text Prompt input */}
                        <input
                          dir="auto"
                          type="text"
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          placeholder="سوال فنی خود را در خصوص استانداردها، تجهیزات و... بپرسید..."
                          className="flex-1 bg-transparent border-0 ring-0 outline-none text-slate-800 placeholder-slate-400 text-xs px-3 focus:ring-0 focus:outline-none"
                        />

                        {/* Submit Button styled with nice solid color */}
                        <button
                          type="submit"
                          disabled={isSendingMessage}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2.5 rounded-full text-xs shadow-sm shrink-0 flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          ارسال
                          <Send className="w-3.5 h-3.5 mr-1" />
                        </button>
                      </div>
                    </form>
                  </motion.div>
                )}

                {/* 3. VIEW: DATABASE MANAGEMENT */}
                {activeTab === 'database' && (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                  >
                    {/* Manual Register Equipment form */}
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                      <h3 className="text-sm font-bold text-slate-800 mb-4 mr-1 flex items-center gap-2">
                        <PlusCircle className="w-5 h-5 text-indigo-600" />
                        ثبت و افزودن کالا به صورت دستی
                      </h3>

                      <form onSubmit={handleAddEquipmentManual} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-500 mb-2 mr-1">پارت‌نامبر (الزامی)</label>
                            <input
                              type="text"
                              value={newEqForm.part_number}
                              onChange={(e) => setNewEqForm({ ...newEqForm, part_number: e.target.value })}
                              placeholder="مانند: FR-880-P"
                              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/10 transition-all shadow-sm"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-semibold text-slate-500 mb-2 mr-1">برند سازنده (الزامی)</label>
                            <input
                              type="text"
                              value={newEqForm.brand}
                              onChange={(e) => setNewEqForm({ ...newEqForm, brand: e.target.value })}
                              placeholder="مانند: Notifier"
                              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/10 transition-all shadow-sm"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-semibold text-slate-500 mb-2 mr-1">نوع کالا (الزامی)</label>
                            <input
                              type="text"
                              value={newEqForm.equipment_type}
                              onChange={(e) => setNewEqForm({ ...newEqForm, equipment_type: e.target.value })}
                              placeholder="مانند: دتکتور شعله ضد انفجار"
                              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/10 transition-all shadow-sm"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-500 mb-2 mr-1">قیمت (مالی)</label>
                            <input
                              type="number"
                              value={newEqForm.price}
                              onChange={(e) => setNewEqForm({ ...newEqForm, price: e.target.value })}
                              placeholder="120.00"
                              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/10 transition-all shadow-sm"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-semibold text-slate-500 mb-2 mr-1">ارز معامله</label>
                            <select
                              value={newEqForm.currency}
                              onChange={(e) => setNewEqForm({ ...newEqForm, currency: e.target.value })}
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-700 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/10 transition-all cursor-pointer shadow-sm"
                            >
                              <option value="USD">USD</option>
                              <option value="EUR">EUR</option>
                              <option value="GBP">GBP</option>
                              <option value="Rials">Rials</option>
                              <option value="AED">AED</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] font-semibold text-slate-500 mb-2 mr-1">مرجع استاندارد NFPA</label>
                            <input
                              type="text"
                              value={newEqForm.nfpa_reference}
                              onChange={(e) => setNewEqForm({ ...newEqForm, nfpa_reference: e.target.value })}
                              placeholder="مانند: NFPA 72"
                              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/10 transition-all shadow-sm"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-semibold text-slate-500 mb-2 mr-1">نوع سیستم</label>
                            <select
                              value={newEqForm.system_type}
                              onChange={(e) => setNewEqForm({ ...newEqForm, system_type: e.target.value as any })}
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-700 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/10 transition-all cursor-pointer shadow-sm"
                            >
                              <option value="alarm">اعلام حریق</option>
                              <option value="fighting">اطفاء حریق</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-2 mr-1">مشخصات فنی و استانداردهای طراحی</label>
                          <textarea
                            value={newEqForm.technical_specifications}
                            onChange={(e) => setNewEqForm({ ...newEqForm, technical_specifications: e.target.value })}
                            rows={2}
                            placeholder="توضیحات تکمیلی، سناریوی تخلیه و یا حساسیت دتکتور..."
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/10 transition-all shadow-sm"
                          />
                        </div>

                        {formMsg && (
                          <div className={`p-3 rounded-xl text-xs font-semibold text-center border ${formMsg.type === 'success' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
                            {formMsg.text}
                          </div>
                        )}

                        <div className="flex justify-end">
                          <button
                            type="submit"
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-6 rounded-xl text-xs shadow-sm cursor-pointer transition-colors"
                          >
                            💾 ثبت کالا در پایگاه داده
                          </button>
                        </div>
                      </form>
                    </div>

                    {/* Interactive Database Spreadsheet Editor */}
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                            <Database className="w-5 h-5 text-indigo-600" />
                            ویرایشگر صفحه‌گسترده پایگاه داده
                          </h3>
                          <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                            می‌توانید مستقیماً سلول‌ها را ویرایش کرده یا ردیف‌ها را کم و زیاد کرده و سپس دکمه همگام‌سازی نهایی را بزنید:
                          </p>
                        </div>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={handleSpreadsheetAddRow}
                            className="bg-indigo-50 hover:bg-indigo-100/80 border border-indigo-200 text-indigo-700 font-bold py-2 px-3 rounded-xl text-[11px] cursor-pointer transition-colors"
                          >
                            ردیف جدید ➕
                          </button>

                          <button
                            type="button"
                            onClick={handleSpreadsheetSave}
                            disabled={isSavingDb}
                            className={`py-2 px-4 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-colors ${isSavingDb ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm cursor-pointer'}`}
                          >
                            {isSavingDb ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                در حال همگام‌سازی...
                              </>
                            ) : (
                              <>
                                💾 ذخیره و همگام‌سازی نهایی
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Spreadsheet Grid */}
                      <div className="overflow-x-auto border border-slate-200 bg-white rounded-xl shadow-sm">
                        <table className="w-full text-right text-[11px] font-sans">
                          <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                            <tr>
                              <th className="p-0 border-x border-slate-200/50"><div className="p-3 text-center resize-x overflow-hidden min-w-[50px] max-w-[80px]" style={{ direction: lang === 'fa' ? 'rtl' : 'ltr' }}>{lang === 'fa' ? 'ردیف' : 'Row'}</div></th>
                              <th className="p-0 border-x border-slate-200/50"><div className="p-3 text-center resize-x overflow-hidden min-w-[50px] max-w-[80px]">{lang === 'fa' ? 'حذف' : 'Del'}</div></th>
                              <th className="p-0 border-x border-slate-200/50"><div className="p-3 resize-x overflow-hidden min-w-[120px]" style={{ direction: lang === 'fa' ? 'rtl' : 'ltr' }}>{lang === 'fa' ? 'پارت نامبر' : 'Part Number'}</div></th>
                              <th className="p-0 border-x border-slate-200/50"><div className="p-3 resize-x overflow-hidden min-w-[100px]" style={{ direction: lang === 'fa' ? 'rtl' : 'ltr' }}>{lang === 'fa' ? 'برند' : 'Brand'}</div></th>
                              <th className="p-0 border-x border-slate-200/50"><div className="p-3 resize-x overflow-hidden min-w-[150px]" style={{ direction: lang === 'fa' ? 'rtl' : 'ltr' }}>{lang === 'fa' ? 'نوع تجهیز' : 'Equipment Type'}</div></th>
                              <th className="p-0 border-x border-slate-200/50"><div className="p-3 resize-x overflow-hidden min-w-[100px] text-center" style={{ direction: lang === 'fa' ? 'rtl' : 'ltr' }}>{lang === 'fa' ? 'سیستم' : 'System'}</div></th>
                              <th className="p-0 border-x border-slate-200/50"><div className="p-3 resize-x overflow-hidden min-w-[120px]" style={{ direction: lang === 'fa' ? 'rtl' : 'ltr' }}>{lang === 'fa' ? 'استاندارد NFPA' : 'NFPA Standard'}</div></th>
                              <th className="p-0 border-x border-slate-200/50"><div className="p-3 resize-x overflow-hidden min-w-[200px]" style={{ direction: lang === 'fa' ? 'rtl' : 'ltr' }}>{lang === 'fa' ? 'مشخصات فنی' : 'Technical Specs'}</div></th>
                              <th className="p-0 border-x border-slate-200/50"><div className="p-3 resize-x overflow-hidden min-w-[100px] text-center" style={{ direction: lang === 'fa' ? 'rtl' : 'ltr' }}>{lang === 'fa' ? 'سند/منبع' : 'Document'}</div></th>
                              {currentUser.price_access === 1 && (
                                <>
                                  <th className="p-0 border-x border-slate-200/50"><div className="p-3 resize-x overflow-hidden min-w-[100px]" style={{ direction: lang === 'fa' ? 'rtl' : 'ltr' }}>{lang === 'fa' ? 'قیمت' : 'Price'}</div></th>
                                  <th className="p-0 border-x border-slate-200/50"><div className="p-3 resize-x overflow-hidden min-w-[80px] text-center" style={{ direction: lang === 'fa' ? 'rtl' : 'ltr' }}>{lang === 'fa' ? 'ارز' : 'Currency'}</div></th>
                                </>
                              )}
                              <th className="p-0 border-x border-slate-200/50"><div className="p-3 resize-x overflow-hidden min-w-[120px] text-center" style={{ direction: lang === 'fa' ? 'rtl' : 'ltr' }}>{lang === 'fa' ? 'تاریخ ثبت' : 'Upload Date'}</div></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-transparent text-slate-700">
                            {editedEquipment.length === 0 ? (
                              <tr>
                                <td colSpan={currentUser.price_access === 1 ? 12 : 10} className="p-6 text-center text-slate-400">
                                  {lang === 'fa' ? 'دیتابیس در این سطح دسترسی خالی است.' : 'Database is empty.'}
                                </td>
                              </tr>
                            ) : (
                              editedEquipment.map((eq, idx) => (
                                <tr key={idx} className="hover:bg-slate-50 transition-colors border-b border-slate-100">
                                  <td className="p-2 text-center font-bold text-slate-500">{idx + 1}</td>
                                  <td className="p-2 text-center">
                                    <button
                                      type="button"
                                      onClick={() => handleSpreadsheetDelete(idx)}
                                      className="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 cursor-pointer transition-colors"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                  <td className="p-2">
                                    <input
                                      type="text"
                                      value={eq.part_number}
                                      onChange={(e) => handleCellEdit(idx, 'part_number', e.target.value)}
                                      className="w-full bg-white border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-2 py-1 text-slate-850 font-bold font-sans transition-all text-xs"
                                    />
                                  </td>
                                  <td className="p-2">
                                    <input
                                      type="text"
                                      value={eq.brand}
                                      onChange={(e) => handleCellEdit(idx, 'brand', e.target.value)}
                                      className="w-full bg-white border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-2 py-1 text-indigo-600 font-semibold transition-all text-xs"
                                    />
                                  </td>
                                  <td className="p-2">
                                    <input
                                      type="text"
                                      value={eq.equipment_type}
                                      onChange={(e) => handleCellEdit(idx, 'equipment_type', e.target.value)}
                                      className="w-full bg-white border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-2 py-1 text-slate-700 transition-all text-xs"
                                    />
                                  </td>
                                  <td className="p-2 text-center">
                                    <select
                                      value={eq.system_type}
                                      onChange={(e) => handleCellEdit(idx, 'system_type', e.target.value)}
                                      className="bg-white border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-1.5 py-1 text-slate-700 cursor-pointer transition-all text-xs"
                                    >
                                      <option value="alarm">اعلام</option>
                                      <option value="fighting">اطفاء</option>
                                    </select>
                                  </td>
                                  <td className="p-2">
                                    <input
                                      type="text"
                                      value={eq.nfpa_reference}
                                      onChange={(e) => handleCellEdit(idx, 'nfpa_reference', e.target.value)}
                                      className="w-full bg-white border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-2 py-1 text-amber-600 font-bold transition-all text-xs"
                                    />
                                  </td>
                                  <td className="p-2">
                                    <input
                                      type="text"
                                      value={eq.technical_specifications}
                                      onChange={(e) => handleCellEdit(idx, 'technical_specifications', e.target.value)}
                                      className="w-full bg-white border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-2 py-1 text-slate-600 transition-all text-xs"
                                    />
                                  </td>
                                  <td className="p-2 text-center">
                                    {eq.source_file && eq.source_file !== 'manual_sync' && eq.source_file !== 'manual_entry' ? (
                                      <a href={`/api/documents/download/${encodeURIComponent(eq.source_file)}`} download className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded transition-colors" title={lang === 'fa' ? 'دانلود فایل' : 'Download File'}>
                                        <FileDown className="w-3.5 h-3.5" />
                                        <span className="text-[10px] font-bold max-w-[60px] truncate" dir="ltr">{eq.source_file}</span>
                                      </a>
                                    ) : (
                                      <span className="text-slate-400 text-[10px]">{lang === 'fa' ? 'دستی' : 'Manual'}</span>
                                    )}
                                  </td>
                                  {currentUser.price_access === 1 && (
                                    <>
                                      <td className="p-2">
                                        <input
                                          type="number"
                                          value={eq.price === null ? '' : eq.price}
                                          onChange={(e) => handleCellEdit(idx, 'price', e.target.value)}
                                          placeholder="—"
                                          className="w-full bg-white border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-2 py-1 text-emerald-700 text-left font-bold transition-all text-xs"
                                        />
                                      </td>
                                      <td className="p-2 text-center">
                                        <select
                                          value={eq.currency}
                                          onChange={(e) => handleCellEdit(idx, 'currency', e.target.value)}
                                          className="bg-white border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-1.5 py-1 text-slate-700 cursor-pointer transition-all text-xs"
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
                                  <td className="p-2">
                                    <input
                                      type="text"
                                      value={eq.created_at || ''}
                                      onChange={(e) => handleCellEdit(idx, 'created_at', e.target.value)}
                                      className="w-full bg-white border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-2 py-1 text-slate-500 text-center transition-all text-xs"
                                      dir="ltr"
                                    />
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* 4. VIEW: USER MANAGEMENT (ADMIN ONLY) */}
                {activeTab === 'users' && currentUser.role === 'admin' && (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Form: Add User */}
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                        <h3 className="text-sm font-bold text-slate-800 mb-4 mr-1 flex items-center gap-2">
                          <UserPlus className="w-5 h-5 text-blue-600" />
                          تعریف کارشناس یا مدیر جدید
                        </h3>

                        <form onSubmit={handleCreateUser} className="space-y-4">
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-500 mb-2 mr-1">نام کاربری جدید</label>
                            <input
                              type="text"
                              value={newUserForm.username}
                              onChange={(e) => setNewUserForm({ ...newUserForm, username: e.target.value })}
                              placeholder="مانند: kaveh_tech"
                              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-semibold text-slate-500 mb-2 mr-1">کلمه عبور</label>
                            <input
                              type="password"
                              value={newUserForm.password}
                              onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                              placeholder="••••••••"
                              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] font-semibold text-slate-500 mb-2 mr-1">نقش کاربری</label>
                              <select
                                value={newUserForm.role}
                                onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value as any })}
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all cursor-pointer"
                              >
                                <option value="user">کارشناس فنی</option>
                                <option value="admin">مدیر سیستم</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-[10px] font-semibold text-slate-500 mb-2 mr-1">دسترسی به بخش</label>
                              <select
                                value={newUserForm.system_access}
                                onChange={(e) => setNewUserForm({ ...newUserForm, system_access: e.target.value as any })}
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all cursor-pointer"
                              >
                                <option value="alarm">فقط اعلام حریق</option>
                                <option value="fighting">فقط اطفاء حریق</option>
                                <option value="both">هر دو (کل سیستم)</option>
                              </select>
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5 p-1">
                            <input
                              type="checkbox"
                              id="newUserPriceAccess"
                              checked={newUserForm.price_access}
                              onChange={(e) => setNewUserForm({ ...newUserForm, price_access: e.target.checked })}
                              className="w-4 h-4 rounded border-slate-200 text-blue-600 bg-white focus:ring-0 focus:ring-offset-0 cursor-pointer"
                            />
                            <label htmlFor="newUserPriceAccess" className="text-xs font-semibold text-slate-600 cursor-pointer">
                              مجوز مشاهده قیمت‌ها (دسترسی مالی)
                            </label>
                          </div>

                          {userFormError && (
                            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold text-center">
                              {userFormError}
                            </div>
                          )}

                          <div className="flex justify-end">
                            <button
                              type="submit"
                              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-xl text-xs shadow-sm cursor-pointer transition-colors"
                            >
                              👤 ثبت کاربری جدید
                            </button>
                          </div>
                        </form>
                      </div>

                      {/* Display Users Table & Permissions Management */}
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                        <div>
                          <h3 className="text-sm font-bold text-slate-800 mb-4 mr-1 flex items-center gap-2">
                            <Users className="w-5 h-5 text-blue-600" />
                            لیست پرسنل و دسترسی‌ها
                          </h3>

                          <div className="space-y-3.5 max-h-[350px] overflow-y-auto pr-1">
                            {users.map(u => (
                              <div 
                                key={u.id}
                                className="p-3.5 bg-slate-50 border border-slate-150 rounded-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3"
                              >
                                <div>
                                  <span className="block text-xs font-bold text-slate-800">👤 {u.username}</span>
                                  <span className="block text-[10px] text-slate-500 font-medium mt-1">نقش: {u.role === 'admin' ? 'مدیر سیستم' : 'کارشناس'}</span>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                  {/* Update system access select */}
                                  <select
                                    disabled={u.username === 'admin'}
                                    value={u.system_access}
                                    onChange={(e) => handleUpdateUserAccess(u, e.target.value as any, u.price_access, u.role)}
                                    className="bg-white border border-slate-200 text-slate-700 rounded-lg px-2 py-1 text-[10px] focus:outline-none cursor-pointer disabled:opacity-50"
                                  >
                                    <option value="alarm">فقط اعلام</option>
                                    <option value="fighting">فقط اطفاء</option>
                                    <option value="both">کل سیستم</option>
                                  </select>

                                  {/* Update role select */}
                                  <select
                                    disabled={u.username === 'admin'}
                                    value={u.role}
                                    onChange={(e) => handleUpdateUserAccess(u, u.system_access, u.price_access, e.target.value as any)}
                                    className="bg-white border border-slate-200 text-slate-700 rounded-lg px-2 py-1 text-[10px] focus:outline-none cursor-pointer disabled:opacity-50"
                                  >
                                    <option value="user">کارشناس</option>
                                    <option value="admin">مدیر</option>
                                  </select>

                                  {/* Update financial clearance */}
                                  <button
                                    disabled={u.username === 'admin'}
                                    onClick={() => handleUpdateUserAccess(u, u.system_access, u.price_access === 1 ? 0 : 1, u.role)}
                                    className={`px-2 py-1.5 rounded-lg text-[9px] font-bold transition-all cursor-pointer disabled:opacity-50 ${u.price_access === 1 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}
                                  >
                                    {u.price_access === 1 ? 'دسترسی مالی مجاز' : 'دسترسی مالی مسدود'}
                                  </button>

                                  {u.username !== 'admin' && (
                                    <button
                                      onClick={() => handleDeleteUser(u.id)}
                                      className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                                      title="حذف کاربر"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

              </div>
            </main>
          </div>
        </div>
      )}

      {/* --- POPUPS / MODALS --- */}

      {/* AI Configuration Popup (Admin Only) */}
      <AnimatePresence>
        {aiConfigModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white p-6 rounded-[24px] relative border border-slate-200 shadow-xl"
            >
              <button 
                onClick={() => setAiConfigModalOpen(false)}
                className="absolute top-4 left-4 text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-full transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <h2 className="text-sm font-bold text-slate-800 mb-6 flex items-center gap-2">
                <Cpu className="w-5 h-5 text-blue-600" />
                پیکربندی هوش مصنوعی سیستم
              </h2>

              <form onSubmit={handleSaveAIConfig} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-2 mr-1">API Key (OpenRouter / custom)</label>
                  <input
                    type="password"
                    value={aiConfig.api_key}
                    onChange={(e) => setAiConfig({ ...aiConfig, api_key: e.target.value })}
                    placeholder="مطابق سایت OpenRouter یا خالی برای جمینی عمومی"
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-2 mr-1">Base URL</label>
                  <input
                    type="text"
                    value={aiConfig.base_url}
                    onChange={(e) => setAiConfig({ ...aiConfig, base_url: e.target.value })}
                    placeholder="https://openrouter.ai/api/v1"
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-2 mr-1">نام مدل پردازشگر (Model Name)</label>
                  <input
                    type="text"
                    value={aiConfig.model_name}
                    onChange={(e) => setAiConfig({ ...aiConfig, model_name: e.target.value })}
                    placeholder="google/gemma-4-31b-it:free"
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  />
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setAiConfigModalOpen(false)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-xl text-xs cursor-pointer transition-colors"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-5 rounded-xl text-xs shadow-sm cursor-pointer transition-colors"
                  >
                    💾 ذخیره تغییرات
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Change Password Popup */}
      <AnimatePresence>
        {pwdModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white p-6 rounded-[24px] relative border border-slate-200 shadow-xl"
            >
              <button 
                onClick={() => setPwdModalOpen(false)}
                className="absolute top-4 left-4 text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-full transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <h2 className="text-sm font-bold text-slate-800 mb-6 flex items-center gap-2">
                <Lock className="w-5 h-5 text-blue-600" />
                تغییر کلمه عبور حساب کاربری
              </h2>

              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-2 mr-1">رمز عبور فعلی</label>
                  <input
                    type="password"
                    value={currPassword}
                    onChange={(e) => setCurrPassword(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-2 mr-1">رمز عبور جدید</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-2 mr-1">تکرار رمز عبور جدید</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  />
                </div>

                {pwdError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold text-center">
                    ⚠️ {pwdError}
                  </div>
                )}
                {pwdSuccess && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700 font-semibold text-center">
                    {pwdSuccess}
                  </div>
                )}

                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setPwdModalOpen(false)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-xl text-xs cursor-pointer transition-colors"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-5 rounded-xl text-xs shadow-sm cursor-pointer transition-colors"
                  >
                    💾 ثبت رمز جدید
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
