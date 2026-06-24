import { useState, useEffect, useMemo } from 'react';
import CardShell from './CardShell';

// Dispatch Queue stage mapper configuration
const DISPATCH_STAGES = {
  "open": { label: "Reported", progress: 15, color: "#6b7280" },
  "escalated": { label: "Escalated", progress: 40, color: "#f59e0b" },
  "dispatched": { label: "PWD Dispatched", progress: 65, color: "#00f5d4" },
  "inspected": { label: "Inspected", progress: 90, color: "#22c55e" }
};

// Seed Wardens for fallbacks
const SEED_WARDENS = [
  { name: "Ashwin Raj", role: "Thalassery Warden", karma: 520 },
  { name: "Divya Balan", role: "Pothole Ranger", karma: 450 },
  { name: "Muhammed Shafi", role: "Waste Tracker", karma: 390 }
];

export default function RightPanel({
  incidents = [],
  wardens,
  onAgentLog
}) {
  // --- SECTION 1: Weather Fetching & Precipitation Chart ---
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    const fetchWeather = async () => {
      try {
        const res = await fetch(
          "https://api.open-meteo.com/v1/forecast?latitude=11.748&longitude=75.361&hourly=precipitation,relativehumidity_2m,surface_pressure&current_weather=true&wind_speed_unit=kmh&timezone=Asia/Kolkata"
        );
        if (!res.ok) throw new Error("Weather fetch failed");
        const data = await res.json();
        
        if (active) {
          setWeather(data);
          setLoading(false);
          
          // Compute peak rain in forecast
          const precipList = data.hourly?.precipitation?.slice(0, 24) || [];
          const peakRain = precipList.length > 0 ? Math.max(...precipList) : 0;
          const windspeed = data.current_weather?.windspeed || 0;

          // Call agent log callback with metrics
          // WARNING: parsed by App.jsx — do not change format
          if (onAgentLog) {
            onAgentLog(`>> Weather sync: ${windspeed} km/h wind, ${peakRain}mm peak rain forecast`);
          }
        }
      } catch (err) {
        console.error("Open-Meteo fetch failed:", err);
        if (active) {
          setError(true);
          setLoading(false);
        }
      }
    };

    fetchWeather();
    return () => {
      active = false;
    };
  }, [onAgentLog]);

  // Derived current hour index for weather lookup
  const currentHourIndex = useMemo(() => {
    return new Date().getHours();
  }, []);

  // Compute precip values & stats
  const weatherStats = useMemo(() => {
    if (!weather) return null;
    const wind = weather.current_weather?.windspeed ?? 0;
    const humidity = weather.hourly?.relativehumidity_2m?.[currentHourIndex] ?? 0;
    const pressure = weather.hourly?.surface_pressure?.[currentHourIndex] ?? 0;
    const precipArray = weather.hourly?.precipitation?.slice(0, 24) || Array(24).fill(0);
    return { wind, humidity, pressure, precipArray };
  }, [weather, currentHourIndex]);

  // --- SECTION 2: Wardens Selection ---
  const topWardens = useMemo(() => {
    const list = wardens && wardens.length > 0 ? wardens : SEED_WARDENS;
    // Sort descending by karma, take top 3
    return [...list]
      .sort((a, b) => b.karma - a.karma)
      .slice(0, 3);
  }, [wardens]);

  const rankIcons = ["🏆", "🥈", "🥉"];

  // --- SECTION 3: AI Dispatch Queue ---
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      if (active) setIsMounted(true);
    }, 50);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, []);

  const dispatchQueue = useMemo(() => {
    return incidents
      .filter(inc => inc.status !== "resolved")
      .sort((a, b) => (b.verifications || 0) - (a.verifications || 0))
      .slice(0, 5);
  }, [incidents]);

  return (
    <aside className="w-full h-full overflow-y-auto no-scrollbar flex flex-col pt-3 md:pt-4 font-mono text-[#e2e8f0]">
      
      <div className="flex flex-col gap-4 px-3 md:px-4 pb-3">
          {/* SECTION 1: Precipitation & Hazards */}
          <CardShell className="flex-1 flex flex-col gap-4 min-h-0">
        <div className="flex items-center justify-between border-b border-[#1b1d24]/50 pb-2">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-300">Precipitation & Hazards</h3>
          {!loading && !error && (
            <span className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-bold bg-emerald-950/20 px-2 py-0.5 rounded border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]"></span>
              LIVE RADAR
            </span>
          )}
        </div>

        {loading ? (
          /* Skeleton Loader */
          <div className="flex flex-col gap-4 animate-pulse py-2">
            <div className="grid grid-cols-3 gap-2">
              <div className="h-10 bg-[#1b1d24]/50 border border-[#2a2d38]/50 rounded"></div>
              <div className="h-10 bg-[#1b1d24]/50 border border-[#2a2d38]/50 rounded"></div>
              <div className="h-10 bg-[#1b1d24]/50 border border-[#2a2d38]/50 rounded"></div>
            </div>
            <div className="h-20 bg-[#1b1d24]/50 border border-[#2a2d38]/50 rounded w-full"></div>
          </div>
        ) : error ? (
          /* Error State */
          <div className="py-4 text-center">
            <span className="text-xs text-gray-500 font-bold">Weather data unavailable</span>
          </div>
        ) : (
          /* Loaded Weather UI */
          <div className="flex-1 flex flex-col justify-between min-h-0">
            {/* Stat chips row */}
            <div className="grid grid-cols-3 gap-2.5 text-center">
              <div className="border border-[#1b1d24] p-3 bg-[#16171d]/60 backdrop-blur-sm rounded-lg hover:border-cyan-500/10 transition-colors">
                <span className="text-[10px] text-[#9ca3af] block font-bold">WIND</span>
                <span className="text-sm font-bold text-white mt-0.5 block">{weatherStats.wind} km/h</span>
              </div>
              <div className="border border-[#1b1d24] p-3 bg-[#16171d]/60 backdrop-blur-sm rounded-lg hover:border-cyan-500/10 transition-colors">
                <span className="text-[10px] text-[#9ca3af] block font-bold">HUMIDITY</span>
                <span className="text-sm font-bold text-white mt-0.5 block">{weatherStats.humidity}%</span>
              </div>
              <div className="border border-[#1b1d24] p-3 bg-[#16171d]/60 backdrop-blur-sm rounded-lg hover:border-cyan-500/10 transition-colors">
                <span className="text-[10px] text-[#9ca3af] block font-bold">PRESSURE</span>
                <span className="text-sm font-bold text-white mt-0.5 block truncate">{weatherStats.pressure} hPa</span>
              </div>
            </div>

            {/* Precipitation Bar chart */}
            <div className="flex flex-col gap-2 min-h-0 justify-center">
              <span className="text-[10px] text-[#9ca3af] uppercase font-bold">Forecast Rain Level</span>
              <div className="flex-1 min-h-[100px] w-full relative">
                <svg viewBox="0 0 240 80" className="w-full h-full overflow-visible">
                  {/* Baseline grid marker */}
                  <line x1="0" y1="60" x2="240" y2="60" stroke="#1b1d24" strokeWidth="0.8" />

                  {/* SVG Bar items */}
                  {(() => {
                    const barWidth = 7;
                    const gap = 2.5;
                    const startX = 8;
                    const precipValues = weatherStats.precipArray;
                    const maxVal = Math.max(...precipValues, 1);
                    const scale = 55 / maxVal;

                    return precipValues.map((val, idx) => {
                      const h = val === 0 ? 2 : val * scale;
                      const y = 60 - h;
                      const x = startX + idx * (barWidth + gap);

                      // Bar coloring thresholds
                      let color = "#22c55e"; // == 0mm
                      if (val > 0 && val <= 5) color = "#eab308"; // 0-5mm
                      else if (val > 5 && val <= 15) color = "#f97316"; // 5-15mm
                      else if (val > 15) color = "#ef4444"; // > 15mm

                      const isCurrentHour = idx === currentHourIndex;

                      return (
                        <rect
                          key={`precip-bar-${idx}`}
                          x={x}
                          y={y}
                          width={barWidth}
                          height={h}
                          fill={color}
                          fillOpacity={isCurrentHour ? "1.0" : "0.75"}
                          stroke={isCurrentHour ? "white" : "none"}
                          strokeWidth={isCurrentHour ? "1" : "0"}
                          strokeOpacity={isCurrentHour ? "0.9" : "0"}
                          rx="0.5"
                          className="hover:fill-opacity-100 transition-all cursor-pointer"
                        >
                          <title>{`${idx}:00 - ${val}mm rain`}</title>
                        </rect>
                      );
                    });
                  })()}

                  {/* X-axis labels aligned with points */}
                  {(() => {
                    const barWidth = 7;
                    const gap = 2.5;
                    const startX = 8;
                    const hours = [0, 6, 12, 18];
                    return hours.map(hour => {
                      const x = startX + hour * (barWidth + gap) + barWidth / 2;
                      const label = hour < 10 ? `0${hour}:00` : `${hour}:00`;
                      return (
                        <text
                          key={`axis-lbl-${hour}`}
                          x={x}
                          y="74"
                          textAnchor="middle"
                          className="fill-[#6b7280] text-[8px] font-mono font-medium"
                        >
                          {label}
                        </text>
                      );
                    });
                  })()}
                </svg>
              </div>
            </div>
          </div>
        )}
      </CardShell>

      {/* SECTION 2: Volunteer Karma Board */}
      <CardShell className="flex-1 flex flex-col gap-3 min-h-0">
        <div className="flex items-center justify-between border-b border-[#1b1d24] pb-2">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-300">Volunteer Karma Board</h3>
          <span className="text-[10px] bg-cyan-500/10 text-[#00f5d4] px-2 py-0.5 rounded border border-[#00f5d4]/20 font-bold leading-none uppercase">
            TOP WARDENS
          </span>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar min-h-0 flex flex-col justify-between">
          {topWardens.map((item, idx) => (
            <div 
              key={idx} 
              className={`flex items-center justify-between py-3 ${
                idx !== topWardens.length - 1 ? 'border-b border-[#1b1d24]/40' : ''
              }`}
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <span className="text-base shrink-0">{rankIcons[idx]}</span>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-bold text-white truncate">{item.name}</span>
                  <span className="text-xs font-mono text-[#9ca3af] mt-0.5 truncate">{item.role}</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-sm font-mono font-bold text-cyan-400">{item.karma}</span>
                <span className="text-[10px] font-mono text-[#7d8590] block mt-0.5">karma</span>
              </div>
            </div>
          ))}
        </div>
      </CardShell>

      {/* Spacer & Indicator */}
      <div className="text-center pt-2 pb-1 text-[10px] text-[#555] uppercase tracking-wider select-none font-bold">
        Dispatch queue below ↓
      </div>

    {/* SECTION 3: AI Dispatch Queue */}
    <CardShell className="flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-[#1b1d24] pb-2">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-300">AI Dispatch Queue</h3>
          <span className="text-[10px] text-gray-300 font-bold uppercase tracking-wider">
            Municipality Status
          </span>
        </div>

        <div className="flex flex-col gap-6">
          {dispatchQueue.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]"></div>
                <span className="text-xs font-bold text-white uppercase tracking-wider">No active dispatches</span>
              </div>
              <span className="text-[10px] text-[#9ca3af] uppercase">all clear in Thalassery</span>
            </div>
          ) : (
            /* Dispatch items list */
            dispatchQueue.map(incident => {
              const stageInfo = DISPATCH_STAGES[incident.status] || DISPATCH_STAGES["open"];
              const cfId = incident.id.startsWith('CF-') 
                ? incident.id 
                : `CF-${incident.id.toString().substring(0, 4)}`;

              return (
                <div key={incident.id} className="flex flex-col gap-2.5">
                  {/* Row 1: ID & Stage Label */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white font-bold font-mono">{cfId}</span>
                    <span 
                      className="font-bold text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border" 
                      style={{ 
                        color: stageInfo.color,
                        borderColor: `${stageInfo.color}30`,
                        backgroundColor: `${stageInfo.color}15`
                      }}
                    >
                      {stageInfo.label}
                    </span>
                  </div>

                  {/* Row 2: Type @ Ward & progress percentage */}
                  <div className="flex justify-between items-center text-[#9ca3af] text-xs">
                    <span className="truncate max-w-[170px]">{incident.type} @ Ward {incident.ward}</span>
                    <span className="font-semibold font-mono">{stageInfo.progress}% dispatched</span>
                  </div>

                  {/* Row 3: Progress track & bar */}
                  <div className="w-full bg-[#1b1d24] h-[4px] rounded-full overflow-hidden mt-0.5">
                    <div 
                      className="h-full rounded-full" 
                      style={{ 
                        width: isMounted ? `${stageInfo.progress}%` : '0%',
                        transition: 'width 600ms ease-out',
                        backgroundColor: stageInfo.color
                      }}
                    ></div>
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
