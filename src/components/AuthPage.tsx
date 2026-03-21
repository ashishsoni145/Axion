import React, { useState, useEffect } from 'react';
import { 
  auth, 
  googleProvider, 
  signInWithPopup, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail
} from '../firebase';
import { 
  LogIn, 
  Sparkles, 
  Mail, 
  Lock, 
  ArrowRight, 
  ChevronLeft, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  CheckCircle2,
  Loader2,
  Moon,
  Sun
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface AuthPageProps {
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

type AuthMode = 'login' | 'signup' | 'forgot';

export function AuthPage({ isDarkMode, onToggleDarkMode }: AuthPageProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    setMessage(null);
  }, [mode]);

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      if (mode === 'signup') {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage('Password reset link sent to your email!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
      <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center p-4 py-8 sm:p-8 bg-zinc-50 dark:bg-zinc-950 transition-colors relative">
      
      {/* Theme Toggle - Moved outside the card for better mobile layout */}
      <div className="absolute top-4 right-4 sm:top-8 sm:right-8 z-50">
        <button
          onClick={onToggleDarkMode}
          className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shadow-sm"
        >
          {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white dark:bg-zinc-900 rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl p-6 sm:p-10 border border-zinc-200 dark:border-zinc-800 transition-colors relative overflow-hidden my-auto z-10"
      >
        {/* Background Accents */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />

        <div className="relative z-10 space-y-8">
          {/* Logo & Header */}
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 mx-auto">
              <Sparkles size={32} />
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                {mode === 'login' && 'Welcome Back'}
                {mode === 'signup' && 'Create Account'}
                {mode === 'forgot' && 'Reset Password'}
              </h1>
              <p className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm">
                {mode === 'login' && 'Sign in to Axion to continue'}
                {mode === 'signup' && 'Join Axion for intelligent conversations'}
                {mode === 'forgot' && 'Enter your email to receive a reset link'}
              </p>
            </div>
          </div>

          {/* Error/Success Messages */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-2xl p-4 flex items-start gap-3 text-red-600 dark:text-red-400 text-sm"
              >
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <p>{error}</p>
              </motion.div>
            )}
            {message && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/20 rounded-2xl p-4 flex items-start gap-3 text-emerald-600 dark:text-emerald-400 text-sm"
              >
                <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
                <p>{message}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Auth Forms */}
          <div className="space-y-6">
            {(mode === 'login' || mode === 'signup') && (
              <form onSubmit={handleEmailAuth} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 ml-1">Email Address</label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-emerald-500 transition-colors" size={18} />
                    <input 
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none placeholder-zinc-400 dark:placeholder-zinc-500"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between ml-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Password</label>
                    {mode === 'login' && (
                      <button 
                        type="button"
                        onClick={() => setMode('forgot')}
                        className="text-xs font-bold text-emerald-500 hover:text-emerald-600 transition-colors"
                      >
                        Forgot?
                      </button>
                    )}
                  </div>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-emerald-500 transition-colors" size={18} />
                    <input 
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl py-3.5 pl-12 pr-12 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none placeholder-zinc-400 dark:placeholder-zinc-500"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <button 
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-emerald-500 text-white rounded-2xl py-4 font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="animate-spin" size={20} /> : (mode === 'login' ? 'Sign In' : 'Create Account')}
                  {!isLoading && <ArrowRight size={18} />}
                </button>
              </form>
            )}

            {mode === 'forgot' && (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 ml-1">Email Address</label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-emerald-500 transition-colors" size={18} />
                    <input 
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none placeholder-zinc-400 dark:placeholder-zinc-500"
                    />
                  </div>
                </div>
                <button 
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-emerald-500 text-white rounded-2xl py-4 font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'Send Reset Link'}
                  {!isLoading && <ArrowRight size={18} />}
                </button>
                <button 
                  type="button"
                  onClick={() => setMode('login')}
                  className="w-full flex items-center justify-center gap-2 text-sm font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                >
                  <ChevronLeft size={18} />
                  Back to Login
                </button>
              </form>
            )}

            {/* Divider */}
            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-100 dark:border-zinc-800"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase font-bold tracking-widest">
                <span className="bg-white dark:bg-zinc-900 px-4 text-zinc-400">Or continue with</span>
              </div>
            </div>

            {/* Social & Other Methods */}
            <div className="grid grid-cols-1 gap-3">
              <button 
                type="button"
                onClick={handleGoogleLogin}
                className="flex items-center justify-center gap-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl py-3 text-sm font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <LogIn size={18} />
                Continue with Google
              </button>
            </div>

            {/* Footer Links */}
            <div className="text-center pt-4">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {mode === 'login' ? "Don't have an account?" : "Already have an account?"}{' '}
                <button 
                  onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                  className="font-bold text-emerald-500 hover:text-emerald-600 transition-colors"
                >
                  {mode === 'login' ? 'Sign Up' : 'Sign In'}
                </button>
              </p>
            </div>
          </div>
        </div>
      </motion.div>
      
      <p className="mt-8 text-center text-[10px] sm:text-xs text-zinc-400 dark:text-zinc-500 max-w-xs leading-relaxed z-10">
        By continuing, you agree to Axion's Terms of Service and Privacy Policy.
      </p>
    </div>
  );
}
