'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MdMyLocation, MdFilterList, MdSearch, MdRefresh, MdCircle, MdSignalWifiOff, MdSpeed, MdBattery5Bar, MdGpsFixed, MdHistory } from 'react-icons/md';
import { getUser, driversApi } from '@/lib/api';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { io, Socket } from 'socket.io-client';

// Leaflet dynamik import (SSR muammolaridan qochish uchun)
const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(m => m.Popup), { ssr: false });
const Polyline = dynamic(() => import('react-leaflet').then(m => m.Polyline), { ssr: false });
const MapUpdater = dynamic(
  () => import('react-leaflet').then(m => {
    return function Updater({ center, zoom }: any) {
      const map = m.useMap();
      React.useEffect(() => {
        if (center) map.flyTo(center, zoom || 15, { animate: true, duration: 1.5 });
      }, [center, zoom, map]);
      return null;
    }
  }), 
  { ssr: false }
);

const statusColors: any = {
  ONLINE: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200', dot: '#10b981', label: 'Online' },
  OFFLINE: { bg: 'bg-slate-100', text: 'text-slate-500', border: 'border-slate-200', dot: '#94a3b8', label: 'Offline' },
  BUSY: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', dot: '#3b82f6', label: 'Buyurtmada' },
  NO_SIGNAL: { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-200', dot: '#ef4444', label: "Aloqa yo'q" },
};

export default function LiveMapPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({ total: 0, online: 0, offline: 0, noSignal: 0, busy: 0 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedDriver, setSelectedDriver] = useState<any>(null);
  const [historyPath, setHistoryPath] = useState<any[]>([]);
  const [isMapReady, setIsMapReady] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const u = getUser();
    if (!u) { router.push('/'); return; }
    setUser(u);
    loadDrivers(u.company?.id);
    loadSummary(u.company?.id);

    // Leaflet CSS
    if (typeof window !== 'undefined') {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
      setTimeout(() => setIsMapReady(true), 500);
    }

    return () => { socketRef.current?.disconnect(); };
  }, []);

  // WebSocket ulanish
  useEffect(() => {
    if (!user) return;
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://gilam-api.ecos.uz';
    const socket = io(`${apiBase}/drivers`, { path: '/api/socket.io', transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('web:join', {
        userId: user.id,
        companyId: user.company?.id,
        role: user.role,
      });
    });

    socket.on('driver.location.updated', (data: any) => {
      setDrivers(prev => prev.map(d =>
        d.id === data.driverId ? { ...d, currentLocation: `(${data.longitude},${data.latitude})`, lastSeenAt: data.timestamp, lastAccuracy: data.accuracy, lastSpeed: data.speed, batteryLevel: data.battery, liveStatus: 'ONLINE' } : d
      ));
    });

    socket.on('driver.online', (data: any) => {
      setDrivers(prev => prev.map(d => d.id === data.driverId ? { ...d, isOnline: true, liveStatus: 'ONLINE' } : d));
      loadSummary(user.company?.id);
    });

    socket.on('driver.offline', (data: any) => {
      setDrivers(prev => prev.map(d => d.id === data.driverId ? { ...d, isOnline: false, liveStatus: 'OFFLINE' } : d));
      loadSummary(user.company?.id);
    });

    socket.on('driver.connection.lost', (data: any) => {
      setDrivers(prev => prev.map(d => d.id === data.driverId ? { ...d, liveStatus: 'NO_SIGNAL' } : d));
    });

    socket.on('driver.mock_location', (data: any) => {
      setDrivers(prev => prev.map(d => d.id === data.driverId ? { ...d, isMock: true } : d));
    });

    return () => { socket.disconnect(); };
  }, [user]);

  const loadDrivers = async (companyId?: string) => {
    try { const d = await driversApi.getAllWithStatus(companyId); setDrivers(d); } catch(e) { console.error(e); }
  };

  const loadSummary = async (companyId?: string) => {
    try { const s = await driversApi.getStatusSummary(companyId); setSummary(s); } catch(e) { console.error(e); }
  };

  const loadHistory = async (driverId: string) => {
    try {
      const from = new Date(); from.setHours(0,0,0,0);
      const h = await driversApi.getLocationHistory(driverId, from.toISOString(), new Date().toISOString());
      setHistoryPath(h.map((p: any) => [p.latitude, p.longitude]));
    } catch(e) { console.error(e); }
  };

  const parseLocation = (loc: any) => {
    if (!loc) return null;
    if (typeof loc === 'object' && 'x' in loc && 'y' in loc) {
      return { lat: loc.y, lng: loc.x };
    }
    if (typeof loc === 'string') {
      const m = loc.match(/\(([-\d.]+),\s*([-\d.]+)\)/);
      if (m) return { lat: parseFloat(m[2]), lng: parseFloat(m[1]) };
    }
    return null;
  };

  const timeSince = (dt: any) => {
    if (!dt) return '—';
    const s = Math.floor((Date.now() - new Date(dt).getTime()) / 1000);
    if (s < 60) return `${s}s oldin`;
    if (s < 3600) return `${Math.floor(s/60)}d oldin`;
    return `${Math.floor(s/3600)}s oldin`;
  };

  const filtered = drivers.filter(d => {
    if (search && !(d.fullName||'').toLowerCase().includes(search.toLowerCase()) && !(d.phone||'').includes(search) && !(d.vehicleNumber||'').toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== 'ALL' && d.liveStatus !== statusFilter) return false;
    return true;
  });

  const center: [number, number] = [41.2995, 69.2401]; // Toshkent

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-slate-800 flex items-center gap-2">
              <MdMyLocation className="text-blue-600" /> Haydovchilar Xaritasi
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">Real vaqt rejimida kuzatish</p>
          </div>
          <button onClick={() => loadDrivers(user?.company?.id)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-bold rounded-xl text-sm hover:bg-blue-700 transition-all">
            <MdRefresh /> Yangilash
          </button>
        </div>

        {/* Status cards */}
        <div className="grid grid-cols-5 gap-3 mt-4">
          {[
            { key: 'total', label: 'Jami', value: summary.total, color: 'from-slate-600 to-slate-800' },
            { key: 'online', label: 'Online', value: summary.online, color: 'from-emerald-500 to-emerald-700' },
            { key: 'busy', label: 'Buyurtmada', value: summary.busy, color: 'from-blue-500 to-blue-700' },
            { key: 'noSignal', label: "Aloqa yo'q", value: summary.noSignal, color: 'from-rose-500 to-rose-700' },
            { key: 'offline', label: 'Offline', value: summary.offline, color: 'from-slate-400 to-slate-600' },
          ].map(s => (
            <div key={s.key} className={`bg-gradient-to-br ${s.color} rounded-xl p-3 text-white shadow-sm`}>
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">{s.label}</p>
              <p className="text-2xl font-black mt-0.5">{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex" style={{ height: 'calc(100vh - 180px)' }}>
        {/* Sidebar — Driverlar ro'yxati */}
        <div className="w-80 bg-white border-r border-slate-200 flex flex-col">
          <div className="p-3 border-b border-slate-100 space-y-2">
            <div className="relative">
              <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Qidiruv..." className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-400" />
            </div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium outline-none">
              <option value="ALL">Barcha statuslar</option>
              <option value="ONLINE">🟢 Online</option>
              <option value="OFFLINE">⚪ Offline</option>
              <option value="BUSY">🔵 Buyurtmada</option>
              <option value="NO_SIGNAL">🔴 Aloqa yo'q</option>
            </select>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filtered.map(d => {
              const s = statusColors[d.liveStatus || 'OFFLINE'] || statusColors.OFFLINE;
              return (
                <div key={d.id} onClick={() => { setSelectedDriver(d); loadHistory(d.id); }} className={`px-4 py-3 border-b border-slate-50 cursor-pointer hover:bg-blue-50/50 transition-all ${selectedDriver?.id === d.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''}`}>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white text-sm font-black">{d.fullName?.[0]}</div>
                      <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white`} style={{ backgroundColor: s.dot }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{d.fullName}</p>
                      <p className="text-[10px] text-slate-400">{d.vehicleNumber || d.phone}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-black ${s.bg} ${s.text} ${s.border} border`}>{s.label}</span>
                  </div>
                  <div className="flex gap-3 mt-1.5 text-[10px] text-slate-400">
                    <span className="flex items-center gap-0.5"><MdGpsFixed className="text-xs" /> {d.lastAccuracy ? `${Math.round(d.lastAccuracy)}m` : '—'}</span>
                    <span className="flex items-center gap-0.5"><MdSpeed className="text-xs" /> {d.lastSpeed ? `${Math.round(d.lastSpeed)} km/s` : '—'}</span>
                    <span className="flex items-center gap-0.5"><MdBattery5Bar className="text-xs" /> {d.batteryLevel ? `${d.batteryLevel}%` : '—'}</span>
                    <span className="ml-auto">{timeSince(d.lastSeenAt)}</span>
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && <div className="p-6 text-center text-slate-400 text-sm">Haydovchilar topilmadi</div>}
          </div>
        </div>

        {/* Map */}
        <div className="flex-1 relative">
          {isMapReady && typeof window !== 'undefined' && (
            <MapContainer center={center} zoom={12} style={{ height: '100%', width: '100%' }} scrollWheelZoom={true}>
              <TileLayer
                attribution='&copy; <a href="https://osm.org">OSM</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {selectedDriver && parseLocation(selectedDriver.currentLocation) && (
                <MapUpdater center={[parseLocation(selectedDriver.currentLocation)!.lat, parseLocation(selectedDriver.currentLocation)!.lng]} zoom={16} />
              )}
              {filtered.filter(d => parseLocation(d.currentLocation)).map(d => {
                const loc = parseLocation(d.currentLocation)!;
                const s = statusColors[d.liveStatus || 'OFFLINE'] || statusColors.OFFLINE;
                return (
                  <Marker key={d.id} position={[loc.lat, loc.lng]}>
                    <Popup>
                      <div className="min-w-[200px]">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white text-xs font-black">{d.fullName?.[0]}</div>
                          <div>
                            <p className="font-bold text-sm">{d.fullName}</p>
                            <p className="text-[10px] text-slate-400">{d.phone}</p>
                          </div>
                        </div>
                        <div className="space-y-1 text-xs">
                          {d.vehicleNumber && <p>🚗 {d.vehicleNumber}</p>}
                          <p style={{color: s.dot}}>● {s.label}</p>
                          <p>📍 GPS: {d.lastAccuracy ? `${Math.round(d.lastAccuracy)}m` : '—'}</p>
                          <p>🚀 Tezlik: {d.lastSpeed ? `${Math.round(d.lastSpeed)} km/s` : '—'}</p>
                          <p>🔋 Batareya: {d.batteryLevel ? `${d.batteryLevel}%` : '—'}</p>
                          <p>🕐 {timeSince(d.lastSeenAt)}</p>
                          {d.isMock && <p className="text-rose-600 font-bold">⚠️ Soxta lokatsiya!</p>}
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
              {historyPath.length > 1 && (
                <Polyline positions={historyPath} pathOptions={{ color: '#3b82f6', weight: 3, opacity: 0.7 }} />
              )}
            </MapContainer>
          )}

          {/* Selected driver info panel */}
          {selectedDriver && (
            <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200 p-4 w-72 z-[1000]">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-black text-lg">{selectedDriver.fullName?.[0]}</div>
                <div>
                  <p className="font-black text-slate-800">{selectedDriver.fullName}</p>
                  <p className="text-xs text-slate-400">{selectedDriver.phone}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-50 rounded-lg p-2"><p className="text-[9px] font-bold text-slate-400">Mashina</p><p className="font-bold text-slate-800">{selectedDriver.vehicleNumber || '—'}</p></div>
                <div className="bg-slate-50 rounded-lg p-2"><p className="text-[9px] font-bold text-slate-400">GPS</p><p className="font-bold text-slate-800">{selectedDriver.lastAccuracy ? `${Math.round(selectedDriver.lastAccuracy)}m` : '—'}</p></div>
                <div className="bg-slate-50 rounded-lg p-2"><p className="text-[9px] font-bold text-slate-400">Tezlik</p><p className="font-bold text-slate-800">{selectedDriver.lastSpeed ? `${Math.round(selectedDriver.lastSpeed)} km/s` : '—'}</p></div>
                <div className="bg-slate-50 rounded-lg p-2"><p className="text-[9px] font-bold text-slate-400">Batareya</p><p className="font-bold text-slate-800">{selectedDriver.batteryLevel ? `${selectedDriver.batteryLevel}%` : '—'}</p></div>
              </div>
              <button onClick={() => { setSelectedDriver(null); setHistoryPath([]); }} className="mt-3 w-full py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all">Yopish</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
