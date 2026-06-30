import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Info, CheckCircle } from 'lucide-react';

const zoneShortNames = {
  "Kannoth–Court Corridor": "Court Corridor",
  "Punnol–Thiruvangad Seafront": "Seafront",
  "Illikkunnu–Nittoor Uplands": "North Uplands",
  "Chirakkara–Morakunnu Hills": "Chirakkara Hills",
  "Kodiyeri–Madapeedika South": "South Highway",
  "Thiruvangad–Overbury's Heritage Quarter": "Heritage Quarter"
};

/**
 * LiveTicker - High-performance infinite scrolling marquee listing operations status.
 */
export default function LiveTicker({ incidents = [], floodRisk = false, theme }) {
  const firstTickerRunRef = useRef(null);
  const [marqueeDuration, setMarqueeDuration] = useState(50);
  // Filter active (open or escalated) incidents
  const activeIncidents = useMemo(() => {
    return incidents.filter(i => i.status === "open" || i.status === "escalated");
  }, [incidents]);

  // Determine status badge bg and label based on active list
  const badgeInfo = useMemo(() => {
    const hasEscalated = activeIncidents.some(i => i.status === "escalated");
    if (hasEscalated) {
      return { bg: "bg-red-500 text-white shadow-[0_0_12px_rgba(239,68,68,0.4)] border-red-400", label: "INCIDENT ACTIVE", icon: AlertTriangle };
    }
    if (activeIncidents.length > 0) {
      return { bg: "bg-amber-500 text-black shadow-[0_0_12px_rgba(245,158,11,0.4)] border-amber-400", label: "MONITORING", icon: Info };
    }
    return { bg: "bg-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.4)] border-emerald-400", label: "ALL CLEAR", icon: CheckCircle };
  }, [activeIncidents]);

  // Map and assemble ticker messages
  const tickerItems = useMemo(() => {
    const messages = activeIncidents.map(i => {
      const shortName = zoneShortNames[i.zone] || i.zone || "Unknown Zone";
      const typeStr = i.type ? i.type.toUpperCase() : "CIVIC ISSUE";
      return `⚠ [${typeStr}] @ ${shortName} (Ward ${i.ward}): ${i.description}`;
    });

    if (floodRisk) {
      messages.push("🌧 FLOOD RISK: Heavy rain forecast — elevated drainage alert for Seafront zone");
    }

    if (messages.length === 0) {
      messages.push("✓ ALL SYSTEMS STABLE — Thalassery Municipality operational. No active incidents.");
    }

    return messages;
  }, [activeIncidents, floodRisk]);

  const isLight = theme === 'light';
  const Icon = badgeInfo.icon;
  
  // Format joint string with separator
  const tickerText = tickerItems.join("   •   ");

  // Base duration on rendered width so added incidents do not increase pixel speed.
  useEffect(() => {
    const tickerRun = firstTickerRunRef.current;
    if (!tickerRun) return undefined;

    const updateDuration = () => {
      const travelDistance = tickerRun.getBoundingClientRect().width + 48;
      setMarqueeDuration(Math.max(50, travelDistance / 24));
    };

    updateDuration();
    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(updateDuration)
      : null;
    resizeObserver?.observe(tickerRun);
    document.fonts?.ready.then(updateDuration);

    return () => resizeObserver?.disconnect();
  }, [tickerText]);

  return (
    <div 
      className={`w-full h-10 overflow-hidden flex items-center px-4 font-mono text-sm select-none relative z-20 transition-all duration-300 ${
        isLight 
          ? 'bg-gradient-to-r from-slate-100 via-white to-slate-100 border-b border-slate-200/80 shadow-sm'
          : 'bg-gradient-to-r from-[#0a0c10] via-[#121622] to-[#0a0c10] border-b border-[#1e2333]/70 shadow-[0_2px_15px_rgba(0,0,0,0.5)]'
      }`}
      title="Hover to pause"
    >
      {/* Subtle tactical corner hazard warning block */}
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 transition-colors duration-300 ${isLight ? 'bg-amber-400' : 'bg-amber-500'}`}></div>

      {/* Fixed Status Badge */}
      <AnimatePresence mode="wait">
        <motion.div
          key={badgeInfo.label}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.2 }}
          className={`${badgeInfo.bg} flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-md mr-4 flex-shrink-0 tracking-widest font-mono border z-10`}
        >
          <Icon size={10} className={badgeInfo.bg.includes('text-black') ? 'text-black' : 'text-white'} />
          <span>{badgeInfo.label}</span>
        </motion.div>
      </AnimatePresence>

      {/* Infinite Scrolling Ticker (Using CSS Translate3D Marquee) */}
      <div className="flex-1 overflow-hidden h-full flex items-center relative [mask-image:linear-gradient(to_right,transparent,black_20px,black_calc(100%-20px),transparent)]">
        <div
          className="animate-marquee-scroller flex items-center gap-12 py-1"
          style={{ '--marquee-duration': `${marqueeDuration}s` }}
        >
          {/* First run */}
          <div ref={firstTickerRunRef} className={`flex items-center gap-12 shrink-0 whitespace-nowrap text-[13px] font-mono tracking-wide ${
            isLight ? 'text-slate-800 font-bold' : 'text-[#e2e8f0]'
          }`}>
            <span>{tickerText}</span>
          </div>
          {/* Second duplicate run for seamless loop */}
          <div className={`flex items-center gap-12 shrink-0 whitespace-nowrap text-[13px] font-mono tracking-wide ${
            isLight ? 'text-slate-800 font-bold' : 'text-[#e2e8f0]'
          }`}>
            <span>{tickerText}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
