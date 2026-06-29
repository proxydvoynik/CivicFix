/**
 * CardShell – shared card surface for all side-panel sections.
 * Dark, subtle, consistent. Spacing is handled by the parent container.
 */
export default function CardShell({ children, className = '', id, theme }) {
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
      <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 border-b border-r rounded-br-sm pointer-events-none transition-colors duration-300 ${
        isLight ? 'border-blue-500/15' : 'border-blue-500/25'
      }`}></div>
      
      {/* Subtle scanline background effect */}
      <div className={`absolute inset-0 bg-[length:100%_4px] pointer-events-none ${
        isLight ? 'bg-[linear-gradient(rgba(0,0,0,0.005)_50%,transparent_50%)]' : 'bg-[linear-gradient(rgba(18,24,38,0.02)_50%,transparent_50%)]'
      }`}></div>
      
      <div className="relative z-10 h-full flex flex-col">
        {children}
      </div>
    </div>
  );
}

