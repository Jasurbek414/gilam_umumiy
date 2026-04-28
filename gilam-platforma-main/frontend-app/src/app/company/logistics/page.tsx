'use client';

import React, { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { 
  MdRoute, 
  MdRefresh, 
  MdDirectionsCar,
  MdSpeed,
  MdCalendarToday,
  MdDateRange,
  MdLocationOn,
  MdPhone,
  MdClose,
  MdGpsFixed,
  MdPerson,
  MdBusiness,
  MdMyLocation,
} from 'react-icons/md';
import { usersApi, ordersApi, getUser } from '@/lib/api';
import toast from 'react-hot-toast';

// Load map component dynamically to avoid SSR issues
const LogisticsMap = dynamic(() => import('@/components/logistics/LogisticsMap'), { 
  ssr: false,
  loading: () => <div className="w-full h-full bg-slate-50 animate-pulse flex items-center justify-center text-slate-400 font-bold uppercase text-xs tracking-widest">Xarita tayyorlanmoqda...</div>
});

export default function LogisticsPage() {
  const [activeDriver, setActiveDriver] = useState<string | null>(null);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [orderPoints, setOrderPoints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // ─── Driver Detail Modal ─────────────────────────────────────
  const [selectedDriver, setSelectedDriver] = useState<any | null>(null);
  const [driverAddress, setDriverAddress] = useState<string>('');
  const [addressLoading, setAddressLoading] = useState(false);

  // ─── Mileage Report State ─────────────────────────────────────
  const [mileageDriver, setMileageDriver] = useState<string | null>(null);
  const [mileagePeriod, setMileagePeriod] = useState<'today' | 'week' | 'month' | 'custom'>('today');
  const [mileageFrom, setMileageFrom] = useState('');
  const [mileageTo, setMileageTo] = useState('');
  const [mileageData, setMileageData] = useState<{ totalKm: number; pointCount: number } | null>(null);
  const [mileageDaily, setMileageDaily] = useState<{ date: string; km: number; points: number }[]>([]);
  const [mileageLoading, setMileageLoading] = useState(false);

  // ─── Reverse Geocode ─────────────────────────────────────────
  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    setAddressLoading(true);
    setDriverAddress('');
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=uz&zoom=18`,
        { headers: { 'User-Agent': 'GilamApp/1.0' } }
      );
      if (res.ok) {
        const data = await res.json();
        setDriverAddress(data.display_name || 'Manzil topilmadi');
      } else {
        setDriverAddress('Manzilni aniqlashda xatolik');
      }
    } catch {
      setDriverAddress('Internet aloqasi yo\'q');
    } finally {
      setAddressLoading(false);
    }
  }, []);

  const openDriverDetail = useCallback((driver: any) => {
    setSelectedDriver(driver);
    setActiveDriver(driver.id);
    if (driver.pos) {
      reverseGeocode(driver.pos[0], driver.pos[1]);
    }
  }, [reverseGeocode]);

  const loadBackendData = async () => {
    try {
      const user = getUser();
      if (!user?.companyId) return;
      const allUsers = await usersApi.getByCompany(user.companyId);
      const allOrders = await ordersApi.getByCompany(user.companyId);
      
      const realDrivers = allUsers.filter((u: any) => u.role === 'DRIVER');
      
      const points = allOrders
        .filter((o: any) => o.customer?.location || o.customer?.address)
        .map((o: any) => {
          let pos: [number, number] | null = null;
          if (o.customer?.location) {
            if (typeof o.customer.location === 'object') {
              pos = [o.customer.location.y || o.customer.location.lat, o.customer.location.x || o.customer.location.lng];
            } else if (typeof o.customer.location === 'string') {
               if (o.customer.location.trim().startsWith('{')) {
                 try {
                   const parsed = JSON.parse(o.customer.location);
                   pos = [parsed.y || parsed.lat, parsed.x || parsed.lng];
                 } catch(e) {}
               } else if (o.customer.location.includes(',')) {
                 const clean = o.customer.location.replace(/[()]/g, '');
                 const parts = clean.split(',').map(Number);
                 pos = [parts[1] || parts[0], parts[0] || parts[1]];
               }
            }
          }
          return {
            id: o.id,
            name: o.customer?.fullName || 'Mijoz',
            pos: pos,
            type: (o.status === 'NEW' || o.status === 'DRIVER_ASSIGNED') ? 'pickup' : 'delivery'
          }
        });
      
      const mappedDrivers = realDrivers.map((d: any) => {
        let pos: [number, number] | null = null;
        if (d.currentLocation) {
          if (typeof d.currentLocation === 'object') {
            pos = [d.currentLocation.y || d.currentLocation.lat, d.currentLocation.x || d.currentLocation.lng];
          } else if (typeof d.currentLocation === 'string') {
            if (d.currentLocation.trim().startsWith('{')) {
              try {
                const parsed = JSON.parse(d.currentLocation);
                pos = [parsed.y || parsed.lat, parsed.x || parsed.lng];
              } catch(e) {}
            } else if (d.currentLocation.includes(',')) {
              const clean = d.currentLocation.replace(/[()]/g, '');
              const parts = clean.split(',').map(Number);
              // PostgreSQL point format is (x, y) meaning (longitude, latitude). Leaflet wants [latitude, longitude].
              pos = [parts[1] || parts[0], parts[0] || parts[1]];
            }
          }
        }
        return {
          id: d.id,
          name: d.fullName,
          pos: pos,
          car: d.phone,
          status: d.status === 'ACTIVE' ? 'Liniyada' : 'Dam olishda',
          tasks: points.filter(p => p.type === 'pickup').length
        };
      });

      setDrivers(mappedDrivers);
      setOrderPoints(points);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBackendData();
    const interval = setInterval(() => {
      loadBackendData();
    }, 5000); // 5 seconds real-time auto-refresh interval.
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-center p-6 bg-white rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            Logistika <MdRoute className="text-blue-500" />
          </h1>
          <p className="text-slate-500 text-sm font-medium">Haydovchilarni real vaqtda kuzating (OpenStreetMap)</p>
        </div>
        <button 
          onClick={() => { setLoading(true); loadBackendData(); toast.success('Ma\'lumotlar yangilandi'); }}
          disabled={loading}
          className={`flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold hover:shadow-lg transition-all disabled:opacity-60 ${loading ? 'animate-pulse' : ''}`}
        >
          <MdRefresh className={`text-xl ${loading ? 'animate-spin' : ''}`} /> {loading ? 'Yuklanmoqda...' : 'Yangilash'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6" style={{ height: 'calc(100vh - 240px)', minHeight: '480px' }}>
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden" style={{ minHeight: '480px' }}>
          <LogisticsMap drivers={drivers} orderPoints={orderPoints} activeDriverId={activeDriver} />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col" style={{ maxHeight: 'calc(100vh - 240px)' }}>
          <div className="p-5 border-b bg-slate-50 flex justify-between shrink-0">
            <h3 className="font-black text-slate-800 text-sm">Haydovchilar</h3>
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
          </div>
          <div className="divide-y divide-slate-100 overflow-y-auto flex-1">
            {drivers.map(driver => (
              <div 
                key={driver.id} 
                onClick={() => openDriverDetail(driver)}
                className={`p-4 cursor-pointer hover:bg-slate-50 transition-all ${activeDriver === driver.id ? 'bg-blue-50' : ''}`}
              >
                <div className="flex items-center gap-3 w-full">
                  <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center font-bold text-slate-600 relative shrink-0">
                    {driver.name[0]}
                    <div 
                      className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${driver.pos ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-slate-400'}`} 
                      title={driver.pos ? "GPS Faol" : "GPS Aloqa yo'q"} 
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-slate-800 truncate">{driver.name}</p>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-[10px] text-slate-500 font-bold uppercase">{driver.car}</p>
                      {driver.pos ? (
                        <span className="text-[9px] font-black tracking-wider text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-md flex items-center shrink-0">
                          <span className="relative flex h-1.5 w-1.5 mr-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                          </span>
                          LIVE
                        </span>
                      ) : (
                        <span className="text-[9px] font-black tracking-wider text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md shrink-0">
                          NOMA'LUM
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Mileage Report Section ────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
              <MdSpeed className="text-xl text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-800">Masofa Hisoboti</h2>
              <p className="text-xs text-slate-400 font-medium">Haydovchi qancha km bosib o'tgani</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Driver selector */}
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Haydovchi</label>
            <select 
              value={mileageDriver || ''} 
              onChange={(e) => setMileageDriver(e.target.value || null)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
            >
              <option value="">— Tanlang —</option>
              {drivers.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* Period selector */}
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Davr</label>
            <div className="flex bg-slate-50 rounded-xl border border-slate-200 p-1 gap-1">
              {[
                { key: 'today', label: 'Bugun' },
                { key: 'week', label: 'Hafta' },
                { key: 'month', label: 'Oy' },
                { key: 'custom', label: 'Oraliq' },
              ].map(p => (
                <button 
                  key={p.key} 
                  onClick={() => setMileagePeriod(p.key as any)}
                  className={`flex-1 px-2 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                    mileagePeriod === p.key 
                      ? 'bg-indigo-600 text-white shadow-md' 
                      : 'text-slate-500 hover:bg-white hover:text-slate-700'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom date range */}
          {mileagePeriod === 'custom' && (
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Dan</label>
                <input 
                  type="date" 
                  value={mileageFrom} 
                  onChange={(e) => setMileageFrom(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex-1">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Gacha</label>
                <input 
                  type="date" 
                  value={mileageTo} 
                  onChange={(e) => setMileageTo(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Load report button */}
        <button 
          onClick={async () => {
            if (!mileageDriver) { toast.error('Haydovchini tanlang'); return; }
            setMileageLoading(true);
            try {
              const now = new Date();
              let from: string, to: string;

              if (mileagePeriod === 'today') {
                from = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
                to = now.toISOString();
              } else if (mileagePeriod === 'week') {
                const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
                from = weekAgo.toISOString();
                to = now.toISOString();
              } else if (mileagePeriod === 'month') {
                const monthAgo = new Date(now); monthAgo.setMonth(monthAgo.getMonth() - 1);
                from = monthAgo.toISOString();
                to = now.toISOString();
              } else {
                if (!mileageFrom || !mileageTo) { toast.error('Sanalarni kiriting'); setMileageLoading(false); return; }
                from = new Date(mileageFrom).toISOString();
                to = new Date(mileageTo + 'T23:59:59').toISOString();
              }

              const [total, daily] = await Promise.all([
                usersApi.getMileage(mileageDriver, from, to),
                usersApi.getMileageDaily(mileageDriver, from, to),
              ]);
              setMileageData(total);
              setMileageDaily(daily);
            } catch (err) {
              toast.error('Hisobotni yuklashda xatolik');
            } finally {
              setMileageLoading(false);
            }
          }}
          disabled={mileageLoading}
          className="w-full md:w-auto px-6 py-3 bg-indigo-600 text-white rounded-xl font-black text-sm hover:bg-indigo-700 hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 mb-6"
        >
          <MdDateRange className="text-lg" />
          {mileageLoading ? 'Yuklanmoqda...' : 'Hisobotni ko\'rsatish'}
        </button>

        {/* Results */}
        {mileageData && (
          <div className="space-y-4">
            {/* Summary Card */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 text-white p-5 rounded-2xl">
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Jami Masofa</p>
                <p className="text-3xl font-black mt-1">{mileageData.totalKm.toFixed(2)} <span className="text-base font-bold opacity-70">km</span></p>
              </div>
              <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 text-white p-5 rounded-2xl">
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">GPS Nuqtalar</p>
                <p className="text-3xl font-black mt-1">{mileageData.pointCount} <span className="text-base font-bold opacity-70">ta</span></p>
              </div>
            </div>

            {/* Daily Breakdown Table */}
            {mileageDaily.length > 0 && (
              <div className="border border-slate-100 rounded-2xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="text-left px-5 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">Sana</th>
                      <th className="text-right px-5 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">Masofa (km)</th>
                      <th className="text-right px-5 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">Nuqtalar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {mileageDaily.map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition">
                        <td className="px-5 py-3 text-sm font-bold text-slate-700">
                          <MdCalendarToday className="inline mr-2 text-indigo-400" />
                          {new Date(row.date).toLocaleDateString('uz-UZ')}
                        </td>
                        <td className="px-5 py-3 text-sm font-black text-right text-indigo-600">{row.km.toFixed(2)}</td>
                        <td className="px-5 py-3 text-sm font-bold text-right text-slate-500">{row.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── Driver Detail Modal ─────────────────────────────────── */}
      {selectedDriver && (
        <div style={{ zIndex: 10000 }} className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedDriver(null)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="relative bg-gradient-to-br from-blue-600 to-indigo-700 p-6 pb-8">
              <button onClick={() => setSelectedDriver(null)} className="absolute top-4 right-4 w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-all">
                <MdClose className="text-white text-lg" />
              </button>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-2xl font-black text-white border-2 border-white/30">
                  {selectedDriver.name?.[0] || '?'}
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">{selectedDriver.name}</h3>
                  <p className="text-blue-200 text-sm font-bold flex items-center gap-1 mt-0.5">
                    <MdPhone className="text-xs" /> {selectedDriver.car}
                  </p>
                  <div className="mt-2">
                    {selectedDriver.pos ? (
                      <span className="text-[10px] font-black tracking-wider text-emerald-300 bg-emerald-500/30 px-2 py-1 rounded-lg inline-flex items-center gap-1">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                        </span>
                        GPS FAOL — LIVE
                      </span>
                    ) : (
                      <span className="text-[10px] font-black tracking-wider text-red-300 bg-red-500/30 px-2 py-1 rounded-lg">GPS ALOQA YO'Q</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Manzil */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <div className="flex items-center gap-2 mb-2">
                  <MdLocationOn className="text-red-500 text-lg" />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Hozirgi Manzil</span>
                </div>
                {selectedDriver.pos ? (
                  <div>
                    {addressLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-sm text-slate-400 font-medium">Manzil aniqlanmoqda...</span>
                      </div>
                    ) : (
                      <p className="text-sm font-bold text-slate-700 leading-relaxed">{driverAddress}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 font-medium">Joylashuv ma'lumoti mavjud emas</p>
                )}
              </div>

              {/* Koordinatalar */}
              {selectedDriver.pos && (
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                  <div className="flex items-center gap-2 mb-2">
                    <MdMyLocation className="text-blue-500 text-lg" />
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Koordinatalar</span>
                  </div>
                  <div className="flex gap-4">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Lat</span>
                      <p className="text-sm font-black text-slate-700">{selectedDriver.pos[0]?.toFixed(6)}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Lng</span>
                      <p className="text-sm font-black text-slate-700">{selectedDriver.pos[1]?.toFixed(6)}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Status */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                  <div className="flex items-center gap-2 mb-1">
                    <MdPerson className="text-indigo-500" />
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Status</span>
                  </div>
                  <p className="text-sm font-black text-slate-700">{selectedDriver.status}</p>
                </div>
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                  <div className="flex items-center gap-2 mb-1">
                    <MdDirectionsCar className="text-amber-500" />
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Buyurtmalar</span>
                  </div>
                  <p className="text-sm font-black text-slate-700">{selectedDriver.tasks} ta</p>
                </div>
              </div>

              {/* Google Maps link */}
              {selectedDriver.pos && (
                <a
                  href={`https://www.google.com/maps?q=${selectedDriver.pos[0]},${selectedDriver.pos[1]}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-5 py-3 rounded-xl font-black text-sm hover:bg-blue-700 hover:shadow-lg transition-all"
                >
                  <MdLocationOn className="text-lg" /> Google Maps'da ochish
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
