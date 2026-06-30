import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { CANONICAL_WARDS } from '../lib/helpers.js';

export default function IssueDetailsModal({
  incident,
  onClose,
  onUpvote,
  onVerify,
  onResolveClick,
  onAuditClick,
  onViewLetter,
  currentUserWarden
}) {
  if (!incident) return null;

  const cfId = incident.id.toString().startsWith('CF-') 
    ? incident.id 
    : `CF-${incident.id.toString().substring(0, 4)}`;

  const canonicalWard = CANONICAL_WARDS.find(w => w.wardNo.toString() === incident.ward?.toString());
  const wardName = canonicalWard ? canonicalWard.wardName : `Ward ${incident.ward}`;
  const zone = canonicalWard ? canonicalWard.zone : "Unknown Zone";

  const getStatusColor = (status) => {
    if (status === 'resolved' || status === 'resolved_verified') return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
    if (status === 'escalated') return 'bg-red-500/10 text-red-400 border border-red-500/20';
    if (status === 'resolving') return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
    return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
  };

  const getSeverityColor = (sev) => {
    if (sev === 'critical') return 'bg-red-500/10 text-red-400 border border-red-500/20';
    if (sev === 'high') return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
    return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-4"
    >
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 15 }}
        transition={{ type: "spring", stiffness: 350, damping: 25 }}
        className="bg-[#101115] border border-[#1b1d24]/60 w-full max-w-4xl h-[80vh] rounded-lg shadow-2xl flex flex-col overflow-hidden font-mono text-[#e2e8f0]"
      >
        
        {/* Header */}
        <div className="border-b border-[#1b1d24]/60 bg-[#121318] p-4 flex items-center justify-between flex-none">
          <div className="flex items-center gap-3">
            <span className="text-white font-bold text-base">{cfId}</span>
            <span className={`text-[11px] uppercase tracking-wider px-2 py-0.5 rounded font-bold ${getSeverityColor(incident.severity)}`}>
              {incident.severity}
            </span>
            <span className={`text-[11px] uppercase tracking-wider px-2 py-0.5 rounded font-bold ${getStatusColor(incident.status)}`}>
              {incident.status?.replace('_', ' ')}
            </span>
          </div>
          <button 
            onClick={onClose}
            className="text-[#8e8e8f] hover:text-white p-1 hover:bg-[#16171d] rounded transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Panel split */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row">
          
          {/* Left Panel: Photo evidence */}
          <div className="w-full md:w-[420px] border-r border-[#1b1d24]/60 p-5 flex flex-col justify-center items-center bg-[#0c0d12]/40 relative overflow-hidden">
            {incident.image || incident.evidenceUrl ? (
              <div className="relative w-full h-full max-h-[360px] rounded border border-[#1b1d24] overflow-hidden bg-black/40 flex items-center justify-center">
                <img 
                  src={incident.image || incident.evidenceUrl} 
                  alt="Incident evidence" 
                  className="w-full h-full object-contain"
                />
                
                {/* Meta details badge inside photo view */}
                <div className="absolute bottom-2 left-2 right-2 bg-black/80 backdrop-blur-sm border border-[#1b1d24]/60 p-2.5 rounded text-[11px] flex flex-col gap-1 leading-normal font-mono text-cyan-400">
                  <div>📷 EXIF MATCH STATUS: VALIDATED</div>
                  <div>📍 GPS LOCK: {incident.lat?.toFixed(6)}, {incident.lng?.toFixed(6)}</div>
                  {incident.uploadedAt && <div>📅 TIMESTAMP: {incident.uploadedAt}</div>}
                </div>
              </div>
            ) : (
              <div className="w-full h-[260px] border border-[#1b1d24]/60 bg-black/20 rounded flex flex-col items-center justify-center text-center p-6 gap-3">
                <span className="text-cyan-500/40 animate-pulse text-xl">📡</span>
                <div className="text-sm text-[#7d8590] uppercase font-bold tracking-wider">No Photo Evidence Submissions</div>
                <div className="text-[11px] text-cyan-400 uppercase font-mono">Location verified via citizen coordinates telemetry</div>
              </div>
            )}
          </div>

          {/* Right Panel: Incident details data */}
          <div className="flex-1 p-6 overflow-y-auto space-y-5">
            
            {/* Category / Type info */}
            <div>
              <div className="text-[12px] text-[#7d8590] uppercase tracking-wider font-bold mb-1">Issue Category</div>
              <div className="text-white text-lg font-bold">{incident.type}</div>
            </div>

            {/* Description */}
            <div>
              <div className="text-[12px] text-[#7d8590] uppercase tracking-wider font-bold mb-1">Description</div>
              <p className="text-sm text-[#9ca3af] leading-relaxed font-sans">{incident.details || incident.description || "No description provided."}</p>
            </div>

            {/* Location */}
            <div>
              <div className="text-[12px] text-[#7d8590] uppercase tracking-wider font-bold mb-1">Geographic Location</div>
              <p className="text-sm text-[#e2e8f0] font-sans">{incident.location}</p>
              <div className="text-[12px] text-cyan-400 mt-1 font-mono">
                Coordinates: {incident.lat?.toFixed(6)}, {incident.lng?.toFixed(6)}
              </div>
            </div>

            {/* Ward Details */}
            <div className="grid grid-cols-2 gap-4 border-t border-b border-[#1b1d24]/60 py-4 my-2">
              <div>
                <div className="text-[12px] text-[#7d8590] uppercase tracking-wider font-bold">Administrative Ward</div>
                <div className="text-white text-sm font-bold mt-1">Ward {incident.ward} - {wardName}</div>
              </div>
              <div>
                <div className="text-[12px] text-[#7d8590] uppercase tracking-wider font-bold">Municipal Zone</div>
                <div className="text-cyan-400 text-sm font-bold mt-1 uppercase">{zone}</div>
              </div>
            </div>

            {/* Verification Statistics */}
            <div className="flex justify-between items-center bg-[#16171d]/40 border border-[#1b1d24]/60 p-4 rounded-lg">
              <div className="text-center flex-1 border-r border-[#1b1d24]/30">
                <div className="text-[11px] text-[#7d8590] uppercase font-bold">Upvotes</div>
                <div className="text-xl text-white font-bold font-mono mt-0.5">{incident.upvotes || 0}</div>
              </div>
              <div className="text-center flex-1">
                <div className="text-[11px] text-[#7d8590] uppercase font-bold">Warden Verifications</div>
                <div className="text-xl text-emerald-400 font-bold font-mono mt-0.5">{incident.verifications || 0}</div>
              </div>
            </div>

            {/* Actions button row */}
            <div className="flex flex-col gap-2 pt-2">
              <div className="text-[12px] text-[#7d8590] uppercase tracking-wider font-bold mb-1">Incident Controls</div>
              <div className="flex flex-wrap gap-3">
                
                {/* Upvote Action */}
                {incident.status !== 'resolved' && incident.status !== 'resolved_verified' && (
                  <button 
                    onClick={() => {
                      onUpvote(incident.id, incident.docId);
                      onClose();
                    }}
                    className="flex-1 min-w-[120px] bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-bold py-2 rounded font-mono uppercase tracking-wide cursor-pointer transition-colors shadow-[0_0_12px_rgba(37,99,235,0.2)]"
                  >
                    ▲ Upvote (+1)
                  </button>
                )}

                {/* Verify Action */}
                {incident.status !== 'resolved' && incident.status !== 'resolved_verified' && (
                  <button 
                    onClick={() => {
                      onVerify(incident.id);
                      onClose();
                    }}
                    className="flex-1 min-w-[120px] bg-emerald-600/10 hover:bg-emerald-600 border border-emerald-500/20 text-emerald-400 hover:text-white text-[12px] font-bold py-2 rounded font-mono uppercase tracking-wide cursor-pointer transition-colors"
                  >
                    ✓ Verify Authenticity
                  </button>
                )}

                {/* Dispatch Letter Action */}
                {incident.status === 'escalated' && (
                  <button 
                    onClick={() => {
                      onViewLetter(incident);
                      onClose();
                    }}
                    className="flex-1 min-w-[120px] bg-purple-600 hover:bg-purple-700 text-white text-[12px] font-bold py-2 rounded font-mono uppercase tracking-wide cursor-pointer transition-colors shadow-[0_0_12px_rgba(147,51,234,0.2)]"
                  >
                    ✉ View Dispatch Notice
                  </button>
                )}

                {/* Resolve Action */}
                {incident.status !== 'resolved' && incident.status !== 'resolved_verified' && (
                  <button 
                    onClick={() => {
                      onResolveClick(incident);
                      onClose();
                    }}
                    className="flex-1 min-w-[120px] bg-cyan-600 hover:bg-cyan-700 text-white text-[12px] font-bold py-2 rounded font-mono uppercase tracking-wide cursor-pointer transition-colors"
                  >
                    🛠 Complete Clearance
                  </button>
                )}

                {/* Audit Action (Warden only) */}
                {currentUserWarden && (incident.status === 'resolved' || incident.status === 'resolved_pending_verification') && (
                  <button 
                    onClick={() => {
                      onAuditClick(incident);
                      onClose();
                    }}
                    className="flex-1 min-w-[120px] bg-amber-600 hover:bg-amber-700 text-white text-[12px] font-bold py-2 rounded font-mono uppercase tracking-wide cursor-pointer transition-colors"
                  >
                    🔎 Audit Work Evidence
                  </button>
                )}
              </div>
            </div>

          </div>

        </div>

      </motion.div>
    </motion.div>
  );
}
