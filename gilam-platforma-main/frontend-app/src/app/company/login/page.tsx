'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MdPhone, MdLock, MdLogin, MdVisibility, MdVisibilityOff, MdBusiness } from 'react-icons/md';
import { authApi, setToken, setUser, setLoginPath } from '@/lib/api';

export default function CompanyLoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await authApi.login(phone, password);
      const { role } = result.user;

      if (role !== 'COMPANY_ADMIN') {
        setError(
          role === 'SUPER_ADMIN'
            ? "Super Admin bu sahifadan kira olmaydi. Iltimos asosiy sahifadan kiring."
            : role === 'OPERATOR'
            ? "Operatorlar bu sahifadan kira olmaydi. Iltimos operator portalidan kiring."
            : "Bu akkaunt korxona admini emas."
        );
        return;
      }

      setToken(result.access_token);
      setUser(result.user);
      setLoginPath('/company/login');
      router.push('/company');
    } catch (err: any) {
      setError(err.message || 'Telefon raqam yoki parol noto\'g\'ri!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 relative overflow-hidden">

      {/* Background decoration */}
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-blue-100 rounded-full blur-[100px] opacity-60" />
      <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-indigo-100 rounded-full blur-[100px] opacity-60" />

      <div className="relative max-w-sm w-full z-10">

        <div className="bg-white border border-slate-100 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-blue-500/10">

          <div className="px-10 pt-10 pb-7 text-center border-b border-slate-50">
            <div className="w-20 h-20 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-[24px] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-500/20 rotate-3">
              <MdBusiness className="text-4xl text-white" />
            </div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">
              Korxona Kabineti
            </h1>
            <p className="mt-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.25em]">
              Gilam SaaS • Korxona
            </p>
          </div>

          <form onSubmit={handleLogin} className="px-10 py-8 space-y-5">
            {error && (
              <div className="bg-rose-50 border border-rose-100 text-rose-600 px-4 py-3 rounded-2xl text-[11px] font-bold text-center leading-relaxed">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
                Telefon raqam
              </label>
              <div className="relative group">
                <MdPhone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl group-focus-within:text-blue-500 transition-colors" />
                <input
                  required
                  type="tel"
                  placeholder="+998 90 123 45 67"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
                Parol
              </label>
              <div className="relative group">
                <MdLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl group-focus-within:text-blue-500 transition-colors" />
                <input
                  required
                  type={showPwd ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-12 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPwd ? <MdVisibilityOff size={18} /> : <MdVisibility size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:-translate-y-0.5 active:translate-y-0 text-white font-black rounded-2xl text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-blue-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-3"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <MdLogin className="text-lg" />
                  Kirish
                </>
              )}
            </button>
          </form>

          <div className="px-10 pb-8 -mt-1">
            <p className="text-[9px] font-bold text-slate-400 text-center uppercase tracking-widest leading-relaxed">
              Faqat korxona adminstratorlari uchun
            </p>
          </div>
        </div>

        <p className="mt-8 text-center text-[9px] font-bold text-slate-400 uppercase tracking-widest">
          © {new Date().getFullYear()} Gilam SaaS Platform
        </p>
      </div>
    </div>
  );
}
