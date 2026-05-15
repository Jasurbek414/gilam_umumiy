'use client';

export default function LiveMapLayout({ children }: { children: React.ReactNode }) {
  // Live Map to'liq ekranda ko'rsatiladi, maxsus layout kerak emas
  // bu faqat nested layout sifatida ishlaydi
  return <>{children}</>;
}
