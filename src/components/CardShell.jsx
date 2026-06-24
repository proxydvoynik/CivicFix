import React from 'react';

/**
 * CardShell – shared card surface for all side-panel sections.
 * Dark, subtle, consistent. Spacing is handled by the parent container.
 */
export default function CardShell({ children, className = '' }) {
  const base = 'bg-[#0f1117]/60 backdrop-blur-md border border-[#1b1d24]/50 rounded-lg p-4';
  return <div className={`${base} ${className}`.trim()}>{children}</div>;
}
