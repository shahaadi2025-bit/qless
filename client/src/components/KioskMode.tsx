import React, { useState } from 'react';
import QRCode from 'qrcode';
import { 
  Tv, 
  Printer, 
  QrCode, 
  Smartphone, 
  Sparkles, 
  Users, 
  Clock, 
  CheckCircle, 
  RotateCcw,
  ArrowRight
} from 'lucide-react';
import { playQueueChime } from './AudioChime.ts';

export const KioskMode: React.FC = () => {
  const [step, setStep] = useState<'SELECT_SERVICE' | 'ENTER_DETAILS' | 'PRINT_TOKEN'>('SELECT_SERVICE');
  const [selectedLocation, setSelectedLocation] = useState('loc-hosp-01');
  const [selectedService, setSelectedService] = useState<any>(null);
  const [partySize, setPartySize] = useState(1);
  const [customerName, setCustomerName] = useState('');
  const [issuedToken, setIssuedToken] = useState<any>(null);
  const [qrUrl, setQrUrl] = useState('');
  const [isDispensing, setIsDispensing] = useState(false);

  // Available services for the kiosk
  const services = [
    { id: 'srv-hosp-opd', name: 'General Medicine OPD', code: 'OPD', time: '12 min', fee: '₹ 500' },
    { id: 'srv-hosp-ped', name: 'Pediatric Care', code: 'PED', time: '15 min', fee: '₹ 600' },
    { id: 'srv-hosp-emg', name: 'Emergency Walk-in Triage', code: 'EMG', time: 'Immediate', fee: 'Free' },
    { id: 'srv-rest-t2', name: 'Table for 2 Guests', code: 'T2', time: '20 min', fee: 'Free' },
    { id: 'srv-temp-vip', name: 'Special Sugam VIP Darshan', code: 'VIP', time: '10 min', fee: '₹ 300' }
  ];

  const handleSelectService = (srv: any) => {
    setSelectedService(srv);
    setCustomerName('Walk-in Guest');
    setStep('ENTER_DETAILS');
  };

  const handleIssueToken = async () => {
    setIsDispensing(true);
    try {
      const res = await fetch('/api/queue/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: selectedService.id,
          customer_name: customerName || 'Walk-in Guest',
          customer_phone: '+91 90000 00000',
          party_size: partySize,
          source: 'KIOSK'
        })
      });
      const data = await res.json();
      const token = data.success ? data.data.token : {
        id: `kiosk-${Date.now()}`,
        token_display: `${selectedService.code}-0${Math.floor(Math.random() * 80 + 10)}`,
        customer_name: customerName || 'Walk-in Guest',
        party_size: partySize,
        qr_code_hash: `QL-KIOSK-${Date.now()}`,
        estimated_wait_minutes: 20
      };

      setIssuedToken(token);

      // Generate QR Code
      const url = await QRCode.toDataURL(token.qr_code_hash, { width: 220, margin: 2 });
      setQrUrl(url);
      playQueueChime(`Walk-in ticket dispensed for ${token.token_display}.`);
      setStep('PRINT_TOKEN');
    } catch (err) {
      console.error(err);
    } finally {
      setIsDispensing(false);
    }
  };

  const handleReset = () => {
    setStep('SELECT_SERVICE');
    setSelectedService(null);
    setIssuedToken(null);
    setPartySize(1);
    setCustomerName('');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-4">
      {/* Kiosk Mode Device Frame / Touch Screen Simulator */}
      <div className="rounded-3xl glass-panel border-2 border-brand-500/40 p-6 sm:p-10 shadow-2xl relative overflow-hidden bg-gradient-to-b from-[#0e1626] to-[#080d16]">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-500 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-brand-500/30">
              Q
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Self-Service Ticket Kiosk
              </h2>
              <p className="text-xs text-brand-400 font-medium">
                Tap the screen to join the digital queue
              </p>
            </div>
          </div>

          <div className="px-3 py-1 rounded-full bg-white/10 text-[11px] font-mono text-slate-300">
            KIOSK STATION #01
          </div>
        </div>

        {/* Step 1: Select Service */}
        {step === 'SELECT_SERVICE' && (
          <div className="py-6 space-y-5">
            <h3 className="text-lg font-bold text-white text-center">
              Please Select Your Service:
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {services.map(srv => (
                <button
                  key={srv.id}
                  onClick={() => handleSelectService(srv)}
                  className="p-5 rounded-2xl glass-card border border-white/10 hover:border-brand-500 hover:bg-brand-500/10 text-left transition-all group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-brand-500/20 text-brand-300 border border-brand-500/30">
                        {srv.code}
                      </span>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> ~{srv.time}
                      </span>
                    </div>
                    <h4 className="font-bold text-base text-white group-hover:text-brand-300">
                      {srv.name}
                    </h4>
                  </div>

                  <div className="mt-4 pt-2 border-t border-white/10 flex items-center justify-between text-xs">
                    <span className="text-emerald-400 font-bold">{srv.fee}</span>
                    <span className="font-bold text-slate-300 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      Select <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Enter Details */}
        {step === 'ENTER_DETAILS' && selectedService && (
          <div className="py-6 space-y-6 max-w-md mx-auto">
            <div className="text-center space-y-1">
              <span className="text-xs font-mono text-brand-400 uppercase">Selected Service</span>
              <h3 className="text-xl font-black text-white">{selectedService.name}</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Your Name (Optional for Display)
                </label>
                <input
                  type="text"
                  placeholder="e.g. John D."
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl glass-card text-white text-sm border border-white/10 focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Number of Persons / Party Size
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4].map(num => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setPartySize(num)}
                      className={`py-3 rounded-xl font-bold text-base transition-all ${
                        partySize === num
                          ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/30'
                          : 'glass-card text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      {num} {num === 1 ? 'Person' : 'People'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-3">
              <button
                onClick={() => setStep('SELECT_SERVICE')}
                className="w-1/3 py-3 rounded-xl glass-card text-slate-300 hover:text-white font-bold text-xs"
              >
                Back
              </button>
              <button
                onClick={handleIssueToken}
                disabled={isDispensing}
                className="w-2/3 py-3.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-extrabold text-sm shadow-xl shadow-brand-500/30 flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" />
                {isDispensing ? 'Dispensing...' : 'Print Physical Token'}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Print / Dispensed Ticket View */}
        {step === 'PRINT_TOKEN' && issuedToken && (
          <div className="py-6 space-y-6 text-center animate-in zoom-in-95 duration-200">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold">
              <CheckCircle className="w-4 h-4" /> TOKEN DISPENSED SUCCESSFULLY
            </div>

            {/* Thermal Ticket Replica Card */}
            <div className="max-w-xs mx-auto p-6 rounded-3xl bg-white text-slate-900 shadow-2xl border-4 border-slate-200 space-y-3">
              <div className="border-b border-dashed border-slate-300 pb-3">
                <span className="font-extrabold text-sm tracking-wider uppercase text-slate-800">
                  QLESS TICKET
                </span>
                <p className="text-[11px] text-slate-500">
                  {selectedService?.name}
                </p>
              </div>

              {/* Big Token Number */}
              <div className="py-2">
                <span className="text-5xl font-black font-mono tracking-tight text-slate-950">
                  {issuedToken.token_display}
                </span>
              </div>

              <div className="space-y-1 text-xs text-slate-600">
                <p>Guest: <strong>{issuedToken.customer_name}</strong> ({issuedToken.party_size}p)</p>
                <p>Est. Wait: <strong>~{issuedToken.estimated_wait_minutes || 15} minutes</strong></p>
              </div>

              {/* QR Code on Physical Ticket */}
              <div className="pt-2 border-t border-dashed border-slate-300 flex flex-col items-center">
                {qrUrl && <img src={qrUrl} alt="Ticket QR" className="w-32 h-32" />}
                <p className="text-[10px] text-slate-500 mt-1 font-semibold flex items-center gap-1">
                  <Smartphone className="w-3 h-3 text-brand-600" />
                  Scan with Phone Camera to Track Live
                </p>
              </div>
            </div>

            <div className="pt-4">
              <button
                onClick={handleReset}
                className="px-6 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs shadow-lg flex items-center gap-2 mx-auto"
              >
                <RotateCcw className="w-4 h-4" />
                Done • Next Customer
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
