import { useState, useEffect, useMemo } from 'react';
import CardShell from './CardShell.jsx';



// Seed Wardens for fallbacks
const SEED_WARDENS = [
  { id: "seed_ashwin_raj", name: "Ashwin Raj", role: "Thalassery Warden", karma: 520 },
  { id: "seed_divya_balan", name: "Divya Balan", role: "Pothole Ranger", karma: 450 },
  { id: "seed_muhammed_shafi", name: "Muhammed Shafi", role: "Waste Tracker", karma: 390 },
  { id: "seed_ananya_k", name: "Ananya K.", role: "Street Watcher", karma: 340 },
  { id: "seed_haris_p", name: "Haris P.", role: "Thalassery Warden", karma: 580 },
  { id: "seed_suresh_m", name: "Suresh M.", role: "Thalassery Warden", karma: 490 },
  { id: "seed_kavya_nair", name: "Kavya Nair", role: "Pothole Ranger", karma: 410 },
  { id: "seed_rahul_k", name: "Rahul K.", role: "Waste Tracker", karma: 370 },
  { id: "seed_meera_v", name: "Meera V.", role: "Street Watcher", karma: 330 },
  { id: "seed_amal_roy", name: "Amal Roy", role: "Thalassery Warden", karma: 510 },
  { id: "seed_fathima_z", name: "Fathima Z.", role: "Pothole Ranger", karma: 460 },
  { id: "seed_sidharth_s", name: "Sidharth S.", role: "Waste Tracker", karma: 380 },
  { id: "seed_neetu_p", name: "Neetu P.", role: "Street Watcher", karma: 320 },
  { id: "seed_sreejith_v", name: "Sreejith V.", role: "Thalassery Warden", karma: 505 },
  { id: "seed_anjana_das", name: "Anjana Das", role: "Pothole Ranger", karma: 430 },
  { id: "seed_jithin_m", name: "Jithin M.", role: "Waste Tracker", karma: 395 },
  { id: "seed_sruthy_k", name: "Sruthy K.", role: "Street Watcher", karma: 310 },
  { id: "seed_arun_kumar", name: "Arun Kumar", role: "Thalassery Warden", karma: 540 },
  { id: "seed_gopika_s", name: "Gopika S.", role: "Pothole Ranger", karma: 440 },
  { id: "seed_shyam_p", name: "Shyam P.", role: "Waste Tracker", karma: 375 },
  { id: "seed_athira_m", name: "Athira M.", role: "Street Watcher", karma: 305 },
  { id: "seed_vivek_nair", name: "Vivek Nair", role: "Thalassery Warden", karma: 500 },
  { id: "seed_reshma_r", name: "Reshma R.", role: "Pothole Ranger", karma: 420 },
  { id: "seed_nikhil_v", name: "Nikhil V.", role: "Waste Tracker", karma: 385 },
  { id: "seed_sneha_k", name: "Sneha K.", role: "Street Watcher", karma: 300 }
];

export default function RightPanel({
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

  return (
    <aside className="w-full h-full overflow-hidden flex flex-col pt-3 md:pt-4 font-mono text-[#e2e8f0]">
      
      <div className="flex flex-col gap-4 px-3 md:px-4 pb-3 flex-1 overflow-hidden">
        {/* SECTION 1: Precipitation & Hazards */}
        <CardShell className="flex-1 flex flex-col gap-4 min-h-0 justify-between py-6">
          <div className="flex items-center justify-between border-b border-[#1b1d24]/50 pb-2 flex-none">
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
            <div className="flex flex-col gap-4 animate-pulse py-2 flex-1 justify-center">
              <div className="grid grid-cols-3 gap-2">
                <div className="h-10 bg-[#1b1d24]/50 border border-[#2a2d38]/50 rounded"></div>
                <div className="h-10 bg-[#1b1d24]/50 border border-[#2a2d38]/50 rounded"></div>
                <div className="h-10 bg-[#1b1d24]/50 border border-[#2a2d38]/50 rounded"></div>
              </div>
              <div className="h-24 bg-[#1b1d24]/50 border border-[#2a2d38]/50 rounded w-full"></div>
            </div>
          ) : error ? (
            /* Error State */
            <div className="py-4 text-center flex-1 flex items-center justify-center">
              <span className="text-xs text-gray-500 font-bold">Weather data unavailable</span>
            </div>
          ) : (
            /* Loaded Weather UI */
            <div className="flex-1 flex flex-col justify-between min-h-0">
              {/* Stat chips row */}
              <div className="grid grid-cols-3 gap-2.5 text-center flex-none">
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
              <div className="flex flex-col gap-2 min-h-0 justify-center flex-1 mt-4">
                <span className="text-[10px] text-[#9ca3af] uppercase font-bold">Forecast Rain Level</span>
                <div className="flex-1 min-h-[120px] w-full relative">
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
        <CardShell className="flex-1 flex flex-col gap-3 min-h-0 justify-between py-6">
          <div className="flex items-center justify-between border-b border-[#1b1d24] pb-2 flex-none">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-300">Volunteer Karma Board</h3>
            <span className="text-[10px] bg-cyan-500/10 text-[#00f5d4] px-2 py-0.5 rounded border border-[#00f5d4]/20 font-bold leading-none uppercase">
              TOP WARDENS
            </span>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar min-h-0 flex flex-col justify-around py-4">
            {topWardens.map((item, idx) => (
              <div 
                key={idx} 
                className={`flex items-center justify-between py-4 ${
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
      </div>
    </aside>
  );
}
