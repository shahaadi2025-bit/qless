import React, { useEffect, useRef, useState } from 'react';
import { 
  ArrowRight, 
  Clock, 
  Users, 
  MapPin, 
  Sparkles, 
  Building2, 
  Utensils, 
  HeartPulse, 
  Landmark, 
  Scissors, 
  GraduationCap 
} from 'lucide-react';

interface HeroSectionProps {
  onFindQueue: () => void;
  onForBusinesses: () => void;
  onSelectSampleVenue?: (venueName: string) => void;
}

interface NodeLocation {
  id: string;
  name: string;
  category: string;
  icon: any;
  x: number; // percentage
  y: number; // percentage
  waitingCount: number;
  estWait: string;
  color: string;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onFindQueue,
  onForBusinesses,
  onSelectSampleVenue
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [activeNode, setActiveNode] = useState<NodeLocation | null>(null);

  // Nodes representing universal city queue network
  const nodes: NodeLocation[] = [
    {
      id: 'cafe',
      name: 'Café Milano & Bistro',
      category: 'Dining',
      icon: Utensils,
      x: 22,
      y: 35,
      waitingCount: 12,
      estWait: '18–24 min',
      color: '#EA580C'
    },
    {
      id: 'clinic',
      name: 'City Care Health Clinic',
      category: 'Healthcare',
      icon: HeartPulse,
      x: 68,
      y: 28,
      waitingCount: 4,
      estWait: '7–12 min',
      color: '#0284C7'
    },
    {
      id: 'temple',
      name: 'Kashi Heritage Mandir',
      category: 'Spiritual',
      icon: Sparkles,
      x: 82,
      y: 65,
      waitingCount: 65,
      estWait: '35–45 min',
      color: '#D97706'
    },
    {
      id: 'bank',
      name: 'Apex National Bank',
      category: 'Banking',
      icon: Landmark,
      x: 35,
      y: 72,
      waitingCount: 6,
      estWait: '8–14 min',
      color: '#2563EB'
    },
    {
      id: 'salon',
      name: 'Luxe & Glow Studio',
      category: 'Personal Care',
      icon: Scissors,
      x: 52,
      y: 50,
      waitingCount: 3,
      estWait: '15–20 min',
      color: '#DB2777'
    },
    {
      id: 'college',
      name: 'Metropolitan University',
      category: 'Admissions Desk',
      icon: GraduationCap,
      x: 15,
      y: 68,
      waitingCount: 19,
      estWait: '25–30 min',
      color: '#8B5CF6'
    }
  ];

  // Subtle animated canvas city network lines
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || 1000);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 600);

    const handleResize = () => {
      if (!canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };
    window.addEventListener('resize', handleResize);

    // Particle queue packets traveling across network edges
    const particles = Array.from({ length: 28 }).map(() => {
      const fromIdx = Math.floor(Math.random() * nodes.length);
      let toIdx = Math.floor(Math.random() * nodes.length);
      while (toIdx === fromIdx) toIdx = Math.floor(Math.random() * nodes.length);

      return {
        from: nodes[fromIdx],
        to: nodes[toIdx],
        progress: Math.random(),
        speed: 0.002 + Math.random() * 0.003,
        size: 1.5 + Math.random() * 2
      };
    });

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw subtle connection grid lines
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const n1 = nodes[i];
          const n2 = nodes[j];
          const x1 = (n1.x / 100) * width;
          const y1 = (n1.y / 100) * height;
          const x2 = (n2.x / 100) * width;
          const y2 = (n2.y / 100) * height;

          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      // Draw moving digital tokens
      particles.forEach(p => {
        p.progress += p.speed;
        if (p.progress >= 1) {
          p.progress = 0;
          p.from = p.to;
          let newTo = Math.floor(Math.random() * nodes.length);
          while (nodes[newTo].id === p.from.id) newTo = Math.floor(Math.random() * nodes.length);
          p.to = nodes[newTo];
        }

        const startX = (p.from.x / 100) * width;
        const startY = (p.from.y / 100) * height;
        const endX = (p.to.x / 100) * width;
        const endY = (p.to.y / 100) * height;

        const curX = startX + (endX - startX) * p.progress;
        const curY = startY + (endY - startY) * p.progress;

        ctx.beginPath();
        ctx.arc(curX, curY, p.size, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(34, 197, 94, 0.55)';
        ctx.shadowColor = 'rgba(34, 197, 94, 0.8)';
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <div className="relative min-h-[86vh] flex flex-col justify-center items-center overflow-hidden px-4 pt-8 pb-16">
      {/* Background Animated Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none z-0 opacity-80"
      />

      {/* Subtle Radial Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-brand-500/10 rounded-full blur-[140px] pointer-events-none -z-10" />

      {/* Floating Interactive Network Nodes */}
      <div className="absolute inset-0 max-w-7xl mx-auto pointer-events-none z-10 hidden sm:block">
        {nodes.map(node => {
          const Icon = node.icon;
          const isHovered = activeNode?.id === node.id;

          return (
            <div
              key={node.id}
              style={{ left: `${node.x}%`, top: `${node.y}%` }}
              className="absolute pointer-events-auto transform -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
              onMouseEnter={() => setActiveNode(node)}
              onMouseLeave={() => setActiveNode(null)}
              onClick={() => {
                if (onSelectSampleVenue) onSelectSampleVenue(node.name);
                onFindQueue();
              }}
            >
              {/* Pulse Beacon */}
              <div 
                className="w-9 h-9 rounded-full flex items-center justify-center border border-white/20 transition-all duration-300 backdrop-blur-md group-hover:scale-125"
                style={{ backgroundColor: `${node.color}25`, borderColor: node.color }}
              >
                <Icon className="w-4 h-4 text-white" />
                <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 beacon-live" />
              </div>

              {/* Node Title Pill */}
              <div className="mt-1.5 px-2 py-0.5 rounded-full bg-dark-900/90 border border-white/10 text-[10px] font-semibold text-slate-300 whitespace-nowrap shadow-md text-center">
                {node.name.split(' ')[0]}
              </div>

              {/* Interactive Live Hover Card (From Prompt Requirements) */}
              {isHovered && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-56 p-3.5 rounded-2xl glass-panel border border-brand-500/30 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 pointer-events-none">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      LIVE
                    </span>
                    <span className="text-[11px] text-slate-400">{node.category}</span>
                  </div>

                  <h4 className="font-bold text-sm text-white leading-tight mb-2">
                    {node.name}
                  </h4>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10 text-xs">
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider">Waiting</p>
                      <p className="font-extrabold text-white flex items-center gap-1 mt-0.5">
                        <Users className="w-3 h-3 text-brand-400" />
                        {node.waitingCount} people
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider">Estimated</p>
                      <p className="font-extrabold text-brand-400 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        {node.estWait}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Hero Content */}
      <div className="relative z-20 max-w-4xl mx-auto text-center space-y-6">
        {/* Verification Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass-panel border border-brand-500/30 shadow-lg">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          <span className="text-xs font-semibold text-slate-200">
            Universal Real-Time Physical & Digital Queue Engine
          </span>
        </div>

        {/* Hero Headings (Exact prompt specs) */}
        <div className="space-y-1">
          <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-tight text-white leading-[1.05]">
            STOP WAITING.
          </h1>
          <h2 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-brand-400 via-emerald-300 to-teal-200 leading-[1.1]">
            START MOVING.
          </h2>
        </div>

        {/* Subheading (Exact prompt specs) */}
        <p className="text-lg sm:text-xl text-slate-300 font-normal max-w-2xl mx-auto leading-relaxed">
          Join queues digitally, track your place in real time, and arrive when it’s actually your turn.
        </p>

        {/* Call to Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-4">
          <button
            onClick={onFindQueue}
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-base flex items-center justify-center gap-2.5 shadow-xl shadow-brand-500/25 hover:shadow-brand-500/40 hover:-translate-y-0.5 transition-all"
          >
            Find a Queue
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={onForBusinesses}
            className="w-full sm:w-auto px-7 py-4 rounded-xl glass-panel hover:bg-white/10 text-slate-200 hover:text-white font-semibold text-base border border-white/15 transition-all flex items-center justify-center gap-2"
          >
            <Building2 className="w-4 h-4 text-slate-400" />
            For Businesses
          </button>
        </div>

        {/* Live Network Stats Strip */}
        <div className="pt-10 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto">
          <div className="p-3 rounded-xl glass-card border border-white/5 text-left">
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Zero Wait Line</p>
            <p className="text-xl font-bold text-white mt-0.5">100% Digital</p>
            <p className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span> Leave the crowd
            </p>
          </div>

          <div className="p-3 rounded-xl glass-card border border-white/5 text-left">
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Sync Latency</p>
            <p className="text-xl font-bold text-white mt-0.5">&lt; 50ms</p>
            <p className="text-[10px] text-slate-400 mt-1">Socket.io real-time</p>
          </div>

          <div className="p-3 rounded-xl glass-card border border-white/5 text-left">
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Supported</p>
            <p className="text-xl font-bold text-white mt-0.5">Any Queue</p>
            <p className="text-[10px] text-slate-400 mt-1">Hospitals, Cafes, Banks</p>
          </div>

          <div className="p-3 rounded-xl glass-card border border-white/5 text-left">
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Database</p>
            <p className="text-xl font-bold text-emerald-400 mt-0.5">MySQL 8.0</p>
            <p className="text-[10px] text-slate-400 mt-1">Workbench Ready</p>
          </div>
        </div>
      </div>
    </div>
  );
};
