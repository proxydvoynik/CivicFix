import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import CardShell from './CardShell.jsx';
import { 
  WARD_ZONES, 
  ZONE_MAPPING, 
  getZoneHealthScore
} from '../lib/helpers.js';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export default function LeftPanel({
  incidents = [],
  onActiveGridAlertsClick,
  onAiDispatchQueueClick,
  onRiskForecastClick,
  theme
}) {
  // --- Section 1 States & Computations ---
  const [animateOffset, setAnimateOffset] = useState(600);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimateOffset(0);
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  // Compute scores dynamically for all 6 zones
  const zoneScores = useMemo(() => {
    const scores = {};
    Object.keys(WARD_ZONES).forEach(zoneName => {
      const wardList = WARD_ZONES[zoneName];
      const zoneIncidents = incidents.filter(inc => {
        const wardStr = inc.ward?.toString();
        return wardStr && wardList.includes(wardStr);
      });
      scores[zoneName] = getZoneHealthScore(zoneIncidents);
    });
    return scores;
  }, [incidents]);

  // Compute average of all 6 scores
  const averageScore = useMemo(() => {
    const scores = Object.values(zoneScores);
    if (scores.length === 0) return 100;
    const sum = scores.reduce((acc, val) => acc + val, 0);
    return parseFloat((sum / scores.length).toFixed(1));
  }, [zoneScores]);

  // Determine radar fill and stroke color based on avg score
  const radarColor = useMemo(() => {
    if (averageScore >= 90) return '#00f5d4'; // Cyan
    if (averageScore >= 70) return '#f59e0b'; // Amber
    return '#ef4444'; // Red
  }, [averageScore]);

  // Radar Geometry Settings (viewBox 0 0 200 200)
  const cx = 100;
  const cy = 100;
  const maxRadius = 58;

  // Calculate coordinates for vertices
  const getVertexCoordinates = (index, scorePercentage) => {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / 6;
    const radius = maxRadius * (scorePercentage / 100);
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    return { x, y };
  };

  // Hexagon background grid lines helper
  const renderGridHexagon = (scale) => {
    const points = Array.from({ length: 6 }).map((_, i) => {
      const angle = -Math.PI / 2 + (i * 2 * Math.PI) / 6;
      const radius = maxRadius * scale;
      const x = cx + radius * Math.cos(angle);
      const y = cy + radius * Math.sin(angle);
      return `${x},${y}`;
    }).join(' ');
    return (
      <polygon
        key={`grid-${scale}`}
        points={points}
        fill="none"
        stroke={theme === 'light' ? '#cbd5e1' : '#2a2d38'}
        strokeWidth="0.8"
      />
    );
  };

  // Axis labels positions (radius ~80)
  const labelPositions = useMemo(() => {
    const positions = [
      { textAnchor: 'middle', dy: '-6', dx: '0' },     // index 0: top
      { textAnchor: 'start', dy: '3', dx: '6' },       // index 1: top right
      { textAnchor: 'start', dy: '6', dx: '6' },       // index 2: bottom right
      { textAnchor: 'middle', dy: '14', dx: '0' },     // index 3: bottom
      { textAnchor: 'end', dy: '6', dx: '-6' },        // index 4: bottom left
      { textAnchor: 'end', dy: '3', dx: '-6' }         // index 5: top left
    ];
    return Array.from({ length: 6 }).map((_, i) => {
      const angle = -Math.PI / 2 + (i * 2 * Math.PI) / 6;
      const radius = 68; // Comfortable distance outside 100% outer ring
      const x = cx + radius * Math.cos(angle);
      const y = cy + radius * Math.sin(angle);
      return { x, y, ...positions[i] };
    });
  }, []);

  // Compute data polygon path string
  const dataPathString = useMemo(() => {
    const vertices = ZONE_MAPPING.map((z, idx) => {
      const score = zoneScores[z.fullName] || 0;
      return getVertexCoordinates(idx, score);
    });
    return vertices.map((v, i) => `${i === 0 ? 'M' : 'L'} ${v.x.toFixed(2)} ${v.y.toFixed(2)}`).join(' ') + ' Z';
  }, [zoneScores]);

  return (
    <aside className={`w-full h-full flex flex-col pt-3 md:pt-4 overflow-hidden font-mono transition-colors duration-300 ${
      theme === 'light' ? 'text-slate-700' : 'text-[#e2e8f0]'
    }`}>
      <style>{`
        @keyframes radar-sweep {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse-soft {
          0%, 100% { opacity: 0.25; transform: scale(1); }
          50% { opacity: 0.45; transform: scale(1.05); }
        }
        .radar-grid-bg {
          background-image: radial-gradient(circle, rgba(0,245,212,0.03) 1px, transparent 1px);
          background-size: 8px 8px;
        }
      `}</style>
      
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="flex-1 flex flex-col gap-4 px-3 md:px-4 pb-3 overflow-hidden"
      >
        {/* SECTION 1: Environmental Health Radar Chart */}
        <motion.div variants={itemVariants} className="flex-[1.4] flex flex-col min-h-0">
          <CardShell theme={theme} className="flex-1 flex flex-col min-h-0 justify-between py-5 px-5 relative h-full">
            {/* Header Block & Overall Score Badge */}
            <div className="flex justify-between items-start flex-none">
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00f5d4] animate-pulse shadow-[0_0_8px_#00f5d4]"></span>
                  <span className="text-[9px] text-gray-500 uppercase tracking-wider font-bold">Thalassery Civic Grid</span>
                </div>
                <h3 className={`text-xs font-bold uppercase tracking-widest mt-0.5 transition-colors duration-300 ${
                  theme === 'light' ? 'text-slate-800' : 'text-gray-200'
                }`}>Environmental Health</h3>
              </div>
              <motion.span 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", delay: 0.5 }}
                className={`text-[9px] font-bold px-2.5 py-1 rounded-md border transition-all duration-300 ${
                averageScore >= 85 
                  ? (theme === 'light'
                      ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                      : 'bg-cyan-950/30 text-[#00f5d4] border-[#00f5d4]/30 shadow-[0_0_12px_rgba(0,245,212,0.1)]') 
                  : (theme === 'light'
                      ? 'bg-red-50 text-red-600 border-red-200 shadow-sm'
                      : 'bg-red-950/30 text-red-400 border-red-500/30 shadow-[0_0_12px_rgba(239,68,68,0.15)]')
              }`}>
                {averageScore.toFixed(1)}% {averageScore >= 85 ? 'STABLE' : 'DEGRADED'}
              </motion.span>
            </div>

            {/* SVG Radar Spiderweb Canvas */}
            <div className={`flex-1 flex items-center justify-center relative min-h-0 py-4 radar-grid-bg rounded-lg my-3 transition-colors duration-300 ${
              theme === 'light'
                ? 'bg-slate-50/50 border border-slate-200/60 shadow-[inset_0_2px_10px_rgba(0,0,0,0.02)]'
                : 'bg-[#07080a]/30 border border-[#1e2333]/30 shadow-[inset_0_2px_10px_rgba(0,0,0,0.2)]'
            }`}>
              {/* Soft Ambient Glow under Radar */}
              <div 
                className="absolute w-36 h-36 rounded-full filter blur-[40px] opacity-10 pointer-events-none transition-all duration-500"
                style={{ backgroundColor: radarColor }}
              />
              
              <svg viewBox="0 0 200 200" className="w-full h-full max-w-[210px] overflow-visible select-none">
                <defs>
                  <linearGradient id="radar-sweep-gradient" x1="0%" y1="100%" x2="0%" y2="0%">
                    <stop offset="0%" stopColor={radarColor} stopOpacity="0" />
                    <stop offset="100%" stopColor={radarColor} stopOpacity="0.3" />
                  </linearGradient>
                </defs>

                {/* Concentric grid lines */}
                {[0.25, 0.50, 0.75, 1.0].map(scale => renderGridHexagon(scale))}

                {/* Hub axis spokes */}
                {Array.from({ length: 6 }).map((_, i) => {
                  const angle = -Math.PI / 2 + (i * 2 * Math.PI) / 6;
                  const x = cx + maxRadius * Math.cos(angle);
                  const y = cy + maxRadius * Math.sin(angle);
                  return (
                    <line
                      key={`axis-${i}`}
                      x1={cx}
                      y1={cy}
                      x2={x}
                      y2={y}
                      stroke={theme === 'light' ? '#e2e8f0' : '#181b24'}
                      strokeWidth="1.2"
                    />
                  );
                })}

                {/* Static Grid Labels */}
                {labelPositions.map((lp, idx) => (
                  <text
                    key={`label-${idx}`}
                    x={lp.x}
                    y={lp.y}
                    textAnchor={lp.textAnchor}
                    dy={lp.dy}
                    dx={lp.dx}
                    className="fill-gray-500 text-[7px] font-bold font-mono tracking-tight"
                  >
                    {ZONE_MAPPING[idx].shortName.toUpperCase()}
                  </text>
                ))}

                {/* Rotating Scanner Sweep */}
                <g className="origin-[100px_100px]" style={{ animation: 'radar-sweep 5s linear infinite' }}>
                  <polygon
                    points={`${cx},${cy} ${cx - 5},${cy - maxRadius} ${cx + 5},${cy - maxRadius}`}
                    fill="url(#radar-sweep-gradient)"
                    pointerEvents="none"
                  />
                  <line
                    x1={cx}
                    y1={cy}
                    x2={cx}
                    y2={cy - maxRadius}
                    stroke={radarColor}
                    strokeWidth="1.2"
                    strokeOpacity="0.8"
                    pointerEvents="none"
                  />
                </g>

                {/* Center HUD Circle & Text */}
                <circle cx={cx} cy={cy} r="20" fill={theme === 'light' ? '#ffffff' : '#0a0c10'} stroke={theme === 'light' ? '#e2e8f0' : '#1e2433'} strokeWidth="1.5" />
                <text
                  x={cx}
                  y={cy - 2}
                  textAnchor="middle"
                  className="fill-gray-400 text-[5px] font-bold tracking-widest font-mono"
                >
                  SYS
                </text>
                <text
                  x={cx}
                  y={cy + 6}
                  textAnchor="middle"
                  fill={theme === 'light' ? '#3b82f6' : '#00f5d4'}
                  className={`text-[5.5px] font-bold tracking-widest font-mono ${theme === 'light' ? 'text-blue-600' : 'text-cyan-400'}`}
                >
                  RADAR
                </text>

                {/* Dynamic Interactive Score Polygon Path with Mount Animation */}
                <path
                  d={dataPathString}
                  fill={radarColor}
                  fillOpacity="0.18"
                  stroke={radarColor}
                  strokeWidth="2"
                  strokeDasharray="600"
                  strokeDashoffset={animateOffset}
                  style={{
                    transition: 'stroke-dashoffset 800ms cubic-bezier(0.16, 1, 0.3, 1), fill 400ms ease, stroke 400ms ease'
                  }}
                />

                {/* Vertex Nodes for values */}
                {ZONE_MAPPING.map((z, idx) => {
                  const score = zoneScores[z.fullName] || 0;
                  const coord = getVertexCoordinates(idx, score);
                  return (
                    <g key={`node-group-${idx}`}>
                      {/* Pulsing ring behind node */}
                      <circle
                        cx={coord.x}
                        cy={coord.y}
                        r="4.5"
                        fill="none"
                        stroke={radarColor}
                        strokeWidth="1"
                        className="opacity-40"
                        style={{ animation: 'pulse-soft 2s infinite' }}
                      />
                      <circle
                        key={`node-${idx}`}
                        cx={coord.x}
                        cy={coord.y}
                        r="2.5"
                        fill={theme === 'light' ? '#ffffff' : '#07090d'}
                        stroke={radarColor}
                        strokeWidth="2"
                        className="transition-all duration-300 hover:scale-150 cursor-pointer"
                      />
                    </g>
                  );
                })}
              </svg>
            </div>
          </CardShell>
        </motion.div>

        {/* WORKSPACE BUTTONS */}
        <motion.div variants={itemVariants} className="flex flex-col gap-2.5 flex-none mt-1">
          {/* Active Grid Alerts */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onActiveGridAlertsClick}
            className={`w-full group relative overflow-hidden rounded-xl border p-3 text-left transition-all duration-300 cursor-pointer ${
              theme === 'light'
                ? 'border-slate-200 bg-gradient-to-r from-white to-slate-50/50 hover:to-blue-50/20 shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_20px_rgba(59,130,246,0.1)] hover:border-blue-300'
                : 'border-[#1e2333]/80 bg-gradient-to-r from-[#0d1017] to-[#07090d] hover:to-[#0f1424] shadow-[0_4px_16px_rgba(0,0,0,0.2)] hover:shadow-[0_8px_24px_rgba(59,130,246,0.15)] hover:border-blue-500/40'
            }`}
          >
            <div className="absolute top-0 left-0 w-[2px] h-full bg-blue-500/50 group-hover:bg-blue-400"></div>
            <div className="flex items-center justify-between pl-1">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                  theme === 'light'
                    ? 'bg-blue-50 border border-blue-200/50 text-blue-500'
                    : 'bg-blue-950/20 border border-blue-500/10 text-blue-400 group-hover:bg-blue-950/40 group-hover:border-blue-500/30'
                }`}>
                  <span className="relative flex h-2 w-2">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${theme === 'light' ? 'bg-blue-400' : 'bg-blue-400'}`}></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className={`text-xs font-bold tracking-wide uppercase transition-colors duration-300 ${
                    theme === 'light' ? 'text-slate-800' : 'text-white'
                  }`}>Active Grid Alerts</span>
                  <span className={`text-[9px] mt-0.5 ${theme === 'light' ? 'text-slate-500' : 'text-gray-500'}`}>Real-time incident dispatch console</span>
                </div>
              </div>
              <span className={`transition-colors text-xs font-sans ${theme === 'light' ? 'text-slate-400 group-hover:text-blue-500' : 'text-gray-600 group-hover:text-blue-400'}`}>→</span>
            </div>
          </motion.button>
          
          {/* AI Dispatch Queue */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onAiDispatchQueueClick}
            className={`w-full group relative overflow-hidden rounded-xl border p-3 text-left transition-all duration-300 cursor-pointer ${
              theme === 'light'
                ? 'border-slate-200 bg-gradient-to-r from-white to-slate-50/50 hover:to-cyan-50/20 shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_20px_rgba(6,182,212,0.1)] hover:border-cyan-300'
                : 'border-[#1e2333]/80 bg-gradient-to-r from-[#0d1017] to-[#07090d] hover:to-[#09171b] shadow-[0_4px_16px_rgba(0,0,0,0.2)] hover:shadow-[0_8px_24px_rgba(6,182,212,0.15)] hover:border-cyan-500/40'
            }`}
          >
            <div className="absolute top-0 left-0 w-[2px] h-full bg-cyan-400/50 group-hover:bg-cyan-300"></div>
            <div className="flex items-center justify-between pl-1">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                  theme === 'light'
                    ? 'bg-cyan-50 border border-cyan-200/50 text-cyan-500'
                    : 'bg-cyan-950/20 border border-cyan-500/10 text-cyan-400 group-hover:bg-cyan-950/40 group-hover:border-cyan-500/30'
                }`}>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className={`text-xs font-bold tracking-wide uppercase transition-colors duration-300 ${
                    theme === 'light' ? 'text-slate-800' : 'text-white'
                  }`}>AI Dispatch Queue</span>
                  <span className={`text-[9px] mt-0.5 ${theme === 'light' ? 'text-slate-500' : 'text-gray-500'}`}>Autonomous categorization & routing</span>
                </div>
              </div>
              <span className={`transition-colors text-xs font-sans ${theme === 'light' ? 'text-slate-400 group-hover:text-cyan-500' : 'text-gray-600 group-hover:text-cyan-400'}`}>→</span>
            </div>
          </motion.button>

          {/* Risk Forecast */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onRiskForecastClick}
            className={`w-full group relative overflow-hidden rounded-xl border p-3 text-left transition-all duration-300 cursor-pointer ${
              theme === 'light'
                ? 'border-slate-200 bg-gradient-to-r from-white to-slate-50/50 hover:to-amber-50/20 shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_20px_rgba(245,158,11,0.1)] hover:border-amber-300'
                : 'border-[#1e2333]/80 bg-gradient-to-r from-[#0d1017] to-[#07090d] hover:to-[#17140f] shadow-[0_4px_16px_rgba(0,0,0,0.2)] hover:shadow-[0_8px_24px_rgba(245,158,11,0.15)] hover:border-amber-500/40'
            }`}
          >
            <div className="absolute top-0 left-0 w-[2px] h-full bg-amber-500/50 group-hover:bg-amber-400"></div>
            <div className="flex items-center justify-between pl-1">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                  theme === 'light'
                    ? 'bg-amber-50 border border-amber-200/50 text-amber-600'
                    : 'bg-amber-950/20 border border-amber-500/10 text-amber-400 group-hover:bg-amber-950/40 group-hover:border-amber-500/30'
                }`}>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className={`text-xs font-bold tracking-wide uppercase transition-colors duration-300 ${
                    theme === 'light' ? 'text-slate-800' : 'text-white'
                  }`}>Risk Forecast Matrix</span>
                  <span className={`text-[9px] mt-0.5 ${theme === 'light' ? 'text-slate-500' : 'text-gray-500'}`}>Predictive weather & ward warning index</span>
                </div>
              </div>
              <span className={`transition-colors text-xs font-sans ${theme === 'light' ? 'text-slate-400 group-hover:text-amber-500' : 'text-gray-600 group-hover:text-amber-400'}`}>→</span>
            </div>
          </motion.button>
        </motion.div>
      </motion.div>
    </aside>
  );
}
