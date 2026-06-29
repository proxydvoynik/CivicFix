import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ConsoleDrawer({ logs = [], theme }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatLog = (log) => {
    if (!log) return '';
    if (typeof log === 'string') return log;
    if (log.text) return log.text;
    if (log.decision) {
      return `[${log.agentType || 'Agent'}] ${log.decision.toUpperCase()}: ${log.reason} (${(log.confidence * 100).toFixed(0)}% conf)`;
    }
    return JSON.stringify(log);
  };

  // Compute the last log entry to display in the header bar
  const lastLog = useMemo(() => {
    return logs.length > 0 ? formatLog(logs[0]) : 'Console idle — awaiting logs...';
  }, [logs]);

  // Display maximum of 50 logs, newest first
  const displayedLogs = useMemo(() => {
    return logs.slice(0, 50);
  }, [logs]);

  return (
    <motion.div
      initial={false}
      animate={{ height: isExpanded ? 280 : 32 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className={`fixed bottom-0 left-0 right-0 z-50 backdrop-blur-xl border-t flex flex-col overflow-hidden font-mono transition-colors duration-300 ${
        theme === 'light'
          ? 'bg-white/95 border-slate-200/85 shadow-[0_-8px_32px_rgba(0,0,0,0.05)] text-slate-800'
          : 'bg-[#07090d]/95 border-[#1e2333]/85 shadow-[0_-8px_32px_rgba(0,0,0,0.6)] text-[#e2e8f0]'
      }`}
    >
      {/* Blinking Cursor Keyframes */}
      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        .blinking-caret {
          animation: blink 1s step-end infinite;
        }
      `}</style>

      {/* Header bar (always visible) */}
      <div className={`h-8 min-h-[32px] px-4 border-b select-none flex items-center w-full transition-colors duration-300 cursor-pointer ${
        theme === 'light' ? 'border-slate-200/60 bg-slate-100/70 hover:bg-slate-200/50' : 'border-[#1e2333]/40 bg-[#0a0c10]/70 hover:bg-[#121622]/80'
      }`} onClick={() => setIsExpanded(!isExpanded)}>
        <div className="max-w-6xl mx-auto w-full flex items-center justify-between">
          {/* Left Section: Title and Green pulsing status dot */}
          <div className={`flex items-center gap-2 text-[9px] sm:text-[10px] font-bold tracking-wider transition-colors duration-300 ${theme === 'light' ? 'text-slate-800' : 'text-white'}`}>
            <span className={`transition-colors duration-300 ${theme === 'light' ? 'text-blue-600' : 'text-cyan-400'}`}>⚡ TRIAGE AGENT COMMAND LOG</span>
            {logs.length > 0 && (
              <span className="relative flex h-1.5 w-1.5">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 transition-colors duration-300 ${theme === 'light' ? 'bg-blue-500' : 'bg-[#00f5d4]'}`}></span>
                <span className={`relative inline-flex rounded-full h-1.5 w-1.5 transition-colors duration-300 ${theme === 'light' ? 'bg-blue-500' : 'bg-[#00f5d4]'}`}></span>
              </span>
            )}
          </div>

          {/* Center Section: Last log entry preview with terminal cursor */}
          <div className="flex-1 mx-8 text-center hidden md:block">
            <AnimatePresence mode="wait">
              <motion.p 
                key={lastLog}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.15 }}
                className={`text-[10px] truncate max-w-xl mx-auto font-mono flex items-center justify-center gap-1 transition-colors duration-300 ${theme === 'light' ? 'text-slate-500' : 'text-gray-400'}`}
              >
                <span>{lastLog}</span>
                {logs.length > 0 && <span className={`w-1.5 h-3 blinking-caret inline-block transition-colors duration-300 ${theme === 'light' ? 'bg-blue-500' : 'bg-[#00f5d4]'}`}></span>}
              </motion.p>
            </AnimatePresence>
          </div>

          {/* Right Section: Toggle Button */}
          <button
            className={`text-[9px] font-bold transition-colors uppercase tracking-widest border px-2 py-0.5 rounded-md cursor-pointer ${
              theme === 'light'
                ? 'text-blue-700 hover:text-blue-800 bg-blue-100 border-blue-200'
                : 'text-[#00f5d4] hover:text-[#00f5d4]/80 bg-cyan-950/30 border-cyan-500/20'
            }`}
          >
            {isExpanded ? '▼ COLLAPSE' : '▲ EXPAND'}
          </button>
        </div>
      </div>

      {/* Expanded Logs Panel */}
      <div className={`flex-1 overflow-y-auto no-scrollbar p-4 transition-colors duration-300 ${theme === 'light' ? 'bg-white/95' : 'bg-[#050608]/95'}`}>
        <div className="max-w-6xl mx-auto w-full space-y-1.5 text-left flex flex-col-reverse justify-end">
          {displayedLogs.length === 0 ? (
            <div className={`text-[10px] italic select-none transition-colors duration-300 ${theme === 'light' ? 'text-slate-400' : 'text-gray-600'}`}>
              &gt;&gt; Console idle. Awaiting operations feed...
            </div>
          ) : (
            displayedLogs.map((log, idx) => (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
                key={idx} 
                className="flex items-start text-[10px] sm:text-xs leading-relaxed font-mono"
              >
                <span className={`mr-2.5 select-none font-bold transition-colors duration-300 mt-0.5 ${theme === 'light' ? 'text-blue-600' : 'text-[#00f5d4]'}`}>&gt;&gt;</span>
                <span className={`whitespace-pre-wrap break-all transition-colors duration-300 ${theme === 'light' ? 'text-slate-600' : 'text-gray-400'}`}>{formatLog(log)}</span>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </motion.div>
  );
}
