
import { type Table, useStore } from '../../store';

interface TableGroupProps {
  table: Table;
  onEdit: () => void;
  hoveredTarget?: { tableId: string, seatIdx: number } | null;
}

function getFitFontSize(text: string, maxWidth: number, maxSize = 14, minSize = 8): number {
  const ctx = document.createElement('canvas').getContext('2d');
  if (!ctx) return maxSize;
  let size = maxSize;
  while (size >= minSize) {
    ctx.font = `800 ${size}px Nunito`;
    if (ctx.measureText(text).width <= maxWidth) return size;
    size -= 0.5;
  }
  return minSize;
}

export function TableGroup({ table, onEdit, hoveredTarget }: TableGroupProps) {
  const { guests, tagColors, updateTable } = useStore();

  const roundRadius = 60;
  const rectW = 160;
  const rectH = 80;
  const seatRadius = 18;
  const seatDist = 35;

  const count = table.seats.length;

  const rotateBtn = table.type === 'round'
    ? { x: 0, y: -(roundRadius + seatDist + 18) }
    : { x: rectW / 2 + 18, y: -(rectH / 2 + 18) };

  const nameMaxWidth = table.type === 'round' ? roundRadius * 2 * 0.75 : rectW * 0.85;
  const nameFontSize = getFitFontSize(table.name, nameMaxWidth);

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

      {/* Label (click to open settings) */}
      <text
        x={0}
        y={0}
        dy=".35em"
        textAnchor="middle"
        fontSize={nameFontSize}
        fill="#0f172a"
        className="font-ui font-extrabold cursor-pointer pointer-events-auto hover:fill-[#6366f1] transition-colors"
        transform={`rotate(${-table.rotation}, 0, 0)`}
        onPointerDown={e => {
          e.stopPropagation();
          onEdit();
        }}
      >
        {table.name}
      </text>

      {/* Rotate button (click to rotate 45°) */}
      <g
        className="canvas-rotate-btn cursor-pointer pointer-events-auto"
        onPointerDown={e => {
          e.stopPropagation();
          updateTable(table.id, { rotation: ((table.rotation || 0) + 45) % 360 });
        }}
      >
        <circle cx={rotateBtn.x} cy={rotateBtn.y} r={14} fill="white" stroke="#cbd5e1" strokeWidth={2} className="hover:stroke-primary transition-colors" />
        <text x={rotateBtn.x} y={rotateBtn.y + 5} textAnchor="middle" className="fill-slate-500 text-base pointer-events-none select-none">↻</text>
      </g>

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
        
        const isHovered = hoveredTarget?.tableId === String(table.id) && hoveredTarget?.seatIdx === idx;
        
        const isTop = y < 0;
        let labelY = y + (isTop ? -20 : 28);
        
        // Stagger labels on rect tables to prevent overlap
        if (table.type === 'rect') {
          const subIdx = idx % Math.ceil(count / 2);
          if (subIdx % 2 === 1) {
            labelY += (isTop ? -14 : 14);
          }
        }
        
        return (
          <g key={`${table.id}-seat-${idx}`} className="canvas-seat" data-table-id={table.id} data-seat-idx={idx}>
            <circle 
              cx={x} 
              cy={y} 
              r={seatRadius}
              className={`stroke-2 cursor-pointer transition-all hover:brightness-95 hover:stroke-[3px] pointer-events-auto ${guest?.isQuestion ? 'stroke-dashed animate-[pulse-stroke_2s_infinite]' : ''}`}
              style={{
                fill: tagColor || (guest ? '#6366f1' : '#f1f5f9'),
                stroke: isHovered ? '#000' : (tagColor || (guest ? '#4f46e5' : '#cbd5e1')),
                strokeWidth: isHovered ? 4 : undefined
              }}
              onPointerDown={() => {
                // Handled in Canvas
              }}
            >
              {guest && <title>{guest.name} ({guest.labels?.[0] || guest.group})</title>}
            </circle>

            {guest && (
              <text 
                x={x} 
                y={labelY} 
                textAnchor="middle"
                fill="#0f172a"
                className="font-ui text-xs font-bold pointer-events-none"
                transform={`rotate(${-table.rotation}, ${x}, ${labelY})`}
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
