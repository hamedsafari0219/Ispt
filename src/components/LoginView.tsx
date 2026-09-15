import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import { Flame, ShieldCheck, Lock, User as UserIcon, LogIn, Sparkles, AlertCircle, RefreshCw, KeyRound } from 'lucide-react';
import { User } from '../types';
import { TransparentLogo } from './TransparentLogo';

interface LoginViewProps {
  onLogin: (username: string, password: string) => Promise<boolean>;
  authError: string;
  setAuthError: (err: string) => void;
  lang: 'fa' | 'en';
}

export const LoginView: React.FC<LoginViewProps> = ({ onLogin, authError, setAuthError, lang }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');
  const [captchaCode, setCaptchaCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Generate random CAPTCHA string
  const generateCaptchaCode = useCallback(() => {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCaptchaCode(code);
    return code;
  }, []);

  // Draw CAPTCHA on Canvas
  const drawCaptcha = useCallback((code: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(1, '#1e293b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Background noise lines
    for (let i = 0; i < 7; i++) {
      ctx.strokeStyle = `rgba(${Math.floor(Math.random() * 180 + 70)}, ${Math.floor(Math.random() * 180 + 70)}, ${Math.floor(Math.random() * 255)}, 0.45)`;
      ctx.lineWidth = Math.random() * 2 + 1;
      ctx.beginPath();
      ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height);
      ctx.lineTo(Math.random() * canvas.width, Math.random() * canvas.height);
      ctx.stroke();
    }

    // Background noise dots
    for (let i = 0; i < 35; i++) {
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.35})`;
      ctx.beginPath();
      ctx.arc(Math.random() * canvas.width, Math.random() * canvas.height, Math.random() * 2.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Characters rendering with rotation & color variance
    const chars = code.split('');
    const startX = 18;
    const spacing = (canvas.width - 25) / chars.length;
    const colors = ['#60a5fa', '#38bdf8', '#818cf8', '#f43f5e', '#fbbf24', '#34d399'];

    chars.forEach((char, index) => {
      ctx.save();
      const x = startX + index * spacing;
      const y = canvas.height / 2 + (Math.random() * 6 - 3);
      const angle = (Math.random() * 26 - 13) * (Math.PI / 180);

      ctx.translate(x, y);
      ctx.rotate(angle);

      ctx.font = `bold ${Math.floor(Math.random() * 4 + 22)}px monospace`;
      ctx.fillStyle = colors[index % colors.length];
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 4;
      ctx.fillText(char, -8, 7);

      ctx.restore();
    });
  }, []);

  // Initialize Captcha
  useEffect(() => {
    const code = generateCaptchaCode();
    drawCaptcha(code);
  }, [generateCaptchaCode, drawCaptcha]);

  const handleRefreshCaptcha = () => {
    const newCode = generateCaptchaCode();
    drawCaptcha(newCode);
    setCaptchaInput('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setAuthError(lang === 'fa' ? 'لطفاً نام کاربری و رمز عبور را وارد کنید.' : 'Please enter username and password.');
      return;
    }

    if (!captchaInput.trim()) {
      setAuthError(lang === 'fa' ? 'لطفاً کد امنیتی کپچا را وارد کنید.' : 'Please enter the CAPTCHA security code.');
      return;
    }

    if (captchaInput.trim().toUpperCase() !== captchaCode.toUpperCase()) {
      setAuthError(lang === 'fa' ? 'کد امنیتی کپچا اشتباه است. دوباره تلاش کنید.' : 'Incorrect CAPTCHA code. Please try again.');
      handleRefreshCaptcha();
      return;
    }

    setIsSubmitting(true);
    const success = await onLogin(username, password);
    setIsSubmitting(false);
    if (!success) {
      handleRefreshCaptcha();
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 relative bg-gradient-to-br from-slate-900 via-slate-950 to-blue-950 overflow-hidden font-sans" dir={lang === 'fa' ? 'rtl' : 'ltr'}>
      {/* Abstract Glowing Background Orbs */}
      <div className="absolute top-1/4 -right-20 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-lg bg-slate-900/90 backdrop-blur-2xl border border-slate-800 p-8 sm:p-10 rounded-3xl shadow-2xl relative z-10 text-slate-100"
      >
        {/* Header Branding */}
        <div className="text-center mb-8 flex flex-col items-center">
          <div className="flex items-center justify-center mb-4 relative drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]">
            <TransparentLogo src="/logo.png" alt="ISATIS Logo" className="h-20 w-auto object-contain" tolerance={50} />
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2">
            {lang === 'fa' ? 'ایساتیس پارس تجهیز' : 'Isatis Pars Tajhiz'}
          </h1>
          
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{lang === 'fa' ? 'سامانه مهندسی اعلام و اطفاء حریق' : 'Fire & Gas Engineering Platform'}</span>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 mr-1">
              {lang === 'fa' ? 'نام کاربری' : 'Username'}
            </label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-slate-400 absolute top-3.5 right-3.5 pointer-events-none" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={lang === 'fa' ? "مانند: admin" : "e.g. admin"}
                className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl pr-10 pl-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 mr-1">
              {lang === 'fa' ? 'رمز عبور' : 'Password'}
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute top-3.5 right-3.5 pointer-events-none" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl pr-10 pl-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>
          </div>

          {/* CAPTCHA Field */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 mr-1">
              {lang === 'fa' ? 'کد امنیتی (کپچا)' : 'Security Code (CAPTCHA)'}
            </label>
            <div className="grid grid-cols-12 gap-2.5 items-center">
              <div className="col-span-6 sm:col-span-7 relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute top-3.5 right-3.5 pointer-events-none" />
                <input
                  type="text"
                  value={captchaInput}
                  onChange={(e) => setCaptchaInput(e.target.value)}
                  placeholder={lang === 'fa' ? 'کد تصویر' : 'Enter code'}
                  maxLength={5}
                  className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl pr-10 pl-3 py-2.5 text-sm font-mono tracking-widest text-white uppercase placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>

              <div className="col-span-6 sm:col-span-5 flex items-center gap-1.5 justify-end">
                <div className="bg-slate-950 p-1 rounded-xl border border-slate-700/80 shadow-inner overflow-hidden flex items-center justify-center">
                  <canvas
                    ref={canvasRef}
                    width={110}
                    height={38}
                    className="rounded-lg cursor-pointer"
                    onClick={handleRefreshCaptcha}
                    title={lang === 'fa' ? 'برای تغییر کد روی تصویر کلیک کنید' : 'Click to refresh code'}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleRefreshCaptcha}
                  className="p-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white rounded-xl transition-all cursor-pointer shrink-0"
                  title={lang === 'fa' ? 'تغییر کد امنیتی' : 'Refresh CAPTCHA'}
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {authError && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400 font-medium flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{authError}</span>
            </motion.div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold py-3 px-6 rounded-xl text-sm shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSubmitting ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>{lang === 'fa' ? 'ورود به حساب کاربری' : 'Sign In'}</span>
                <LogIn className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
};
