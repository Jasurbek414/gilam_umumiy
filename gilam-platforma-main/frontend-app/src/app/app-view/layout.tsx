import React from 'react';
import { MdOutlineQrCodeScanner, MdCheckCircle, MdLocalShipping, MdPerson, MdNotifications } from 'react-icons/md';

export default function MobileAppRolesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-slate-900 min-h-screen flex items-center justify-center p-4 sm:p-8">
      
      {/* Mobile Device Mockup Container */}
      <div className="w-[375px] h-[812px] bg-white rounded-[40px] shadow-2xl relative overflow-hidden border-[8px] border-slate-800 flex flex-col">
        {/* Dynamic Island / Status bar mock */}
        <div className="h-7 w-full flex justify-center absolute top-0 z-50">
          <div className="w-1/3 h-6 bg-slate-800 rounded-b-xl"></div>
        </div>
        
        {/* Mobile Header */}
        <header className="pt-12 pb-4 px-6 bg-blue-600 text-white flex justify-between items-center z-10 shadow-md">
          <div className="flex flex-col">
            <span className="text-xs text-blue-200 font-semibold uppercase tracking-wider">Ishchi Dastur</span>
            <span className="text-lg flex items-center gap-1 font-bold">
              <MdPerson className="text-blue-200" /> Jasur
            </span>
          </div>
          <button className="relative w-10 h-10 flex items-center justify-center rounded-full bg-blue-500/50">
            <MdNotifications className="text-xl" />
            <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>
        </header>

        {/* Mobile Body Component Injection */}
        <main className="flex-1 bg-slate-50 overflow-y-auto no-scrollbar pb-24">
          {children}
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="absolute bottom-0 w-full h-20 bg-white border-t border-slate-100 flex justify-around items-center px-2 pb-5 z-20">
          <button className="flex flex-col items-center p-2 text-blue-600">
            <MdLocalShipping className="text-2xl mb-1 drop-shadow-sm" />
            <span className="text-[10px] font-bold">Vazifalar</span>
          </button>
          
          <button className="relative -top-6 w-14 h-14 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-blue-500/40 border-4 border-white transition-transform hover:scale-105">
            <MdOutlineQrCodeScanner className="text-2xl drop-shadow-md" />
          </button>
          
          <button className="flex flex-col items-center p-2 text-slate-400">
            <MdCheckCircle className="text-2xl mb-1" />
            <span className="text-[10px] font-medium">Bajarilgan</span>
          </button>
        </nav>
      </div>

      {/* Helper text outside the phone */}
      <div className="hidden lg:block ml-12 max-w-sm text-slate-300">
        <h2 className="text-3xl font-white mb-4">Ilova Ekran Ko'rinishi</h2>
        <p className="mb-4">Bu ishchilar (Haydovchi, Yuvuvchi, Pardozchi) uchun mo'ljallangan mobil dasturning PWA yoki WebView orqali ko'rinish namunasi.</p>
        <ul className="space-y-3 list-disc pl-5 text-slate-400">
          <li>Markazdagi katta tugma orqali har bir gilam shtrix kodi (QR) skanerlanadi.</li>
          <li>Skaner qilinganda Buyurtma holati tizimda (Backend) avtomatik o'zgaradi ("Yuvilmoqda", "Qadoqlandi" h.k).</li>
          <li>Haydovchi uchun bu oyna xaritaga (GPS) o'zgarishi mumkin.</li>
        </ul>
      </div>
      
    </div>
  );
}
