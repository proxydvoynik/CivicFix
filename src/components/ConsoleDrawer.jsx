import { useState, useMemo } from 'react';
import { Heart } from 'lucide-react';

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
    <div
      style={{
        height: isExpanded ? '280px' : '80px',
        transition: 'height 300ms ease'
      }}
      className="fixed bottom-0 left-0 right-0 z-50 bg-[#0c0e13]/90 backdrop-blur border-t border-[#1b1d24]/60 flex flex-col overflow-hidden font-mono"
    >
      {/* Integrated Joined Footer */}
      <footer className="h-12 flex-shrink-0 flex flex-col items-center justify-center border-b border-[#1b1d24]/40 bg-[#0c0e13]/10 py-1.5 px-4 text-center text-[#7d8590] text-[10px] leading-relaxed relative z-10">
        <div>CivicFix v0.4.0 • Thalassery Town Community Command Center.</div>
        <div className="mt-0.5 flex items-center justify-center gap-1.5 flex-wrap">
          <span>Developed with ❤️ by <span className={`${theme === 'light' ? 'text-[#1e1b4b]' : 'text-white'} font-bold`}>Harshith</span> for the</span>
          <span className={`${theme === 'light' ? 'text-[#1e1b4b] hover:text-red-500' : 'text-white hover:text-red-500'} transition-colors cursor-pointer flex items-center gap-0.5 font-bold`}>
            Vibe2Ship Hackathon <Heart className="fill-red-500 stroke-red-500 inline-block shrink-0" size={11} />
          </span>
        </div>
      </footer>

      {/* Header bar (always visible) */}
      <div className="h-8 min-h-[32px] px-4 border-b border-[#1b1d24]/50 select-none flex items-center w-full">
        <div className="max-w-6xl mx-auto w-full flex items-center justify-between">
          {/* Left Section: Title and Green pulsing status dot */}
          <div className="flex items-center gap-2 text-[10px] sm:text-xs font-bold text-white tracking-wide">
            <span>⚡ TRIAGE AGENT COMMAND LOG</span>
            {logs.length > 0 && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00f5d4] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00f5d4]"></span>
              </span>
            )}
          </div>

          {/* Center Section: Last log entry preview */}
          <div className="flex-1 mx-8 text-center hidden md:block">
            <p className="text-[10px] sm:text-xs text-gray-400 truncate max-w-xl mx-auto font-mono">
              {lastLog}
            </p>
          </div>

          {/* Right Section: Toggle Button */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-[10px] sm:text-xs font-bold text-[#00f5d4] hover:underline focus:outline-none uppercase tracking-wider"
          >
            {isExpanded ? '▼ COLLAPSE' : '▲ EXPAND'}
          </button>
        </div>
      </div>

      {/* Expanded Logs Panel */}
      <div className="flex-1 overflow-y-auto no-scrollbar bg-[#090b0e]/90 p-4">
        <div className="max-w-6xl mx-auto w-full space-y-1.5 text-left">
          {displayedLogs.length === 0 ? (
            <div className="text-xs text-gray-600 italic select-none">
              &gt;&gt; No log entries recorded.
            </div>
          ) : (
            displayedLogs.map((log, idx) => (
              <div key={idx} className="flex items-start text-xs leading-relaxed">
                <span className="text-[#00f5d4] mr-2 select-none font-bold">&gt;&gt;</span>
                <span className="text-[#9ca3af] whitespace-pre-wrap break-all">{formatLog(log)}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
