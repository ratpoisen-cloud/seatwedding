import { type Table, useStore } from '../../store';

interface TableGroupProps {
  table: Table;
  onEdit: () => void;
  selectedGuestId?: string | null;
  dropHover?: { tableId: string; seatIdx: number } | null;
  onSeatClick?: (tableId: string, seatIdx: number, guestId: string | null) => void;
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

function statusLabel(status: string, isQuestion: boolean): string {
  if (isQuestion) return 'Под вопросом';
  if (status === 'Приглашение принято') return 'Принято';
  if (status === 'Отклонено') return 'Отклонено';
  if (status === 'Не приглашен') return 'Не приглашен';
  return status;
}

export function TableGroup({ table, onEdit, selectedGuestId, dropHover, onSeatClick }: TableGroupProps) {
  const { guests, tagColors, updateTable } = useStore();

  const roundRadius = 60;
  const rectW = 160;
  const rectH = 80;
  const seatRadius = 18;
  const seatDist = 24;

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
      {table.type === 'round' ? (
        <circle
          className="fill-secondary stroke-accent/30 stroke-[2px] hover:stroke-accent transition-colors"
          r={roundRadius}
          filter="url(#soft-shadow)"
        />
      ) : (
        <rect
          className="fill-secondary stroke-accent/30 stroke-[2px] hover:stroke-accent transition-colors"
          width={rectW}
          height={rectH}
          x={-rectW / 2}
          y={-rectH / 2}
          rx={12}
          filter="url(#soft-shadow)"
        />
      )}

      <text
        x={0}
        y={0}
        dy=".35em"
        textAnchor="middle"
        fontSize={nameFontSize}
        fill="#283618"
        className="font-ui font-extrabold cursor-pointer pointer-events-auto hover:fill-accent transition-colors"
        transform={`rotate(${-table.rotation}, 0, 0)`}
        onPointerDown={e => {
          e.stopPropagation();
          onEdit();
        }}
      >
        {table.name}
      </text>

      <g
        className="canvas-rotate-btn cursor-pointer pointer-events-auto"
        onPointerDown={e => {
          e.stopPropagation();
          updateTable(table.id, { rotation: ((table.rotation || 0) + 45) % 360 });
        }}
      >
        <circle cx={rotateBtn.x} cy={rotateBtn.y} r={14} fill="#fefae0" stroke="#C9A25B" strokeWidth={2} className="hover:stroke-accent hover:fill-accent/10 transition-colors" />
        <text x={rotateBtn.x} y={rotateBtn.y + 5} textAnchor="middle" className="fill-text-muted text-base pointer-events-none select-none">↻</text>
      </g>

      {table.seats.map((guestId, idx) => {
        let x = 0, y = 0;
        let dist = 0;
        let section: 'top' | 'right' | 'bottom' | 'left' = 'top';
        let angle = 0;

        if (table.type === 'round') {
          angle = (idx / count) * Math.PI * 2;
          dist = roundRadius + seatDist;
          x = Math.cos(angle) * dist;
          y = Math.sin(angle) * dist;
        } else if (table.seatLayout === 'stadium') {
          const a = rectW / 2;
          const b = rectH / 2;
          const endX = a - b;
          const R = b + seatDist;
          const straightLen = 2 * endX;
          const semicircleLen = Math.PI * R;
          const totalLen = 2 * straightLen + 2 * semicircleLen;
          const pos = (idx / count) * totalLen;

          if (pos < straightLen) {
            section = 'top';
            x = -endX + (pos / straightLen) * (2 * endX);
            y = -R;
          } else if (pos < straightLen + semicircleLen) {
            section = 'right';
            const frac = (pos - straightLen) / semicircleLen;
            angle = -Math.PI / 2 + frac * Math.PI;
            x = endX + Math.cos(angle) * R;
            y = Math.sin(angle) * R;
          } else if (pos < straightLen + semicircleLen + straightLen) {
            section = 'bottom';
            const frac = (pos - straightLen - semicircleLen) / straightLen;
            x = endX - frac * (2 * endX);
            y = R;
          } else {
            section = 'left';
            const frac = (pos - straightLen - semicircleLen - straightLen) / semicircleLen;
            angle = Math.PI / 2 + frac * Math.PI;
            x = -endX + Math.cos(angle) * R;
            y = Math.sin(angle) * R;
          }
        } else {
          // rows layout (variant 1) — original two straight rows
          const perSide = Math.ceil(count / 2);
          const side = idx < perSide ? -1 : 1;
          const subIdx = idx % perSide;
          const step = rectW / (perSide + 0.5);
          x = -rectW / 2 + (subIdx + 0.75) * step;
          y = side * (rectH / 2 + seatDist);
        }

        const guest = guestId ? guests.find(g => g.id === guestId) : null;
        const tagColor = guest?.labels?.[0] ? tagColors[guest.labels[0]] : null;

        const isSelected = guestId && selectedGuestId === guestId;
        const isDropHover = dropHover?.tableId === table.id && dropHover.seatIdx === idx;

        const labelGap = table.type === 'round' ? 46 : 28;
        let labelX: number, labelY: number;

        if (table.type === 'round') {
          const lx = x;
          const ly = y - labelGap;
          const minR = roundRadius + seatDist + 10;
          if (Math.hypot(lx, ly) < minR) {
            const theta = Math.atan2(ly, lx);
            labelX = minR * Math.cos(theta);
            labelY = minR * Math.sin(theta);
          } else {
            labelX = lx;
            labelY = ly;
          }
        } else if (table.seatLayout === 'stadium') {
          switch (section) {
            case 'top':
              labelX = x;
              labelY = y - labelGap;
              break;
            case 'bottom':
              labelX = x;
              labelY = y + labelGap;
              break;
            case 'right':
            case 'left':
              labelX = x + Math.cos(angle) * labelGap;
              labelY = y + Math.sin(angle) * labelGap;
              break;
          }
        } else {
          const isTop = y < 0;
          labelX = x;
          labelY = y + (isTop ? -26 : 34);
          const subIdx = idx % Math.ceil(count / 2);
          if (subIdx % 2 === 1) {
            labelY += (isTop ? -14 : 14);
          }
        }

        const seatFill = isSelected
          ? '#283618'
          : isDropHover
            ? 'rgba(96, 108, 56, 0.15)'
            : (tagColor || (guest ? '#C9A25B' : '#fefae0'));
        const seatStroke = isSelected
          ? '#1a2610'
          : isDropHover
            ? '#606c38'
            : (tagColor || (guest ? '#B8924A' : '#606c38'));
        const seatStrokeWidth = isSelected ? 4 : (isDropHover ? 4 : undefined);

        const tooltipText = guest
          ? `${guest.name}\n${guest.labels?.[0] || guest.group || 'Без группы'}\n${statusLabel(guest.status, guest.isQuestion)}`
          : undefined;

        return (
          <g key={`${table.id}-seat-${idx}`} className="canvas-seat" data-table-id={table.id} data-seat-idx={idx}>
            <circle
              cx={x}
              cy={y}
              r={seatRadius}
              className={`stroke-2 cursor-pointer transition-all hover:brightness-95 hover:stroke-[3px] pointer-events-auto ${guest?.isQuestion ? 'stroke-dashed animate-[pulse-stroke_2s_infinite]' : ''}`}
              style={{
                fill: seatFill,
                stroke: seatStroke,
                strokeWidth: seatStrokeWidth,
              }}
              onPointerDown={e => {
                if (e.button !== 0) return;
                e.stopPropagation();
                onSeatClick?.(table.id, idx, guestId);
              }}
            >
              {tooltipText && <title>{tooltipText}</title>}
            </circle>

            {guest && (
              <text
                x={labelX}
                y={labelY}
                dy=".35em"
                textAnchor="middle"
                fill="#283618"
                className="font-ui text-xs font-bold pointer-events-none"
                transform={`rotate(${-table.rotation}, ${labelX}, ${labelY})`}
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
