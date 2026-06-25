import { useState, useEffect, useMemo } from 'react';
import CardShell from './CardShell';
import { 
  WARD_ZONES, 
  ZONE_MAPPING, 
  getCategoryInfo, 
  getZoneHealthScore, 
  getZoneSummary, 
  filterAlerts 
} from '../lib/helpers';

export default function LeftPanel({
  incidents = [],
  previousScores = {},
  activeZone = null,
  onZoneSelect,
  onIncidentFocus,
  onUpvote,
  onVerify,
  onAutoEscalate,
  onAgentLog
}) {
  const [now] = useState(() => Date.now());

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

  // Axis labels positions (radius ~86)
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

  // --- Section 3 Search & Status Filters ---
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // Reset page-level active zone filter via dismissible chip
  const handleClearZoneFilter = () => {
    onZoneSelect(null);
  };

  // Filtered incidents based on activeZone, search query, and status pills
  const filteredIncidents = useMemo(() => {
    return filterAlerts(incidents, searchQuery, activeZone, statusFilter);
  }, [incidents, searchQuery, activeZone, statusFilter]);

  // Helper to format relative time ago
  const formatTimeAgo = (inc) => {
    if (inc.timeAgo) return inc.timeAgo;
    if (!inc.reportedAt) return "just now";
    try {
      const diffMs = now - new Date(inc.reportedAt).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return "just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    } catch {
      return "just now";
    }
  };

  return (
    <aside className="w-full h-full flex flex-col pt-3 md:pt-4 overflow-y-auto no-scrollbar font-mono text-[#e2e8f0]">
      
      <div className="flex flex-col gap-4 px-3 md:px-4 pb-3">
        {/* SECTION 1: Environmental Health Radar Chart */}
        <CardShell className="flex-1 flex flex-col min-h-0">
        
        {/* Header Block & Overall Score Badge */}
        <div className="flex justify-between items-start mb-3">
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
        <div className="flex-1 flex items-center justify-center relative min-h-0">
          <svg viewBox="0 0 200 200" className="w-full h-full max-w-[220px] overflow-visible">
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

      {/* SECTION 2: Zone Health Cards */}
      <CardShell className="flex-1 flex flex-col min-h-0">
        <span className="text-[10.5px] text-[#9ca3af] uppercase tracking-wider font-bold mb-2 block">Municipal Zones Overview</span>
        
        {/* Scrollable grid container with hidden scrollbar */}
        <div className="space-y-2 flex-1 overflow-y-auto no-scrollbar pr-0.5 min-h-0">
          {ZONE_MAPPING.map(zone => {
            const zoneIncidents = incidents.filter(inc => {
              const wardStr = inc.ward?.toString();
              return wardStr && WARD_ZONES[zone.fullName].includes(wardStr);
            });
            const summary = getZoneSummary(zoneIncidents);
            const score = summary.healthScore;
            
            // Status badge info
            const statusBadge = summary.status;
            let badgeStyle = "bg-emerald-950/30 text-emerald-400 border-emerald-500/20";
            if (statusBadge === "CRITICAL") {
              badgeStyle = "bg-red-950/30 text-red-400 border-red-500/20";
            } else if (statusBadge === "WARNING") {
              badgeStyle = "bg-amber-950/30 text-amber-400 border-amber-500/20";
            }

            const dominantIssue = summary.dominantIssue;

            // Compare score to determine trend arrow
            const prevScore = previousScores[zone.fullName] ?? score;
            let trendArrow = "→";
            let trendStyle = "text-[#6b7280]";
            if (score > prevScore) {
              trendArrow = "↑";
              trendStyle = "text-emerald-400 font-bold";
            } else if (score < prevScore) {
              trendArrow = "↓";
              trendStyle = "text-red-400 font-bold";
            }

            const isSelected = activeZone === zone.fullName;

            return (
              <div
                key={zone.fullName}
                onClick={() => onZoneSelect(isSelected ? null : zone.fullName)}
                className={`cursor-pointer bg-[#0f1117]/60 backdrop-blur-sm border rounded-lg py-3.5 px-3 flex flex-col justify-between hover:border-cyan-500/30 transition-all ${
                  isSelected 
                    ? 'border-l-2 border-l-[#00f5d4] border-[#1b1d24] bg-[#0c0e13]' 
                    : 'border-[#1b1d24] border-l-transparent'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white truncate max-w-[170px]">
                    {zone.shortName}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-xs font-bold font-mono text-white">
                      {score}%
                    </span>
                    <span className={`text-[9px] font-semibold border px-1 py-0.2 rounded uppercase ${badgeStyle}`}>
                      {statusBadge}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-1 text-[10px]">
                  <span className="text-[#9ca3af] font-mono">
                    [{dominantIssue}]
                  </span>
                  <span className={`text-xs ${trendStyle}`}>
                    {trendArrow}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardShell>
        
        {/* Spacer & Indicator */}
        <div className="text-center pt-2 pb-1 text-[10px] text-[#555] uppercase tracking-wider select-none font-bold">
          Live incidents below ↓
        </div>

      {/* SECTION 3: Incident Streams Feed */}
      <CardShell className="flex flex-col">
        
        {/* Section Header */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] text-[#9ca3af] uppercase tracking-wider font-bold">Active Grid Alerts</span>
          <span className="text-[11px] text-cyan-400 font-bold">{filteredIncidents.length} active</span>
        </div>

        {/* Dismissible active zone filter chip */}
        {activeZone && (
          <div className="flex items-center gap-1 bg-cyan-950/40 border border-cyan-500/20 px-2 py-0.5 rounded text-xs text-[#00f5d4] w-max mb-2 font-mono">
            <span>{ZONE_MAPPING.find(z => z.fullName === activeZone)?.shortName || activeZone}</span>
            <button
              onClick={handleClearZoneFilter}
              className="hover:text-white font-bold ml-1 text-xs leading-none"
              title="Clear zone filter"
            >
              ×
            </button>
          </div>
        )}

        {/* Text search input */}
        <div className="flex items-center gap-2 bg-[#0c0d12]/80 border border-[#1b1d24]/60 px-2 py-1.5 rounded text-xs font-mono mb-2">
          <svg className="w-3.5 h-3.5 text-[#6b7280] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search details, wards..."
            className="bg-transparent border-none text-[#e2e8f0] focus:outline-none placeholder-[#3b4453] w-full text-xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="text-[#6b7280] hover:text-white shrink-0 text-xs font-bold px-1"
            >
              ×
            </button>
          )}
        </div>

        {/* Filter pills */}
        <div className="flex items-center gap-1.5 mb-3 flex-none text-[10px]">
          {["All", "Open", "Escalated", "Resolved"].map(pill => {
            const isSelected = statusFilter === pill;
            return (
              <button
                key={pill}
                onClick={() => setStatusFilter(pill)}
                className={`px-2.5 py-1 rounded transition-colors font-bold uppercase ${
                  isSelected 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-[#16171d]/60 border border-[#1b1d24]/50 text-[#9ca3af] hover:text-white'
                }`}
              >
                {pill}
              </button>
            );
          })}
        </div>

        {/* Scrollable feed of incident cards */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-0.5 no-scrollbar">
          {filteredIncidents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
                <span className="text-xs font-bold text-white uppercase tracking-wider">No active incidents</span>
              </div>
              <span className="text-[10px] text-[#9ca3af] uppercase">All clear in this zone</span>
            </div>
          ) : (
            filteredIncidents.map(incident => {
              const catInfo = getCategoryInfo(incident.type);

              // Upvote handler
              const handleUpvoteClick = (e) => {
                e.stopPropagation();
                onUpvote(incident.id);
              };

              // Verify handler
              const handleVerifyClick = (e) => {
                e.stopPropagation();
                onVerify(incident.id);
                // Trigger auto-escalation & logging if verified >= 3 after this call
                if ((incident.verifications || 0) + 1 >= 3) {
                  onAutoEscalate(incident.id);
                  onAgentLog(`>> Auto-escalated CF-${incident.id}: community threshold reached`);
                }
              };

              return (
                <div
                  key={incident.id}
                  onClick={() => onIncidentFocus(incident)}
                  className="cursor-pointer border border-[#1b1d24]/40 bg-[#16171d]/50 hover:bg-[#1d1e26]/60 backdrop-blur-sm p-3.5 rounded-lg flex flex-col gap-2 transition-colors hover:border-[#1b1d24]"
                >
                  {/* Top Row: Category Badge + ID + Time */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-bold border px-1.5 py-0.2 rounded uppercase ${catInfo.bg}`}>
                        {catInfo.label}
                      </span>
                      <span className="text-[10px] font-mono text-[#9ca3af] font-semibold">
                        CF-{incident.id.toString().substring(0, 4)}
                      </span>
                    </div>
                    <span className="text-[10px] text-[#9ca3af] font-mono font-medium">
                      {formatTimeAgo(incident)}
                    </span>
                  </div>

                  {/* Middle: Truncated Description */}
                  <p className="text-xs text-[#d1d5db] leading-relaxed line-clamp-1">
                    {incident.description}
                  </p>

                  {/* Bottom Row: Ward tag + Verify Count + Buttons */}
                  <div className="flex items-center justify-between mt-1 pt-1.5 border-t border-[#1b1d24]/30">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] bg-[#101115] border border-[#1b1d24]/70 px-1.5 py-0.2 text-[#7d8590] rounded font-bold">
                        Ward {incident.ward}
                      </span>
                      <span className="text-[10px] text-[#9ca3af] flex items-center gap-0.5">
                        🛡 {incident.verifications || 0} verified
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={handleUpvoteClick}
                        className="bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white px-2 py-0.5 rounded border border-blue-500/20 text-[10px] font-bold font-mono transition-colors cursor-pointer"
                        title="Upvote grievance"
                      >
                        ↑ Upvote ({incident.upvotes || 0})
                      </button>
                      <button
                        onClick={handleVerifyClick}
                        className="bg-emerald-600/10 hover:bg-emerald-600 text-emerald-400 hover:text-white px-2 py-0.5 rounded border border-emerald-500/20 text-[10px] font-bold font-mono transition-colors cursor-pointer"
                        title="Confirm issue validity"
                      >
                        ✓ Verify
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardShell>
      </div>
    </aside>
  );
}
