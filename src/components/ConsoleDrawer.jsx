import { useState, useMemo } from 'react';

export default function ConsoleDrawer({ logs = [] }) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Compute the last log entry to display in the header bar
  const lastLog = useMemo(() => {
    return logs.length > 0 ? logs[0] : 'Console idle — awaiting logs...';
  }, [logs]);

  // Display maximum of 50 logs, newest first
  const displayedLogs = useMemo(() => {
    return logs.slice(0, 50);
  }, [logs]);

  return (
    <div
      style={{
        height: isExpanded ? '200px' : '32px',
        transition: 'height 300ms ease'
      }}
      className="fixed bottom-0 left-0 right-0 z-50 bg-[#0c0e13]/95 backdrop-blur border-t border-[#1b1d24] flex flex-col overflow-hidden font-mono"
    >
      {/* Header bar (always visible) */}
      <div className="h-8 min-h-[32px] px-4 flex items-center justify-between border-b border-[#1b1d24]/50 select-none">
        {/* Left Section: Title and Green pulsing status dot */}
        <div className="flex items-center gap-2 text-[10px] sm:text-xs font-bold text-white tracking-wide">
          <span>⚡ AI AGENT CONSOLE</span>
          {logs.length > 0 && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          )}
        </div>

        {/* Center Section: Last log entry preview */}
        <div className="flex-1 mx-4 text-center hidden md:block">
          <p className="text-[10px] sm:text-xs text-gray-500 truncate max-w-xl mx-auto font-mono">
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

      {/* Expanded Logs Panel */}
      <div className="flex-1 overflow-y-auto no-scrollbar bg-[#090b0e]/95 p-4 space-y-1.5">
        {displayedLogs.length === 0 ? (
          <div className="text-xs text-gray-600 italic select-none">
            &gt;&gt; No log entries recorded.
          </div>
        ) : (
          displayedLogs.map((log, idx) => (
            <div key={idx} className="flex items-start text-xs leading-relaxed">
              <span className="text-[#00f5d4] mr-2 select-none font-bold">&gt;&gt;</span>
              <span className="text-[#9ca3af] whitespace-pre-wrap break-all">{log}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
