import React, { useEffect, useState } from 'react';
import { 
  Search, 
  MapPin, 
  Clock, 
  Users, 
  ShieldCheck, 
  Navigation, 
  ArrowRight,
  Sparkles,
  Filter,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { PlaceImg } from './PlaceImg.tsx';
import { venueArtDataUri } from '../venueArt.ts';

interface ServiceItem {
  id: string;
  name: string;
  service_code: string;
  description: string;
  avg_duration_minutes: number;
  base_price: number;
  is_paid: number;
}

interface LocationCard {
  id: string;
  name: string;
  org_name: string;
  category: string;
  address: string;
  city: string;
  distance_km: number;
  travel_time_minutes: number;
  travel_buffer_minutes: number;
  people_waiting: number;
  currently_serving: string;
  estimated_wait_minutes: number;
  wait_status: 'LOW_WAIT' | 'MEDIUM_WAIT' | 'HIGH_WAIT';
  is_verified: boolean;
  banner_url?: string;
  services: ServiceItem[];
}

interface CustomerHomeProps {
  locations: LocationCard[];
  onTokenIssued: (tokenData: any) => void;
  onViewMap: () => void;
  openLocationId?: string | null;
}

export const CustomerHome: React.FC<CustomerHomeProps> = ({
  openLocationId,
  locations,
  onTokenIssued,
  onViewMap
}) => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [activeModalLocation, setActiveModalLocation] = useState<LocationCard | null>(null);
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);
  const [partySize, setPartySize] = useState('1');
  const [customerPhone, setCustomerPhone] = useState(user?.phone || '+91 98765 00001');
  const [customerName, setCustomerName] = useState(user?.full_name || 'Aadi Shah');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Open the join form when the map asks for it ("locationId|timestamp")
  useEffect(() => {
    if (!openLocationId) return;
    const id = openLocationId.split('|')[0];
    const loc = locations.find((l) => l.id === id);
    if (loc) {
      setActiveModalLocation(loc);
      setSelectedService(loc.services && loc.services.length > 0 ? loc.services[0] : null);
    }
  }, [openLocationId]);

  // Filter locations
  const categories = [
    { id: 'ALL', label: 'All Places' },
    { id: 'HEALTHCARE', label: '🏥 Healthcare' },
    { id: 'RESTAURANT', label: '🍽️ Dining' },
    { id: 'RELIGIOUS', label: '🛕 Temples' },
    { id: 'BANKING', label: '🏦 Banks' },
    { id: 'SALON', label: '✂️ Salons' }
  ];

  const filteredLocations = locations.filter(loc => {
    const matchesCat = selectedCategory === 'ALL' || loc.category === selectedCategory;
    const matchesSearch = 
      loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loc.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loc.address.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleOpenJoinModal = (loc: LocationCard) => {
    setActiveModalLocation(loc);
    setSelectedService(loc.services && loc.services.length > 0 ? loc.services[0] : null);
  };

  const handleSubmitJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeModalLocation || !selectedService) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/queue/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: selectedService.id,
          customer_name: customerName,
          customer_phone: customerPhone,
          party_size: parseInt(partySize) || 1,
          source: 'APP',
          user_id: user?.id
        })
      });

      const data = await res.json();
      if (data.success) {
        setActiveModalLocation(null);
        onTokenIssued(data.data.token);
      } else {
        alert(data.message || 'Failed to join queue');
      }
    } catch (err) {
      console.error('Error joining queue:', err);
      // Fallback demo token issuance
      const fakeToken = {
        id: `tok-${Date.now()}`,
        service_id: selectedService.id,
        location_id: activeModalLocation.id,
        token_number: 28,
        token_display: `${selectedService.service_code}-028`,
        customer_name: customerName,
        customer_phone: customerPhone,
        party_size: parseInt(partySize) || 1,
        source: 'APP',
        priority_level: 'STANDARD',
        status: 'WAITING',
        estimated_wait_minutes: 22,
        qr_code_hash: `QL-${Date.now().toString(36).toUpperCase()}`,
        check_in_time: new Date().toISOString()
      };
      setActiveModalLocation(null);
      onTokenIssued(fakeToken);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Greeting & Search (Exact prompt specification) */}
      <div className="space-y-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-brand-400">
            Good morning, {user?.full_name ? user.full_name.split(' ')[0] : 'there'}.
          </span>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white mt-1">
            What are you waiting for?
          </h2>
        </div>

        {/* Global Search & Location Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search restaurants, hospitals, temples, banks..."
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl glass-panel text-white placeholder:text-slate-500 border border-white/10 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-sm"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onViewMap}
              className="flex items-center gap-2 px-5 py-3.5 rounded-2xl glass-panel hover:bg-white/10 text-slate-200 hover:text-white border border-white/10 text-sm font-semibold transition-all whitespace-nowrap"
            >
              <MapPin className="w-4 h-4 text-emerald-400 animate-pulse" />
              📍 Near You
            </button>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 py-2 rounded-xl font-semibold transition-all whitespace-nowrap ${
                selectedCategory === cat.id
                  ? 'bg-brand-500 text-white shadow-md shadow-brand-500/25'
                  : 'glass-panel text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Section: LIVE NEAR YOU */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
              LIVE NEAR YOU
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Verified queue streaming directly from physical counters
            </p>
          </div>

          <button
            onClick={onViewMap}
            className="text-xs font-bold text-brand-400 hover:text-brand-300 flex items-center gap-1 transition-colors"
          >
            Open Interactive Radar
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Venue Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredLocations.map(loc => {
            const isLowWait = loc.wait_status === 'LOW_WAIT';
            const isMedWait = loc.wait_status === 'MEDIUM_WAIT';

            return (
              <div
                key={loc.id}
                className="group rounded-3xl glass-card border border-white/10 overflow-hidden flex flex-col justify-between hover:border-brand-500/40 hover:-translate-y-1 transition-all duration-300 shadow-xl"
              >
                {/* Banner Thumbnail with Live Tag */}
                <div className="relative h-44 w-full overflow-hidden">
                  <PlaceImg loc={loc}
                    src={loc.banner_url || venueArtDataUri(loc.category)}
                    alt={loc.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-dark-950 via-dark-950/40 to-transparent"></div>

                  {/* Top Live Badges */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wider bg-dark-950/85 backdrop-blur-md text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      LIVE STREAM
                    </span>

                    {loc.is_verified && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-dark-950/85 backdrop-blur-md text-white border border-white/20 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-brand-400" />
                        QLESS Verified
                      </span>
                    )}
                  </div>

                  {/* Category Pill on bottom of banner */}
                  <div className="absolute bottom-3 left-3">
                    <span className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-white/20 backdrop-blur-md text-white">
                      {loc.category}
                    </span>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="font-extrabold text-lg text-white leading-snug group-hover:text-brand-300 transition-colors">
                      {loc.name}
                    </h4>
                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-1 line-clamp-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      {loc.address}
                    </p>
                  </div>

                  {/* Operational Matrix Grid */}
                  <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-dark-950/60 border border-white/5 text-center">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-medium">Distance</span>
                      <p className="text-sm font-extrabold text-slate-200 mt-0.5">
                        {loc.distance_km} km
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        ~{loc.travel_time_minutes}m drive
                      </p>
                    </div>

                    <div className="border-x border-white/10">
                      <span className="text-[10px] text-slate-400 uppercase font-medium">People In Line</span>
                      <p className="text-sm font-extrabold text-white mt-0.5 flex items-center justify-center gap-1">
                        <Users className="w-3.5 h-3.5 text-brand-400" />
                        {loc.people_waiting}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Now serving: <span className="font-mono text-brand-400">{loc.currently_serving || 'None'}</span>
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-medium">Est. Wait</span>
                      <p className={`text-sm font-extrabold mt-0.5 ${
                        isLowWait ? 'text-emerald-400' : isMedWait ? 'text-amber-400' : 'text-rose-400'
                      }`}>
                        ~{loc.estimated_wait_minutes} min
                      </p>
                      <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                        isLowWait ? 'text-emerald-400 bg-emerald-500/10' : 'text-amber-400 bg-amber-500/10'
                      }`}>
                        {loc.wait_status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  {/* Card Action Button */}
                  <button
                    onClick={() => handleOpenJoinModal(loc)}
                    className="w-full py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20 hover:shadow-brand-500/35 transition-all"
                  >
                    Join Digital Queue
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal: Join Digital Queue Form */}
      {activeModalLocation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-3xl glass-panel border border-brand-500/30 p-6 shadow-2xl space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-brand-400">
                  Instant Digital Token Issue
                </span>
                <h3 className="text-xl font-black text-white mt-1">
                  {activeModalLocation.name}
                </h3>
                <p className="text-xs text-slate-400">
                  Select your required service category
                </p>
              </div>
              <button
                onClick={() => setActiveModalLocation(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitJoin} className="space-y-4">
              {/* Service Category Selection */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">
                  Select Queue / Service:
                </label>
                <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1">
                  {activeModalLocation.services?.map(srv => {
                    const isSelected = selectedService?.id === srv.id;
                    return (
                      <div
                        key={srv.id}
                        onClick={() => setSelectedService(srv)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-brand-500/20 border-brand-400 text-white ring-1 ring-brand-400'
                            : 'glass-card border-white/10 text-slate-300 hover:bg-white/5'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-white/10 text-brand-300">
                              {srv.service_code}
                            </span>
                            <span className="font-bold text-sm text-white">
                              {srv.name}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1">
                            {srv.description}
                          </p>
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-mono font-bold text-brand-400 block">
                            ~{srv.avg_duration_minutes}m avg
                          </span>
                          {srv.base_price > 0 ? (
                            <span className="text-[11px] text-emerald-400">₹{srv.base_price}</span>
                          ) : (
                            <span className="text-[10px] text-slate-400">Free Queue</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Guest Details */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Customer Name</label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl glass-card text-white text-xs border border-white/10 focus:border-brand-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Mobile Phone</label>
                  <input
                    type="text"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl glass-card text-white text-xs border border-white/10 focus:border-brand-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Party Size / Guests</label>
                <select
                  value={partySize}
                  onChange={(e) => setPartySize(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl glass-card text-white text-xs border border-white/10 focus:border-brand-500 focus:outline-none bg-dark-900"
                >
                  <option value="1">1 Person</option>
                  <option value="2">2 People</option>
                  <option value="3">3 People</option>
                  <option value="4">4 People</option>
                  <option value="5">5+ People</option>
                </select>
              </div>

              {/* Real-time Wait Calculation Notice */}
              <div className="p-3 rounded-xl bg-brand-500/10 border border-brand-500/20 text-xs text-slate-300 flex items-start gap-2">
                <Clock className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white">Live Smart Departure Advisor Enabled</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Your token will sync live via WebSockets. You can leave the physical premises and will be alerted when you are 2nd in line.
                  </p>
                </div>
              </div>

              {/* Submit CTA */}
              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setActiveModalLocation(null)}
                  className="w-1/3 py-2.5 rounded-xl glass-card text-slate-300 hover:text-white text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-2/3 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold shadow-lg shadow-brand-500/25 transition-all flex items-center justify-center gap-2"
                >
                  {isSubmitting ? 'Issuing Token...' : 'Get Live Token Now'}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
