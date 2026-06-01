
import { type Table, useStore } from '../../store';

interface TableGroupProps {
  table: Table;
  onEdit: () => void;
}

export function TableGroup({ table, onEdit }: TableGroupProps) {
  const { guests, tagColors } = useStore();

  const roundRadius = 60;
  const rectW = 160;
  const rectH = 80;
  const seatRadius = 18;
  const seatDist = 55;

  const count = table.seats.length;

  return (
    <g 
      className="canvas-table cursor-grab active:cursor-grabbing" 
      data-id={table.id}
      transform={`translate(${table.x}, ${table.y}) rotate(${table.rotation})`}
    >
      {/* Base Shape */}
      {table.type === 'round' ? (
        <circle 
          className="fill-bg-card stroke-border stroke-[3px] hover:stroke-slate-400 transition-colors" 
          r={roundRadius} 
          filter="url(#soft-shadow)" 
        />
      ) : (
        <rect 
          className="fill-bg-card stroke-border stroke-[3px] hover:stroke-slate-400 transition-colors"
          width={rectW} 
          height={rectH} 
          x={-rectW / 2} 
          y={-rectH / 2} 
          rx={12}
          filter="url(#soft-shadow)"
        />
      )}

      {/* Label */}
      <text 
        className="font-ui text-base font-extrabold fill-text-main text-anchor-middle cursor-pointer pointer-events-auto hover:fill-primary transition-colors"
        y={6}
        onClick={(e) => {
          e.stopPropagation();
          onEdit();
        }}
      >
        {table.name}
      </text>

      {/* Seats */}
      {table.seats.map((guestId, idx) => {
        let x = 0, y = 0;
        
        if (table.type === 'round') {
          const angle = (idx / count) * Math.PI * 2;
          const dist = roundRadius + seatDist;
          x = Math.cos(angle) * dist;
          y = Math.sin(angle) * dist;
        } else {
          const perSide = Math.ceil(count / 2);
          const side = idx < perSide ? -1 : 1;
          const subIdx = idx % perSide;
          const step = rectW / (perSide + 0.5);
          x = -rectW / 2 + (subIdx + 0.75) * step;
          y = side * (rectH / 2 + seatDist);
        }

        const guest = guestId ? guests.find(g => g.id === guestId) : null;
        const tagColor = guest?.labels?.[0] ? tagColors[guest.labels[0]] : null;
        
        return (
          <g key={`${table.id}-seat-${idx}`} className="canvas-seat" data-table-id={table.id} data-seat-idx={idx}>
            <circle 
              cx={x} 
              cy={y} 
              r={seatRadius}
              className={`stroke-2 cursor-pointer transition-all hover:brightness-95 hover:stroke-[3px] pointer-events-auto ${guest?.isQuestion ? 'stroke-dashed animate-[pulse-stroke_2s_infinite]' : ''}`}
              style={{
                fill: tagColor || (guest ? '#6366f1' : '#f1f5f9'),
                stroke: tagColor || (guest ? '#4f46e5' : '#cbd5e1'),
              }}
              onPointerDown={() => {
                // If there's a guest, maybe we initiate drag. But Canvas.tsx handles this roughly.
                // We'll refine seat interactions in phase 4.
              }}
            >
              {guest && <title>{guest.name} ({guest.group})</title>}
            </circle>

            {guest && (
              <text 
                x={x} 
                y={y + (y > 0 ? 32 : -22)} 
                className="font-ui text-xs font-bold fill-text-main text-anchor-middle pointer-events-none"
                transform={`rotate(${-table.rotation}, ${x}, ${y + (y > 0 ? 32 : -22)})`}
              >
                {guest.name.split(' ')[0]}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
}
