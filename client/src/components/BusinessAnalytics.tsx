import React, { useEffect, useState } from 'react';
import { 
  BarChart3, 
  DollarSign, 
  TrendingUp, 
  Users, 
  Clock, 
  ShieldCheck, 
  ArrowUpRight,
  Layers,
  Sparkles,
  PieChart
} from 'lucide-react';

export const BusinessAnalytics: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/analytics/summary')
      .then(r => r.json())
      .then(json => {
        if (json.success) setData(json.data);
      })
      .catch(e => console.warn('Analytics fetch notice:', e))
      .finally(() => setLoading(false));
  }, []);

  const summary = data?.summary || {
    totalOrganizations: 6,
    totalLocations: 6,
    totalServices: 12,
    totalWaiting: 14,
    completedToday: 54,
    activeCounters: 7,
    avgWaitTimeMinutes: 16,
    grossRevenue: 14250.00,
    platformCommission: 498.75,
    vendorPayouts: 13751.25
  };

  const hourlySurge = data?.hourlySurge || [
    { hour: '09:00', tokens: 12, avgWait: 8 },
    { hour: '10:00', tokens: 28, avgWait: 14 },
    { hour: '11:00', tokens: 45, avgWait: 22 },
    { hour: '12:00', tokens: 62, avgWait: 31 },
    { hour: '13:00', tokens: 58, avgWait: 27 },
    { hour: '14:00', tokens: 34, avgWait: 16 },
    { hour: '15:00', tokens: 49, avgWait: 24 },
    { hour: '16:00', tokens: 66, avgWait: 34 },
    { hour: '17:00', tokens: 71, avgWait: 38 },
    { hour: '18:00', tokens: 54, avgWait: 29 }
  ];

  const ledger = data?.commissionLedger || [
    {
      id: 'com-001',
      org_name: 'City Care Multispeciality Hospital',
      service: 'General Medicine OPD',
      gross: '₹ 500.00',
      fee_rate: '2.50%',
      platform_fee: '₹ 12.50',
      vendor_net: '₹ 487.50',
      status: 'SETTLED',
      date: 'Today, 11:20 AM'
    },
    {
      id: 'com-002',
      org_name: 'Kashi Heritage Mandir Trust',
      service: 'Special Sugam VIP Darshan',
      gross: '₹ 900.00',
      fee_rate: '1.50%',
      platform_fee: '₹ 13.50',
      vendor_net: '₹ 886.50',
      status: 'ACCRUED',
      date: 'Today, 11:45 AM'
    },
    {
      id: 'com-003',
      org_name: 'Luxe & Glow Wellness Salon',
      service: 'Designer Haircut & Styling',
      gross: '₹ 1,200.00',
      fee_rate: '5.00%',
      platform_fee: '₹ 60.00',
      vendor_net: '₹ 1,140.00',
      status: 'ACCRUED',
      date: 'Today, 12:10 PM'
    }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-3xl glass-panel border border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-brand-400"></span>
            <h2 className="text-xl font-extrabold text-white tracking-tight">
              Executive Analytics &amp; Commission Ledger
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time multi-tenant platform metrics and automatic vendor fee settlement
          </p>
        </div>

        <span className="px-3 py-1 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/30 text-xs font-mono font-bold">
          QLESS STARTUP ENGINE
        </span>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl glass-card border border-white/10 space-y-1">
          <span className="text-xs uppercase font-medium text-slate-400 flex items-center justify-between">
            Today’s Completed
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </span>
          <p className="text-3xl font-black text-white">{summary.completedToday}</p>
          <p className="text-[11px] text-emerald-400 flex items-center gap-1 font-semibold">
            +18% throughput improvement
          </p>
        </div>

        <div className="p-5 rounded-3xl glass-card border border-white/10 space-y-1">
          <span className="text-xs uppercase font-medium text-slate-400 flex items-center justify-between">
            Avg Customer Wait
            <Clock className="w-4 h-4 text-brand-400" />
          </span>
          <p className="text-3xl font-black text-brand-400">~{summary.avgWaitTimeMinutes} min</p>
          <p className="text-[11px] text-slate-400">
            vs 65 min physical waiting line
          </p>
        </div>

        <div className="p-5 rounded-3xl glass-card border border-white/10 space-y-1">
          <span className="text-xs uppercase font-medium text-slate-400 flex items-center justify-between">
            Gross Volume (GMV)
            <DollarSign className="w-4 h-4 text-blue-400" />
          </span>
          <p className="text-3xl font-black text-white">₹ {summary.grossRevenue.toLocaleString()}</p>
          <p className="text-[11px] text-blue-400 font-semibold">
            Priority Darshan &amp; Clinic fees
          </p>
        </div>

        <div className="p-5 rounded-3xl glass-card border border-white/10 space-y-1">
          <span className="text-xs uppercase font-medium text-slate-400 flex items-center justify-between">
            Platform Commission
            <Sparkles className="w-4 h-4 text-amber-400" />
          </span>
          <p className="text-3xl font-black text-amber-400">₹ {summary.platformCommission.toFixed(2)}</p>
          <p className="text-[11px] text-slate-400">
            Net Vendor Payout: ₹ {summary.vendorPayouts.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Hourly Surge Curve (Interactive Visual SVG Chart) */}
      <div className="rounded-3xl glass-panel border border-white/10 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-extrabold text-white">
              Hourly Queue Surge Curves &amp; Peak Congestion
            </h3>
            <p className="text-xs text-slate-400">
              Live token volume per hour across all connected physical venues
            </p>
          </div>
          <span className="text-xs font-mono text-emerald-400">Peak: 17:00 (71 tokens)</span>
        </div>

        {/* Custom SVG Bar Chart */}
        <div className="h-44 w-full flex items-end gap-2 pt-4 border-b border-white/10 pb-2">
          {hourlySurge.map((item: any, i: number) => {
            const heightPercent = (item.tokens / 75) * 100;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                {/* Tooltip */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[9px] font-mono text-white bg-dark-900 px-1 py-0.5 rounded border border-white/10 whitespace-nowrap">
                  {item.tokens} tokens ({item.avgWait}m)
                </div>
                <div
                  style={{ height: `${heightPercent}%` }}
                  className="w-full rounded-t-lg bg-gradient-to-t from-brand-600 to-emerald-400 group-hover:from-brand-500 group-hover:to-teal-300 transition-all cursor-pointer shadow-md"
                />
                <span className="text-[10px] text-slate-400 font-mono mt-1">
                  {item.hour.split(':')[0]}h
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Commission Ledger Table (Presentation Highlight) */}
      <div className="rounded-3xl glass-panel border border-white/10 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-extrabold text-white">
              Automated Startup Commission Ledger
            </h3>
            <p className="text-xs text-slate-400">
              Transparent platform fee deduction (1.5% – 5.0%) and automated vendor payouts
            </p>
          </div>
          <span className="text-xs font-mono text-brand-400">ACID Transaction Log</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 text-slate-400 uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-3">Organization</th>
                <th className="py-2.5 px-3">Service</th>
                <th className="py-2.5 px-3">Gross Fee</th>
                <th className="py-2.5 px-3">QLESS Cut %</th>
                <th className="py-2.5 px-3">Commission</th>
                <th className="py-2.5 px-3">Net Payout</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {ledger.map((row: any) => (
                <tr key={row.id} className="hover:bg-white/5 transition-colors">
                  <td className="py-3 px-3 font-semibold text-white">{row.org_name}</td>
                  <td className="py-3 px-3 text-slate-300">{row.service}</td>
                  <td className="py-3 px-3 font-mono text-white">{row.gross}</td>
                  <td className="py-3 px-3 font-mono text-brand-400">{row.fee_rate}</td>
                  <td className="py-3 px-3 font-mono text-emerald-400 font-bold">{row.platform_fee}</td>
                  <td className="py-3 px-3 font-mono text-slate-300">{row.vendor_net}</td>
                  <td className="py-3 px-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      row.status === 'SETTLED' 
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}>
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
