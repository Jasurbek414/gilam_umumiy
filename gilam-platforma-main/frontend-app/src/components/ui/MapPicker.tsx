'use client';

import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

import { MdMyLocation, MdSearch, MdLocationOn } from 'react-icons/md';
import toast from 'react-hot-toast';

// Custom elegant marker
const customIcon = L.divIcon({
  className: 'custom-map-marker',
  html: `
    <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 40px; height: 40px;">
      <div style="position: absolute; width: 100%; height: 100%; background-color: rgba(79, 70, 229, 0.2); border-radius: 50%; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
      <div style="position: absolute; width: 24px; height: 24px; background-color: #4f46e5; border: 3px solid white; border-radius: 50%; box-shadow: 0 4px 6px rgba(0,0,0,0.3);"></div>
      <div style="position: absolute; bottom: -8px; width: 4px; height: 12px; background-color: #4f46e5; border-radius: 2px;"></div>
    </div>
  `,
  iconSize: [40, 40],
  iconAnchor: [20, 40],
});

interface MapPickerProps {
  onLocationSelect: (lat: number, lng: number, address: string) => void;
  initialLocation?: { lat: number, lng: number };
  initialSearchQuery?: string;
}

function MapUpdater({ center, zoom }: { center: [number, number], zoom: number }) {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => {
      map.invalidateSize();
      map.flyTo(center, zoom, { duration: 1.5 });
    }, 100);
  }, [center, zoom, map]);
  return null;
}

function LocationMarker({ onSelect, position, setPosition }: { onSelect: any, position: [number, number], setPosition: any }) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      setPosition([lat, lng]);
      onSelect(lat, lng);
    },
  });

  return (
    <Marker 
      position={position} 
      icon={customIcon} 
      draggable={true} 
      eventHandlers={{
        dragend: (e) => {
          const marker = e.target;
          const { lat, lng } = marker.getLatLng();
          setPosition([lat, lng]);
          onSelect(lat, lng);
        }
      }} 
    />
  );
}

export default function MapPicker({ onLocationSelect, initialLocation, initialSearchQuery }: MapPickerProps) {
  const defaultPos: [number, number] = initialLocation ? [initialLocation.lat, initialLocation.lng] : [41.2995, 69.2401]; // Tashkent
  const [position, setPosition] = useState<[number, number]>(defaultPos);
  const [zoom, setZoom] = useState(13);
  const [isSearching, setIsSearching] = useState(false);
  const [addressLine, setAddressLine] = useState('Xaritadan joyni belgilang');
  const [lastSearched, setLastSearched] = useState('');
  const [mapType, setMapType] = useState<'m' | 'y'>('m'); // 'm' = Roadmap, 'y' = Hybrid/Satellite

  const OSM_ROADMAP = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  const ESRI_SATELLITE = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
  const TILE_URL = mapType === 'm' ? OSM_ROADMAP : ESRI_SATELLITE;

  // Live Auto-Search as user types in parent form
  useEffect(() => {
    if (initialSearchQuery && initialSearchQuery.length >= 3 && initialSearchQuery !== lastSearched) {
      const delayFn = setTimeout(() => {
        handleLiveSearch(initialSearchQuery);
      }, 1000);
      return () => clearTimeout(delayFn);
    }
  }, [initialSearchQuery, lastSearched]);

  const handleLiveSearch = async (query: string) => {
    setIsSearching(true);
    setLastSearched(query);

    // Helper function for cascading search
    const performSearch = async (searchStr: string): Promise<any> => {
      if (!searchStr || searchStr.trim().length === 0) return null;
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchStr)}&limit=1&accept-language=uz&countrycodes=uz`);
        const data = await res.json();
        if (data && data.length > 0) {
          return data[0];
        }
        // If not found, remove the last word (e.g., "55-uy") and try again
        const words = searchStr.trim().split(' ');
        if (words.length > 1) {
          words.pop();
          return await performSearch(words.join(' '));
        }
        return null; // completely failed
      } catch (err) {
        console.error('Cascading search error:', err);
        return null;
      }
    };

    const result = await performSearch(query);

    if (result) {
      const lat = parseFloat(result.lat);
      const lng = parseFloat(result.lon);
      setPosition([lat, lng]);
      setZoom(16); // slightly broader zoom for regions or precise if found
      
      // Re-fetch accurate name for the local overlay ONLY, do NOT overwrite parent's input text
      fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=uz`)
        .then(res => res.json())
        .then(revData => {
          const addr = revData.display_name || query;
          setAddressLine(addr);
          onLocationSelect(lat, lng, query);
        })
        .catch(() => {
          setAddressLine(query);
          onLocationSelect(lat, lng, query);
        });
    }
    
    setIsSearching(false);
  };

  // Handle Reverse Geocoding when dragging
  const handleSelect = (lat: number, lng: number) => {
    setIsSearching(true);
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=uz`)
      .then(res => res.json())
      .then(data => {
        const addr = data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        setAddressLine(addr);
        setLastSearched(addr); // prevent loop
        onLocationSelect(lat, lng, addr);
      })
      .catch(() => {
        const fallback = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        setAddressLine(fallback);
        setLastSearched(fallback); // prevent loop
        onLocationSelect(lat, lng, fallback);
      })
      .finally(() => setIsSearching(false));
  };

  const locateMe = () => {
    if (navigator.geolocation) {
      setIsSearching(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setPosition([lat, lng]);
          setZoom(16);
          handleSelect(lat, lng);
          setIsSearching(false);
        },
        (err) => {
          // err is a GeolocationPositionError, do not directly console.error an object causing crash
          if (err.code === 1) {
             toast.error("Joylashuvni aniqlashga brauzer ruxsat bermadi");
          } else {
             toast.error("Joylashuvni aniqlab bo'lmadi");
          }
          setIsSearching(false);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      toast.error("Sizning uskunangiz lokatsiyani qo'llab-quvvatlamaydi");
    }
  };

  return (
    <div className="w-full flex flex-col gap-3">
      {/* Map Container */}
      <div className="w-full h-[380px] rounded-2xl overflow-hidden shadow-lg border border-slate-200 relative group animate-in zoom-in-95 duration-500">
        
        {/* Loading Indicator for Live Search */}
        {isSearching && (
          <div className="absolute inset-0 bg-white/20 backdrop-blur-[1px] z-[1000] flex items-center justify-center pointer-events-none">
            <div className="bg-white/90 px-6 py-3 rounded-full shadow-lg flex items-center gap-3">
               <div className="w-5 h-5 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
               <p className="text-xs font-black text-indigo-700 uppercase tracking-widest">Qidirilmoqda...</p>
            </div>
          </div>
        )}
        
        {/* Floating current address indicator */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-white/90 backdrop-blur-md px-4 py-2 flex items-center gap-2 rounded-full shadow-lg border border-slate-100 max-w-[90%] pointer-events-none transition-all">
          <MdLocationOn className="text-indigo-600 shrink-0 text-lg" />
          <p className="text-xs font-bold text-slate-700 truncate">{addressLine}</p>
        </div>

        {/* Map Type Toggle */}
        <div className="absolute left-4 bottom-8 z-[1000] flex bg-white/90 backdrop-blur-sm rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.15)] border border-slate-100 overflow-hidden text-[10px] uppercase tracking-widest p-1">
          <button 
            type="button"
            onClick={() => setMapType('m')}
            className={`px-4 py-2.5 rounded-lg transition-all font-black ${mapType === 'm' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100/50 hover:text-slate-800'}`}
          >
            Xarita
          </button>
          <button 
            type="button"
            onClick={() => setMapType('y')}
            className={`px-4 py-2.5 rounded-lg transition-all font-black ${mapType === 'y' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100/50 hover:text-slate-800'}`}
          >
            Sputnik
          </button>
        </div>

        {/* Locate Me button */}
        <button
          type="button"
          onClick={locateMe}
          className="absolute right-4 bottom-8 z-[1000] w-12 h-12 bg-white rounded-full shadow-[0_4px_12px_rgba(0,0,0,0.15)] border border-slate-100 flex items-center justify-center text-slate-600 hover:text-indigo-600 hover:scale-105 active:scale-95 transition-all focus:outline-none focus:ring-4 focus:ring-indigo-500/20"
          title="Mening joylashuvim"
        >
          <MdMyLocation className="text-2xl" />
        </button>

        <MapContainer 
          center={position} 
          zoom={zoom} 
          maxZoom={20}
          style={{ height: '100%', width: '100%', backgroundColor: '#f8fafc' }}
          zoomControl={false}
        >
          <TileLayer
            attribution={mapType === 'm' ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' : '&copy; Esri'}
            url={TILE_URL}
            maxZoom={20}
          />
          <LocationMarker onSelect={handleSelect} position={position} setPosition={setPosition} />
          <MapUpdater center={position} zoom={zoom} />
        </MapContainer>
      </div>
    </div>
  );
}
