import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Send,
  Inbox,
  Building2,
  AlertTriangle,
  Lock,
  Eye,
  Edit,
  Trash2,
  Printer,
  Sparkles,
  Paperclip,
  CheckCircle2,
  Clock,
  X,
  RefreshCw,
  Tag,
  ArrowRightLeft,
  FileSignature,
  UploadCloud,
  FileUp,
  Download,
  ExternalLink,
  BrainCircuit,
  Zap,
  CheckSquare,
  Mail
} from 'lucide-react';
import { Letter, User } from '../types';
import { authenticatedFetch } from '../utils/api';
import { SendEmailModal } from './SendEmailModal';
import { EmailHistoryModal } from './EmailHistoryModal';

interface LettersViewProps {
  currentUser: User | null;
  lang: 'fa' | 'en';
}

export const LettersView: React.FC<LettersViewProps> = ({ currentUser, lang }) => {
  const isFa = lang === 'fa';
  const [letters, setLetters] = useState<Letter[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Filters
  const [typeFilter, setTypeFilter] = useState<'all' | 'outgoing' | 'incoming' | 'internal'>('all');
  const [confidentialityFilter, setConfidentialityFilter] = useState<'all' | 'normal' | 'confidential' | 'secret'>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'normal' | 'urgent' | 'immediate'>('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 30;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, typeFilter, confidentialityFilter, priorityFilter]);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [editingLetter, setEditingLetter] = useState<Letter | null>(null);
  const [previewLetter, setPreviewLetter] = useState<Letter | null>(null);
  const [emailLetter, setEmailLetter] = useState<Letter | null>(null);
  const [isEmailHistoryOpen, setIsEmailHistoryOpen] = useState<boolean>(false);
  
  // AI Analysis Modal
  const [aiAnalysisLetter, setAiAnalysisLetter] = useState<Letter | null>(null);
  const [isQuickUploadOpen, setIsQuickUploadOpen] = useState<boolean>(false);
  
  // Processing states
  const [isAnalyzingFile, setIsAnalyzingFile] = useState<boolean>(false);
  const [isBulkProcessing, setIsBulkProcessing] = useState<boolean>(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0, filename: '' });
  const [isAiDrafting, setIsAiDrafting] = useState<boolean>(false);
  const [aiPrompt, setAiPrompt] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const quickFileInputRef = useRef<HTMLInputElement>(null);
  const templateFileInputRef = useRef<HTMLInputElement>(null);
  const [isLoadingTemplate, setIsLoadingTemplate] = useState<boolean>(false);

  // Form state
  const [formData, setFormData] = useState<Partial<Letter>>({
    letter_number: '',
    letter_date: new Date().toISOString().slice(0, 10),
    type: 'outgoing',
    subject: '',
    sender: 'شرکت مهندسی ایساتیس پارس تجهیز',
    recipient: '',
    confidentiality: 'normal',
    priority: 'normal',
    status: 'sent',
    content: '',
    attachments: '',
    project_code: 'IP-2026-F&G-01',
    file_name: '',
    file_url: '',
    file_size: '',
    ai_analysis: ''
  });

  useEffect(() => {
    fetchLetters();
  }, []);

  const fetchLetters = async () => {
    setLoading(true);
    try {
      const res = await authenticatedFetch('/api/letters');
      if (res.ok) {
        const data = await res.json();
        setLetters(data);
      }
    } catch (e) {
      console.error('Error fetching letters:', e);
    } finally {
      setLoading(false);
    }
  };

  const generateLetterNumber = () => {
    const year = new Date().getFullYear() - 621; // Jalali year approximation
    const randomSeq = Math.floor(1000 + Math.random() * 9000);
    const prefix = formData.type === 'outgoing' ? 'OUT' : formData.type === 'incoming' ? 'INC' : 'INT';
    setFormData(prev => ({ ...prev, letter_number: `IPT-${prefix}-${year}-${randomSeq}` }));
  };

  const handleOpenCreate = () => {
    setEditingLetter(null);
    setFormData({
      letter_number: `IPT-OUT-1405-${Math.floor(1000 + Math.random() * 9000)}`,
      letter_date: new Date().toISOString().slice(0, 10),
      type: 'outgoing',
      subject: '',
      sender: 'شرکت مهندسی ایساتیس پارس تجهیز',
      recipient: '',
      confidentiality: 'normal',
      priority: 'normal',
      status: 'sent',
      content: '',
      attachments: '',
      project_code: 'IP-2026-F&G-01',
      file_name: '',
      file_url: '',
      file_size: '',
      ai_analysis: ''
    });
    setIsCreateModalOpen(true);
  };

  const handleOpenEdit = (letter: Letter) => {
    setEditingLetter(letter);
    setFormData({ ...letter });
    setIsCreateModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm(isFa ? 'آیا از حذف این نامه اطمینان دارید؟' : 'Are you sure you want to delete this letter?')) return;
    try {
      const res = await authenticatedFetch(`/api/letters/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setLetters(prev => prev.filter(l => l.id !== id));
      }
    } catch (e) {
      console.error('Delete letter failed:', e);
    }
  };

  const handleSaveLetter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.letter_number || !formData.subject) {
      alert(isFa ? 'لطفا شماره و موضوع نامه را وارد کنید.' : 'Please enter letter number and subject.');
      return;
    }

    try {
      if (editingLetter) {
        const res = await authenticatedFetch(`/api/letters/${editingLetter.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData)
        });
        if (res.ok) {
          const updated = await res.json();
          setLetters(prev => prev.map(l => l.id === updated.id ? updated : l));
          setIsCreateModalOpen(false);
        }
      } else {
        const res = await authenticatedFetch('/api/letters', {
          method: 'POST',
          body: JSON.stringify({ ...formData, created_by: currentUser?.username || 'user' })
        });
        if (res.ok) {
          const created = await res.json();
          setLetters(prev => [created, ...prev]);
          setIsCreateModalOpen(false);
        }
      }
    } catch (e) {
      console.error('Save letter error:', e);
    }
  };

  // Load Word Template
  const handleLoadTemplate = async (file: File) => {
    if (!file) return;
    setIsLoadingTemplate(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = (event.target?.result as string)?.split(',')[1];
        if (!base64) {
          setIsLoadingTemplate(false);
          return;
        }

        const res = await authenticatedFetch('/api/extract-text', {
          method: 'POST',
          body: JSON.stringify({
            fileBase64: base64,
            fileName: file.name,
            mimeType: file.type
          })
        });

        if (res.ok) {
          const data = await res.json();
          setFormData(prev => ({ ...prev, content: data.text }));
        } else {
          alert(isFa ? 'خطا در استخراج متن از فایل قالب.' : 'Failed to extract text from template.');
        }
        setIsLoadingTemplate(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Load template error:', err);
      setIsLoadingTemplate(false);
    }
  };

  const handleBulkAnalyzeFiles = async (files: FileList) => {
    if (!files || files.length === 0) return;
    setIsBulkProcessing(true);
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setBulkProgress({ current: i + 1, total: files.length, filename: file.name });
      
      try {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve((e.target?.result as string).split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const res = await authenticatedFetch('/api/letters/analyze', {
          method: 'POST',
          body: JSON.stringify({
            fileBase64: base64,
            fileName: file.name,
            mimeType: file.type
          })
        });

        if (res.ok) {
          const data = await res.json();
          const ext = data.extracted || {};

          const analyzedData: Partial<Letter> = {
            subject: ext.subject || `نامه وارده/صادره - ${file.name}`,
            sender: ext.sender || (ext.type === 'incoming' ? 'ارسال‌کننده ناشناس' : 'شرکت مهندسی ایساتیس پارس تجهیز'),
            recipient: ext.recipient || (ext.type === 'incoming' ? 'شرکت مهندسی ایساتیس پارس تجهیز' : 'مدیریت محترم'),
            letter_number: ext.letter_number || `IPT-INC-1405-${Math.floor(1000 + Math.random() * 9000)}`,
            letter_date: ext.letter_date || new Date().toISOString().slice(0, 10),
            type: ext.type || 'incoming',
            confidentiality: ext.confidentiality || 'normal',
            priority: ext.priority || 'normal',
            project_code: ext.project_code || 'IP-2026-F&G-01',
            content: ext.content || 'محتوای استخراج‌شده از سند نامه...',
            ai_analysis: ext.ai_analysis || 'تحلیل خودکار توسط مدل هوش مصنوعی در حال انجام است.',
            file_name: data.file_name || file.name,
            file_url: data.file_url || '',
            file_size: data.file_size || `${Math.round(file.size / 1024)} KB`,
            attachments: file.name
          };

          const saveRes = await authenticatedFetch('/api/letters', {
            method: 'POST',
            body: JSON.stringify({
              ...analyzedData,
              status: 'archived',
              created_by: currentUser?.username || 'user'
            })
          });

          if (saveRes.ok) {
            const newLetter = await saveRes.json();
            setLetters(prev => [newLetter, ...prev]);
          }
        }
      } catch (err) {
        console.error('Bulk file analysis error for file', file.name, err);
      }
    }
    
    setIsBulkProcessing(false);
    setIsQuickUploadOpen(false);
  };

  // AI File Analysis & Auto-fill Handler
  const handleAnalyzeFile = async (file: File, isQuickMode: boolean = false) => {
    if (!file) return;
    setIsAnalyzingFile(true);

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = (event.target?.result as string)?.split(',')[1];
        if (!base64) {
          setIsAnalyzingFile(false);
          return;
        }

        const res = await authenticatedFetch('/api/letters/analyze', {
          method: 'POST',
          body: JSON.stringify({
            fileBase64: base64,
            fileName: file.name,
            mimeType: file.type
          })
        });

        if (res.ok) {
          const data = await res.json();
          const ext = data.extracted || {};

          const analyzedData: Partial<Letter> = {
            subject: ext.subject || `نامه وارده/صادره - ${file.name}`,
            sender: ext.sender || (ext.type === 'incoming' ? 'ارسال‌کننده ناشناس' : 'شرکت مهندسی ایساتیس پارس تجهیز'),
            recipient: ext.recipient || (ext.type === 'incoming' ? 'شرکت مهندسی ایساتیس پارس تجهیز' : 'مدیریت محترم'),
            letter_number: ext.letter_number || `IPT-INC-1405-${Math.floor(1000 + Math.random() * 9000)}`,
            letter_date: ext.letter_date || new Date().toISOString().slice(0, 10),
            type: ext.type || 'incoming',
            confidentiality: ext.confidentiality || 'normal',
            priority: ext.priority || 'normal',
            project_code: ext.project_code || 'IP-2026-F&G-01',
            content: ext.content || 'محتوای استخراج‌شده از سند نامه...',
            ai_analysis: ext.ai_analysis || 'تحلیل خودکار توسط مدل هوش مصنوعی در حال انجام است.',
            file_name: data.file_name || file.name,
            file_url: data.file_url || '',
            file_size: data.file_size || `${Math.round(file.size / 1024)} KB`,
            attachments: file.name
          };

          if (isQuickMode) {
            // Save directly as new letter
            const saveRes = await authenticatedFetch('/api/letters', {
              method: 'POST',
              body: JSON.stringify({
                ...analyzedData,
                status: 'archived',
                created_by: currentUser?.username || 'user'
              })
            });

            if (saveRes.ok) {
              const newLetter = await saveRes.json();
              setLetters(prev => [newLetter, ...prev]);
              setIsQuickUploadOpen(false);
              setAiAnalysisLetter(newLetter);
            }
          } else {
            // Fill create/edit modal form
            setFormData(prev => ({ ...prev, ...analyzedData }));
          }
        } else {
          alert(isFa ? 'خطا در تحلیل سند توسط AI. لطفاً مجدداً تلاش کنید.' : 'Failed to analyze letter file with AI.');
        }
        setIsAnalyzingFile(false);
      };

      reader.readAsDataURL(file);
    } catch (err) {
      console.error('File analysis error:', err);
      setIsAnalyzingFile(false);
    }
  };

  const handleDraftWithAi = async () => {
    if (!formData.subject) {
      alert(isFa ? 'لطفاً ابتدا موضوع نامه را وارد کنید.' : 'Please enter letter subject first.');
      return;
    }
    setIsAiDrafting(true);
    try {
      const res = await authenticatedFetch('/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          query: `لطفا یک متن نامه رسمی و حرفه‌ای اتوماسیون اداری برای شرکت مهندسی سیستم‌های اعلام و اطفاء حریق (F&G) با مشخصات زیر بنویس:
          موضوع: ${formData.subject}
          فرستنده: ${formData.sender}
          گیرنده: ${formData.recipient || 'جناب آقای مهندس ... / مدیریت محترم'}
          توضیحات تکمیلی: ${aiPrompt || 'تنظیم نامه رسمی با لحن اداری استاندارد، رعایت احترام و بندهای فنی'}
          
          متن نامه را مستقیم و بدون توضیحات اضافی شروع کن.`,
          history: [],
          systemAccess: 'both',
          priceAccess: 1
        })
      });

      if (res.ok) {
        const data = await res.json();
        const lastMsg = data.history ? data.history[data.history.length - 1] : null;
        if (lastMsg && lastMsg.content) {
          setFormData(prev => ({ ...prev, content: lastMsg.content }));
        }
      }
    } catch (e) {
      console.error('AI Draft Error:', e);
    } finally {
      setIsAiDrafting(false);
    }
  };

  const handleDraftReply = (originalLetter: Letter) => {
    setEditingLetter(null);
    setAiAnalysisLetter(null);
    setFormData({
      letter_number: `IPT-OUT-1405-${Math.floor(1000 + Math.random() * 9000)}`,
      letter_date: new Date().toISOString().slice(0, 10),
      type: 'outgoing',
      subject: `پاسخ به نامه پیرو شماره ${originalLetter.letter_number} - ${originalLetter.subject}`,
      sender: 'شرکت مهندسی ایساتیس پارس تجهیز',
      recipient: originalLetter.sender,
      confidentiality: originalLetter.confidentiality,
      priority: originalLetter.priority,
      status: 'sent',
      content: `با سلام و احترام،\nعاطفاً به نامه شماره ${originalLetter.letter_number} مورخ ${originalLetter.letter_date} در خصوص «${originalLetter.subject}»، بدین‌وسیله به استحضار می‌رساند...`,
      attachments: `پیرو نامه ${originalLetter.letter_number}`,
      project_code: originalLetter.project_code || 'IP-2026-F&G-01'
    });
    setIsCreateModalOpen(true);
  };

  // Filter logic
  const filteredLetters = useMemo(() => {
    return letters.filter(letter => {
      const matchesSearch =
        letter.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        letter.letter_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        letter.sender.toLowerCase().includes(searchQuery.toLowerCase()) ||
        letter.recipient.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (letter.project_code && letter.project_code.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesType = typeFilter === 'all' || letter.type === typeFilter;
      const matchesConf = confidentialityFilter === 'all' || letter.confidentiality === confidentialityFilter;
      const matchesPriority = priorityFilter === 'all' || letter.priority === priorityFilter;

      return matchesSearch && matchesType && matchesConf && matchesPriority;
    });
  }, [letters, searchQuery, typeFilter, confidentialityFilter, priorityFilter]);

  const totalPages = Math.ceil(filteredLetters.length / ITEMS_PER_PAGE);
  const paginatedLetters = filteredLetters.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Summary counts
  const outgoingCount = useMemo(() => letters.filter(l => l.type === 'outgoing').length, [letters]);
  const incomingCount = useMemo(() => letters.filter(l => l.type === 'incoming').length, [letters]);
  const internalCount = useMemo(() => letters.filter(l => l.type === 'internal').length, [letters]);
  const urgentCount = useMemo(() => letters.filter(l => l.priority === 'urgent' || l.priority === 'immediate').length, [letters]);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto text-slate-800" dir={isFa ? 'rtl' : 'ltr'}>
      {/* Top Header & Actions Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold">
              <FileSignature className="w-3.5 h-3.5" />
              <span>{isFa ? 'سامانه هوشمند اتوماسیون و تحلیل فایل‌های نامه F&G' : 'AI-Powered F&G Correspondence & Document Intelligence'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {isFa ? 'اتوماسیون اداری و تحلیل هوشمند نامه‌ها' : 'Engineering Correspondence Automation'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              {isFa ? 'ثبت، ارجاع و تحلیل هوشمند نامه‌های وارده و صادره با امکان استخراج خودکار متون، اولویت‌بندی و هوش مصنوعی' : 'Manage outgoing & incoming letters with AI document OCR analysis, instant auto-fill, and smart response generation.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => setIsEmailHistoryOpen(true)}
              className="px-3.5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs sm:text-sm border border-slate-700 shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Mail className="w-4 h-4 text-sky-400" />
              <span>{isFa ? 'سوابق مکاتبات ایمیل' : 'Email Logs'}</span>
            </button>

            <button
              onClick={() => setIsQuickUploadOpen(true)}
              className="px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <UploadCloud className="w-5 h-5" />
              <span>{isFa ? 'بارگذاری و تحلیل هوشمند فایل نامه (AI)' : 'Upload & Analyze File (AI)'}</span>
            </button>

            <button
              onClick={handleOpenCreate}
              className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-5 h-5" />
              <span>{isFa ? 'ثبت نامه جدید' : 'Create New Letter'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Overview Stat Widgets */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/80 p-4.5 rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 border border-blue-100 rounded-xl shrink-0">
            <Send className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">{isFa ? 'نامه‌های صادره' : 'Outgoing Letters'}</div>
            <div className="text-2xl font-extrabold text-slate-900 mt-0.5">{outgoingCount}</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 p-4.5 rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl shrink-0">
            <Inbox className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">{isFa ? 'نامه‌های وارده' : 'Incoming Letters'}</div>
            <div className="text-2xl font-extrabold text-slate-900 mt-0.5">{incomingCount}</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 p-4.5 rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center gap-4">
          <div className="p-3 bg-purple-50 text-purple-600 border border-purple-100 rounded-xl shrink-0">
            <ArrowRightLeft className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">{isFa ? 'نامه‌های داخلی' : 'Internal Letters'}</div>
            <div className="text-2xl font-extrabold text-slate-900 mt-0.5">{internalCount}</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 p-4.5 rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center gap-4">
          <div className="p-3 bg-rose-50 text-rose-600 border border-rose-100 rounded-xl shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">{isFa ? 'فوریت بالا / آنی' : 'Urgent / Immediate'}</div>
            <div className="text-2xl font-extrabold text-rose-600 mt-0.5">{urgentCount}</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200/80 p-4.5 rounded-2xl shadow-sm space-y-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4 justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isFa ? 'جستجو در شماره، موضوع، فرستنده، گیرنده یا کد پروژه...' : 'Search letters by number, subject, sender, project...'}
              className="w-full pr-10 pl-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-blue-500 focus:outline-none transition-all placeholder-slate-400"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Type Filter */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setTypeFilter('all')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${typeFilter === 'all' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                {isFa ? 'همه' : 'All'}
              </button>
              <button
                onClick={() => setTypeFilter('outgoing')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${typeFilter === 'outgoing' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                {isFa ? 'صادره' : 'Outgoing'}
              </button>
              <button
                onClick={() => setTypeFilter('incoming')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${typeFilter === 'incoming' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                {isFa ? 'وارده' : 'Incoming'}
              </button>
              <button
                onClick={() => setTypeFilter('internal')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${typeFilter === 'internal' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                {isFa ? 'داخلی' : 'Internal'}
              </button>
            </div>

            {/* Confidentiality Filter */}
            <select
              value={confidentialityFilter}
              onChange={(e) => setConfidentialityFilter(e.target.value as any)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 focus:outline-none focus:border-blue-500"
            >
              <option value="all">{isFa ? 'همه طبقات' : 'All Levels'}</option>
              <option value="normal">{isFa ? 'عادی' : 'Normal'}</option>
              <option value="confidential">{isFa ? 'محرمانه' : 'Confidential'}</option>
              <option value="secret">{isFa ? 'سری' : 'Secret'}</option>
            </select>

            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as any)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 focus:outline-none focus:border-blue-500"
            >
              <option value="all">{isFa ? 'همه اولویت‌ها' : 'All Priorities'}</option>
              <option value="normal">{isFa ? 'عادی' : 'Normal'}</option>
              <option value="urgent">{isFa ? 'فوری' : 'Urgent'}</option>
              <option value="immediate">{isFa ? 'آنی' : 'Immediate'}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto" />
            <p className="text-xs font-medium">{isFa ? 'در حال دریافت اطلاعات اتوماسیون...' : 'Loading letters...'}</p>
          </div>
        ) : filteredLetters.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-3">
            <FileText className="w-12 h-12 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">{isFa ? 'هیچ نامه‌ای یافت نشد.' : 'No letters found.'}</p>
            <p className="text-xs text-slate-400">
              {isFa ? 'جهت ثبت نامه جدید یا بارگذاری فایل از دکمه‌های بالای صفحه استفاده نمایید.' : 'Use the top buttons to create or upload a letter.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50/80 text-slate-600 font-bold border-b border-slate-200 uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="py-3.5 px-4 text-center">#</th>
                  <th className="py-3.5 px-4">{isFa ? 'شماره و تاریخ' : 'Number & Date'}</th>
                  <th className="py-3.5 px-4">{isFa ? 'نوع' : 'Type'}</th>
                  <th className="py-3.5 px-4">{isFa ? 'موضوع نامه / کد پروژه' : 'Subject / Project'}</th>
                  <th className="py-3.5 px-4">{isFa ? 'فرستنده / گیرنده' : 'Sender / Recipient'}</th>
                  <th className="py-3.5 px-4 text-center">{isFa ? 'فایل سند & تحلیل AI' : 'File & AI Analysis'}</th>
                  <th className="py-3.5 px-4 text-center">{isFa ? 'طبقه بندی & فوریت' : 'Level & Priority'}</th>
                  <th className="py-3.5 px-4 text-center">{isFa ? 'عملیات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {paginatedLetters.map((letter, idx) => {
                  const typeBadge =
                    letter.type === 'outgoing'
                      ? { bg: 'bg-blue-50 text-blue-700 border-blue-200', text: isFa ? 'صادره' : 'Outgoing' }
                      : letter.type === 'incoming'
                      ? { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', text: isFa ? 'وارده' : 'Incoming' }
                      : { bg: 'bg-purple-50 text-purple-700 border-purple-200', text: isFa ? 'داخلی' : 'Internal' };

                  const priorityBadge =
                    letter.priority === 'immediate'
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : letter.priority === 'urgent'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200';

                  const confBadge =
                    letter.confidentiality === 'secret'
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : letter.confidentiality === 'confidential'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200';

                  return (
                    <tr key={letter.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 text-center font-mono text-slate-400">{idx + 1}</td>
                      
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-extrabold text-slate-900 tracking-wider">{letter.letter_number}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{letter.letter_date}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${typeBadge.bg}`}>
                          {typeBadge.text}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-bold text-slate-900 truncate" title={letter.subject}>
                          {letter.subject}
                        </div>
                        {letter.project_code && (
                          <div className="inline-flex items-center gap-1 text-[10px] font-mono text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded mt-1">
                            <Tag className="w-2.5 h-2.5" />
                            {letter.project_code}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-[11px]">
                        <div className="text-slate-800">
                          <span className="text-slate-400 ml-1">{isFa ? 'از:' : 'From:'}</span>
                          {letter.sender || '-'}
                        </div>
                        <div className="text-slate-600 mt-0.5">
                          <span className="text-slate-400 ml-1">{isFa ? 'به:' : 'To:'}</span>
                          {letter.recipient || '-'}
                        </div>
                      </td>

                      {/* File attachment & AI Analysis Column */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          {letter.file_url || letter.file_name ? (
                            <a
                              href={letter.file_url || `/api/documents/download/${letter.file_name}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] font-semibold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-lg hover:bg-teal-100 transition-all"
                              title={letter.file_name}
                            >
                              <Paperclip className="w-3 h-3" />
                              <span className="max-w-[100px] truncate">{letter.file_name || 'فایل ضممیه'}</span>
                              <Download className="w-2.5 h-2.5" />
                            </a>
                          ) : (
                            <span className="text-[10px] text-slate-400">{isFa ? 'بدون فایل اصلی' : 'No file'}</span>
                          )}

                          <button
                            onClick={() => setAiAnalysisLetter(letter)}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-lg hover:bg-indigo-600 hover:text-white transition-all cursor-pointer"
                          >
                            <BrainCircuit className="w-3 h-3" />
                            <span>{isFa ? 'تحلیل AI' : 'AI Analysis'}</span>
                          </button>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center space-y-1">
                        <div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${confBadge}`}>
                            {letter.confidentiality === 'secret' ? (isFa ? 'سری' : 'Secret') : letter.confidentiality === 'confidential' ? (isFa ? 'محرمانه' : 'Confidential') : (isFa ? 'عادی' : 'Normal')}
                          </span>
                        </div>
                        <div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${priorityBadge}`}>
                            {letter.priority === 'immediate' ? (isFa ? 'آنی' : 'Immediate') : letter.priority === 'urgent' ? (isFa ? 'فوری' : 'Urgent') : (isFa ? 'عادی' : 'Normal')}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setEmailLetter(letter)}
                            className="p-1.5 bg-sky-50 hover:bg-sky-600 text-sky-600 hover:text-white rounded-lg transition-all cursor-pointer"
                            title={isFa ? 'ارسال نامه با ایمیل' : 'Send Letter via Email'}
                          >
                            <Mail className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setPreviewLetter(letter)}
                            className="p-1.5 bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white rounded-lg transition-all cursor-pointer"
                            title={isFa ? 'مشاهده سربرگ و چاپ' : 'Preview & Print'}
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          {(currentUser.role === 'admin' || currentUser.role === 'manager') && (
                            <button
                              onClick={() => handleOpenEdit(letter)}
                              className="p-1.5 bg-slate-100 hover:bg-slate-800 text-slate-600 hover:text-white rounded-lg transition-all cursor-pointer"
                              title={isFa ? 'ویرایش نامه' : 'Edit'}
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}
                          {currentUser.role === 'admin' && (
                            <button
                              onClick={() => handleDelete(letter.id)}
                              className="p-1.5 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white rounded-lg transition-all cursor-pointer"
                              title={isFa ? 'حذف نامه (ادمین)' : 'Delete (Admin)'}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
              {isFa ? 'قبلی' : 'Prev'}
            </button>
            <div className="text-sm font-medium text-slate-600 px-4">
              {isFa ? `صفحه ${currentPage} از ${totalPages}` : `Page ${currentPage} of ${totalPages}`}
            </div>
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev + 1, 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              {isFa ? 'بعدی' : 'Next'}
            </button>
          </div>
        )}
      </div>

      {/* QUICK FILE UPLOAD & AI ANALYSIS MODAL */}
      <AnimatePresence>
        {isQuickUploadOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-5 text-slate-800"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm">
                  <UploadCloud className="w-5 h-5 text-emerald-600" />
                  <span>{isFa ? 'بارگذاری و استخراج هوشمند سند نامه (AI)' : 'Smart File Analysis & Auto-Import'}</span>
                </div>
                <button
                  onClick={() => setIsQuickUploadOpen(false)}
                  className="text-slate-400 hover:text-slate-700 p-1 rounded-lg transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <p className="text-slate-600 leading-relaxed">
                  {isFa ? 'فایل تصویر (JPG, PNG) یا PDF نامه ورودی/خروجی خود را بارگذاری کنید. هوش مصنوعی به‌صورت خودکار موضوع، شماره، فرستنده، گیرنده و خلاصه‌ای از نکات کلیدی آن را تحلیل و در سیستم ثبت می‌کند.' : 'Drop or upload any letter PDF or image. AI will automatically parse subject, sender, recipient, letter number, and key takeaways into the system.'}
                </p>

                <div
                  onClick={() => quickFileInputRef.current?.click()}
                  className="border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/50 hover:bg-emerald-50 p-8 rounded-2xl text-center cursor-pointer transition-all space-y-3 group"
                >
                  <input
                    type="file"
                    ref={quickFileInputRef}
                    multiple
                    onChange={(e) => {
                      const files = e.target.files;
                      if (files && files.length > 0) {
                        if (files.length === 1) {
                          handleAnalyzeFile(files[0], true);
                        } else {
                          handleBulkAnalyzeFiles(files);
                        }
                      }
                      e.target.value = '';
                    }}
                    accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.txt"
                    className="hidden"
                  />

                  {isBulkProcessing ? (
                    <div className="space-y-3 py-4">
                      <div className="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
                      <p className="font-bold text-emerald-800 animate-pulse">
                        {isFa ? `در حال پردازش ${bulkProgress.current} از ${bulkProgress.total} فایل...` : `Processing file ${bulkProgress.current} of ${bulkProgress.total}...`}
                      </p>
                      <p className="text-[11px] text-emerald-600 truncate max-w-[250px] mx-auto">{bulkProgress.filename}</p>
                    </div>
                  ) : isAnalyzingFile ? (
                    <div className="space-y-3 py-4">
                      <div className="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
                      <p className="font-bold text-emerald-800 animate-pulse">{isFa ? 'هوش مصنوعی در حال خواندن سند و استخراج فیلدهاست...' : 'AI is reading letter content & extracting fields...'}</p>
                    </div>
                  ) : (
                    <>
                      <div className="p-3 bg-white text-emerald-600 rounded-2xl w-14 h-14 mx-auto shadow-sm group-hover:scale-110 transition-all flex items-center justify-center">
                        <FileUp className="w-7 h-7" />
                      </div>
                      <div>
                        <div className="font-extrabold text-slate-800 text-sm">{isFa ? 'کلیک کنید یا فایل‌های نامه را به اینجا بکشید' : 'Click or drag & drop letter files here'}</div>
                        <div className="text-[11px] text-slate-500 mt-1 font-mono">PDF, PNG, JPG, DOCX ({isFa ? 'امکان انتخاب گروهی فایل‌ها' : 'Bulk select supported'})</div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* AI ANALYSIS MODAL FOR ROW */}
      <AnimatePresence>
        {aiAnalysisLetter && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-3xl shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto text-slate-800"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2 text-indigo-900 font-extrabold text-base">
                  <BrainCircuit className="w-5 h-5 text-indigo-600" />
                  <span>{isFa ? 'تحلیل و ارزیابی هوشمند نامه توسط AI' : 'AI Letter Analysis & Summary'}</span>
                </div>
                <button
                  onClick={() => setAiAnalysisLetter(null)}
                  className="text-slate-400 hover:text-slate-700 p-1 rounded-lg transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Document Overview Header */}
              <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-xl space-y-2 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold text-slate-900 text-sm">{aiAnalysisLetter.subject}</span>
                  <span className="font-mono text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md font-bold">
                    {aiAnalysisLetter.letter_number}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-slate-600 pt-2 border-t border-slate-200/60">
                  <div><strong>{isFa ? 'فرستنده:' : 'Sender:'}</strong> {aiAnalysisLetter.sender}</div>
                  <div><strong>{isFa ? 'گیرنده:' : 'Recipient:'}</strong> {aiAnalysisLetter.recipient}</div>
                  <div><strong>{isFa ? 'تاریخ:' : 'Date:'}</strong> {aiAnalysisLetter.letter_date}</div>
                </div>
              </div>

              {/* Attached File Card */}
              {aiAnalysisLetter.file_name && (
                <div className="flex items-center justify-between p-3 bg-teal-50/70 border border-teal-200/80 rounded-xl text-xs">
                  <div className="flex items-center gap-2.5">
                    <Paperclip className="w-4 h-4 text-teal-700" />
                    <div>
                      <div className="font-bold text-teal-900">{aiAnalysisLetter.file_name}</div>
                      <div className="text-[10px] text-teal-600">{aiAnalysisLetter.file_size || 'سند ضمیمه شده'}</div>
                    </div>
                  </div>
                  <a
                    href={aiAnalysisLetter.file_url || `/api/documents/download/${aiAnalysisLetter.file_name}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-teal-700 hover:bg-teal-600 text-white font-bold rounded-lg transition-all flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{isFa ? 'دانلود سند اصلی' : 'Download Original File'}</span>
                  </a>
                </div>
              )}

              {/* AI Executive Analysis Box */}
              <div className="p-4 bg-gradient-to-br from-indigo-50/80 via-blue-50/50 to-slate-50 border border-indigo-200 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-indigo-900 font-extrabold text-xs">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span>{isFa ? 'چکیده مدیریتی و اقدامات پیشنهادی هوش مصنوعی' : 'AI Executive Breakdown & Action Items'}</span>
                </div>
                <div className="text-xs text-slate-800 leading-relaxed whitespace-pre-line font-sans bg-white p-4 rounded-xl border border-indigo-100 shadow-sm">
                  {aiAnalysisLetter.ai_analysis || (isFa ? 'تحلیل تحریری برای این نامه ثبت نشده است.' : 'No AI summary available for this letter.')}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                <button
                  onClick={() => handleDraftReply(aiAnalysisLetter)}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex items-center gap-2 shadow-md shadow-blue-600/20 transition-all cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>{isFa ? 'تنظیم پیش‌نویس پاسخ به این نامه با AI' : 'Draft Response with AI'}</span>
                </button>

                <button
                  onClick={() => setAiAnalysisLetter(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all cursor-pointer"
                >
                  {isFa ? 'بستن' : 'Close'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CREATE / EDIT MODAL */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-3xl shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto text-slate-800"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                  <FileSignature className="w-5 h-5 text-blue-600" />
                  <span>{editingLetter ? (isFa ? 'ویرایش نامه رسمی' : 'Edit Official Letter') : (isFa ? 'ثبت نامه رسمی جدید' : 'Create New Official Letter')}</span>
                </h2>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="text-slate-400 hover:text-slate-700 p-1 rounded-lg transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drag & Drop File Upload Banner inside modal */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Paperclip className="w-4 h-4 text-blue-600" />
                    {isFa ? 'پیوست فایل یا قالب نامه' : 'Attach Letter / Load Template'}
                  </span>
                  
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => templateFileInputRef.current?.click()}
                      disabled={isLoadingTemplate}
                      className="px-3 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isLoadingTemplate ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                      <span>{isFa ? 'بارگذاری قالب (Word)' : 'Load Template (Word)'}</span>
                    </button>
                    <input
                      type="file"
                      ref={templateFileInputRef}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleLoadTemplate(f);
                        e.target.value = ''; // Reset input
                      }}
                      accept=".doc,.docx,.txt"
                      className="hidden"
                    />

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>{isFa ? 'فایل سند (تحلیل AI)' : 'Upload & AI Auto-fill'}</span>
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleAnalyzeFile(f, false);
                        e.target.value = ''; // Reset input
                      }}
                      accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.txt"
                      className="hidden"
                    />
                  </div>
                </div>

                {isAnalyzingFile || isLoadingTemplate ? (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 flex items-center gap-2 animate-pulse">
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <span>{isFa ? 'در حال پردازش فایل...' : 'Processing file...'}</span>
                  </div>
                ) : formData.file_name ? (
                  <div className="flex items-center justify-between p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900">
                    <span className="font-mono text-[11px] truncate">{formData.file_name} ({formData.file_size})</span>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, file_name: '', file_url: '', file_size: '' }))}
                      className="text-rose-600 hover:text-rose-800 p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : null}
              </div>

              <form onSubmit={handleSaveLetter} className="space-y-4 text-xs">
                {/* Form row 1 */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-700 mb-1 font-bold">{isFa ? 'شماره نامه' : 'Letter Number'}</label>
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={formData.letter_number || ''}
                        onChange={(e) => setFormData({ ...formData, letter_number: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:bg-white focus:border-blue-500 focus:outline-none"
                        required
                      />
                      <button
                        type="button"
                        onClick={generateLetterNumber}
                        className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl shrink-0 cursor-pointer"
                        title={isFa ? 'تولید شماره خودکار' : 'Auto Generate'}
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 mb-1 font-bold">{isFa ? 'تاریخ نامه' : 'Letter Date'}</label>
                    <input
                      type="text"
                      value={formData.letter_date || ''}
                      onChange={(e) => setFormData({ ...formData, letter_date: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:bg-white focus:border-blue-500 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 mb-1 font-bold">{isFa ? 'نوع نامه' : 'Letter Type'}</label>
                    <select
                      value={formData.type || 'outgoing'}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none font-medium"
                    >
                      <option value="outgoing">{isFa ? 'صادره (ارسال به بیرون)' : 'Outgoing'}</option>
                      <option value="incoming">{isFa ? 'وارده (دریافت از بیرون)' : 'Incoming'}</option>
                      <option value="internal">{isFa ? 'داخلی (بین واحدها)' : 'Internal'}</option>
                    </select>
                  </div>
                </div>

                {/* Form row 2 */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-700 mb-1 font-bold">{isFa ? 'کد پروژه مرجع' : 'Project Code'}</label>
                    <input
                      type="text"
                      value={formData.project_code || ''}
                      onChange={(e) => setFormData({ ...formData, project_code: e.target.value })}
                      placeholder="IP-2026-F&G-01"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:bg-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 mb-1 font-bold">{isFa ? 'طبقه بندی' : 'Confidentiality'}</label>
                    <select
                      value={formData.confidentiality || 'normal'}
                      onChange={(e) => setFormData({ ...formData, confidentiality: e.target.value as any })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none font-medium"
                    >
                      <option value="normal">{isFa ? 'عادی' : 'Normal'}</option>
                      <option value="confidential">{isFa ? 'محرمانه' : 'Confidential'}</option>
                      <option value="secret">{isFa ? 'سری' : 'Secret'}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 mb-1 font-bold">{isFa ? 'اولویت ارسال' : 'Priority'}</label>
                    <select
                      value={formData.priority || 'normal'}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none font-medium"
                    >
                      <option value="normal">{isFa ? 'عادی' : 'Normal'}</option>
                      <option value="urgent">{isFa ? 'فوری' : 'Urgent'}</option>
                      <option value="immediate">{isFa ? 'آنی' : 'Immediate'}</option>
                    </select>
                  </div>
                </div>

                {/* Form row 3 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 mb-1 font-bold">{isFa ? 'فرستنده (از طرف)' : 'Sender'}</label>
                    <input
                      type="text"
                      value={formData.sender || ''}
                      onChange={(e) => setFormData({ ...formData, sender: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none font-medium"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 mb-1 font-bold">{isFa ? 'گیرنده (به نام)' : 'Recipient'}</label>
                    <input
                      type="text"
                      value={formData.recipient || ''}
                      onChange={(e) => setFormData({ ...formData, recipient: e.target.value })}
                      placeholder={isFa ? 'به: مدیریت محترم واحد مهندسی' : 'To: Engineering Department'}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none font-medium"
                      required
                    />
                  </div>
                </div>

                {/* Subject */}
                <div>
                  <label className="block text-slate-700 mb-1 font-bold">{isFa ? 'موضوع نامه' : 'Subject'}</label>
                  <input
                    type="text"
                    value={formData.subject || ''}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder={isFa ? 'موضوع: تایید مدارک فنی و نقشه جانمایی دتکتورهای گاز' : 'Subject: Approval of F&G drawings'}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none font-medium"
                    required
                  />
                </div>

                {/* AI Assistant Generator */}
                <div className="p-3.5 bg-gradient-to-br from-blue-50 to-indigo-50/50 border border-blue-200/80 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-blue-900 font-bold flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-blue-600" />
                      {isFa ? 'دستیار هوش مصنوعی تنظیم متن نامه (AI Writer)' : 'AI Draft Writer'}
                    </span>
                    <button
                      type="button"
                      onClick={handleDraftWithAi}
                      disabled={isAiDrafting}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold flex items-center gap-1.5 disabled:opacity-50 transition-all cursor-pointer shadow-sm"
                    >
                      {isAiDrafting ? (
                        <>
                          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>{isFa ? 'در حال تنظیم...' : 'Drafting...'}</span>
                        </>
                      ) : (
                        <span>{isFa ? 'تولید هوشمند متن' : 'Generate Text'}</span>
                      )}
                    </button>
                  </div>
                  <input
                    type="text"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder={isFa ? 'توضیحات کوتاه برای AI (مثلا: نامه تایید مدارک با رعایت استاندارد NFPA 72)' : 'Optional instruction for AI...'}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Letter Body Content */}
                <div>
                  <label className="block text-slate-700 mb-1 font-bold">{isFa ? 'متن اصلی / چکیده نامه' : 'Main Content'}</label>
                  <textarea
                    rows={6}
                    value={formData.content || ''}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder={isFa ? 'با سلام و احترام،\nبازگشت به نامه شماره ...' : 'Dear Sir/Madam,...'}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none leading-relaxed font-sans"
                    required
                  />
                </div>

                {/* AI Analysis Field */}
                <div>
                  <label className="block text-slate-700 mb-1 font-bold flex items-center gap-1">
                    <BrainCircuit className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{isFa ? 'تحلیل هوشمند اداری و نکات کلیدی (AI Analysis)' : 'AI Analysis & Key Takeaways'}</span>
                  </label>
                  <textarea
                    rows={3}
                    value={formData.ai_analysis || ''}
                    onChange={(e) => setFormData({ ...formData, ai_analysis: e.target.value })}
                    placeholder={isFa ? 'تحلیل هوشمند، اقدامات لازم و الزامات اداری به صورت خودکار توسط AI تکمیل می‌شود...' : 'AI extracted insights and action items...'}
                    className="w-full bg-indigo-50/50 border border-indigo-200 rounded-xl p-3 text-slate-800 focus:bg-white focus:border-indigo-500 focus:outline-none leading-relaxed font-sans text-xs"
                  />
                </div>

                {/* Attachments */}
                <div>
                  <label className="block text-slate-700 mb-1 font-bold">{isFa ? 'توضیح پیوست‌ها' : 'Attachments Note'}</label>
                  <input
                    type="text"
                    value={formData.attachments || ''}
                    onChange={(e) => setFormData({ ...formData, attachments: e.target.value })}
                    placeholder={isFa ? 'دارد (شامل ۳ برگ نقشه جانمایی دتکتورها)' : '3 pages of F&G layout drawings'}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none font-medium"
                  />
                </div>

                {/* Submit buttons */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all cursor-pointer"
                  >
                    {isFa ? 'انصراف' : 'Cancel'}
                  </button>

                  <button
                    type="submit"
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-extrabold shadow-lg shadow-blue-600/25 transition-all cursor-pointer"
                  >
                    {isFa ? 'ثبت و ذخیره نامه' : 'Save Letter'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PREVIEW & PRINT OFFICIAL LETTER MODAL */}
      <AnimatePresence>
        {previewLetter && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-4xl shadow-2xl space-y-4 max-h-[95vh] overflow-y-auto text-slate-800"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm">
                  <Printer className="w-4 h-4 text-blue-600" />
                  <span>{isFa ? 'پیش‌نمایش سربرگ رسمی نامه' : 'Official Letterhead Preview'}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const l = previewLetter;
                      setPreviewLetter(null);
                      setEmailLetter(l);
                    }}
                    className="px-3.5 py-1.5 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>{isFa ? 'ارسال با ایمیل' : 'Send via Email'}</span>
                  </button>

                  <button
                    onClick={() => window.print()}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>{isFa ? 'چاپ نامه' : 'Print Letter'}</span>
                  </button>

                  <button
                    onClick={() => setPreviewLetter(null)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition-all cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Printable Official Paper Layout */}
              <div
                id="printable-letter"
                className="bg-white text-slate-900 p-8 sm:p-12 rounded-xl shadow-md font-sans min-h-[700px] flex flex-col justify-between border border-slate-200"
                style={{ direction: isFa ? 'rtl' : 'ltr' }}
              >
                <div>
                  {/* Company Header */}
                  <div className="border-b-2 border-blue-900 pb-4 mb-6 flex items-center justify-between">
                    <div>
                      <h1 className="text-xl font-black text-blue-950 tracking-tight">
                        {isFa ? 'شرکت مهندسی ایساتیس پارس تجهیز' : 'ISATIS PARS TAJHIZ ENGINEERING CO.'}
                      </h1>
                      <p className="text-xs text-slate-600 font-semibold mt-0.5">
                        {isFa ? 'تامین کننده تخصصی تجهیزات و سیستم‌های اعلام و اطفاء حریق (F&G)' : 'Specialized F&G Systems Engineering & Supply'}
                      </p>
                    </div>

                    <div className="text-left font-mono text-[11px] text-slate-700 space-y-0.5 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                      <div><strong>{isFa ? 'شماره:' : 'Ref:'}</strong> {previewLetter.letter_number}</div>
                      <div><strong>{isFa ? 'تاریخ:' : 'Date:'}</strong> {previewLetter.letter_date}</div>
                      <div><strong>{isFa ? 'پیوست:' : 'Att:'}</strong> {previewLetter.attachments || (isFa ? 'ندارد' : 'None')}</div>
                    </div>
                  </div>

                  {/* Bismillah Header */}
                  <div className="text-center font-bold text-slate-700 text-sm mb-6">
                    {isFa ? '« بسمه تعالی »' : 'IN THE NAME OF GOD'}
                  </div>

                  {/* Recipient */}
                  <div className="text-sm font-bold text-slate-900 mb-6">
                    <div>{isFa ? 'به:' : 'To:'} {previewLetter.recipient || 'مدیریت محترم'}</div>
                    <div className="mt-1">
                      <span className="text-slate-700 font-normal">{isFa ? 'موضوع:' : 'Subject:'} </span>
                      <span className="underline underline-offset-4 font-black text-blue-950">{previewLetter.subject}</span>
                    </div>
                  </div>

                  {/* Main Text Content */}
                  <div className="text-sm leading-8 text-slate-800 whitespace-pre-line text-justify font-normal mb-8">
                    {previewLetter.content}
                  </div>

                  {/* AI Analysis section if present */}
                  {previewLetter.ai_analysis && (
                    <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5">
                      <div className="font-extrabold text-indigo-900 flex items-center gap-1.5">
                        <BrainCircuit className="w-4 h-4 text-indigo-600" />
                        <span>{isFa ? 'خلاصه و تحلیل سیستم هوشمند (AI Analysis Summary):' : 'AI Analysis:'}</span>
                      </div>
                      <div className="text-slate-700 whitespace-pre-line leading-relaxed">{previewLetter.ai_analysis}</div>
                    </div>
                  )}
                </div>

                {/* Footer Sign-off & Stamp Place */}
                <div className="pt-6 border-t border-slate-200 mt-auto">
                  <div className="flex items-end justify-between text-xs">
                    <div>
                      <div className="font-bold text-slate-900">{isFa ? 'با احترام،' : 'Best Regards,'}</div>
                      <div className="font-extrabold text-blue-900 mt-1">{previewLetter.sender}</div>
                      <div className="text-slate-500 mt-0.5">{isFa ? 'واحد مهندسی و اتوماسیون اداری' : 'Engineering & Official Affairs Dept.'}</div>
                    </div>

                    <div className="w-32 h-20 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center text-[10px] text-slate-400 font-mono text-center p-2">
                      {isFa ? 'محل امضاء و مهر رسمی شرکت' : 'Official Stamp & Signature'}
                    </div>
                  </div>

                  {/* Document Footer Note */}
                  <div className="text-center text-[10px] text-slate-400 mt-6 pt-2 border-t border-slate-100">
                    {isFa ? 'تهران، خیابان پاسداران، شرکت مهندسی ایساتیس پارس تجهیز — تلفن: ۰۲۱-۲۲۰۰۰۰۰۰ — وبسایت رسمی اتوماسیون' : 'Isatis Pars Tajhiz Engineering Co. — Official F&G Document Management'}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Send Letter Email Modal */}
      {emailLetter && (
        <SendEmailModal
          isOpen={!!emailLetter}
          onClose={() => setEmailLetter(null)}
          type="letter"
          data={emailLetter}
          lang={lang}
          onSuccess={() => {
            fetchLetters();
          }}
        />
      )}

      {/* Email History Logs Modal */}
      <EmailHistoryModal
        isOpen={isEmailHistoryOpen}
        onClose={() => setIsEmailHistoryOpen(false)}
        lang={lang}
        isAdmin={currentUser?.role === 'admin'}
      />

    </div>
  );
};
