'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MdPhone, MdLock, MdLogin, MdVisibility, MdVisibilityOff } from 'react-icons/md';
import { authApi, setToken, setUser, setLoginPath } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const result = await authApi.login(phone, password);
      const { role } = result.user;

      if (role !== 'SUPER_ADMIN') {
        setError('Bu sahifadan faqat Super Admin kira oladi!');
        return;
      }

      setToken(result.access_token);
      setUser(result.user);
      setLoginPath('/');
      router.push('/admin');

    } catch (err: any) {
      setError(err.message || 'Telefon raqam yoki parol xato!');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 bg-[radial-gradient(circle_at_top_right,_#e2e8f0,_transparent),_radial-gradient(circle_at_bottom_left,_#f1f5f9,_transparent)]">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-[2rem] shadow-2xl shadow-blue-500/10 border border-slate-100 overflow-hidden transform transition-all">
          
          <div className="p-8 pb-4 text-center">
            <div className="w-20 h-20 bg-gradient-to-tr from-blue-600 to-indigo-700 text-white rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-blue-500/20 text-4xl mb-6 rotate-3">
              💧
            </div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">
              Xush Kelibsiz
            </h1>
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-2">
              Gilam SaaS • Avtomatlashtirish Tizimi
            </p>
          </div>

          <form onSubmit={handleLogin} className="p-8 pt-4 space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm font-bold text-center animate-pulse">
                ❌ {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Telefon Raqam</label>
              <div className="relative group">
                <MdPhone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl group-focus-within:text-blue-500 transition-colors" />
                <input 
                  required
                  type="tel" 
                  placeholder="+998901234567"
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all font-bold text-slate-700"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Maxfiy Parol</label>
              <div className="relative group">
                <MdLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl group-focus-within:text-blue-500 transition-colors" />
                <input 
                  required
                  type={showPassword ? 'text' : 'password'} 
                  placeholder="••••••••"
                  className="w-full pl-12 pr-12 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all font-bold text-slate-700"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <MdVisibilityOff size={20} /> : <MdVisibility size={20} />}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-0.5 active:scale-95 transition-all duration-200 flex items-center justify-center gap-3 disabled:opacity-70 disabled:translate-y-0"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <MdLogin className="text-xl" />
                  Tizimga Kirish
                </>
              )}
            </button>
          </form>

          <div className="p-6 bg-slate-50/50 border-t border-slate-50 text-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Muammo yuzaga kelsa texnik ko&apos;makka murojaat qiling
            </p>
          </div>
        </div>

        <p className="mt-8 text-center text-xs font-bold text-slate-400/60 uppercase tracking-widest">
          &copy; {new Date().getFullYear()} Gilam SaaS Automation Platform
        </p>
      </div>
    </div>
  );
}
