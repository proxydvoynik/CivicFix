import { useMemo } from 'react';

const zoneShortNames = {
  "Kannoth–Court Corridor": "Court Corridor",
  "Punnol–Thiruvangad Seafront": "Seafront",
  "Illikkunnu–Nittoor Uplands": "North Uplands",
  "Chirakkara–Morakunnu Hills": "Chirakkara Hills",
  "Kodiyeri–Madapeedika South": "South Highway",
  "Thiruvangad–Overbury's Heritage Quarter": "Heritage Quarter"
};

export default function LiveTicker({ incidents = [], floodRisk = false }) {
  // Filter active (open or escalated) incidents
  const activeIncidents = useMemo(() => {
    return incidents.filter(i => i.status === "open" || i.status === "escalated");
  }, [incidents]);

  // Determine status badge bg and label based on active list
  const badgeInfo = useMemo(() => {
    const hasEscalated = activeIncidents.some(i => i.status === "escalated");
    if (hasEscalated) {
      return { bg: "bg-red-600 text-white", label: "INCIDENT ACTIVE" };
    }
    if (activeIncidents.length > 0) {
      return { bg: "bg-amber-500 text-black", label: "MONITORING" };
    }
    return { bg: "bg-emerald-500 text-white", label: "ALL CLEAR" };
  }, [activeIncidents]);

  // Map and assemble ticker messages
  const tickerMessage = useMemo(() => {
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

    return messages.join("  •  ");
  }, [activeIncidents, floodRisk]);

  // Calculate scrolling duration based on length of messages
  const duration = useMemo(() => {
    return `${Math.max(20, tickerMessage.length * 0.08)}s`;
  }, [tickerMessage]);

  return (
    <div 
      className="w-full bg-[#0c0e13] border-b border-[#1b1d24] h-8.5 overflow-hidden flex items-center px-3 font-mono text-xs select-none relative z-20"
      title="Hover to pause"
    >
      <style>{`
        @keyframes ticker-scroll {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-100%, 0, 0); }
        }
        .animate-ticker-wrapper {
          position: relative;
          overflow: hidden;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
        }
        .animate-ticker-content {
          padding-left: 100%;
          display: inline-block;
          white-space: nowrap;
          animation: ticker-scroll var(--ticker-duration, 25s) linear infinite;
        }
        .animate-ticker-content:hover {
          animation-play-state: paused;
        }
      `}</style>

      {/* Fixed Status Badge */}
      <span 
        className={`${badgeInfo.bg} text-[10px] font-bold px-2 py-0.5 rounded mr-3 flex-shrink-0 tracking-wider font-mono`}
      >
        {badgeInfo.label}
      </span>

      {/* Scrolling text area */}
      <div className="animate-ticker-wrapper">
        <div 
          style={{ '--ticker-duration': duration }}
          className="animate-ticker-content text-[#e2e8f0]/90 font-mono text-[11px]"
        >
          {tickerMessage}
        </div>
      </div>
    </div>
  );
}
