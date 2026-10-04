import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Layers,
  Volume2,
  VolumeX,
  Play,
  CheckCircle2,
  UserX,
  Users,
  Zap,
  RefreshCw,
  MapPin,
  Search,
  Ticket,
  Clock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useSocket } from '../context/SocketContext.tsx';
import { playQueueChime, stopQueueSound, unmuteQueueSound } from './AudioChime.ts';

interface StaffCounterStationProps {
  /** Venues to choose from (the same nearby list the customer side shows). */
  locations?: any[];
  /** Name of the area the venues were loaded for. */
  locationLabel?: string;
}

interface VenueOption {
  id: string;
  name: string;
  category: string;
}

const FALLBACK_VENUES: VenueOption[] = [
  { id: 'loc-hosp-01', name: 'City Care Hospital - Central Wing', category: 'HEALTHCARE' },
  { id: 'loc-rest-02', name: 'Trattoria Bella Milano - Downtown', category: 'RESTAURANT' },
  { id: 'loc-temp-03', name: 'Kashi Heritage Mandir - Sacred Complex', category: 'RELIGIOUS' },
  { id: 'loc-bank-04', name: 'Apex National Bank - Financial Hub', category: 'BANKING' },
  { id: 'loc-saln-05', name: 'Luxe & Glow - Bandra Studio', category: 'SALON' }
];

const CATEGORY_LABEL: Record<string, string> = {
  HEALTHCARE: 'Healthcare',
  RESTAURANT: 'Dining',
  PHARMACY: 'Pharmacies',
  EDUCATION: 'Colleges & Schools',
  GOVERNMENT: 'Government',
  SHOPPING: 'Shopping',
  TRANSPORT: 'Transport',
  ENTERTAINMENT: 'Entertainment',
  FUEL: 'Fuel',
  LODGING: 'Hotels',
  LEISURE: 'Parks & Gyms',
  ATTRACTION: 'Attractions',
  SERVICES: 'Other Places',
  RELIGIOUS: 'Temple',
  BANKING: 'Bank',
  SALON: 'Salon'
};

export const StaffCounterStation: React.FC<StaffCounterStationProps> = ({ locations, locationLabel }) => {
  const { user } = useAuth();
  const { lastEvent } = useSocket();

  const [locationId, setLocationId] = useState('');
  const [counterId, setCounterId] = useState('');
  const [venueQuery, setVenueQuery] = useState('');
  const [stationData, setStationData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState('');
  const reqIdRef = useRef(0);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 3500);
  };

  // Venues come from the nearby list; the demo venues are only a fallback.
  const venues: VenueOption[] = useMemo(() => {
    const source = locations && locations.length > 0 ? locations : FALLBACK_VENUES;
    return source.map((l: any) => ({ id: l.id, name: l.name, category: l.category }));
  }, [locations]);

  const shownVenues = useMemo(() => {
    const q = venueQuery.trim().toLowerCase();
    const list = q ? venues.filter((v) => v.name.toLowerCase().includes(q)) : venues;
    const current = venues.find((v) => v.id === locationId);
    return current && !list.some((v) => v.id === current.id) ? [current, ...list] : list;
  }, [venues, venueQuery, locationId]);

  // Keep the selected venue valid when the list changes (for example after picking a new area).
  useEffect(() => {
    if (venues.length === 0) return;
    if (!locationId || !venues.some((v) => v.id === locationId)) {
      setLocationId(venues[0].id);
      setCounterId('');
      setStationData(null);
    }
  }, [venues]);

  const fetchStation = async () => {
    if (!locationId) return;
    const myReq = ++reqIdRef.current;
    try {
      const res = await fetch(
        `/api/counter/station?counter_id=${encodeURIComponent(counterId)}&location_id=${encodeURIComponent(locationId)}`
      );
      const json = await res.json();
      if (myReq !== reqIdRef.current) return; // a newer request replaced this one
      if (json.success) {
        const counters: any[] = json.data.counters || [];
        // The selected counter must belong to the selected venue.
        if (counters.length > 0 && !counters.some((c) => c.id === counterId)) {
          setCounterId(counters[0].id);
        }
        setStationData(json.data);
      }
    } catch {
      console.warn('Failed to fetch station from API, keeping state');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStation();
  }, [locationId, counterId]);

  // Refresh when queue events arrive over the socket.
  useEffect(() => {
    if (!lastEvent) return;
    if (['TOKEN_CREATED', 'TOKEN_CALLED', 'TOKEN_SERVING', 'TOKEN_COMPLETED', 'TOKEN_NO_SHOW'].includes(lastEvent.type)) {
      fetchStation();
    }
  }, [lastEvent]);

  // Leaving this screen silences any announcement still playing.
  useEffect(() => {
    return () => {
      stopQueueSound();
    };
  }, []);

  const post = (url: string, body: object) =>
    fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

  const handleCallNext = async () => {
    if (!counterId) {
      showToast('Pick a counter first');
      return;
    }
    setActionLoading(true);
    try {
      const res = await post('/api/counter/call-next', { counter_id: counterId });
      const data = await res.json();
      if (data.success) {
        unmuteQueueSound();
        playQueueChime(data.data.announcement_text);
        fetchStation();
      } else {
        showToast(data.message || 'No waiting tokens found in queue');
      }
    } catch {
      showToast('Network error calling token');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartServing = async (tokenId: string) => {
    stopQueueSound();
    try {
      await post('/api/counter/serve', { counter_id: counterId, token_id: tokenId });
      fetchStation();
    } catch (err) {
      console.error(err);
    }
  };

  const handleComplete = async (tokenId: string) => {
    stopQueueSound();
    try {
      await post('/api/counter/complete', { counter_id: counterId, token_id: tokenId });
      fetchStation();
    } catch (err) {
      console.error(err);
    }
  };

  const handleNoShow = async (tokenId: string) => {
    stopQueueSound();
    try {
      await post('/api/counter/no-show', { counter_id: counterId, token_id: tokenId });
      fetchStation();
    } catch (err) {
      console.error(err);
    }
  };

  const activeCounter = stationData?.activeCounter;
  const activeToken = stationData?.activeToken;
  const waitingTokens: any[] = stationData?.waitingTokens || [];
  const completedTokens: any[] = stationData?.completedTokens || [];
  const currentVenue = venues.find((v) => v.id === locationId);
  const isCalled = activeToken && activeToken.status === 'CALLED';

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] px-4 py-2.5 rounded-xl glass-panel border border-brand-500/40 text-xs font-semibold text-white shadow-2xl">
          {toast}
        </div>
      )}

      {/* Header banner */}
      <div className="relative overflow-hidden rounded-3xl glass-panel border border-white/10 p-5 sm:p-6">
        <svg
          className="absolute -right-10 -top-10 w-80 h-80 opacity-25 pointer-events-none"
          viewBox="0 0 200 200"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="100" cy="100" r="30" stroke="#22c55e" strokeWidth="1.5" />
          <circle cx="100" cy="100" r="55" stroke="#22c55e" strokeWidth="1" />
          <circle cx="100" cy="100" r="80" stroke="#38bdf8" strokeWidth="1" />
          <line x1="100" y1="100" x2="180" y2="60" stroke="#22c55e" strokeWidth="1.5" />
          <circle cx="100" cy="100" r="4" fill="#22c55e" />
        </svg>

        <div className="relative flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">Staff Counter Calling Console</h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Operator: <strong className="text-white">{user?.full_name || 'Staff Member'}</strong>
            </p>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-brand-400" />
              {locationLabel
                ? `Venues near ${locationLabel}`
                : 'Demo venues. Choose a location above to load real places nearby.'}
            </p>
          </div>

          <div className="flex flex-col gap-2 w-full xl:w-auto xl:min-w-[520px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={venueQuery}
                onChange={(e) => setVenueQuery(e.target.value)}
                placeholder={`Search ${venues.length} venues...`}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl glass-card text-white placeholder:text-slate-500 text-xs border border-white/10 focus:border-brand-500 focus:outline-none"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <select
                value={locationId}
                onChange={(e) => {
                  setLocationId(e.target.value);
                  setCounterId('');
                  setStationData(null);
                }}
                className="flex-1 min-w-[200px] px-3 py-2.5 rounded-xl glass-card text-white border border-white/10 focus:border-brand-500 focus:outline-none bg-dark-900"
              >
                {shownVenues.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({CATEGORY_LABEL[v.category] || v.category})
                  </option>
                ))}
              </select>

              <select
                value={counterId}
                onChange={(e) => setCounterId(e.target.value)}
                className="px-3 py-2.5 rounded-xl glass-card border border-white/10 focus:border-brand-500 focus:outline-none bg-dark-900 font-bold text-brand-300"
              >
                {(stationData?.counters || []).map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.counter_number} ({c.name || 'Active Desk'})
                  </option>
                ))}
              </select>

              <button
                onClick={fetchStation}
                className="p-2.5 rounded-xl glass-card hover:bg-white/10 text-slate-300 hover:text-white"
                title="Refresh queue"
              >
                <RefreshCw className="w-4 h-4" />
              </button>

              <button
                onClick={() => {
                  stopQueueSound();
                  showToast('Announcement sound stopped');
                }}
                className="p-2.5 rounded-xl glass-card hover:bg-rose-500/20 text-slate-300 hover:text-rose-300"
                title="Stop announcement sound"
              >
                <VolumeX className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Waiting', value: waitingTokens.length, icon: Users, tone: 'text-brand-400' },
          { label: 'Now at counter', value: activeToken ? activeToken.token_display : 'None', icon: Ticket, tone: 'text-sky-400' },
          { label: 'Finished today', value: completedTokens.length, icon: CheckCircle2, tone: 'text-emerald-400' },
          { label: 'Desk status', value: activeCounter?.status || 'OPEN', icon: Layers, tone: 'text-amber-400' }
        ].map((s) => (
          <div key={s.label} className="card-glow rounded-2xl glass-card border border-white/10 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
              <s.icon className={`w-5 h-5 ${s.tone}`} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-slate-400">{s.label}</p>
              <p className="text-lg font-black text-white truncate font-mono">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Call next */}
          <div className="relative overflow-hidden rounded-3xl glass-panel border border-brand-500/30 p-6 sm:p-8 shadow-2xl">
            <div className="absolute -left-10 -bottom-16 w-64 h-64 rounded-full bg-brand-500/10 blur-3xl pointer-events-none" />
            <div className="relative flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="space-y-1 text-center sm:text-left">
                <span className="text-[11px] uppercase font-bold tracking-widest text-brand-400 flex items-center justify-center sm:justify-start gap-1.5">
                  <Zap className="w-3.5 h-3.5" /> High-Speed Calling Desk
                </span>
                <h3 className="text-2xl sm:text-3xl font-black text-white">
                  {currentVenue ? currentVenue.name : 'Choose a venue'}
                </h3>
                <p className="text-xs text-slate-300">
                  {activeCounter?.counter_number || 'Counter'} - {waitingTokens.length} customers waiting
                </p>
              </div>

              <button
                onClick={handleCallNext}
                disabled={actionLoading || waitingTokens.length === 0 || !counterId}
                className="w-full sm:w-auto px-8 py-5 rounded-2xl bg-gradient-to-r from-brand-500 to-emerald-600 hover:from-brand-600 hover:to-emerald-700 text-white font-extrabold text-lg shadow-xl shadow-brand-500/30 hover:shadow-brand-500/50 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed"
              >
                <Volume2 className="w-6 h-6 animate-pulse" />
                {actionLoading ? 'Calling...' : 'CALL NEXT TOKEN'}
              </button>
            </div>
          </div>

          {/* Current token */}
          <div className="relative rounded-3xl glass-card border border-white/10 p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                <h4 className="font-extrabold text-base text-white">Currently Called / At Counter</h4>
              </div>
              {activeToken && (
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    activeToken.status === 'SERVING'
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse'
                  }`}
                >
                  STATUS: {activeToken.status}
                </span>
              )}
            </div>

            {activeToken ? (
              <div className="space-y-5">
                <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-br from-dark-800 to-dark-950 border border-white/10">
                  <span className="hidden sm:block absolute -left-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-dark-950 border border-white/10" />
                  <span className="hidden sm:block absolute -right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-dark-950 border border-white/10" />
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">Token number</span>
                    <div className={`relative inline-block rounded-xl px-1 ${isCalled ? 'ring-pulse' : ''}`}>
                      <p className={`text-4xl sm:text-6xl font-black font-mono tracking-tight ${isCalled ? 'text-shimmer' : 'text-white'}`}>
                        {activeToken.token_display}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-brand-300 mt-1">{activeToken.customer_name}</p>
                    <p className="text-xs text-slate-400 flex items-center gap-2">
                      <span>Party: {activeToken.party_size || 1}</span>
                      <span>|</span>
                      <span>Source: {activeToken.source || 'APP'}</span>
                    </p>
                  </div>

                  <div className="space-y-1 text-sm sm:text-right">
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest">Called at</span>
                    <p className="font-mono text-slate-300">
                      {activeToken.called_time ? new Date(activeToken.called_time).toLocaleTimeString() : 'Just now'}
                    </p>
                    <button
                      onClick={() => {
                        unmuteQueueSound();
                        playQueueChime(
                          `Reminder: Token ${activeToken.token_display}, please proceed to ${activeCounter?.counter_number}.`
                        );
                      }}
                      className="mt-2 px-3 py-1.5 rounded-xl glass-panel hover:bg-white/10 text-slate-200 text-xs font-semibold flex items-center gap-1.5"
                    >
                      <Volume2 className="w-3.5 h-3.5 text-brand-400" />
                      Repeat Audio Call
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {activeToken.status !== 'SERVING' && (
                    <button
                      onClick={() => handleStartServing(activeToken.id)}
                      className="py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 transition-all"
                    >
                      <Play className="w-4 h-4" />
                      Start Serving
                    </button>
                  )}

                  <button
                    onClick={() => handleComplete(activeToken.id)}
                    className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all sm:col-span-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Finish &amp; Mark Completed
                  </button>

                  <button
                    onClick={() => handleNoShow(activeToken.id)}
                    className="py-3 px-4 rounded-xl glass-card hover:bg-rose-500/20 hover:border-rose-500 text-slate-300 hover:text-rose-300 text-xs font-bold flex items-center justify-center gap-2 border border-white/10 transition-all"
                  >
                    <UserX className="w-4 h-4" />
                    Mark No-Show
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-10 text-center space-y-3">
                <svg viewBox="0 0 120 80" className="w-32 h-auto mx-auto" fill="none" aria-hidden="true">
                  <rect x="10" y="30" width="100" height="40" rx="8" fill="#1a202c" stroke="#2d3748" strokeWidth="2" />
                  <rect x="22" y="14" width="76" height="24" rx="6" fill="#0d1117" stroke="#22c55e" strokeOpacity="0.6" strokeWidth="2" />
                  <text x="60" y="31" textAnchor="middle" fill="#22c55e" fontSize="12" fontFamily="monospace" fontWeight="700">
                    --
                  </text>
                  <circle cx="30" cy="52" r="5" fill="#22c55e" opacity="0.6" />
                  <rect x="44" y="48" width="56" height="8" rx="4" fill="#2d3748" />
                </svg>
                <h5 className="font-bold text-white text-sm">Counter is currently idle</h5>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  {isLoading
                    ? 'Loading this venue...'
                    : 'Press CALL NEXT TOKEN above to invite the next waiting guest.'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Waiting + completed */}
        <div className="space-y-6">
          <div className="rounded-3xl glass-panel border border-white/10 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-brand-400" />
                <h4 className="font-extrabold text-sm text-white">Waiting Line ({waitingTokens.length})</h4>
              </div>
              <span className="text-[10px] font-mono text-slate-400">FIFO / PRIORITY</span>
            </div>

            <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
              {waitingTokens.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400">The queue is clear.</div>
              ) : (
                waitingTokens.map((tok: any, index: number) => {
                  const isEmergency = tok.priority_level === 'EMERGENCY';
                  const isPriority = tok.priority_level === 'PRIORITY';
                  return (
                    <div
                      key={tok.id}
                      className={`p-3 rounded-2xl border transition-all flex items-center justify-between ${
                        isEmergency
                          ? 'bg-rose-500/10 border-rose-500/40'
                          : isPriority
                          ? 'bg-amber-500/10 border-amber-500/40'
                          : 'glass-card border-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center font-mono font-bold text-xs text-slate-300">
                          #{index + 1}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-extrabold text-sm text-white">{tok.token_display}</span>
                            {isEmergency && (
                              <span className="text-[9px] font-bold px-1.5 rounded bg-rose-500 text-white">EMERGENCY</span>
                            )}
                            {isPriority && (
                              <span className="text-[9px] font-bold px-1.5 rounded bg-amber-500 text-dark-950">VIP</span>
                            )}
                          </div>
                          <p className="text-xs text-slate-300">
                            {tok.customer_name} ({tok.party_size || 1}p)
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-mono text-brand-400 block">~{tok.estimated_wait_minutes}m</span>
                        <span className="text-[9px] text-slate-500">{tok.source || 'APP'}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="rounded-3xl glass-card border border-white/10 p-5 space-y-3">
            <div className="flex items-center gap-2 border-b border-white/10 pb-3">
              <Clock className="w-4 h-4 text-emerald-400" />
              <h4 className="font-extrabold text-sm text-white">Recently finished</h4>
            </div>
            {completedTokens.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">Nothing finished yet.</p>
            ) : (
              <ul className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {completedTokens.map((tok: any) => (
                  <li key={tok.id} className="flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-slate-200">{tok.token_display}</span>
                    <span className="text-slate-400 truncate mx-3">{tok.customer_name}</span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};