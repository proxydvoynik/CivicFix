import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, X } from 'lucide-react';
import L from 'leaflet';
import { CANONICAL_WARDS, getMapMarkers } from '../lib/helpers.js';
import { WARD_POLYGONS } from '../lib/ward_polygons.js';

export default function AiDispatchQueueWorkspace({
  isOpen,
  onClose,
  incidents,
  thalasseryBoundaryGeoJSON,
  onOpenIncidentDetails,
  theme
}) {
  const [modalMapInstance, setModalMapInstance] = useState(null);
  const modalMapRef = useRef(null);

  // Filter only active dispatching/escalated/resolved incidents
  const dispatchQueue = useMemo(() => {
    return incidents
      .filter(inc => inc.status !== "resolved" && inc.status !== "resolved_verified")
      .sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0));
  }, [incidents]);

  // Stage configuration mapping
  const stages = {
    "REPORTED": { label: "Reported", progress: 15, color: "#6b7280" },
    "UNDER_REVIEW": { label: "Under Review", progress: 25, color: "#3b82f6" },
    "ESCALATED": { label: "Escalated", progress: 40, color: "#f59e0b" },
    "DISPATCHED": { label: "Dispatched", progress: 65, color: "#00f5d4" },
    "IN_PROGRESS": { label: "In Progress", progress: 85, color: "#a855f7" }
  };

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
          { direction: 'center', className: 'custom-ward-tooltip font-mono text-[10px] text-white border-none bg-[#090b10]/95 p-2.5 rounded shadow-xl' }
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

    const markers = getMapMarkers(dispatchQueue);
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
        className: 'font-mono text-[9px] bg-[#0c0d12]/95 text-white border border-[#1b1d24]/60 p-1.5 rounded shadow-xl'
      });

      marker.on('click', () => {
        modalMapInstance.setView([inc.lat, inc.lng], 15);
        if (onOpenIncidentDetails) {
          onOpenIncidentDetails(inc);
        }
      });
    });
  }, [dispatchQueue, modalMapInstance, onOpenIncidentDetails]);

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
          <div className="flex items-center gap-2 text-cyan-400">
            <AlertCircle size={16} />
            <span className="text-xs font-bold font-sans uppercase tracking-wide text-white">AI Dispatch Queue Workspace</span>
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
          
          {/* Left Column: Dispatch List */}
          <div className="w-full md:w-[480px] border-r border-[#1b1d24]/60 flex flex-col p-4 overflow-hidden h-full">
            <div className="text-[11px] text-[#9ca3af] uppercase tracking-wider font-bold mb-3 flex-none">
              Active Municipal Dispatches ({dispatchQueue.length})
            </div>

            <div className="flex-1 overflow-y-auto space-y-5 pr-1 no-scrollbar min-h-0">
              {dispatchQueue.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]"></div>
                    <span className="text-xs font-bold text-white uppercase tracking-wider">No active dispatches</span>
                  </div>
                  <span className="text-[10px] text-[#9ca3af] uppercase">all clear in Thalassery</span>
                </div>
              ) : (
                dispatchQueue.map(incident => {
                  const statusKey = incident.dispatchStatus || "REPORTED";
                  const stageInfo = stages[statusKey] || stages["REPORTED"];
                  const cfId = incident.id.toString().startsWith('CF-') 
                    ? incident.id 
                    : `CF-${incident.id.toString().substring(0, 4)}`;

                  return (
                    <div 
                      key={incident.id} 
                      onClick={() => {
                        if (modalMapInstance && incident.lat && incident.lng) {
                          modalMapInstance.setView([incident.lat, incident.lng], 15);
                        }
                      }}
                      className="cursor-pointer bg-[#16171d]/20 border border-[#1b1d24]/60 p-4 rounded-lg flex flex-col gap-2.5 hover:border-cyan-500/20 transition-all"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-bold font-mono">{cfId}</span>
                          {incident.assignedDepartment && (
                            <span className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-blue-500/10 text-cyan-400 border border-cyan-500/20">
                              {incident.assignedDepartment}
                            </span>
                          )}
                        </div>
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

                      <div className="flex justify-between items-center text-[#9ca3af] text-xs">
                        <span className="truncate max-w-[240px]">{incident.type} @ Ward {incident.ward}</span>
                        <span className="font-semibold font-mono">{stageInfo.progress}% dispatched</span>
                      </div>

                      <div className="w-full bg-[#1b1d24] h-[4px] rounded-full overflow-hidden mt-0.5">
                        <div 
                          className="h-full rounded-full" 
                          style={{ 
                            width: `${stageInfo.progress}%`,
                            backgroundColor: stageInfo.color
                          }}
                        ></div>
                      </div>

                      {incident.escalationReason && (
                        <div className="text-[10px] text-[#7d8590] italic leading-normal font-sans mt-0.5">
                          🤖 {incident.escalationReason}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

          </div>

          {/* Right Column: Leaflet Map */}
          <div className="flex-1 h-full min-h-0 p-4 bg-[#090b10] flex flex-col">
            <div className="flex-1 w-full h-full min-h-0 relative z-0 rounded border border-[#1b1d24]/60 shadow-lg overflow-hidden">
              <div ref={modalMapRef} className="w-full h-full min-h-0 bg-[#090b10]"></div>
            </div>
          </div>

        </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
