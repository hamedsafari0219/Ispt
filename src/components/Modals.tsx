import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Cpu, KeyRound, Save, AlertCircle, CheckCircle2, Sparkles, Zap } from 'lucide-react';
import { AIConfig } from '../types';

interface AiConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  aiConfig: AIConfig;
  onSaveConfig: (cfg: AIConfig) => Promise<void>;
  lang: 'fa' | 'en';
}

const GOOGLE_MODELS = [
  { 
    id: 'gemini-3.5-flash', 
    name: 'Gemini 3.5 Flash', 
    badgeFa: '⚡ فوق‌العاده سریع و پایدار (توصیه شده)', 
    badgeEn: '⚡ Fast & Stable (Recommended)',
    descFa: 'مدل استاندارد نسل 3.5 گوگل با سرعت بالا و پاسخ‌دهی پایدار',
    descEn: 'Standard 3.5 model with verified high stability and speed'
  },
  { 
    id: 'gemini-3.8-flash', 
    name: 'Gemini 3.8 Flash', 
    badgeFa: 'نسل جدید 3.8', 
    badgeEn: 'Next-Gen 3.8',
    descFa: 'جدیدترین مدل سبک و باهوش گوگل برای پردازش‌های مهندسی',
    descEn: 'Latest lightweight and smart Google model for engineering workflows'
  },
  { 
    id: 'gemini-3.6-flash', 
    name: 'Gemini 3.6 Flash', 
    badgeFa: 'استدلال پیشرفته', 
    badgeEn: 'Advanced Reasoning',
    descFa: 'مدل قدرتمند با درک عمیق اسناد فنی و استانداردهای NFPA',
    descEn: 'Powerful model with deep understanding of technical standards'
  }
];

const OPENROUTER_MODELS = [
  { 
    id: 'google/gemma-4-31b-it:free', 
    name: 'Gemma 4 31B (Free)', 
    badgeFa: 'OpenRouter Free', 
    badgeEn: 'OpenRouter Free',
    descFa: 'مدل متن‌باز قدرتمند گوگل در OpenRouter',
    descEn: 'Open source powerful model on OpenRouter'
  },
  { 
    id: 'meta-llama/llama-3.3-70b-instruct:free', 
    name: 'Llama 3.3 70B (Free)', 
    badgeFa: 'Free 70B', 
    badgeEn: 'Free 70B',
    descFa: 'مدل عمومی سنگین متا ۷۰ میلیارد پارامتری',
    descEn: 'Meta Llama 3.3 70B model'
  },
  { 
    id: 'deepseek/deepseek-r1:free', 
    name: 'DeepSeek R1 (Free)', 
    badgeFa: 'Reasoning', 
    badgeEn: 'Reasoning',
    descFa: 'مدل استدلال عمیق استپ‌بای‌استپ',
    descEn: 'DeepSeek R1 reasoning model'
  }
];

export const AiConfigModal: React.FC<AiConfigModalProps> = ({
  isOpen,
  onClose,
  aiConfig,
  onSaveConfig,
  lang
}) => {
  const isInitialGoogle = !aiConfig.base_url || aiConfig.base_url.includes('googleapis') || !aiConfig.base_url.includes('openrouter');
  const [provider, setProvider] = useState<'google' | 'openrouter'>(isInitialGoogle ? 'google' : 'openrouter');
  const [apiKey, setApiKey] = useState(aiConfig.api_key || '');
  const [baseUrl, setBaseUrl] = useState(aiConfig.base_url || 'https://generativelanguage.googleapis.com');
  const [modelName, setModelName] = useState(aiConfig.model_name || 'gemini-3.5-flash');
  const [msg, setMsg] = useState('');

  if (!isOpen) return null;

  const handleProviderSwitch = (p: 'google' | 'openrouter') => {
    setProvider(p);
    if (p === 'google') {
      setBaseUrl('https://generativelanguage.googleapis.com');
      setModelName('gemini-3.5-flash');
    } else {
      setBaseUrl('https://openrouter.ai/api/v1');
      setModelName('google/gemma-4-31b-it:free');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveConfig({
      api_key: apiKey,
      base_url: provider === 'google' ? 'https://generativelanguage.googleapis.com' : baseUrl,
      model_name: modelName
    });
    setMsg(lang === 'fa' ? 'تنظیمات با موفقیت ذخیره شد.' : 'AI Configuration saved.');
    setTimeout(() => {
      setMsg('');
      onClose();
    }, 1200);
  };

  const presetModels = provider === 'google' ? GOOGLE_MODELS : OPENROUTER_MODELS;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" dir={lang === 'fa' ? 'rtl' : 'ltr'}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-5"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center">
                <Cpu className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {lang === 'fa' ? 'تنظیمات سرویس هوش مصنوعی (LLM)' : 'AI Model Configuration'}
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  {lang === 'fa' ? 'تنظیم کلید API از Google AI Studio یا OpenRouter' : 'Configure Google AI Studio or OpenRouter Credentials'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Provider Selector Tabs */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                {lang === 'fa' ? 'ارائه‌دهنده سرویس (Provider):' : 'Provider Platform:'}
              </label>
              <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-2xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => handleProviderSwitch('google')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    provider === 'google'
                      ? 'bg-white text-blue-700 shadow-xs border border-slate-200/80'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Google AI Studio (Gemini)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleProviderSwitch('openrouter')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    provider === 'openrouter'
                      ? 'bg-white text-blue-700 shadow-xs border border-slate-200/80'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Zap className="w-4 h-4 text-blue-500" />
                  <span>OpenRouter API</span>
                </button>
              </div>
            </div>

            {/* Model Selector Presets */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2 flex items-center justify-between">
                <span>{lang === 'fa' ? 'مدل‌های هوش مصنوعی:' : 'Available Models:'}</span>
                {provider === 'google' && (
                  <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    <span>Gemini 3.5 Flash</span>
                  </span>
                )}
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {presetModels.map((m) => {
                  const isSelected = modelName === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setModelName(m.id)}
                      className={`p-3 rounded-2xl border text-right transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                        isSelected 
                          ? 'bg-blue-50/90 border-blue-500 ring-2 ring-blue-500/20 text-blue-900 shadow-xs' 
                          : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className="font-bold text-xs truncate">{m.name}</span>
                        <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full ${
                          m.id === 'gemini-3.5-flash' 
                            ? 'bg-amber-100 text-amber-800 border border-amber-300' 
                            : 'bg-slate-200/80 text-slate-700'
                        }`}>
                          {lang === 'fa' ? m.badgeFa : m.badgeEn}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 line-clamp-2 leading-snug">
                        {lang === 'fa' ? m.descFa : m.descEn}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Manual Model Name Input / Override */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === 'fa' ? 'شناسه مدل (Model Identifier):' : 'Model Identifier Name:'}
              </label>
              <input
                type="text"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                placeholder={provider === 'google' ? 'gemini-3.5-flash' : 'google/gemma-4-31b-it:free'}
                className="w-full custom-input px-3.5 py-2.5 text-xs text-slate-900 font-mono"
              />
            </div>

            {/* API Key Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {provider === 'google' 
                  ? (lang === 'fa' ? 'کلید Google AI Studio (API Key):' : 'Google AI Studio API Key:')
                  : (lang === 'fa' ? 'کلید OpenRouter (API Key):' : 'OpenRouter API Key:')}
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={provider === 'google' ? 'AIzaSy... (از ai.google.dev)' : 'sk-or-v1-... (از openrouter.ai)'}
                className="w-full custom-input px-3.5 py-2.5 text-xs text-slate-900 font-mono"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                {provider === 'google'
                  ? (lang === 'fa' 
                      ? 'نکته: در صورت خالی بودن کلید، سیستم به طور خودکار از کلید سرور پیش‌فرض Gemini 3.5 Flash استفاده می‌کند. برای سهمیه اختصاصی می‌توانید کلید خود را از ai.google.dev وارد کنید.' 
                      : 'Note: If empty, defaults to built-in Gemini 3.5 Flash server key. Enter your key from ai.google.dev for dedicated quota.')
                  : (lang === 'fa'
                      ? 'نکته: برای سرویس OpenRouter کلید sk-or-v1-... خود را وارد نمایید.'
                      : 'Note: Enter your OpenRouter API key for third-party model access.')}
              </p>
            </div>

            {/* Base URL (only visible or editable for OpenRouter) */}
            {provider === 'openrouter' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Base URL (OpenRouter Endpoint):
                </label>
                <input
                  type="text"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://openrouter.ai/api/v1"
                  className="w-full custom-input px-3.5 py-2.5 text-xs text-slate-900 font-mono"
                />
              </div>
            )}

            {msg && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl font-semibold text-center flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{msg}</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                {lang === 'fa' ? 'انصراف' : 'Cancel'}
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/20 cursor-pointer flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>{lang === 'fa' ? 'ذخیره تنظیمات' : 'Save Config'}</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onChangePassword: (oldP: string, newP: string) => Promise<boolean>;
  lang: 'fa' | 'en';
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  onChangePassword,
  lang
}) => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!oldPassword || !newPassword) {
      setErrorMsg(lang === 'fa' ? 'هر دو فیلد الزامی هستند.' : 'Both fields are required.');
      return;
    }

    const ok = await onChangePassword(oldPassword, newPassword);
    if (ok) {
      setSuccessMsg(lang === 'fa' ? 'رمز عبور با موفقیت بروزرسانی شد.' : 'Password updated successfully.');
      setTimeout(() => {
        setSuccessMsg('');
        onClose();
      }, 1200);
    } else {
      setErrorMsg(lang === 'fa' ? 'رمز عبور فعلی اشتباه است.' : 'Current password is incorrect.');
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" dir={lang === 'fa' ? 'rtl' : 'ltr'}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-5"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-blue-600" />
              <h3 className="text-base font-bold text-slate-900">
                {lang === 'fa' ? 'تغییر رمز عبور کاربر' : 'Change Password'}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === 'fa' ? 'رمز عبور فعلی *' : 'Current Password *'}
              </label>
              <input
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="w-full custom-input px-3.5 py-2.5 text-xs text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === 'fa' ? 'رمز عبور جدید *' : 'New Password *'}
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full custom-input px-3.5 py-2.5 text-xs text-slate-900"
              />
            </div>

            {errorMsg && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-semibold text-center flex items-center justify-center gap-1.5">
                <AlertCircle className="w-4 h-4" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl font-semibold text-center flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>{successMsg}</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                {lang === 'fa' ? 'انصراف' : 'Cancel'}
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/20 cursor-pointer flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>{lang === 'fa' ? 'بروزرسانی رمز' : 'Update Password'}</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
