import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { 
  Ticket, 
  Clock, 
  Users, 
  MapPin, 
  AlertTriangle, 
  CheckCircle, 
  QrCode as QrIcon, 
  Navigation,
  ArrowRight,
  Sparkles,
  Volume2,
  RefreshCw
} from 'lucide-react';
import { useSocket } from '../context/SocketContext.tsx';
import { playQueueChime } from './AudioChime.ts';

interface LiveTokenTrackerProps {
  tokenData: any;
  onRefresh?: () => void;
  onExploreMore?: () => void;
}

export const LiveTokenTracker: React.FC<LiveTokenTrackerProps> = ({
  tokenData: initialToken,
  onRefresh,
  onExploreMore
}) => {
  const [token, setToken] = useState<any>(initialToken || {
    id: 'tok-001',
    token_display: 'OPD-014',
    customer_name: 'Aadi Shah',
    party_size: 1,
    status: 'WAITING',
    estimated_wait_minutes: 18,
    qr_code_hash: 'QL-HASH-OPD014-9812A',
    service_name: 'General Medicine OPD',
    location_name: 'City Care Hospital - Central Wing',
    counter_name: 'Desk 01',
    people_ahead: 2,
    check_in_time: new Date(Date.now() - 15 * 60000).toISOString()
  });

  const [peopleAhead, setPeopleAhead] = useState(token.people_ahead || 2);
  const [estWait, setEstWait] = useState(token.estimated_wait_minutes || 18);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const { lastEvent, socket } = useSocket();

  // Listen for real-time WebSocket events for this token
  useEffect(() => {
    if (!lastEvent) return;

    if (lastEvent.type === 'TOKEN_CALLED') {
      const calledToken = lastEvent.data?.token || lastEvent.data;
      if (calledToken?.id === token.id || calledToken?.token_display === token.token_display) {
        setToken((prev: any) => ({
          ...prev,
          status: 'CALLED',
          counter_name: lastEvent.data?.counter?.counter_number || 'Desk 01'
        }));
        setPeopleAhead(0);
        setEstWait(0);
      } else {
        // Someone else was called, decrement our position
        setPeopleAhead((prev: number) => Math.max(0, prev - 1));
        setEstWait((prev: number) => Math.max(0, prev - 8));
      }
    } else if (lastEvent.type === 'TOKEN_SERVING') {
      const servToken = lastEvent.data?.token || lastEvent.data;
      if (servToken?.id === token.id) {
        setToken((prev: any) => ({ ...prev, status: 'SERVING' }));
      }
    } else if (lastEvent.type === 'TOKEN_COMPLETED') {
      const compToken = lastEvent.data?.token || lastEvent.data;
      if (compToken?.id === token.id) {
        setToken((prev: any) => ({ ...prev, status: 'COMPLETED' }));
      }
    }
  }, [lastEvent, token.id]);

  // Generate QR Code data URL
  useEffect(() => {
    const hash = token.qr_code_hash || `QL-${token.token_display}`;
    QRCode.toDataURL(hash, {
      width: 200,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    })
      .then(url => setQrDataUrl(url))
      .catch(err => console.error('QR code generation error:', err));
  }, [token.qr_code_hash, token.token_display]);

  // Simulation test button for presentation
  const handleSimulateCall = () => {
    setToken((prev: any) => ({
      ...prev,
      status: 'CALLED',
      counter_name: 'Counter Desk 01'
    }));
    setPeopleAhead(0);
    setEstWait(0);
    playQueueChime(`Token ${token.token_display}, please proceed to Counter Desk 01.`);
  };

  const isCalled = token.status === 'CALLED';
  const isServing = token.status === 'SERVING';
  const isCompleted = token.status === 'COMPLETED';

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Presentation Demo Banner */}
      <div className="p-3 rounded-2xl glass-card border border-brand-500/30 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-brand-400" />
          <span className="text-slate-200 font-medium">
            Live Digital Queue Passport synced with Staff Station
          </span>
        </div>
        <button
          onClick={handleSimulateCall}
          className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-brand-300 font-bold transition-colors flex items-center gap-1"
        >
          <Volume2 className="w-3.5 h-3.5" /> Test Calling Chime
        </button>
      </div>

      {/* Main Digital Ticket Pass */}
      <div className={`rounded-3xl glass-panel border overflow-hidden shadow-2xl transition-all duration-300 ${
        isCalled 
          ? 'border-emerald-500 ring-4 ring-emerald-500/20 bg-dark-900/95' 
          : 'border-white/10'
      }`}>
        {/* Ticket Header */}
        <div className={`p-6 text-center border-b border-white/10 relative ${
          isCalled ? 'bg-gradient-to-b from-emerald-500/20 to-transparent' : 'bg-white/5'
        }`}>
          {/* Status Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-3">
            {isCalled ? (
              <span className="bg-emerald-500 text-white px-3 py-1 rounded-full shadow-lg shadow-emerald-500/40 animate-bounce flex items-center gap-1.5">
                <Volume2 className="w-4 h-4" /> YOU ARE BEING CALLED!
              </span>
            ) : isServing ? (
              <span className="bg-blue-500/20 text-blue-300 border border-blue-500/30 px-3 py-1 rounded-full">
                Now Serving at Counter
              </span>
            ) : isCompleted ? (
              <span className="bg-slate-700 text-slate-300 px-3 py-1 rounded-full">
                Service Completed
              </span>
            ) : (
              <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                ACTIVE QUEUE TICKET
              </span>
            )}
          </div>

          <p className="text-xs uppercase tracking-widest text-slate-400 font-bold">
            {token.location_name || 'City Care Hospital'}
          </p>
          <h2 className="text-sm font-semibold text-white mt-0.5">
            {token.service_name || 'General Medicine OPD'}
          </h2>

          {/* Large Token Display Number */}
          <div className="my-5">
            <span className="text-6xl sm:text-7xl font-black font-mono tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-100 to-slate-400 drop-shadow-md">
              {token.token_display}
            </span>
          </div>

          <p className="text-xs text-slate-300 font-medium">
            Guest: <strong className="text-white">{token.customer_name}</strong> • Party of {token.party_size || 1}
          </p>
        </div>

        {/* Dynamic Departure & Travel Guidance Alert */}
        <div className="p-4 border-b border-white/10 bg-dark-950/60">
          {isCalled ? (
            <div className="p-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs flex items-start gap-3 animate-pulse">
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm text-white">Proceed to {token.counter_name || 'Counter Desk 01'}</p>
                <p className="text-[11px] text-emerald-300 mt-0.5">
                  The counter operator is waiting for you. Show this pass or your QR code when you arrive.
                </p>
              </div>
            </div>
          ) : peopleAhead <= 1 ? (
            <div className="p-3.5 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-200 text-xs flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm text-white">Return to Waiting Area Now!</p>
                <p className="text-[11px] text-amber-300 mt-0.5">
                  You are the next person in line. Head back to the venue immediately.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-slate-200 text-xs flex items-start gap-3">
              <Navigation className="w-5 h-5 text-brand-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm text-white">Safe to explore nearby</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  You are {peopleAhead} people away. We will notify you when 2 people are ahead so you can comfortably return.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Live Counters Metric Grid */}
        <div className="grid grid-cols-2 p-5 gap-4 text-center border-b border-white/10 bg-dark-950/40">
          <div className="p-4 rounded-2xl glass-card border border-white/5">
            <span className="text-xs uppercase font-medium text-slate-400 tracking-wider flex items-center justify-center gap-1">
              <Users className="w-3.5 h-3.5 text-brand-400" /> People Ahead
            </span>
            <p className="text-3xl sm:text-4xl font-black text-white mt-1">
              {peopleAhead}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">in physical queue</p>
          </div>

          <div className="p-4 rounded-2xl glass-card border border-white/5">
            <span className="text-xs uppercase font-medium text-slate-400 tracking-wider flex items-center justify-center gap-1">
              <Clock className="w-3.5 h-3.5 text-brand-400" /> Approx Wait
            </span>
            <p className="text-3xl sm:text-4xl font-black text-brand-400 mt-1">
              ~{estWait} <span className="text-base font-normal text-slate-400">min</span>
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">based on active staff</p>
          </div>
        </div>

        {/* QR Code Verification Section */}
        <div className="p-6 text-center space-y-3 bg-dark-900/60">
          <p className="text-xs text-slate-300 font-semibold flex items-center justify-center gap-1.5">
            <QrIcon className="w-4 h-4 text-brand-400" />
            Scan at Kiosk or Counter to Check In
          </p>

          <div className="inline-block p-3 rounded-2xl bg-white shadow-xl">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="Token QR Pass" className="w-36 h-36 mx-auto" />
            ) : (
              <div className="w-36 h-36 bg-slate-200 rounded flex items-center justify-center text-slate-400 text-xs">
                Generating QR...
              </div>
            )}
          </div>

          <p className="text-[11px] font-mono text-slate-400">
            Hash: {token.qr_code_hash || 'QL-TOKEN-PASSPORT'}
          </p>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-dark-950/90 border-t border-white/10 flex items-center gap-3">
          <button
            onClick={onExploreMore}
            className="flex-1 py-3 rounded-xl glass-card hover:bg-white/10 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
          >
            Explore Nearby Places
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
