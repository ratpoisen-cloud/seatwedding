
import { type Landmark as LandmarkType } from '../../store';

export function Landmark({ data }: { data: LandmarkType }) {
  return (
    <g 
      className="canvas-landmark cursor-grab active:cursor-grabbing" 
      transform={`translate(${data.x}, ${data.y})`}
    >
      {/* Soft shadow handled by CSS filter or SVG filter in Canvas */}
      <path d="M-60,0 C-60,-50 60,-50 60,0 Z" fill="#ef4444" stroke="#991b1b" strokeWidth="2" filter="url(#soft-shadow)"/>
      <circle cx="-25" cy="-20" r="10" fill="white"/>
      <circle cx="25" cy="-15" r="14" fill="white"/>
      <circle cx="0" cy="-35" r="8" fill="white"/>
      <rect x="-15" y="0" width="30" height="50" rx="6" fill="#fef3c7" stroke="#b45309" strokeWidth="2"/>
    </g>
  );
}
