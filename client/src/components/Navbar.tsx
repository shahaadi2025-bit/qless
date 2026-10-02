import React from 'react';
import { 
  Compass, 
  Ticket, 
  Tv, 
  BarChart3, 
  ShieldCheck, 
  UserCheck, 
  Layers,
  Sparkles,
  Store
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useSocket } from '../context/SocketContext.tsx';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  activeTokenCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, activeTokenCount = 1 }) => {
  const { user, switchRole } = useAuth();
  const { isConnected } = useSocket();

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-white/10 px-4 lg:px-8 py-3.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <div 
          onClick={() => setActiveTab('explore')}
          className="flex items-center gap-3 cursor-pointer group select-none"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-brand-500/20 group-hover:scale-105 transition-transform duration-200">
            <span className="text-white font-extrabold text-xl tracking-tighter font-mono">Q</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl tracking-tight text-white group-hover:text-brand-400 transition-colors">
                QLESS
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-400 border border-brand-500/30">
                UNIVERSAL
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium tracking-wide hidden sm:block">
              JOIN THE QUEUE. NOT THE CROWD.
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1.5 p-1 rounded-xl bg-dark-900/80 border border-white/5">
          <button
            onClick={() => setActiveTab('explore')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'explore'
                ? 'bg-brand-500 text-white shadow-md shadow-brand-500/25'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Compass className="w-4 h-4" />
            Find a Queue
          </button>

          <button
            onClick={() => setActiveTab('tracker')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold relative transition-all ${
              activeTab === 'tracker'
                ? 'bg-brand-500 text-white shadow-md shadow-brand-500/25'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Ticket className="w-4 h-4" />
            Live Token Pass
            {activeTokenCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('counter')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'counter'
                ? 'bg-brand-500 text-white shadow-md shadow-brand-500/25'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Layers className="w-4 h-4" />
            Staff Station
          </button>

          <button
            onClick={() => setActiveTab('kiosk')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'kiosk'
                ? 'bg-brand-500 text-white shadow-md shadow-brand-500/25'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Tv className="w-4 h-4" />
            Venue Kiosk
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'analytics'
                ? 'bg-brand-500 text-white shadow-md shadow-brand-500/25'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Analytics & Payouts
          </button>
        </nav>

        {/* Live Status & Role Switcher */}
        <div className="flex items-center gap-3">
          {/* Socket Indicator */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-dark-900 border border-white/10 text-[11px] font-mono">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 beacon-live' : 'bg-amber-400'}`}></span>
            <span className="text-slate-300 hidden sm:inline">{isConnected ? 'LIVE WS' : 'SYNCING'}</span>
          </div>

          {/* Quick Role Switcher for College Presentation Demo */}
          <div className="flex items-center gap-1 bg-dark-900/90 border border-white/10 p-0.5 rounded-lg text-[11px]">
            <button
              onClick={() => { switchRole('CUSTOMER'); setActiveTab('tracker'); }}
              className={`px-2 py-1 rounded font-medium transition-all ${
                user?.role === 'CUSTOMER' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Switch to Customer Mode"
            >
              Customer
            </button>
            <button
              onClick={() => { switchRole('STAFF'); setActiveTab('counter'); }}
              className={`px-2 py-1 rounded font-medium transition-all ${
                user?.role === 'STAFF' 
                  ? 'bg-emerald-600 text-white' 
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Switch to Staff Calling Desk"
            >
              Staff
            </button>
            <button
              onClick={() => { switchRole('BUSINESS_ADMIN'); setActiveTab('analytics'); }}
              className={`px-2 py-1 rounded font-medium transition-all ${
                user?.role === 'BUSINESS_ADMIN' 
                  ? 'bg-purple-600 text-white' 
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Switch to Admin Mode"
            >
              Admin
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Tab Bar */}
      <div className="flex md:hidden items-center justify-around gap-1 mt-2.5 pt-2 border-t border-white/10 overflow-x-auto text-[11px]">
        <button
          onClick={() => setActiveTab('explore')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-md ${activeTab === 'explore' ? 'text-brand-400 font-bold' : 'text-slate-400'}`}
        >
          <Compass className="w-3.5 h-3.5" /> Explore
        </button>
        <button
          onClick={() => setActiveTab('tracker')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-md ${activeTab === 'tracker' ? 'text-brand-400 font-bold' : 'text-slate-400'}`}
        >
          <Ticket className="w-3.5 h-3.5" /> Pass
        </button>
        <button
          onClick={() => setActiveTab('counter')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-md ${activeTab === 'counter' ? 'text-brand-400 font-bold' : 'text-slate-400'}`}
        >
          <Layers className="w-3.5 h-3.5" /> Staff
        </button>
        <button
          onClick={() => setActiveTab('kiosk')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-md ${activeTab === 'kiosk' ? 'text-brand-400 font-bold' : 'text-slate-400'}`}
        >
          <Tv className="w-3.5 h-3.5" /> Kiosk
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-md ${activeTab === 'analytics' ? 'text-brand-400 font-bold' : 'text-slate-400'}`}
        >
          <BarChart3 className="w-3.5 h-3.5" /> Stats
        </button>
      </div>
    </header>
  );
};
