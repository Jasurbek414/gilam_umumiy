'use client';

import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';


// Custom icons
const driverIcon = L.icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/3202/3202926.png',
  iconSize: [35, 35],
  iconAnchor: [17, 35],
});

const pickupIcon = L.icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/1673/1673188.png',
  iconSize: [30, 30],
  iconAnchor: [15, 30],
});

const deliveryIcon = L.icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/1673/1673221.png',
  iconSize: [30, 30],
  iconAnchor: [15, 30],
});

const OSM_TILES = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

interface LogisticsMapProps {
  drivers: any[];
  orderPoints: any[];
  activeDriverId?: string | null;
}

function MapController({ activeDriverId, drivers, orderPoints }: { activeDriverId?: string | null, drivers: any[], orderPoints: any[] }) {
  const map = useMap();
  React.useEffect(() => {
    if (activeDriverId) {
      const driver = drivers.find(d => d.id === activeDriverId);
      if (driver && driver.pos && Array.isArray(driver.pos) && driver.pos.length === 2 && !isNaN(driver.pos[0])) {
        map.flyTo(driver.pos as L.LatLngExpression, 16, { animate: true, duration: 1.2 });
      }
    } else {
      // Auto-fit bounds based on all valid markers if available
      const bounds = L.latLngBounds([]);
      let hasValidPoints = false;
      
      [...drivers, ...orderPoints].forEach(item => {
        if (item.pos && Array.isArray(item.pos) && !isNaN(item.pos[0])) {
          bounds.extend(item.pos as L.LatLngExpression);
          hasValidPoints = true;
        }
      });
      
      if (hasValidPoints) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
      }
    }
  }, [activeDriverId, drivers, orderPoints, map]);
  return null;
}

export default function LogisticsMap({ drivers, orderPoints, activeDriverId }: LogisticsMapProps) {
  const validDrivers = drivers.filter(d => d.pos && Array.isArray(d.pos) && !isNaN(d.pos[0]));
  const validPoints = orderPoints.filter(p => p.pos && Array.isArray(p.pos) && !isNaN(p.pos[0]));

  return (
    <div className="w-full h-full min-h-[500px] border-4 border-slate-100 relative bg-slate-50">
      <MapContainer 
        center={[41.311081, 69.240562]} // Fallback center
        zoom={12} 
        style={{ height: '100%', width: '100%', minHeight: '500px' }}
      >
        <MapController activeDriverId={activeDriverId} drivers={drivers} orderPoints={orderPoints} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url={OSM_TILES}
        />
        {validDrivers.map(driver => (
          <Marker key={`dr-${driver.id}`} position={driver.pos} icon={driverIcon}>
            <Popup>
              <div className="p-2">
                <h4 className="font-bold">{driver.name}</h4>
                <p className="text-xs text-slate-500">{driver.car}</p>
                <p className="text-[10px] font-bold text-emerald-500 uppercase mt-1">● {driver.status}</p>
              </div>
            </Popup>
          </Marker>
        ))}
        {validPoints.map(point => (
          <Marker key={`pt-${point.id}`} position={point.pos} icon={point.type === 'pickup' ? pickupIcon : deliveryIcon}>
            <Popup>
              <div className="p-1">
                <p className="font-bold text-xs">{point.name}</p>
                <p className="text-[10px] uppercase font-bold text-blue-500">{point.type === 'pickup' ? 'Olib ketish' : 'Yetkazib berish'}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
