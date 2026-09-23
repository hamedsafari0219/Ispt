import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import * as XLSX from 'xlsx';
import { User, Equipment, ChatMessage, ChatArchive, AIConfig } from './types';
import { RightSidebarNav } from './components/RightSidebarNav';
import { TopHeader } from './components/TopHeader';
import { Sidebar } from './components/Sidebar';
import { LoginView } from './components/LoginView';
import { DashboardView } from './components/DashboardView';
import { AssistantView } from './components/AssistantView';
import { DatabaseView } from './components/DatabaseView';
import { UsersView } from './components/UsersView';
import { ProposalView } from './components/ProposalView';
import { LettersView } from './components/LettersView';
import { AdminConsoleView } from './components/AdminConsoleView';
import { EDMSView } from './components/EDMSView';
import { AiConfigModal, ChangePasswordModal } from './components/Modals';
import { authenticatedFetch } from './utils/api';

export default function App() {
  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('fg_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [authError, setAuthError] = useState('');

  // Layout & Navigation State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'assistant' | 'database' | 'users' | 'proposal' | 'letters' | 'admin-console' | 'edms'>('dashboard');
  const [systemFilter, setSystemFilter] = useState<'all' | 'alarm' | 'fighting'>('all');
  const [lang, setLang] = useState<'fa' | 'en'>('fa');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [aiConfigModalOpen, setAiConfigModalOpen] = useState(false);
  const [pwdModalOpen, setPwdModalOpen] = useState(false);

  // Right Sidebar Navigation Mode: 'collapsible' (default for maximum workspace) or 'pinned' (fixed column)
  const [sidebarMode, setSidebarMode] = useState<'pinned' | 'collapsible'>(() => {
    const saved = localStorage.getItem('fg_sidebar_mode');
    return (saved === 'pinned' || saved === 'collapsible') ? saved : 'collapsible';
  });
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Global Data States
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [documents, setDocuments] = useState<{ id: number; file_name: string }[]>([]);
  const [aiConfig, setAiConfig] = useState<AIConfig>({
    api_key: '',
    base_url: 'https://openrouter.ai/api/v1',
    model_name: 'google/gemma-4-31b-it:free'
  });

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [brandFilter, setBrandFilter] = useState('همه');

  // Engineering Assistant Chat
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [currentChatId, setCurrentChatId] = useState<number | null>(null);
  const [chatArchives, setChatArchives] = useState<ChatArchive[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [attachedFile, setAttachedFile] = useState<{ name: string; base64: string; mimeType: string } | null>(null);
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  // DB Feeder (RAG Parser)
  const [uploadCategory, setUploadCategory] = useState<'alarm' | 'fighting'>('alarm');
  const [feedFile, setFeedFile] = useState<File | null>(null);
  const [isFeeding, setIsFeeding] = useState(false);
  const [feedSuccessMsg, setFeedSuccessMsg] = useState('');
  const [feedErrorMsg, setFeedErrorMsg] = useState('');

  // Spreadsheet Live Editor
  const [editedEquipment, setEditedEquipment] = useState<Equipment[]>([]);
  const [isSavingDb, setIsSavingDb] = useState(false);

  // Manual Add Form State
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

  // User Management Form Feedback
  const [userFormMsg, setUserFormMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Initial loading spinner
  const [loading, setLoading] = useState(true);

  // Load backend data when authenticated
  useEffect(() => {
    if (currentUser) {
      loadAllData(true);
    } else {
      setLoading(false);
    }
  }, [currentUser]);

  // Auto Logout after 5 minutes (300,000 ms) of inactivity
  useEffect(() => {
    if (!currentUser) return;

    const INACTIVITY_LIMIT_MS = 5 * 60 * 1000; // 5 minutes
    let inactivityTimer: NodeJS.Timeout;

    const resetInactivityTimer = () => {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        handleLogout();
        setAuthError(
          lang === 'fa'
            ? 'به دلیل عدم فعالیت به مدت ۵ دقیقه، به صورت خودکار از حساب کاربری خارج شدید.'
            : 'You were automatically logged out due to 5 minutes of inactivity.'
        );
      }, INACTIVITY_LIMIT_MS);
    };

    const activityEvents: (keyof WindowEventMap)[] = [
      'mousemove',
      'mousedown',
      'keydown',
      'touchstart',
      'scroll',
      'click'
    ];

    activityEvents.forEach((evt) => {
      window.addEventListener(evt, resetInactivityTimer, { passive: true });
    });

    // Start initial timer
    resetInactivityTimer();

    return () => {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      activityEvents.forEach((evt) => {
        window.removeEventListener(evt, resetInactivityTimer);
      });
    };
  }, [currentUser, lang]);

  // Close drawer with Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isDrawerOpen) setIsDrawerOpen(false);
        if (mobileMenuOpen) setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawerOpen, mobileMenuOpen]);

  const loadAllData = async (showLoading = true) => {
    if (!currentUser) return;
    if (showLoading) setLoading(true);

    try {
      // 1. Fetch Equipment
      const eqRes = await authenticatedFetch(`/api/equipment?system_access=${currentUser.system_access}&price_access=${currentUser.price_access}`);
      if (eqRes.ok) {
        const eqData = await eqRes.json();
        setEquipment(eqData);
        setEditedEquipment(eqData);
      }

      // 2. Fetch Chat Archives
      const chatRes = await authenticatedFetch(`/api/chat-archives/${currentUser.id}`);
      if (chatRes.ok) {
        const chats = await chatRes.json();
        setChatArchives(chats);
      }

      // 3. Fetch AI Settings (Admin only)
      if (currentUser.role === 'admin') {
        const aiRes = await authenticatedFetch('/api/ai/config');
        if (aiRes.ok) {
          const config = await aiRes.json();
          setAiConfig(config);
        }
      }

      // 4. Fetch Documents
      const docRes = await authenticatedFetch('/api/documents');
      if (docRes.ok) {
        setDocuments(await docRes.json());
      }

      // 5. Fetch Users (Admin only)
      if (currentUser.role === 'admin') {
        const usersRes = await authenticatedFetch('/api/users');
        if (usersRes.ok) {
          const uData = await usersRes.json();
          setUsers(uData);
        }
      }
    } catch (e) {
      console.error('Error loading data:', e);
    } finally {
      setLoading(false);
    }
  };

  // Auth: Login
  const handleLogin = async (username: string, password: string): Promise<boolean> => {
    setAuthError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      if (res.ok) {
        const user: User = await res.json();
        setCurrentUser(user);
        localStorage.setItem('fg_user', JSON.stringify(user));
        return true;
      } else {
        const err = await res.json();
        setAuthError(err.error || (lang === 'fa' ? 'نام کاربری یا رمز عبور اشتباه است.' : 'Invalid credentials.'));
        return false;
      }
    } catch (err) {
      setAuthError(lang === 'fa' ? 'خطا در دسترسی به سرور.' : 'Server connection error.');
      return false;
    }
  };

  // Auth: Logout
  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('fg_user');
    setEquipment([]);
    setChatHistory([]);
    setChatArchives([]);
    setUsers([]);
    setCurrentChatId(null);
  };

  // Auth: Change password
  const handleChangePassword = async (oldPassword: string, newPassword: string): Promise<boolean> => {
    try {
      const res = await authenticatedFetch('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({
          userId: currentUser?.id,
          currentPassword: oldPassword,
          newPassword: newPassword
        })
      });
      return res.ok;
    } catch {
      return false;
    }
  };

  // Save AI Configuration
  const handleSaveAiConfig = async (newConfig: AIConfig) => {
    try {
      const res = await authenticatedFetch('/api/ai/config', {
        method: 'POST',
        body: JSON.stringify(newConfig)
      });
      if (res.ok) {
        setAiConfig(newConfig);
      }
    } catch (e) {
      console.error('Error saving AI Config:', e);
    }
  };

  // File Converter Helper
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = error => reject(error);
    });
  };

  // Smart Catalog RAG Feeder
  const handleSmartFeed = async () => {
    if (!feedFile) return;
    setIsFeeding(true);
    setFeedSuccessMsg('');
    setFeedErrorMsg('');
    try {
      const base64 = await fileToBase64(feedFile);
      const res = await authenticatedFetch('/api/ai/extract', {
        method: 'POST',
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
        setFeedSuccessMsg(lang === 'fa' 
          ? `✅ پردازش هوشمند موفقیت‌آمیز بود!\n▫️ ${result.equipmentCount} تجهیز استخراج شد.\n▫️ ${result.knowledgeCount} استاندارد ثبت گردید.` 
          : `✅ Document processed!\n▫️ ${result.equipmentCount} items parsed.\n▫️ ${result.knowledgeCount} references learned.`);
        setFeedFile(null);
        loadAllData(false);
      } else {
        const err = await res.json();
        setFeedErrorMsg(err.error || 'Failed to extract document.');
      }
    } catch (e: any) {
      setFeedErrorMsg(`Processing error: ${e.message}`);
    } finally {
      setIsFeeding(false);
    }
  };

  // Manual Equipment Entry
  const handleAddEquipmentManual = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormMsg(null);
    if (!newEqForm.part_number || !newEqForm.brand || !newEqForm.equipment_type) {
      setFormMsg({ type: 'error', text: lang === 'fa' ? 'پارت‌نامبر، برند و نوع کالا الزامی است.' : 'Part number, brand and type are required.' });
      return;
    }
    try {
      const res = await authenticatedFetch('/api/equipment', {
        method: 'POST',
        body: JSON.stringify({
          ...newEqForm,
          created_by: currentUser?.username
        })
      });
      if (res.ok) {
        setFormMsg({ type: 'success', text: lang === 'fa' ? '✅ کالا با موفقیت ذخیره شد.' : '✅ Equipment saved.' });
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
        setFormMsg({ type: 'error', text: err.error || 'Failed to register.' });
      }
    } catch {
      setFormMsg({ type: 'error', text: 'Network failure.' });
    }
  };

  // Spreadsheet Save & Sync
  const handleSpreadsheetSave = async () => {
    setIsSavingDb(true);
    try {
      const res = await authenticatedFetch('/api/equipment/sync', {
        method: 'POST',
        body: JSON.stringify({
          items: editedEquipment,
          system_access: currentUser?.system_access,
          price_access: currentUser?.price_access,
          username: currentUser?.username
        })
      });
      if (res.ok) {
        loadAllData(false);
      }
    } catch (e) {
      console.error('Spreadsheet sync error:', e);
    } finally {
      setIsSavingDb(false);
    }
  };

  // Assistant Chat: Select file
  const handleChatFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const base64 = await fileToBase64(file);
    setAttachedFile({ name: file.name, base64, mimeType: file.type });
  };

  // Assistant Chat: Submit message
  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() && !attachedFile) return;

    const query = chatInput;
    setChatInput('');
    setIsSendingMessage(true);

    const newHistory: ChatMessage[] = [...chatHistory, { role: 'user', content: query }];
    setChatHistory(newHistory);

    try {
      const res = await authenticatedFetch('/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          userId: currentUser?.id,
          query,
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
        loadAllData(false);
      } else {
        const err = await res.json();
        setChatHistory([...newHistory, { role: 'assistant', content: `Error: ${err.error || 'Failed to respond.'}` }]);
      }
    } catch (e: any) {
      setChatHistory([...newHistory, { role: 'assistant', content: `Network Error: ${e.message}` }]);
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleStartNewChat = () => {
    setCurrentChatId(null);
    setChatHistory([]);
    setAttachedFile(null);
  };

  const handleLoadArchive = (archive: ChatArchive) => {
    setCurrentChatId(archive.id);
    setChatHistory(archive.history);
  };

  const handleDeleteArchive = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await authenticatedFetch(`/api/chat-archives/${id}`, { method: 'DELETE' });
      if (res.ok) {
        if (currentChatId === id) handleStartNewChat();
        loadAllData(false);
      }
    } catch (e) {
      console.error('Delete archive error:', e);
    }
  };

  // User Management
  const handleAddUser = async (userObj: Partial<User> & { password?: string }) => {
    setUserFormMsg(null);
    try {
      const res = await authenticatedFetch('/api/users', {
        method: 'POST',
        body: JSON.stringify(userObj)
      });
      if (res.ok) {
        setUserFormMsg({ type: 'success', text: lang === 'fa' ? '✅ کاربر با موفقیت ساخته شد.' : 'User created.' });
        loadAllData(false);
      } else {
        const err = await res.json();
        setUserFormMsg({ type: 'error', text: err.error || 'Failed to create user.' });
      }
    } catch {
      setUserFormMsg({ type: 'error', text: 'Network error.' });
    }
  };

  const handleDeleteUser = async (id: number) => {
    try {
      const res = await authenticatedFetch(`/api/users/${id}`, { method: 'DELETE' });
      if (res.ok) loadAllData(false);
    } catch (e) {
      console.error('Delete user error:', e);
    }
  };

  const handleToggleUserPermission = async (userId: number, field: 'system_access' | 'price_access' | 'role', value: any) => {
    const targetUser = users.find(u => u.id === userId);
    if (!targetUser) return;

    const updatedRole = field === 'role' ? value : targetUser.role;
    const updatedSystem = field === 'system_access' ? value : targetUser.system_access;
    const updatedPrice = field === 'price_access' ? value : targetUser.price_access;

    try {
      const res = await authenticatedFetch(`/api/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify({ role: updatedRole, system_access: updatedSystem, price_access: updatedPrice === 1 })
      });
      if (res.ok) loadAllData(false);
    } catch (e) {
      console.error('Permission toggle error:', e);
    }
  };

  // Excel BOM Export
  const handleExportExcel = () => {
    const filtered = equipment.filter(item => {
      const matchSearch = item.part_number.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.brand.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.equipment_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.technical_specifications.toLowerCase().includes(searchQuery.toLowerCase());
      const matchBrand = brandFilter === 'همه' || item.brand === brandFilter;
      const matchSystem = systemFilter === 'all' || item.system_type === systemFilter;
      return matchSearch && matchBrand && matchSystem;
    });

    const exportData = filtered.map(e => ({
      'پارت نامبر': e.part_number,
      'برند': e.brand,
      'نوع تجهیز': e.equipment_type,
      'سیستم': e.system_type === 'alarm' ? 'اعلام حریق' : 'اطفاء حریق',
      'مرجع NFPA': e.nfpa_reference || '—',
      'مشخصات فنی': e.technical_specifications,
      'قیمت': currentUser?.price_access === 1 ? (e.price || '—') : 'محرمانه',
      'ارز': currentUser?.price_access === 1 ? e.currency : 'محرمانه',
      'تاریخ ثبت': e.created_at || '—'
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'تجهیزات F&G');
    worksheet['!dir'] = 'rtl';
    XLSX.writeFile(workbook, `F_and_G_Equipment_Catalog_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  if (loading && currentUser) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-900 text-white font-sans" dir={lang === 'fa' ? 'rtl' : 'ltr'}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
          className="w-12 h-12 border-3 border-blue-500 border-t-transparent rounded-full mb-4"
        />
        <h3 className="text-base font-bold text-slate-100">
          {lang === 'fa' ? 'در حال بارگذاری اطلاعات پایگاه داده F&G...' : 'Loading F&G System Data...'}
        </h3>
      </div>
    );
  }

  // Render Login if unauthenticated
  if (!currentUser) {
    return (
      <LoginView
        onLogin={handleLogin}
        authError={authError}
        setAuthError={setAuthError}
        lang={lang}
      />
    );
  }

  return (
    <div 
      className="min-h-screen w-full flex bg-slate-100 font-sans text-slate-900 selection:bg-blue-500/20 selection:text-blue-700"
      dir={lang === 'fa' ? 'rtl' : 'ltr'}
    >
      {/* 1. Dedicated Column Navigation on the Right (منوی سمت راست: حالت کشویی انتخابی یا پین شده) */}
      <RightSidebarNav
        currentUser={currentUser}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        systemFilter={systemFilter}
        setSystemFilter={setSystemFilter}
        lang={lang}
        setLang={setLang}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        onOpenAiModal={() => setAiConfigModalOpen(true)}
        onOpenPwdModal={() => setPwdModalOpen(true)}
        onLogout={handleLogout}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        sidebarMode={sidebarMode}
        setSidebarMode={setSidebarMode}
        isDrawerOpen={isDrawerOpen}
        setIsDrawerOpen={setIsDrawerOpen}
      />

      {/* 2. Main Workspace & View Container */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen overflow-x-hidden">
        {/* Top Header */}
        <TopHeader
          currentUser={currentUser}
          activeTab={activeTab}
          systemFilter={systemFilter}
          lang={lang}
          setLang={setLang}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onLogout={handleLogout}
          sidebarMode={sidebarMode}
          setSidebarMode={setSidebarMode}
          isDrawerOpen={isDrawerOpen}
          onToggleDrawer={() => setIsDrawerOpen(prev => !prev)}
        />

        {/* View Stage */}
        <div className="flex-1 flex w-full relative min-h-0">
          {/* Secondary Drawer Sidebar for Archives & RAG Feeder */}
          <AnimatePresence>
            {isSidebarOpen && (
              <Sidebar
                currentUser={currentUser}
                chatArchives={chatArchives}
                currentChatId={currentChatId}
                documents={documents}
                uploadCategory={uploadCategory}
                setUploadCategory={setUploadCategory}
                feedFile={feedFile}
                setFeedFile={setFeedFile}
                isFeeding={isFeeding}
                feedSuccessMsg={feedSuccessMsg}
                feedErrorMsg={feedErrorMsg}
                onSmartFeed={handleSmartFeed}
                onStartNewChat={handleStartNewChat}
                onLoadArchive={handleLoadArchive}
                onDeleteArchive={handleDeleteArchive}
                onSelectTab={(tab) => setActiveTab(tab)}
                onCloseSidebar={() => setIsSidebarOpen(false)}
                lang={lang}
              />
            )}
          </AnimatePresence>

        {/* View Stage */}
        <main className="flex-1 flex flex-col min-w-0 p-4 sm:p-6 md:p-8 overflow-y-auto custom-scrollbar">
          {activeTab === 'dashboard' && (
            <DashboardView
              currentUser={currentUser}
              equipment={equipment}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              brandFilter={brandFilter}
              setBrandFilter={setBrandFilter}
              systemFilter={systemFilter}
              setSystemFilter={setSystemFilter}
              onExportExcel={handleExportExcel}
              onRefreshData={() => loadAllData(false)}
              onNavigateToAssistant={() => setActiveTab('assistant')}
              lang={lang}
            />
          )}

          {activeTab === 'assistant' && (
            <AssistantView
              currentUser={currentUser}
              chatHistory={chatHistory}
              chatInput={chatInput}
              setChatInput={setChatInput}
              attachedFile={attachedFile}
              setAttachedFile={setAttachedFile}
              isSendingMessage={isSendingMessage}
              onSendChatMessage={handleSendChatMessage}
              onChatFileSelect={handleChatFileSelect}
              lang={lang}
            />
          )}

          {activeTab === 'database' && (
            <DatabaseView
              currentUser={currentUser}
              editedEquipment={editedEquipment}
              setEditedEquipment={setEditedEquipment}
              isSavingDb={isSavingDb}
              newEqForm={newEqForm}
              setNewEqForm={setNewEqForm}
              formMsg={formMsg}
              onAddEquipmentManual={handleAddEquipmentManual}
              onSpreadsheetSave={handleSpreadsheetSave}
              lang={lang}
            />
          )}

          {activeTab === 'users' && currentUser.role === 'admin' && (
            <UsersView
              usersList={users}
              onAddUser={handleAddUser}
              onDeleteUser={handleDeleteUser}
              onToggleUserPermission={handleToggleUserPermission}
              userFormMsg={userFormMsg}
              lang={lang}
            />
          )}

          {activeTab === 'proposal' && (
            <ProposalView
              currentUser={currentUser}
              equipmentList={equipment}
              lang={lang}
            />
          )}

          {activeTab === 'letters' && (
            <LettersView
              currentUser={currentUser}
              lang={lang}
            />
          )}

          {activeTab === 'edms' && (
            <EDMSView
              currentUser={currentUser}
              lang={lang}
            />
          )}

          {activeTab === 'admin-console' && currentUser.role === 'admin' && (
            <AdminConsoleView
              currentUser={currentUser}
              lang={lang}
            />
          )}
        </main>
      </div>
      </div>

      {/* Modals */}
      <AiConfigModal
        isOpen={aiConfigModalOpen}
        onClose={() => setAiConfigModalOpen(false)}
        aiConfig={aiConfig}
        onSaveConfig={handleSaveAiConfig}
        lang={lang}
      />

      <ChangePasswordModal
        isOpen={pwdModalOpen}
        onClose={() => setPwdModalOpen(false)}
        onChangePassword={handleChangePassword}
        lang={lang}
      />
    </div>
  );
}
