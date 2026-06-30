import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, X } from 'lucide-react';
import L from 'leaflet';
import { CANONICAL_WARDS } from '../lib/helpers.js';
import { WARD_POLYGONS } from '../lib/ward_polygons.js';

export default function WardHotspotsWorkspace({
  isOpen,
  onClose,
  wardRisks,
  thalasseryBoundaryGeoJSON,
  incidents,
  onAgentLog,
  triageAgent,
  theme
}) {
  const [modalMapInstance, setModalMapInstance] = useState(null);
  const modalMapRef = useRef(null);
  const [hoveredWardNo, setHoveredWardNo] = useState(null);
  const [clickedWardNo, setClickedWardNo] = useState(null);

  // Local state for interactive AI risk analyses
  const [localWardRisks, setLocalWardRisks] = useState({});
  const [loadingAIWards, setLoadingAIWards] = useState({});

  // Sync with background parent state initially
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        setLocalWardRisks(wardRisks);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen, wardRisks]);

  // Run AI Diagnostics on demand
  const runAiDiagnosticsForWard = async (wardNo, wardName) => {
    if (!wardNo) return;
    setLoadingAIWards(prev => ({ ...prev, [wardNo]: true }));

    const matchingIncidents = incidents.filter(
      inc => inc.ward?.toString() === wardNo.toString()
    );

    try {
      const aiResult = await triageAgent.predictWardRisk(
        wardName,
        matchingIncidents,
        { temp: 29, precipitation: 5, floodRisk: false },
        true
      );

      setLocalWardRisks(prev => ({
        ...prev,
        [wardNo.toString()]: {
          wardName,
          riskLevel: aiResult.riskLevel,
          confidence: aiResult.confidence,
          reason: aiResult.reason,
          recommendedAction: aiResult.recommendedAction,
          isAIAnalysed: true
        }
      }));

      if (onAgentLog) {
        onAgentLog(`[Triage Agent] AI Diagnostics for Ward ${wardNo}: Risk ${aiResult.riskLevel.toUpperCase()} (${(aiResult.confidence * 100).toFixed(0)}% conf) - ${aiResult.recommendedAction}`);
      }
    } catch (e) {
      console.error("AI diagnostics failed:", e);
    } finally {
      setLoadingAIWards(prev => ({ ...prev, [wardNo]: false }));
    }
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

  // Sync ward overlay polygons & highlights
  useEffect(() => {
    if (!modalMapInstance) return;

    // Clear existing polygon layers (except the tile layer and boundary layer)
    modalMapInstance.eachLayer(layer => {
      if (layer instanceof L.Polygon && !layer.options.dashArray) {
        modalMapInstance.removeLayer(layer);
      }
    });

    const ZONE_COLORS = {
      "Court Corridor": "#3b82f6",
      "Seafront": "#06b6d4",
      "North Uplands": "#f59e0b",
      "Chirakkara Hills": "#a855f7",
      "South Highway": "#f43f5e",
      "Heritage Quarter": "#10b981"
    };

    WARD_POLYGONS.forEach(wp => {
      const canonicalWard = CANONICAL_WARDS.find(w => w.wardNo === wp.wardNo);
      const zone = canonicalWard ? canonicalWard.zone : null;
      const zoneColor = ZONE_COLORS[zone] || "#94a3b8";

      const riskData = localWardRisks[wp.wardNo.toString()];
      const riskLevel = riskData ? riskData.riskLevel : "low";

      // If this ward is hovered or clicked, highlight it strongly
      const isTarget = hoveredWardNo === wp.wardNo || clickedWardNo === wp.wardNo;
      
      let fillColor = zoneColor;
      if (riskLevel === "critical") fillColor = "#ef4444";
      else if (riskLevel === "high") fillColor = "#f59e0b";
      else if (riskLevel === "moderate") fillColor = "#eab308";

      const polygon = L.polygon(wp.polygon, {
        color: isTarget ? '#ffffff' : '#22d3ee',
        opacity: isTarget ? 0.9 : 0.4,
        weight: isTarget ? 2.0 : 0.8,
        fillColor: fillColor,
        fillOpacity: isTarget ? 0.28 : (riskLevel !== "low" && riskLevel !== "moderate" ? 0.15 : 0.04),
        interactive: true
      });

      polygon.bindTooltip(
        `<strong>Ward ${wp.wardNo}: ${canonicalWard ? canonicalWard.wardName : "Unknown"}</strong><br/>
         Risk Level: <span style="font-weight:bold;text-transform:uppercase;color:${fillColor}">${riskLevel}</span>`,
        { direction: 'center', className: 'custom-ward-tooltip font-mono text-[12px] text-white border-none bg-[#090b10]/95 p-2.5 rounded shadow-xl' }
      );

      polygon.on('click', () => {
        setClickedWardNo(wp.wardNo);
        // Find center coordinates
        let latSum = 0, lngSum = 0;
        wp.polygon.forEach(c => {
          latSum += c[0];
          lngSum += c[1];
        });
        modalMapInstance.setView([latSum / wp.polygon.length, lngSum / wp.polygon.length], 15);
      });

      polygon.on('mouseover', () => {
        setHoveredWardNo(wp.wardNo);
      });

      polygon.on('mouseout', () => {
        setHoveredWardNo(null);
      });

      polygon.addTo(modalMapInstance);
    });
  }, [modalMapInstance, localWardRisks, hoveredWardNo, clickedWardNo]);

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

  if (!isOpen) return null;

  const getRiskColor = (level) => {
    if (level === "critical") return "bg-red-500/10 text-red-400 border border-red-500/20";
    if (level === "high") return "bg-amber-500/10 text-amber-400 border border-amber-500/20";
    if (level === "moderate") return "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20";
    return "bg-green-500/10 text-green-400 border border-green-500/20";
  };

  const handleWardItemClick = (wardNo, polygonCoords) => {
    setClickedWardNo(wardNo);
    if (modalMapInstance && polygonCoords) {
      let latSum = 0, lngSum = 0;
      polygonCoords.forEach(c => {
        latSum += c[0];
        lngSum += c[1];
      });
      modalMapInstance.setView([latSum / polygonCoords.length, lngSum / polygonCoords.length], 15);
    }
  };

  const riskArray = Object.values(localWardRisks);

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
          <div className="flex items-center gap-2 text-amber-400">
            <AlertCircle size={16} />
            <span className="text-sm font-bold font-sans uppercase tracking-wide text-white">Ward Hotspots & Risk Predictions</span>
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
          
          {/* Left Column: Forecast Cards */}
          <div className="w-full md:w-[480px] border-r border-[#1b1d24]/60 flex flex-col p-4 overflow-hidden h-full">
            <div className="text-[13px] text-[#9ca3af] uppercase tracking-wider font-bold mb-3 flex-none">
              Municipal Risk Forecast ({riskArray.length})
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 no-scrollbar min-h-0">
              {Object.entries(localWardRisks).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="flex items-center gap-2 mb-1.5 animate-pulse">
                    <span className="text-sm font-bold text-white uppercase tracking-wider">Generating Risk Forecast...</span>
                  </div>
                  <span className="text-[12px] text-[#9ca3af] uppercase">Running predictive models</span>
                </div>
              ) : (
                Object.entries(localWardRisks).map(([wardNoStr, risk]) => {
                  const wardNoVal = parseInt(wardNoStr);
                  const matchingPolygon = WARD_POLYGONS.find(wp => wp.wardNo === wardNoVal);
                  const canonicalWard = CANONICAL_WARDS.find(w => w.wardNo === wardNoVal);
                  const isHighlighted = clickedWardNo === wardNoVal || hoveredWardNo === wardNoVal;

                  const displayTitle = canonicalWard ? `Ward ${wardNoVal} - ${canonicalWard.wardName}` : `Ward ${wardNoVal}`;
                  const displayZone = canonicalWard ? canonicalWard.zone : "";

                  return (
                    <div 
                      key={wardNoStr} 
                      onClick={() => matchingPolygon && handleWardItemClick(matchingPolygon.wardNo, matchingPolygon.polygon)}
                      onMouseEnter={() => matchingPolygon && setHoveredWardNo(matchingPolygon.wardNo)}
                      onMouseLeave={() => setHoveredWardNo(null)}
                      className={`border p-4 rounded-lg flex flex-col gap-2 transition-all cursor-pointer ${
                        isHighlighted ? "border-amber-500/40 bg-amber-950/5 shadow-[0_0_12px_rgba(245,158,11,0.08)]" : "border-[#1b1d24]/60 hover:border-amber-500/20 bg-[#16171d]/20"
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex flex-col">
                          <span className="font-bold text-white text-sm">{displayTitle}</span>
                          {displayZone && (
                            <span className="text-[11px] text-[#7d8590] mt-0.5 uppercase tracking-wide">
                              {displayZone} Sector
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {risk.isAIAnalysed ? (
                            <span className="text-[11px] uppercase tracking-wider px-1.5 py-0.5 rounded font-bold border border-purple-500/20 bg-purple-950/15 text-purple-400">
                              🤖 AI Certified
                            </span>
                          ) : (
                            <span className="text-[11px] uppercase tracking-wider px-1.5 py-0.5 rounded font-bold border border-blue-500/20 bg-blue-950/15 text-blue-400">
                              ⚖ Heuristic
                            </span>
                          )}
                          <span className={`text-[11px] uppercase tracking-wider px-1.5 py-0.5 rounded font-bold ${getRiskColor(risk.riskLevel)}`}>
                            {risk.riskLevel}
                          </span>
                        </div>
                      </div>
                      
                      {risk.confidence && (
                        <div className="text-[12px] text-[#7d8590] font-semibold">
                          Confidence: {(risk.confidence * 100).toFixed(0)}%
                        </div>
                      )}

                      <p className="text-[13px] text-[#8e8e8f] leading-relaxed font-sans italic mt-0.5">
                        {risk.reason}
                      </p>
                      
                      {risk.recommendedAction && (
                        <div className="text-[12px] text-cyan-400 font-bold leading-normal font-sans mt-0.5 border-t border-[#1b1d24]/30 pt-1.5">
                          Action Plan: {risk.recommendedAction}
                        </div>
                      )}

                      {/* AI Diagnostics Trigger Button */}
                      {!risk.isAIAnalysed && wardNoVal && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            runAiDiagnosticsForWard(wardNoVal, risk.wardName);
                          }}
                          disabled={loadingAIWards[wardNoVal]}
                          className="mt-2 bg-purple-600/10 hover:bg-purple-600 text-purple-400 hover:text-white px-2.5 py-1 rounded border border-purple-500/20 text-[12px] font-bold font-mono transition-colors cursor-pointer w-full flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {loadingAIWards[wardNoVal] ? (
                            <>
                              <span className="w-2.5 h-2.5 rounded-full border border-purple-400 border-t-transparent animate-spin"></span>
                              Running AI...
                            </>
                          ) : (
                            <>
                              🤖 Run AI Diagnostics
                            </>
                          )}
                        </button>
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
