import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, X } from 'lucide-react';
import L from 'leaflet';
import { CANONICAL_WARDS, filterAlerts, getCategoryInfo, getMapMarkers } from '../lib/helpers.js';
import { WARD_POLYGONS } from '../lib/ward_polygons.js';

export default function ActiveGridAlertsWorkspace({
  isOpen,
  onClose,
  incidents,
  onUpvote,
  onVerify,
  onViewLetter,
  onResolveClick,
  onAuditClick,
  onAutoEscalate,
  onAgentLog,
  thalasseryBoundaryGeoJSON,
  onOpenIncidentDetails,
  theme
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [modalMapInstance, setModalMapInstance] = useState(null);
  const modalMapRef = useRef(null);

  // Filtered incidents
  const filtered = useMemo(() => {
    return filterAlerts(incidents, searchQuery, null, statusFilter);
  }, [incidents, searchQuery, statusFilter]);

  // Initialize and clean up Map
  useEffect(() => {
    if (!isOpen || !modalMapRef.current) return;

    let map = null;
    const timer = setTimeout(() => {
      if (!modalMapRef.current) return;
      
      const boundaryLimit = L.latLngBounds([11.7000, 75.4300], [11.8100, 75.5600]);
      map = L.map(modalMapRef.current, {
        center: [11.7490, 75.4891],
        zoom: 13,
        minZoom: 11,
        maxZoom: 18,
        maxBounds: boundaryLimit,
        maxBoundsViscosity: 1.0,
        zoomControl: false,
        attributionControl: false
      });

      const tileUrl = theme === 'dark'
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
      L.tileLayer(tileUrl, {
        maxZoom: 20
      }).addTo(map);

      // Draw Thalassery Municipal Boundary polygon
      if (thalasseryBoundaryGeoJSON) {
        L.geoJSON(thalasseryBoundaryGeoJSON, {
          style: {
            color: '#ef4444',
            weight: 2,
            dashArray: '8 4',
            fill: false,
            lineCap: 'round',
            lineJoin: 'round',
            interactive: false
          }
        }).addTo(map);
      }

      // Draw Ward Borders
      const ZONE_COLORS = {
        "Court Corridor": "#3b82f6",     // Blue
        "Seafront": "#06b6d4",           // Cyan
        "North Uplands": "#f59e0b",       // Amber
        "Chirakkara Hills": "#a855f7",   // Purple
        "South Highway": "#f43f5e",      // Rose/Red
        "Heritage Quarter": "#10b981"    // Emerald
      };

      WARD_POLYGONS.forEach(wp => {
        const canonicalWard = CANONICAL_WARDS.find(w => w.wardNo === wp.wardNo);
        const zone = canonicalWard ? canonicalWard.zone : null;
        const zoneColor = ZONE_COLORS[zone] || "#94a3b8";

        const polygon = L.polygon(wp.polygon, {
          color: '#22d3ee',
          opacity: 0.5,
          weight: 0.8,
          fillColor: zoneColor,
          fillOpacity: 0.05,
          interactive: true
        });

        polygon.on('mouseover', () => {
          polygon.setStyle({
            weight: 1.5,
            fillOpacity: 0.18,
            opacity: 0.8
          });
        });

        polygon.on('mouseout', () => {
          polygon.setStyle({
            weight: 0.8,
            fillOpacity: 0.05,
            opacity: 0.5
          });
        });

        polygon.bindTooltip(
          `<strong>Ward ${wp.wardNo}: ${canonicalWard ? canonicalWard.wardName : "Unknown"}</strong><br/><span style="color:${zoneColor}">${zone || "General"} Sector</span>`,
          { direction: 'center', className: 'custom-ward-tooltip font-mono text-[12px] text-white border-none bg-[#090b10]/95 p-2.5 rounded shadow-xl' }
        );

        polygon.addTo(map);
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      setModalMapInstance(map);
    }, 100);

    return () => {
      clearTimeout(timer);
      if (map) {
        map.remove();
      }
      setModalMapInstance(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, thalasseryBoundaryGeoJSON]);

  // Sync ward overlay markers
  useEffect(() => {
    if (!modalMapInstance) return;

    // Remove existing markers
    modalMapInstance.eachLayer(layer => {
      if (layer instanceof L.Marker) {
        modalMapInstance.removeLayer(layer);
      }
    });

    const markers = getMapMarkers(filtered);
    markers.forEach(inc => {
      if (!inc.lat || !inc.lng) return;
      
      const marker = L.circle([inc.lat, inc.lng], {
        radius: 60,
        color: inc.colorHex || '#3b82f6',
        fillColor: inc.colorHex || '#3b82f6',
        fillOpacity: 0.8,
        weight: 2
      }).addTo(modalMapInstance);
      
      marker.bindTooltip(`<strong>${inc.type}</strong><br/>${inc.location}`, {
        direction: 'top',
        className: 'font-mono text-[11px] bg-[#0c0d12]/95 text-white border border-[#1b1d24]/60 p-1.5 rounded shadow-xl'
      });

      marker.on('click', () => {
        modalMapInstance.setView([inc.lat, inc.lng], 15);
        if (onOpenIncidentDetails) {
          onOpenIncidentDetails(inc);
        }
      });
    });
  }, [filtered, modalMapInstance, onOpenIncidentDetails]);

  // Sync map tiles with theme
  useEffect(() => {
    if (modalMapInstance) {
      const url = theme === 'dark'
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

      modalMapInstance.eachLayer(layer => {
        if (typeof layer.setUrl === 'function') {
          layer.setUrl(url);
          layer.redraw();
        }
      });
      modalMapInstance.invalidateSize();
    }
  }, [theme, modalMapInstance]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/90 backdrop-blur-md z-40 flex items-center justify-center p-4 sm:p-6 md:p-8"
        >
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="bg-[#101115] border border-[#1b1d24]/60 w-full h-[90vh] rounded-lg shadow-2xl flex flex-col overflow-hidden font-mono text-[#e2e8f0]"
          >
        
        {/* Header */}
        <div className="border-b border-[#1b1d24]/60 bg-[#121318] p-4 flex items-center justify-between flex-none">
          <div className="flex items-center gap-2 text-blue-400">
            <AlertCircle size={16} />
            <span className="text-sm font-bold font-sans uppercase tracking-wide text-white">Active Grid Alerts Workspace</span>
          </div>
          <button 
            onClick={onClose}
            className="text-[#8e8e8f] hover:text-white p-1 hover:bg-[#16171d] rounded transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Split columns */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row">
          
          {/* Left Column: Filter & Feed */}
          <div className="w-full md:w-[480px] border-r border-[#1b1d24]/60 flex flex-col p-4 overflow-hidden h-full">
            
            {/* Search Input */}
            <div className="flex items-center gap-2 bg-[#0c0d12]/80 border border-[#1b1d24]/60 px-3 py-2 rounded text-sm font-mono mb-3">
              <svg className="w-4 h-4 text-[#6b7280] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search details, wards..."
                className="bg-transparent border-none text-[#e2e8f0] focus:outline-none placeholder-[#3b4453] w-full text-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="text-[#6b7280] hover:text-white shrink-0 text-sm font-bold px-1"
                >
                  ×
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 mb-4 flex-none text-[12px] overflow-x-auto no-scrollbar">
              {["All", "Open", "Escalated", "Resolved"].map(pill => {
                const isSelected = statusFilter === pill;
                return (
                  <button
                    key={pill}
                    onClick={() => setStatusFilter(pill)}
                    className={`px-3 py-1 rounded transition-colors font-bold uppercase ${
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

            {/* Alert List Container */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 no-scrollbar min-h-0">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
                    <span className="text-sm font-bold text-white uppercase tracking-wider">No active incidents</span>
                  </div>
                  <span className="text-[12px] text-[#9ca3af] uppercase">All clear in this zone</span>
                </div>
              ) : (
                filtered.map(incident => {
                  const catInfo = getCategoryInfo(incident.type);
                  return (
                    <div
                      key={incident.id}
                      onClick={() => {
                        if (modalMapInstance && incident.lat && incident.lng) {
                          modalMapInstance.setView([incident.lat, incident.lng], 15);
                        }
                      }}
                      className={`cursor-pointer border p-3.5 rounded-lg flex flex-col gap-2 transition-all ${
                        theme === 'light'
                          ? 'border-slate-200 bg-white hover:bg-blue-50/40 hover:border-blue-300 shadow-sm'
                          : 'border-[#1b1d24]/60 bg-[#16171d]/30 hover:bg-[#1d1e26]/40 hover:border-blue-500/20'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`text-[11px] font-bold border px-1.5 py-0.2 rounded uppercase ${catInfo.bg}`}>
                            {catInfo.label}
                          </span>
                          <span className={`text-[12px] font-mono font-semibold ${theme === 'light' ? 'text-slate-700' : 'text-[#9ca3af]'}`}>
                            CF-{incident.id.toString().substring(0, 4)}
                          </span>
                        </div>
                        <span className={`text-[12px] font-mono font-medium ${theme === 'light' ? 'text-slate-600' : 'text-[#9ca3af]'}`}>
                          {incident.timeAgo || "Just now"}
                        </span>
                      </div>

                      <p className={`text-sm leading-relaxed line-clamp-2 font-medium ${theme === 'light' ? 'text-slate-900' : 'text-[#d1d5db]'}`}>
                        {incident.description || incident.details}
                      </p>

                      <div className={`flex items-center justify-between mt-1 pt-1.5 border-t ${theme === 'light' ? 'border-slate-200' : 'border-[#1b1d24]/30'}`}>
                        <div className="flex items-center gap-2">
                          <span className={`text-[12px] border px-1.5 py-0.2 rounded font-bold ${
                            theme === 'light' ? 'bg-slate-100 border-slate-300 text-slate-700' : 'bg-[#101115] border-[#1b1d24]/70 text-[#7d8590]'
                          }`}>
                            Ward {incident.ward}
                          </span>
                          <span className={`text-[12px] flex items-center gap-0.5 font-medium ${theme === 'light' ? 'text-slate-700' : 'text-[#9ca3af]'}`}>
                            🛡 {incident.verifications || 0} verified
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={(e) => { e.stopPropagation(); onUpvote(incident.id); }}
                            className={`px-2 py-0.5 rounded border text-[12px] font-bold font-mono transition-colors cursor-pointer ${theme === 'light' ? 'bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-600 hover:text-white' : 'bg-blue-600/10 border-blue-500/20 text-blue-400 hover:bg-blue-600 hover:text-white'}`}
                          >
                            ↑ Upvote ({incident.votes || 0})
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onVerify(incident.id);
                              // Trigger auto-escalation & logging if verified >= 15 after this call
                              if ((incident.verifications || 0) + 1 >= 15) {
                                onAutoEscalate && onAutoEscalate(incident.id);
                                onAgentLog && onAgentLog(`>> Auto-escalated CF-${incident.id}: community threshold reached`);
                              }
                            }}
                            className={`px-2 py-0.5 rounded border text-[12px] font-bold font-mono transition-colors cursor-pointer ${theme === 'light' ? 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-600 hover:text-white' : 'bg-emerald-600/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-600 hover:text-white'}`}
                          >
                            ✓ Verify
                          </button>
                          {incident.status === 'escalated' && (
                            <button
                              onClick={(e) => { e.stopPropagation(); onViewLetter && onViewLetter(incident); }}
                              className={`px-2 py-0.5 rounded border text-[12px] font-bold font-mono transition-colors cursor-pointer ${theme === 'light' ? 'bg-purple-50 border-purple-300 text-purple-700 hover:bg-purple-600 hover:text-white' : 'bg-purple-600/10 border-purple-500/20 text-purple-400 hover:bg-purple-600 hover:text-white'}`}
                            >
                              ✉ Dispatch
                            </button>
                          )}
                          {(incident.status !== 'resolved' && incident.status !== 'resolved_verified' && incident.status !== 'resolved_pending_verification') && (
                            <button
                              onClick={(e) => { e.stopPropagation(); onResolveClick && onResolveClick(incident); }}
                              className={`px-2 py-0.5 rounded border text-[12px] font-bold font-mono transition-colors cursor-pointer ${theme === 'light' ? 'bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-600 hover:text-white' : 'bg-amber-600/10 border-amber-500/20 text-amber-400 hover:bg-amber-600 hover:text-white'}`}
                            >
                              ⚙ Resolve
                            </button>
                          )}
                          {incident.status === 'resolved_pending_verification' && (
                            <button
                              onClick={(e) => { e.stopPropagation(); onAuditClick && onAuditClick(incident); }}
                              className="bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white px-2 py-0.5 rounded border border-purple-500/30 text-[12px] font-bold font-mono transition-colors cursor-pointer animate-pulse font-bold"
                            >
                              🔍 Audit Proof
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

          </div>

          {/* Right Column: Leaflet Map */}
          <div className="flex-1 h-full min-h-0 relative bg-[#090b10] z-0">
            <div ref={modalMapRef} className="w-full h-full min-h-0"></div>
          </div>

        </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
