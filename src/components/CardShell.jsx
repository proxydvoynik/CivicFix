/**
 * CardShell – shared card surface for all side-panel sections.
 * Dark, subtle, consistent. Spacing is handled by the parent container.
 */
export default function CardShell({ children, className = '', id, theme, isPriority = false }) {
  const isLight = theme === 'light';
  
  const base = isLight
    ? 'bg-gradient-to-b from-white to-slate-50/95 backdrop-blur-xl border border-slate-200/80 rounded-xl p-5 relative overflow-hidden transition-all duration-300 hover:border-slate-300 hover:shadow-[0_8px_24px_rgba(0,0,0,0.04)]'
    : 'bg-gradient-to-b from-[#0f111a]/90 to-[#07090d]/98 backdrop-blur-xl border border-[#1e2433]/70 rounded-xl p-5 relative overflow-hidden transition-all duration-300 hover:border-[#2b354c]/95 hover:shadow-[0_8px_32px_rgba(0,0,0,0.5)]';
  
  return (
    <div id={id} className={`${base} ${className}`.trim()}>
      {/* Corner Brackets */}
      <div className={`absolute top-0 left-0 w-2.5 h-2.5 border-t border-l rounded-tl-sm pointer-events-none transition-colors duration-300 ${
        isLight ? 'border-blue-500/15' : 'border-blue-500/25'
      }`}></div>
      <div className={`absolute top-0 right-0 w-2.5 h-2.5 border-t border-r rounded-tr-sm pointer-events-none transition-colors duration-300 ${
        isLight ? 'border-blue-500/15' : 'border-blue-500/25'
      }`}></div>
      <div className={`absolute bottom-0 left-0 w-2.5 h-2.5 border-b border-l rounded-bl-sm pointer-events-none transition-colors duration-300 ${
        isLight ? 'border-blue-500/15' : 'border-blue-500/25'
      }`}></div>
      <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 border-b border-r rounded-bl-sm pointer-events-none transition-colors duration-300 ${
        isLight ? 'border-blue-500/15' : 'border-blue-500/25'
      }`}></div>
      
      {/* Subtle scanline background effect */}
      <div className={`absolute inset-0 bg-[length:100%_4px] pointer-events-none ${
        isLight ? 'bg-[linear-gradient(rgba(0,0,0,0.005)_50%,transparent_50%)]' : 'bg-[linear-gradient(rgba(18,24,38,0.02)_50%,transparent_50%)]'
      }`}></div>

      {/* Recreated Magic UI Border Beam (Animated glow border overlay) */}
      {isPriority && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none rounded-xl" style={{ overflow: 'visible' }}>
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            rx="12"
            fill="none"
            stroke="url(#border-beam-gradient)"
            strokeWidth="1.5"
            className="animate-border-beam"
            style={{
              strokeDasharray: '120 480',
              strokeDashoffset: 0,
            }}
          />
          <defs>
            <linearGradient id="border-beam-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="transparent" />
              <stop offset="50%" stopColor={isLight ? '#3b82f6' : '#00f5d4'} stopOpacity="0.8" />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>
          </defs>
        </svg>
      )}
      
      <div className="relative z-10 h-full flex flex-col">
        {children}
      </div>
    </div>
  );
}
