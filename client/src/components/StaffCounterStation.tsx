import React, { useEffect, useState } from 'react';
import { 
  Layers, 
  Volume2, 
  Play, 
  CheckCircle2, 
  UserX, 
  Clock, 
  Users, 
  Sparkles, 
  AlertCircle,
  Building2,
  Phone,
  RefreshCw,
  Zap
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useSocket } from '../context/SocketContext.tsx';
import { playQueueChime } from './AudioChime.ts';

export const StaffCounterStation: React.FC = () => {
  const { user } = useAuth();
  const { socket, lastEvent } = useSocket();

  const [locationId, setLocationId] = useState('loc-hosp-01');
  const [counterId, setCounterId] = useState('cnt-hosp-01');
  const [stationData, setStationData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch station state
  const fetchStation = async () => {
    try {
      const res = await fetch(`/api/counter/station?counter_id=${counterId}&location_id=${locationId}`);
      const json = await res.json();
      if (json.success) {
        setStationData(json.data);
      }
    } catch (err) {
      console.warn('Failed to fetch station from API, keeping state');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStation();
  }, [locationId, counterId]);

  // Listen to socket events for real-time list updates
  useEffect(() => {
    if (!lastEvent) return;
    if (['TOKEN_CREATED', 'TOKEN_CALLED', 'TOKEN_SERVING', 'TOKEN_COMPLETED', 'TOKEN_NO_SHOW'].includes(lastEvent.type)) {
      fetchStation();
    }
  }, [lastEvent]);

  // Action: Call Next Token
  const handleCallNext = async () => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/counter/call-next', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ counter_id: counterId })
      });
      const data = await res.json();
      if (data.success) {
        playQueueChime(data.data.announcement_text);
        fetchStation();
      } else {
        alert(data.message || 'No waiting tokens found in queue');
      }
    } catch (err) {
      alert('Network error calling token');
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Start Serving
  const handleStartServing = async (tokenId: string) => {
    try {
      await fetch('/api/counter/serve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ counter_id: counterId, token_id: tokenId })
      });
      fetchStation();
    } catch (err) {
      console.error(err);
    }
  };

  // Action: Mark Completed
  const handleComplete = async (tokenId: string) => {
    try {
      await fetch('/api/counter/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ counter_id: counterId, token_id: tokenId })
      });
      fetchStation();
    } catch (err) {
      console.error(err);
    }
  };

  // Action: Mark No-Show
  const handleNoShow = async (tokenId: string) => {
    try {
      await fetch('/api/counter/no-show', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ counter_id: counterId, token_id: tokenId })
      });
      fetchStation();
    } catch (err) {
      console.error(err);
    }
  };

  const activeCounter = stationData?.activeCounter;
  const activeToken = stationData?.activeToken;
  const waitingTokens = stationData?.waitingTokens || [];
  const completedTokens = stationData?.completedTokens || [];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Station Control Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-3xl glass-panel border border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <h2 className="text-xl font-extrabold text-white tracking-tight">
              Staff Counter Calling Console
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Operator: <strong className="text-white">{user?.full_name || 'Staff Member'}</strong> • Zero-wait physical desk interface
          </p>
        </div>

        {/* Location & Counter Selectors */}
        <div className="flex flex-wrap items-center gap-2 text-xs w-full sm:w-auto">
          <select
            value={locationId}
            onChange={(e) => { setLocationId(e.target.value); }}
            className="px-3 py-2 rounded-xl glass-card text-white border border-white/10 focus:border-brand-500 focus:outline-none bg-dark-900"
          >
            <option value="loc-hosp-01">City Care Hospital (Healthcare)</option>
            <option value="loc-rest-02">Trattoria Bella Milano (Dining)</option>
            <option value="loc-temp-03">Kashi Mandir (Temple Darshan)</option>
            <option value="loc-bank-04">Apex National Bank (Banking)</option>
            <option value="loc-saln-05">Luxe &amp; Glow (Salon)</option>
          </select>

          <select
            value={counterId}
            onChange={(e) => setCounterId(e.target.value)}
            className="px-3 py-2 rounded-xl glass-card text-white border border-white/10 focus:border-brand-500 focus:outline-none bg-dark-900 font-bold text-brand-300"
          >
            {stationData?.counters?.map((c: any) => (
              <option key={c.id} value={c.id}>
                {c.counter_number} ({c.name || 'Active Desk'})
              </option>
            ))}
          </select>

          <button
            onClick={fetchStation}
            className="p-2 rounded-xl glass-card hover:bg-white/10 text-slate-300 hover:text-white"
            title="Refresh Queue"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Grid: Active Serving Box & Call Next Action */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Active Token & Primary 1-Click Calling Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Large Hero Calling Banner */}
          <div className="rounded-3xl glass-panel border border-brand-500/30 p-6 sm:p-8 relative overflow-hidden shadow-2xl">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="space-y-1 text-center sm:text-left">
                <span className="text-[11px] uppercase font-bold tracking-widest text-brand-400 flex items-center justify-center sm:justify-start gap-1.5">
                  <Zap className="w-3.5 h-3.5" /> High-Speed Calling Desk
                </span>
                <h3 className="text-2xl sm:text-3xl font-black text-white">
                  {activeCounter?.counter_number || 'Counter Desk'}
                </h3>
                <p className="text-xs text-slate-300">
                  {waitingTokens.length} customers waiting in line for this station
                </p>
              </div>

              {/* Big 1-Click Call Next Button */}
              <button
                onClick={handleCallNext}
                disabled={actionLoading || waitingTokens.length === 0}
                className="w-full sm:w-auto px-8 py-5 rounded-2xl bg-gradient-to-r from-brand-500 to-emerald-600 hover:from-brand-600 hover:to-emerald-700 text-white font-extrabold text-lg shadow-xl shadow-brand-500/30 hover:shadow-brand-500/50 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed"
              >
                <Volume2 className="w-6 h-6 animate-pulse" />
                {actionLoading ? 'Calling...' : 'CALL NEXT TOKEN'}
              </button>
            </div>
          </div>

          {/* Current Active Token Being Served */}
          <div className="rounded-3xl glass-card border border-white/10 p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                <h4 className="font-extrabold text-base text-white">
                  Currently Called / At Counter
                </h4>
              </div>
              {activeToken && (
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  activeToken.status === 'SERVING' 
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse'
                }`}>
                  STATUS: {activeToken.status}
                </span>
              )}
            </div>

            {activeToken ? (
              <div className="space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-dark-950/70 border border-white/5">
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">
                      TOKEN NUMBER
                    </span>
                    <p className="text-4xl sm:text-5xl font-black font-mono text-white tracking-tight">
                      {activeToken.token_display}
                    </p>
                    <p className="text-sm font-bold text-brand-300 mt-1">
                      {activeToken.customer_name}
                    </p>
                    <p className="text-xs text-slate-400 flex items-center gap-2">
                      <span>Party: {activeToken.party_size || 1}</span>
                      <span>•</span>
                      <span>Source: {activeToken.source || 'APP'}</span>
                    </p>
                  </div>

                  <div className="space-y-1 text-sm sm:text-right">
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest">
                      CALLED AT
                    </span>
                    <p className="font-mono text-slate-300">
                      {activeToken.called_time ? new Date(activeToken.called_time).toLocaleTimeString() : 'Just now'}
                    </p>
                    <button
                      onClick={() => playQueueChime(`Reminder: Token ${activeToken.token_display}, please proceed to ${activeCounter?.counter_number}.`)}
                      className="mt-2 px-3 py-1.5 rounded-xl glass-panel hover:bg-white/10 text-slate-200 text-xs font-semibold flex items-center gap-1.5"
                    >
                      <Volume2 className="w-3.5 h-3.5 text-brand-400" />
                      Repeat Audio Call
                    </button>
                  </div>
                </div>

                {/* Operator Actions */}
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
              <div className="py-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto text-slate-400">
                  <Layers className="w-6 h-6" />
                </div>
                <h5 className="font-bold text-white text-sm">
                  Counter is Currently Idle
                </h5>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Click the <strong>CALL NEXT TOKEN</strong> button above to invite the next waiting guest in queue.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Live Waiting Queue List */}
        <div className="rounded-3xl glass-panel border border-white/10 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-brand-400" />
              <h4 className="font-extrabold text-sm text-white">
                Waiting Line ({waitingTokens.length})
              </h4>
            </div>
            <span className="text-[10px] font-mono text-slate-400">
              FIFO / PRIORITY
            </span>
          </div>

          <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
            {waitingTokens.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                Queue is completely clear! 🎉
              </div>
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
                          <span className="font-mono font-extrabold text-sm text-white">
                            {tok.token_display}
                          </span>
                          {isEmergency && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-500 text-white">
                              EMERGENCY
                            </span>
                          )}
                          {isPriority && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500 text-dark-950">
                              VIP
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-300">
                          {tok.customer_name} ({tok.party_size || 1}p)
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-mono text-brand-400 block">
                        ~{tok.estimated_wait_minutes}m
                      </span>
                      <span className="text-[9px] text-slate-500">
                        {tok.source || 'APP'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
