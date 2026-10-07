import React, { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { Navbar } from './components/Navbar.tsx';
import { HeroSection } from './components/HeroSection.tsx';
import { InteractiveMap } from './components/InteractiveMap.tsx';
import { CustomerHome } from './components/CustomerHome.tsx';
import { LiveTokenTracker } from './components/LiveTokenTracker.tsx';
import { StaffCounterStation } from './components/StaffCounterStation.tsx';
import { KioskMode } from './components/KioskMode.tsx';
import { BusinessAnalytics } from './components/BusinessAnalytics.tsx';
import { useSocket } from './context/SocketContext.tsx';
import { Database, HelpCircle, Sparkles, ExternalLink, Code2 } from 'lucide-react';
import { apiFetch } from './config.ts';
import { AccountProvider } from './context/AccountContext.tsx';
import { LandingPage } from './components/LandingPage.tsx';
import { PricingPage } from './components/PricingPage.tsx';
import { AccountPage } from './components/AccountPage.tsx';
import { BoostCard } from './components/BoostCard.tsx';
import { AuroraBackground } from './components/AuroraBackground.tsx';
import { CursorGlow } from './components/CursorGlow.tsx';
import { ScrollProgress } from './components/ScrollProgress.tsx';
import { LocationPicker } from './components/LocationPicker.tsx';

// Keep the list manageable when many nearby places are discovered: nearest N per category.
const capPerCategory = (rows: any[], perCategory = 24): any[] => {
  const seen: Record<string, number> = {};
  return rows.filter((r) => {
    seen[r.category] = (seen[r.category] || 0) + 1;
    return seen[r.category] <= perCategory;
  });
};

const AppInner: React.FC = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [locations, setLocations] = useState<any[]>([]);
  const [activeToken, setActiveToken] = useState<any>({
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

  const [showDemoModal, setShowDemoModal] = useState(false);
  const [joinRequest, setJoinRequest] = useState<string | null>(null);
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number; label: string } | null>(() => {
    try {
      const raw = localStorage.getItem('qless:userLoc');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const { lastEvent } = useSocket();
  const discoveredRef = useRef<string>('');
  const reqIdRef = useRef(0);
  const [locStatus, setLocStatus] = useState<{ kind: 'loading' | 'ok' | 'warn'; text: string } | null>(null);

  // Load verified locations
  const fetchLocations = async () => {
    const myReq = ++reqIdRef.current;
    try {
      const qs = userLoc ? `?userLat=${userLoc.lat}&userLng=${userLoc.lng}` : '';
      if (userLoc) {
        const key = `${userLoc.lat.toFixed(3)},${userLoc.lng.toFixed(3)}`;
        if (discoveredRef.current !== key) {
          setLocStatus({ kind: 'loading', text: `Finding places near ${userLoc.label}... (can take up to 30 seconds)` });
          try {
            const dr = await apiFetch(`/api/places/nearby?lat=${userLoc.lat}&lng=${userLoc.lng}&radius=2500`);
            const dj = await dr.json();
            if (dj && dj.success && !dj.stale) {
              discoveredRef.current = key;
              setLocStatus({ kind: 'ok', text: `Found ${dj.count} real places near ${userLoc.label}.` });
            } else {
              setLocStatus({ kind: 'warn', text: 'The live place lookup is busy right now. Pick the location again in a minute to retry.' });
            }
          } catch {
            setLocStatus({ kind: 'warn', text: 'Could not reach the server (the free server may be waking up). Pick the location again in a minute.' });
          }
        }
      }
      const res = await apiFetch(`/api/explore/locations${qs}`);
      const data = await res.json();
      if (data.success && data.data.length > 0) {
        if (myReq === reqIdRef.current) setLocations(userLoc ? capPerCategory(data.data) : data.data);
      }
    } catch (err) {
      console.warn('Failed to load locations from API, keeping initial data');
    }
  };

  useEffect(() => {
    fetchLocations();
  }, [userLoc]);

  // Update on socket queue events
  useEffect(() => {
    if (lastEvent) {
      fetchLocations();
    }
  }, [lastEvent]);

  // Handle Token Issue from Customer Portal or Map
  const handleTokenIssued = (tokenData: any) => {
    setActiveToken(tokenData);
    setActiveTab('tracker');
    confetti({
      particleCount: 60,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  return (
    <div className="relative isolate min-h-screen bg-dark-950 text-slate-100 flex flex-col selection:bg-brand-500/30 selection:text-brand-300">
      <AuroraBackground />
      <CursorGlow />
      <ScrollProgress />
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeTokenCount={activeToken ? 1 : 0}
      />

      {/* Main Content View Switcher */}
      <main key={activeTab} className="page-enter flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        {activeTab === 'explore' && (
          <div className="space-y-12">
            {/* Hero Experience (Stop Waiting. Start Moving.) */}
            <HeroSection
              onFindQueue={() => {
                const el = document.getElementById('customer-home-view');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              onForBusinesses={() => setActiveTab('counter')}
            />

            {/* Customer Home Discovery (Live Near You) */}
            <div id="customer-home-view" className="pt-6 border-t border-white/10">
              <LocationPicker
                current={userLoc}
                status={locStatus}
                onChange={(loc) => {
                  setUserLoc(loc);
                  if (!loc) setLocStatus(null);
                  try {
                    if (loc) localStorage.setItem('qless:userLoc', JSON.stringify(loc));
                    else localStorage.removeItem('qless:userLoc');
                  } catch {
                    /* storage unavailable */
                  }
                }}
              />
              <CustomerHome
                openLocationId={joinRequest}
                locations={locations}
                onTokenIssued={handleTokenIssued}
                onViewMap={() => {
                  const mapEl = document.getElementById('interactive-map-section');
                  if (mapEl) mapEl.scrollIntoView({ behavior: 'smooth' });
                }}
              />
            </div>

            {/* Interactive Geospatial Radar Map Section */}
            <div id="interactive-map-section" className="pt-6 border-t border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-extrabold text-white tracking-tight">
                    Spatial Venue Radar &amp; Live Map
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Live wait indicators: 🟢 Low Wait (&lt;15m) • 🟡 Medium Wait (15–35m) • 🔴 High Wait (&gt;35m)
                  </p>
                </div>
              </div>

              <InteractiveMap
                userLocation={userLoc}
                locations={locations}
                onSelectLocation={(loc) => console.log('Selected loc', loc)}
                onJoinQueue={(loc) => {
                  setJoinRequest(`${loc.id}|${Date.now()}`);
                  const el = document.getElementById('customer-home-view');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
              />
            </div>
          </div>
        )}

        {activeTab === 'home' && (
          <LandingPage
            onFindQueue={() => setActiveTab('explore')}
            onPricing={() => setActiveTab('pricing')}
            onForBusinesses={() => setActiveTab('pricing')}
          />
        )}

        {activeTab === 'pricing' && (
          <div className="py-4">
            <PricingPage />
          </div>
        )}

        {activeTab === 'account' && (
          <div className="py-4">
            <AccountPage onGoPricing={() => setActiveTab('pricing')} />
          </div>
        )}

        {/* Live Customer Token Passport */}
        {activeTab === 'tracker' && (
          <div className="py-4">
            <BoostCard token={activeToken} />
            <LiveTokenTracker
              tokenData={activeToken}
              onExploreMore={() => setActiveTab('explore')}
            />
          </div>
        )}

        {/* Staff Counter Station */}
        {activeTab === 'counter' && (
          <div className="py-4">
            <div className="max-w-6xl mx-auto">
              <LocationPicker
                current={userLoc}
                status={locStatus}
                onChange={(loc) => {
                  setUserLoc(loc);
                  if (!loc) setLocStatus(null);
                  try {
                    if (loc) localStorage.setItem('qless:userLoc', JSON.stringify(loc));
                    else localStorage.removeItem('qless:userLoc');
                  } catch {
                    /* storage unavailable */
                  }
                }}
              />
            </div>
            <StaffCounterStation locations={locations} locationLabel={userLoc ? userLoc.label : undefined} />
          </div>
        )}

        {/* Self-Service Walk-In Kiosk Mode */}
        {activeTab === 'kiosk' && (
          <div className="py-4">
            <KioskMode />
          </div>
        )}

        {/* Business Analytics & Commission Ledger */}
        {activeTab === 'analytics' && (
          <div className="py-4">
            <BusinessAnalytics />
          </div>
        )}
      </main>

      {/* Floating Demo Helper Button for College Presentation */}
      <div className="fixed bottom-5 right-5 z-50">
        <button
          onClick={() => setShowDemoModal(true)}
          className="px-4 py-2.5 rounded-full glass-panel border border-brand-500/40 text-brand-300 hover:text-white font-bold text-xs shadow-2xl flex items-center gap-2 hover:scale-105 transition-transform"
        >
          <Sparkles className="w-4 h-4 text-brand-400 animate-spin" style={{ animationDuration: '6s' }} />
          College Demo &amp; MySQL Guide
        </button>
      </div>

      {/* College Presentation Quick Reference Modal */}
      {showDemoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl rounded-3xl glass-panel border border-brand-500/40 p-6 sm:p-8 shadow-2xl space-y-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-white/10 pb-4">
              <div>
                <span className="text-[10px] font-mono uppercase text-brand-400 font-bold">
                  Presentation Cheatsheet
                </span>
                <h3 className="text-xl font-black text-white mt-0.5">
                  How to Demonstrate QLESS to Professors
                </h3>
              </div>
              <button
                onClick={() => setShowDemoModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-300">
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                <p className="font-bold text-white text-sm">
                  1. Live Real-Time Multi-Screen Interaction
                </p>
                <p>
                  Open two browser tabs side-by-side:
                  <br />• <strong>Tab 1</strong>: Open <strong>Live Token Pass</strong> (Customer)
                  <br />• <strong>Tab 2</strong>: Open <strong>Staff Station</strong> (Staff)
                  <br />Click <strong>CALL NEXT TOKEN</strong> on Tab 2. You will instantly hear the <strong>audio chime</strong> and see Tab 1 update to <strong>"YOU ARE BEING CALLED"</strong> in &lt;50ms via WebSockets!
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                <p className="font-bold text-white text-sm flex items-center gap-2">
                  <Database className="w-4 h-4 text-brand-400" />
                  2. MySQL Workbench Verification Queries
                </p>
                <p>
                  Open MySQL Workbench, run this query to show live queue analytics:
                </p>
                <pre className="p-2.5 rounded-xl bg-dark-950 font-mono text-[11px] text-emerald-400 border border-white/10 overflow-x-auto">
{`USE qless_db;
SELECT organization_name, service_name, waiting_count, estimated_wait_minutes
FROM v_live_queue_metrics;`}
                </pre>
                <p>
                  And to show the startup commission revenue split:
                </p>
                <pre className="p-2.5 rounded-xl bg-dark-950 font-mono text-[11px] text-brand-400 border border-white/10 overflow-x-auto">
{`SELECT * FROM v_financial_commission_summary;`}
                </pre>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                <p className="font-bold text-white text-sm">
                  3. Key Architectural Strengths to Mention
                </p>
                <ul className="list-disc list-inside space-y-1 text-slate-400">
                  <li><strong>Universal Engine</strong>: Works for Hospitals, Cafes, Temples, Banks, Salons without hardcoded logic.</li>
                  <li><strong>Data Principle</strong>: Maps provide location/distances; QLESS provides verified live queue telemetry.</li>
                  <li><strong>Smart Departure Advisor</strong>: Calculates when safe to leave the premises and alerts user when 2nd in line.</li>
                </ul>
              </div>
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setShowDemoModal(false)}
                className="px-5 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs"
              >
                Got It, Ready to Demo!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-white/10 py-6 px-4 text-center text-xs text-slate-500">
        <p>QLESS Universal Real-Time Queue Infrastructure Platform • Production-Ready Startup MVP</p>
      </footer>
    </div>
  );
};

export const App: React.FC = () => (
  <AccountProvider>
    <AppInner />
  </AccountProvider>
);
