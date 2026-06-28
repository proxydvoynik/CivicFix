import { useState, useEffect, useMemo } from 'react';
import CardShell from './CardShell.jsx';
import { 
  WARD_ZONES, 
  ZONE_MAPPING, 
  getZoneHealthScore
} from '../lib/helpers.js';

export default function LeftPanel({
  incidents = [],
  onActiveGridAlertsClick,
  onAiDispatchQueueClick,
  onRiskForecastClick
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
  const maxRadius = 70;

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
        stroke="#2a2d38"
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
      const radius = 80; // Comfortable distance outside 100% outer ring
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
    <aside className="w-full h-full flex flex-col pt-3 md:pt-4 overflow-hidden font-mono text-[#e2e8f0]">
      
      <div className="flex-1 flex flex-col gap-4 px-3 md:px-4 pb-3 overflow-hidden">
        {/* SECTION 1: Environmental Health Radar Chart */}
        <CardShell className="flex-1 flex flex-col min-h-0 justify-between py-6">
          {/* Header Block & Overall Score Badge */}
          <div className="flex justify-between items-start flex-none">
            <div className="flex flex-col">
              <span className="text-[10px] text-[#6b7280] uppercase tracking-wider font-bold">Thalassery Civic Grid</span>
              <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider">Environmental Health</h3>
            </div>
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${
              averageScore >= 85 
                ? 'bg-cyan-950/40 text-[#00f5d4] border-[#00f5d4]/20' 
                : 'bg-red-950/40 text-red-400 border-red-500/20 shadow-[0_0_8px_rgba(239,68,68,0.15)]'
            }`}>
              {averageScore.toFixed(1)}% {averageScore >= 85 ? 'stable' : 'degraded'}
            </span>
          </div>

          {/* SVG Radar Spiderweb Canvas */}
          <div className="flex-1 flex items-center justify-center relative min-h-0 py-6">
            <svg viewBox="0 0 200 200" className="w-full h-full max-w-[260px] overflow-visible">
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
                    stroke="#1b1d24"
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
                  className="fill-[#6b7280] text-[8px] font-bold font-mono tracking-tight"
                >
                  {ZONE_MAPPING[idx].shortName}
                </text>
              ))}

              {/* Center HUD Circle & Text */}
              <circle cx={cx} cy={cy} r="18" fill="#121318" stroke="#1b1d24" strokeWidth="1" />
              <text
                x={cx}
                y={cy - 2}
                textAnchor="middle"
                className="fill-[#6b7280] text-[5.5px] font-bold tracking-wider"
              >
                CIVIC
              </text>
              <text
                x={cx}
                y={cy + 5}
                textAnchor="middle"
                className="fill-white text-[5.5px] font-bold tracking-wider"
              >
                HEALTH
              </text>

              {/* Dynamic Interactive Score Polygon Path with Mount Animation */}
              <path
                d={dataPathString}
                fill={radarColor}
                fillOpacity="0.4"
                stroke={radarColor}
                strokeWidth="2"
                strokeDasharray="600"
                strokeDashoffset={animateOffset}
                style={{
                  transition: 'stroke-dashoffset 600ms ease-out, fill 400ms ease-in-out, stroke 400ms ease-in-out'
                }}
              />

              {/* Vertex Nodes for values */}
              {ZONE_MAPPING.map((z, idx) => {
                const score = zoneScores[z.fullName] || 0;
                const coord = getVertexCoordinates(idx, score);
                return (
                  <circle
                    key={`node-${idx}`}
                    cx={coord.x}
                    cy={coord.y}
                    r="2.5"
                    fill="#121318"
                    stroke={radarColor}
                    strokeWidth="1.5"
                    className="transition-all duration-300"
                  />
                );
              })}
            </svg>
          </div>
        </CardShell>

        {/* WORKSPACE BUTTONS */}
        <div className="grid grid-cols-1 gap-2.5 flex-none mt-2">
          <button
            onClick={onActiveGridAlertsClick}
            className="w-full h-10 flex items-center justify-between px-4 rounded bg-[#16171d]/80 border border-[#1b1d24] text-xs font-bold font-mono tracking-wider uppercase hover:bg-[#1d1e26] hover:border-blue-500/30 transition-all text-left text-white group"
          >
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 group-hover:animate-ping shadow-[0_0_8px_#3b82f6]"></span>
              Active Grid Alerts
            </span>
            <span className="text-[#6b7280] group-hover:text-blue-400 font-bold font-sans">→</span>
          </button>
          
          <button
            onClick={onAiDispatchQueueClick}
            className="w-full h-10 flex items-center justify-between px-4 rounded bg-[#16171d]/80 border border-[#1b1d24] text-xs font-bold font-mono tracking-wider uppercase hover:bg-[#1d1e26] hover:border-cyan-500/30 transition-all text-left text-white group"
          >
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 group-hover:animate-ping shadow-[0_0_8px_#22d3ee]"></span>
              AI Dispatch Queue
            </span>
            <span className="text-[#6b7280] group-hover:text-cyan-400 font-bold font-sans">→</span>
          </button>

          <button
            onClick={onRiskForecastClick}
            className="w-full h-10 flex items-center justify-between px-4 rounded bg-[#16171d]/80 border border-[#1b1d24] text-xs font-bold font-mono tracking-wider uppercase hover:bg-[#1d1e26] hover:border-amber-500/30 transition-all text-left text-white group"
          >
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 group-hover:animate-ping shadow-[0_0_8px_#f59e0b]"></span>
              Risk Forecast
            </span>
            <span className="text-[#6b7280] group-hover:text-amber-400 font-bold font-sans">→</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
