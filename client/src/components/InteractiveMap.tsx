import React, { useState } from 'react';
import { 
  MapPin, 
  Navigation, 
  Clock, 
  Users, 
  ShieldCheck, 
  ExternalLink, 
  Sparkles,
  Search,
  Filter,
  ArrowRight
} from 'lucide-react';

interface LocationMarker {
  id: string;
  name: string;
  org_name: string;
  category: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  distance_km: number;
  travel_time_minutes: number;
  travel_buffer_minutes: number;
  people_waiting: number;
  currently_serving: string;
  estimated_wait_minutes: number;
  wait_status: 'LOW_WAIT' | 'MEDIUM_WAIT' | 'HIGH_WAIT';
  is_verified: boolean;
  banner_url?: string;
  services: any[];
}

interface InteractiveMapProps {
  locations: LocationMarker[];
  onSelectLocation: (location: LocationMarker) => void;
  onJoinQueue: (location: LocationMarker, serviceId?: string) => void;
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  locations,
  onSelectLocation,
  onJoinQueue
}) => {
  const [selectedLoc, setSelectedLoc] = useState<LocationMarker | null>(locations[0] || null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'LOW_WAIT' | 'MEDIUM_WAIT' | 'HIGH_WAIT'>('ALL');

  // Filter locations based on wait status
  const filtered = statusFilter === 'ALL' 
    ? locations 
    : locations.filter(l => l.wait_status === statusFilter);

  // Status badge styling helper
  const getBadgeStyle = (status: string) => {
    switch (status) {
      case 'LOW_WAIT':
        return {
          bg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
          dot: 'bg-emerald-400',
          label: 'LOW WAIT (< 15m)'
        };
      case 'MEDIUM_WAIT':
        return {
          bg: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
          dot: 'bg-amber-400',
          label: 'MEDIUM WAIT (15–35m)'
        };
      case 'HIGH_WAIT':
        return {
          bg: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
          dot: 'bg-rose-400',
          label: 'HIGH WAIT (> 35m)'
        };
      default:
        return {
          bg: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
          dot: 'bg-blue-400',
          label: 'LIVE'
        };
    }
  };

  return (
    <div className="space-y-4">
      {/* Map Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl glass-panel">
        <div className="flex items-center gap-2">
          <Navigation className="w-4 h-4 text-brand-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Spatial Radar &amp; Live Wait Markers
          </span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              statusFilter === 'ALL' ? 'bg-white/15 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            All Live Markers ({locations.length})
          </button>
          <button
            onClick={() => setStatusFilter('LOW_WAIT')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
              statusFilter === 'LOW_WAIT' ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40' : 'text-slate-400 hover:text-white'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            Low Wait
          </button>
          <button
            onClick={() => setStatusFilter('MEDIUM_WAIT')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
              statusFilter === 'MEDIUM_WAIT' ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40' : 'text-slate-400 hover:text-white'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            Medium Wait
          </button>
          <button
            onClick={() => setStatusFilter('HIGH_WAIT')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
              statusFilter === 'HIGH_WAIT' ? 'bg-rose-500/25 text-rose-300 border border-rose-500/40' : 'text-slate-400 hover:text-white'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-400"></span>
            High Wait
          </button>
        </div>
      </div>

      {/* Spatial Map Canvas Simulation */}
      <div className="relative w-full h-[520px] rounded-3xl overflow-hidden glass-panel border border-white/10 bg-[#0c121e]">
        {/* Stylized Vector Map Grid Background */}
        <div 
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(#22c55e 1px, transparent 1px), linear-gradient(to right, #1e293b 1px, transparent 1px), linear-gradient(to bottom, #1e293b 1px, transparent 1px)`,
            backgroundSize: '40px 40px, 120px 120px, 120px 120px'
          }}
        />

        {/* Map Radar Pulse Center (User Location Marker) */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center pointer-events-none">
          <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center animate-ping"></div>
          <div className="absolute top-2 w-6 h-6 rounded-full bg-blue-500 border-2 border-white flex items-center justify-center shadow-lg shadow-blue-500/50">
            <span className="w-2 h-2 rounded-full bg-white"></span>
          </div>
          <span className="mt-8 px-2 py-0.5 rounded bg-dark-950/90 border border-white/20 text-[10px] font-mono text-blue-400">
            📍 You Are Here
          </span>
        </div>

        {/* Map Notice: Data Principle (Google Map vs QLESS Live Data) */}
        <div className="absolute top-4 left-4 z-20 max-w-sm p-2.5 rounded-xl bg-dark-950/90 border border-white/10 text-[11px] text-slate-300 backdrop-blur-md hidden sm:block">
          <p className="font-semibold text-white flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-brand-400" />
            QLESS Verified Live Stream
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            Map coordinates provide distance &amp; travel times. Queue counts and wait estimations are verified direct from QLESS-connected counters.
          </p>
        </div>

        {/* Dynamic Venue Markers on Map */}
        {filtered.map((loc, idx) => {
          const badge = getBadgeStyle(loc.wait_status);
          const isSelected = selectedLoc?.id === loc.id;

          // Compute deterministic spatial placement around center
          const angle = (idx / locations.length) * Math.PI * 2;
          const radius = 130 + (idx % 3) * 45;
          const leftPercent = 50 + (Math.cos(angle) * radius) / 5;
          const topPercent = 50 + (Math.sin(angle) * radius) / 5.5;

          return (
            <div
              key={loc.id}
              style={{ left: `${leftPercent}%`, top: `${topPercent}%` }}
              className="absolute z-20 transform -translate-x-1/2 -translate-y-1/2"
            >
              {/* Marker Pin */}
              <button
                onClick={() => {
                  setSelectedLoc(loc);
                  onSelectLocation(loc);
                }}
                className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-full border shadow-xl backdrop-blur-md transition-all duration-200 ${
                  isSelected
                    ? 'scale-110 ring-4 ring-brand-500/30 bg-dark-900 border-brand-400'
                    : 'bg-dark-900/90 border-white/20 hover:scale-105 hover:border-brand-500'
                }`}
              >
                <span className={`w-2.5 h-2.5 rounded-full ${badge.dot} ${isSelected ? 'animate-ping' : ''}`} />
                <span className="text-xs font-bold text-white max-w-[120px] truncate">
                  {loc.name.split(' - ')[0]}
                </span>
                <span className="text-[10px] font-mono text-brand-400">
                  {loc.estimated_wait_minutes}m
                </span>
              </button>
            </div>
          );
        })}

        {/* Selected Venue Floating Details Drawer on Map */}
        {selectedLoc && (
          <div className="absolute bottom-4 right-4 left-4 sm:left-auto sm:w-96 z-30 p-4 rounded-2xl glass-panel border border-brand-500/30 shadow-2xl animate-in slide-in-from-bottom-3 duration-200">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${getBadgeStyle(selectedLoc.wait_status).bg}`}>
                    {getBadgeStyle(selectedLoc.wait_status).label}
                  </span>
                  {selectedLoc.is_verified && (
                    <span className="text-[10px] font-semibold text-brand-400 flex items-center gap-0.5">
                      <ShieldCheck className="w-3 h-3" /> Verified
                    </span>
                  )}
                </div>
                <h3 className="font-extrabold text-base text-white leading-tight">
                  {selectedLoc.name}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {selectedLoc.address}
                </p>
              </div>
            </div>

            {/* Real-time stats grid */}
            <div className="grid grid-cols-3 gap-2 p-2.5 my-3 rounded-xl bg-dark-950/70 border border-white/5 text-center">
              <div>
                <span className="text-[10px] text-slate-400 uppercase">Wait Time</span>
                <p className="text-base font-extrabold text-brand-400 mt-0.5">
                  ~{selectedLoc.estimated_wait_minutes} min
                </p>
              </div>
              <div className="border-x border-white/10">
                <span className="text-[10px] text-slate-400 uppercase">In Line</span>
                <p className="text-base font-extrabold text-white mt-0.5">
                  {selectedLoc.people_waiting}
                </p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase">Distance</span>
                <p className="text-base font-extrabold text-slate-200 mt-0.5">
                  {selectedLoc.distance_km} km
                </p>
              </div>
            </div>

            {/* Primary Action: Join Queue Button */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => onJoinQueue(selectedLoc)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20 hover:shadow-brand-500/40 transition-all"
              >
                Join Queue Now
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedLoc.name + ' ' + selectedLoc.address)}`}
                target="_blank"
                rel="noreferrer"
                className="p-2.5 rounded-xl glass-card hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs transition-colors"
                title="Open in Google Maps for Navigation"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
