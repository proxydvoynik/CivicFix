import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
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

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.3
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export default function RightPanel({
  wardens,
  onAgentLog,
  theme
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
    <aside className={`w-full h-full overflow-hidden flex flex-col pt-3 md:pt-4 font-mono transition-colors duration-300 ${
      theme === 'light' ? 'text-slate-700' : 'text-[#e2e8f0]'
    }`}>
      
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="flex flex-col gap-4 px-3 md:px-4 pb-3 flex-1 overflow-hidden"
      >
        {/* SECTION 1: Precipitation & Hazards */}
        <motion.div variants={itemVariants} className="flex-[1.1] flex flex-col min-h-0">
          <CardShell theme={theme} className="flex-1 flex flex-col gap-3 min-h-0 justify-between py-5">
            <div className={`flex items-center justify-between border-b pb-2 flex-none transition-colors duration-300 ${
              theme === 'light' ? 'border-slate-100' : 'border-[#1e2333]/60'
            }`}>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]"></span>
                <h3 className={`text-xs font-bold uppercase tracking-wider transition-colors duration-300 ${
                  theme === 'light' ? 'text-slate-800' : 'text-gray-200'
                }`}>Precipitation & Hazards</h3>
              </div>
              {!loading && !error && (
                <motion.span 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`flex items-center gap-1 text-[8px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-widest transition-colors duration-300 ${
                  theme === 'light' 
                    ? 'bg-emerald-50 text-emerald-600 border-emerald-200/50' 
                    : 'bg-emerald-950/20 text-emerald-400 border-emerald-500/20'
                }`}>
                  LIVE RADAR
                </motion.span>
              )}
            </div>

            {loading ? (
              /* Skeleton Loader */
              <div className="flex flex-col gap-4 animate-pulse py-2 flex-1 justify-center">
                <div className="grid grid-cols-3 gap-2">
                  <div className={`h-10 border rounded transition-colors duration-300 ${theme === 'light' ? 'bg-slate-100 border-slate-200' : 'bg-[#1b1d24]/50 border-[#2a2d38]/50'}`}></div>
                  <div className={`h-10 border rounded transition-colors duration-300 ${theme === 'light' ? 'bg-slate-100 border-slate-200' : 'bg-[#1b1d24]/50 border-[#2a2d38]/50'}`}></div>
                  <div className={`h-10 border rounded transition-colors duration-300 ${theme === 'light' ? 'bg-slate-100 border-slate-200' : 'bg-[#1b1d24]/50 border-[#2a2d38]/50'}`}></div>
                </div>
                <div className={`h-24 border rounded w-full transition-colors duration-300 ${theme === 'light' ? 'bg-slate-100 border-slate-200' : 'bg-[#1b1d24]/50 border-[#2a2d38]/50'}`}></div>
              </div>
            ) : error ? (
              /* Error State */
              <div className="py-4 text-center flex-1 flex items-center justify-center">
                <span className="text-xs text-gray-500 font-bold">Weather data unavailable</span>
              </div>
            ) : (
              /* Loaded Weather UI */
              <motion.div 
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex-1 flex flex-col justify-between min-h-0"
              >
                {/* Stat chips row */}
                <div className="grid grid-cols-3 gap-2 text-center flex-none">
                  <div className={`border p-2 rounded-lg transition-colors duration-300 ${
                    theme === 'light' ? 'border-slate-100 bg-slate-50 hover:border-cyan-500/30 shadow-[0_2px_4px_rgba(0,0,0,0.01)]' : 'border-[#1e2333]/85 bg-[#090b0e]/80 hover:border-cyan-500/30 shadow-[0_2px_8px_rgba(0,0,0,0.15)]'
                  }`}>
                    <span className="text-[8px] text-gray-500 block font-bold tracking-wider">WIND</span>
                    <span className={`text-xs font-bold mt-0.5 block transition-colors duration-300 ${theme === 'light' ? 'text-slate-800' : 'text-white'}`}>{weatherStats.wind} km/h</span>
                  </div>
                  <div className={`border p-2 rounded-lg transition-colors duration-300 ${
                    theme === 'light' ? 'border-slate-100 bg-slate-50 hover:border-amber-500/30 shadow-[0_2px_4px_rgba(0,0,0,0.01)]' : 'border-[#1e2333]/85 bg-[#090b0e]/80 hover:border-amber-500/30 shadow-[0_2px_8px_rgba(0,0,0,0.15)]'
                  }`}>
                    <span className="text-[8px] text-gray-500 block font-bold tracking-wider">HUMIDITY</span>
                    <span className={`text-xs font-bold mt-0.5 block transition-colors duration-300 ${theme === 'light' ? 'text-slate-800' : 'text-white'}`}>{weatherStats.humidity}%</span>
                  </div>
                  <div className={`border p-2 rounded-lg transition-colors duration-300 ${
                    theme === 'light' ? 'border-slate-100 bg-slate-50 hover:border-emerald-500/30 shadow-[0_2px_4px_rgba(0,0,0,0.01)]' : 'border-[#1e2333]/85 bg-[#090b0e]/80 hover:border-emerald-500/30 shadow-[0_2px_8px_rgba(0,0,0,0.15)]'
                  }`}>
                    <span className="text-[8px] text-gray-500 block font-bold tracking-wider">PRESSURE</span>
                    <span className={`text-xs font-bold mt-0.5 block truncate transition-colors duration-300 ${theme === 'light' ? 'text-slate-800' : 'text-white'}`}>{weatherStats.pressure} hPa</span>
                  </div>
                </div>

                {/* Precipitation Bar chart */}
                <div className="flex flex-col gap-1.5 min-h-0 justify-center flex-1 mt-3">
                  <div className="flex items-center justify-between text-[8px] text-gray-500 uppercase font-bold tracking-widest flex-none">
                    <span>Precipitation Forecast</span>
                    <span className="text-cyan-500">24H CYCLE</span>
                  </div>
                  <div className={`flex-1 min-h-[105px] w-full relative rounded-lg border p-2 overflow-hidden transition-colors duration-300 ${
                    theme === 'light' ? 'bg-slate-50/50 border-slate-200/80 shadow-[inset_0_2px_8px_rgba(0,0,0,0.02)]' : 'bg-[#07080a]/45 border-[#1e2333]/40 shadow-[inset_0_2px_10px_rgba(0,0,0,0.1)]'
                  }`}>
                    <svg viewBox="0 0 240 80" className="w-full h-full overflow-visible">
                      {/* Baseline grid marker */}
                      <line x1="0" y1="60" x2="240" y2="60" stroke={theme === 'light' ? '#cbd5e1' : '#1e2433'} strokeWidth="0.8" />
                      <line x1="0" y1="30" x2="240" y2="30" stroke={theme === 'light' ? '#f1f5f9' : '#141720'} strokeWidth="0.5" strokeDasharray="3 3" />

                      {/* SVG Bar items */}
                      {(() => {
                        const barWidth = 6.5;
                        const gap = 3;
                        const startX = 6;
                        const precipValues = weatherStats.precipArray;
                        const maxVal = Math.max(...precipValues, 1);
                        const scale = 50 / maxVal;

                        return precipValues.map((val, idx) => {
                          const h = val === 0 ? 1.5 : val * scale;
                          const y = 60 - h;
                          const x = startX + idx * (barWidth + gap);

                          // Bar coloring thresholds
                          let color = "#10b981"; // green
                          if (val > 0 && val <= 5) color = "#eab308"; // yellow
                          else if (val > 5 && val <= 15) color = "#f97316"; // orange
                          else if (val > 15) color = "#ef4444"; // red

                          const isCurrentHour = idx === currentHourIndex;

                          return (
                            <motion.rect
                              initial={{ height: 0, y: 60 }}
                              animate={{ height: h, y: y }}
                              transition={{ type: "spring", delay: 0.3 + (idx * 0.02), stiffness: 300, damping: 20 }}
                              key={`precip-bar-${idx}`}
                              x={x}
                              width={barWidth}
                              fill={color}
                              fillOpacity={isCurrentHour ? "1.0" : "0.55"}
                              stroke={isCurrentHour ? (theme === 'light' ? '#0f172a' : '#00f5d4') : 'none'}
                              strokeWidth={isCurrentHour ? "1" : "0"}
                              rx="1"
                              className="hover:fill-opacity-100 transition-all cursor-pointer"
                            >
                              <title>{`${idx}:00 - ${val}mm rain`}</title>
                            </motion.rect>
                          );
                        });
                      })()}

                      {/* X-axis labels */}
                      {(() => {
                        const barWidth = 6.5;
                        const gap = 3;
                        const startX = 6;
                        const hours = [0, 6, 12, 18, 23];
                        return hours.map(hour => {
                          const x = startX + hour * (barWidth + gap) + barWidth / 2;
                          const label = hour < 10 ? `0${hour}:00` : `${hour}:00`;
                          return (
                            <text
                              key={`axis-lbl-${hour}`}
                              x={x}
                              y="72"
                              textAnchor="middle"
                              className="fill-gray-500 text-[6.5px] font-mono font-bold"
                            >
                              {label}
                            </text>
                          );
                        });
                      })()}
                    </svg>
                  </div>
                </div>
              </motion.div>
            )}
          </CardShell>
        </motion.div>

        {/* SECTION 2: Volunteer Karma Board */}
        <motion.div variants={itemVariants} className="flex-1 flex flex-col min-h-0">
          <CardShell theme={theme} className="flex-1 flex flex-col gap-3 min-h-0 justify-between py-5">
            <div className={`flex items-center justify-between border-b pb-2 flex-none transition-colors duration-300 ${
              theme === 'light' ? 'border-slate-100' : 'border-[#1e2333]/60'
            }`}>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                <h3 className={`text-xs font-bold uppercase tracking-wider transition-colors duration-300 ${
                  theme === 'light' ? 'text-slate-800' : 'text-gray-200'
                }`}>Volunteer Karma Board</h3>
              </div>
              <span className={`text-[8px] px-2 py-0.5 rounded-md border font-bold leading-none uppercase tracking-wider transition-colors duration-300 ${
                theme === 'light' 
                  ? 'bg-cyan-50 text-cyan-600 border-cyan-200/50' 
                  : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
              }`}>
                LEADERBOARD
              </span>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar min-h-0 flex flex-col justify-around py-1 space-y-2">
              {topWardens.map((item, idx) => {
                // Calculate a relative karma progress percentage
                const highestKarma = topWardens[0]?.karma || 600;
                const barPercent = Math.min(100, Math.max(10, (item.karma / highestKarma) * 100));
                
                return (
                  <motion.div 
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.4 + (idx * 0.1), type: "spring" }}
                    whileHover={{ scale: 1.02 }}
                    key={idx} 
                    className={`group flex flex-col gap-1.5 p-2.5 rounded-lg border transition-all duration-300 cursor-pointer ${
                      theme === 'light'
                        ? 'border-slate-100 bg-slate-50/60 hover:border-blue-500/30 hover:bg-white shadow-[0_2px_4px_rgba(0,0,0,0.01)] hover:shadow-[0_4px_12px_rgba(59,130,246,0.08)]'
                        : 'border-[#1e2333]/30 bg-[#07080a]/40 hover:border-[#2b354c]/60 hover:bg-[#0c1018]/50 shadow-[0_2px_4px_rgba(0,0,0,0.1)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.3)]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`text-sm shrink-0 w-6 h-6 flex items-center justify-center rounded-md border text-xs font-bold transition-colors duration-300 ${
                          theme === 'light' ? 'bg-slate-100 border-slate-200 text-slate-700' : 'bg-[#10131d] border-[#1e2333]/65'
                        }`}>
                          {rankIcons[idx] || (idx + 1)}
                        </span>
                        <div className="flex flex-col min-w-0">
                          <span className={`text-[11px] font-bold transition-colors duration-300 ${theme === 'light' ? 'text-slate-800' : 'text-white'}`}>{item.name}</span>
                          <span className="text-[8px] font-mono text-gray-500 tracking-wider mt-0.5 uppercase truncate">{item.role}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-mono font-bold text-cyan-500">{item.karma}</span>
                        <span className="text-[7.5px] font-mono text-gray-500 block uppercase tracking-wider">KP</span>
                      </div>
                    </div>
                    
                    {/* Progress karma bar */}
                    <div className={`w-full h-1 rounded-full overflow-hidden transition-colors duration-300 ${theme === 'light' ? 'bg-slate-100' : 'bg-[#121622]'}`}>
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${barPercent}%` }}
                        transition={{ delay: 0.6 + (idx * 0.1), duration: 1, ease: "easeOut" }}
                        className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full" 
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </CardShell>
        </motion.div>
      </motion.div>
    </aside>
  );
}