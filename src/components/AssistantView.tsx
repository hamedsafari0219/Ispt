import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Send, 
  Mic, 
  Plus, 
  X, 
  FileText, 
  Copy, 
  Check, 
  RotateCcw, 
  ThumbsUp, 
  ThumbsDown, 
  Flame, 
  ShieldCheck, 
  Zap, 
  Compass, 
  Search,
  FileCode,
  Paperclip
} from 'lucide-react';
import { ChatMessage, User } from '../types';

interface AssistantViewProps {
  currentUser: User;
  chatHistory: ChatMessage[];
  chatInput: string;
  setChatInput: (val: string) => void;
  attachedFile: { name: string; base64: string; mimeType: string } | null;
  setAttachedFile: (file: { name: string; base64: string; mimeType: string } | null) => void;
  isSendingMessage: boolean;
  onSendChatMessage: (e: React.FormEvent) => void;
  onChatFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  lang: 'fa' | 'en';
}

export const AssistantView: React.FC<AssistantViewProps> = ({
  currentUser,
  chatHistory,
  chatInput,
  setChatInput,
  attachedFile,
  setAttachedFile,
  isSendingMessage,
  onSendChatMessage,
  onChatFileSelect,
  lang
}) => {
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isSendingMessage]);

  const handleCopyText = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Gemini Style Prompt Cards
  const promptCards = lang === 'fa' ? [
    {
      title: 'ضوابط جانمایی دتکتورها',
      subtitle: 'فواصل نصب و پوشش‌دهی دتکتورهای دود طبق NFPA 72',
      prompt: 'فاصله‌گذاری دتکتور دود طبق NFPA 72 چقدر است؟',
      icon: <ShieldCheck className="w-5 h-5 text-blue-500" />
    },
    {
      title: 'استعلام پارت‌نامبر و کاتالوگ',
      subtitle: 'اطلاعات فنی برندهای Notifier، VESDA و Honeywell',
      prompt: 'دیتاشیت و پارت‌نامبر دتکتور شعله برند Notifier را بگو',
      icon: <Search className="w-5 h-5 text-amber-500" />
    },
    {
      title: 'طراحی سیستم اطفاء گاز',
      subtitle: 'کدهای NFPA 2001 و محاسبات غلظت گاز FM-200',
      prompt: 'استاندارد طراحی سیستم اطفاء گاز FM-200 در NFPA 2001 چگونه است؟',
      icon: <Flame className="w-5 h-5 text-rose-500" />
    },
    {
      title: 'مقایسه تکنولوژی دتکتورها',
      subtitle: 'بررسی تفاوت دتکتورهای مکشی VESDA با دتکتور نقطه ای',
      prompt: 'تفاوت دتکتور مکشی (VESDA) با دتکتورهای نقطه‌ای چیست؟',
      icon: <Zap className="w-5 h-5 text-purple-500" />
    }
  ] : [
    {
      title: 'Detector Spacing Rules',
      subtitle: 'Smoke detector positioning according to NFPA 72',
      prompt: 'Smoke detector spacing under NFPA 72',
      icon: <ShieldCheck className="w-5 h-5 text-blue-500" />
    },
    {
      title: 'Equipment Datasheet Search',
      subtitle: 'Part numbers & specs for Notifier, VESDA, Honeywell',
      prompt: 'Notifier flame detector part numbers and specs',
      icon: <Search className="w-5 h-5 text-amber-500" />
    },
    {
      title: 'Gas Extinguishing System Design',
      subtitle: 'NFPA 2001 clean agent & FM-200 calculation rules',
      prompt: 'FM-200 clean agent design rule in NFPA 2001',
      icon: <Flame className="w-5 h-5 text-rose-500" />
    },
    {
      title: 'Compare Detector Types',
      subtitle: 'Aspirating (VESDA) vs Point Smoke Detectors',
      prompt: 'Aspirating Smoke Detection vs Point Detectors',
      icon: <Zap className="w-5 h-5 text-purple-500" />
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="h-[calc(100dvh-100px)] sm:h-[calc(100vh-120px)] flex flex-col justify-between max-w-5xl mx-auto w-full px-2 sm:px-4"
      dir={lang === 'fa' ? 'rtl' : 'ltr'}
    >
      {/* Scrollable Chat Area */}
      <div className="flex-1 overflow-y-auto space-y-6 py-4 px-2 custom-scrollbar">
        {chatHistory.length === 0 ? (
          /* Gemini Style Welcome Canvas */
          <div className="min-h-[75vh] flex flex-col items-center justify-center text-center px-4 space-y-8">
            
            {/* Header Greeting */}
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="space-y-3 max-w-2xl"
            >
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 border border-slate-200/80 text-xs font-semibold text-slate-700 shadow-xs mb-2">
                <span className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-amber-500 animate-pulse" />
                <span>Gemini F&G Copilot</span>
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
                {lang === 'fa' ? (
                  <>
                    سلام، <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">{currentUser.username}</span>
                  </>
                ) : (
                  <>
                    Hello, <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">{currentUser.username}</span>
                  </>
                )}
              </h1>

              <p className="text-base sm:text-lg text-slate-500 font-medium max-w-lg mx-auto">
                {lang === 'fa' 
                  ? 'چگونه می‌توانم امروز در کدهای NFPA، پارت‌نامبرها و استعلام کاتالوگ‌ها به شما کمک کنم؟'
                  : 'How can I assist you today with NFPA standards, F&G datasheets or equipment catalog?'}
              </p>
            </motion.div>

            {/* Gemini Bento Cards */}
            <div className="w-full max-w-3xl grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-4 text-right">
              {promptCards.map((card, idx) => (
                <motion.button
                  key={idx}
                  type="button"
                  whileHover={{ scale: 1.015, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setChatInput(card.prompt)}
                  className="p-4 bg-white/90 hover:bg-slate-50 border border-slate-200/90 hover:border-blue-300 rounded-2xl text-right transition-all shadow-xs hover:shadow-md flex flex-col justify-between group cursor-pointer space-y-3"
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                      {card.title}
                    </span>
                    <div className="p-2 rounded-xl bg-slate-100 group-hover:bg-blue-50 transition-colors">
                      {card.icon}
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 font-normal leading-relaxed">
                    {card.subtitle}
                  </p>
                </motion.button>
              ))}
            </div>
          </div>
        ) : (
          /* Chat Stream - Gemini Minimalist Style */
          <div className="space-y-6 max-w-4xl mx-auto py-2">
            {chatHistory.map((msg, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="space-y-3"
              >
                {msg.role === 'user' ? (
                  /* User Bubble - Gemini Sleek Pill */
                  <div className="flex justify-end">
                    <div className="bg-slate-200/90 text-slate-900 rounded-3xl rounded-te-xs px-5 py-3.5 max-w-[85%] sm:max-w-[75%] shadow-2xs font-medium text-xs sm:text-sm leading-relaxed text-right">
                      {msg.content}
                    </div>
                  </div>
                ) : (
                  /* AI Response - Gemini Modern Stream */
                  <div className="flex items-start gap-3.5 max-w-full">
                    {/* Gemini Sparkle Avatar */}
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 via-purple-600 to-amber-400 text-white flex items-center justify-center p-1.5 shadow-sm shrink-0 mt-0.5">
                      <Sparkles className="w-4 h-4 text-white animate-pulse" />
                    </div>

                    <div className="flex-1 space-y-2 overflow-hidden text-right">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">
                          {lang === 'fa' ? 'دستیار Gemini F&G' : 'Gemini F&G AI'}
                        </span>
                      </div>

                      {/* AI Content */}
                      <div 
                        dir="auto" 
                        className="bg-white border border-slate-200/80 rounded-2xl rounded-tr-xs p-5 shadow-xs text-xs sm:text-sm text-slate-800 leading-relaxed font-sans whitespace-pre-line space-y-2"
                      >
                        {msg.content}
                      </div>

                      {/* Action Bar */}
                      <div className="flex items-center gap-1.5 text-slate-400 pt-1">
                        <button
                          type="button"
                          onClick={() => handleCopyText(msg.content, idx)}
                          className="p-1.5 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all text-xs flex items-center gap-1"
                          title={lang === 'fa' ? 'کپی پاسخ' : 'Copy answer'}
                        >
                          {copiedIndex === idx ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-[11px] text-emerald-600 font-bold">{lang === 'fa' ? 'کپی شد' : 'Copied'}</span>
                            </>
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>

                        <button
                          type="button"
                          className="p-1.5 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all"
                          title="Thumbs up"
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          className="p-1.5 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all"
                          title="Thumbs down"
                        >
                          <ThumbsDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}

            {/* Shimmer / Loading State */}
            {isSendingMessage && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-start gap-3.5 max-w-full"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 via-purple-600 to-amber-400 text-white flex items-center justify-center p-1.5 shadow-sm shrink-0">
                  <Sparkles className="w-4 h-4 text-white animate-spin" />
                </div>

                <div className="flex-1 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-blue-600">
                      {lang === 'fa' ? 'در حال تحلیل پایگاه داده و کدهای NFPA...' : 'Thinking & Analyzing F&G Database...'}
                    </span>
                  </div>
                  
                  {/* Shimmer Lines */}
                  <div className="space-y-2">
                    <div className="h-3 w-3/4 bg-gradient-to-r from-slate-200 via-blue-100 to-slate-200 rounded-full animate-pulse" />
                    <div className="h-3 w-1/2 bg-gradient-to-r from-slate-200 via-purple-100 to-slate-200 rounded-full animate-pulse" />
                  </div>
                </div>
              </motion.div>
            )}
            <div ref={chatBottomRef} />
          </div>
        )}
      </div>

      {/* Gemini Floating Prompt Capsule Bar */}
      <div className="pt-2 pb-2 sticky bottom-0 z-20 w-full max-w-4xl mx-auto">
        <form 
          onSubmit={onSendChatMessage} 
          className="bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-[28px] p-3 shadow-xl focus-within:shadow-2xl focus-within:border-blue-500/80 focus-within:ring-4 focus-within:ring-blue-500/10 transition-all flex flex-col gap-2"
        >
          {/* File Attachment Chip */}
          {attachedFile && (
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 px-3 py-1.5 rounded-2xl text-xs w-fit shadow-xs">
              <FileText className="w-4 h-4 text-blue-600" />
              <span className="font-semibold truncate max-w-[200px]">{attachedFile.name}</span>
              <button
                type="button"
                onClick={() => setAttachedFile(null)}
                className="text-slate-400 hover:text-slate-700 hover:bg-blue-100/60 rounded-full p-0.5 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Text Input */}
          <div className="flex items-center px-2">
            <input
              dir="auto"
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder={
                lang === 'fa' 
                  ? "سوال فنی، استعلام پارت‌نامبر یا کدهای NFPA را از دستیار Gemini بپرسید..." 
                  : "Ask technical questions, NFPA standards or part numbers..."
              }
              className="w-full bg-transparent border-0 ring-0 outline-none text-slate-900 placeholder-slate-400 text-xs sm:text-sm px-1 focus:ring-0 focus:outline-none"
            />
          </div>

          {/* Capsule Action Row */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-100 px-1">
            {/* Left Controls (RTL right) */}
            <div className="flex items-center gap-1.5">
              <input
                type="file"
                id="assistant-attach-file"
                accept=".png,.jpg,.jpeg,.pdf"
                onChange={onChatFileSelect}
                className="hidden"
              />
              <label
                htmlFor="assistant-attach-file"
                className="w-9 h-9 rounded-full flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-slate-100 transition-all cursor-pointer"
                title={lang === 'fa' ? 'پیوست تصویر یا سند' : 'Attach File'}
              >
                <Plus className="w-5 h-5" />
              </label>

              <button
                type="button"
                className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
                title={lang === 'fa' ? 'ورودی صوتی (به زودی)' : 'Voice input (Coming soon)'}
              >
                <Mic className="w-4 h-4" />
              </button>
            </div>

            {/* Right Controls (RTL left) - Send Button */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 hidden sm:inline-block font-medium">
                {lang === 'fa' ? 'مدل اختصاصی F&G' : 'F&G AI Engine'}
              </span>

              <button
                type="submit"
                disabled={isSendingMessage || (!chatInput.trim() && !attachedFile)}
                className={`w-10 h-10 rounded-full flex items-center justify-center text-white transition-all shadow-md ${
                  isSendingMessage || (!chatInput.trim() && !attachedFile)
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                    : 'bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 hover:opacity-90 cursor-pointer shadow-blue-500/20 active:scale-95'
                }`}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </form>
      </div>
    </motion.div>
  );
};
