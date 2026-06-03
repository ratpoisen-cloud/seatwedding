import React, { useRef, useState, useEffect } from 'react';
import { useStore } from '../../store';
import { Landmark } from './Landmark';
import { TableGroup } from './TableGroup';
import { useModalStore } from '../modals/ModalStore';

function findTableAtPoint(x: number, y: number): string | null {
  const elements = document.elementsFromPoint(x, y);
  for (const el of elements) {
    let current: Element | null = el;
    while (current) {
      const cls = current.getAttribute('class');
      if (cls && cls.split(/\s+/).includes('canvas-table')) {
        const id = current.getAttribute('data-id');
        if (id) return id;
      }
      current = current.parentElement;
    }
  }
  return null;
}

function isLandmarkAtPoint(x: number, y: number): boolean {
  const elements = document.elementsFromPoint(x, y);
  for (const el of elements) {
    let current: Element | null = el;
    while (current) {
      const cls = current.getAttribute('class');
      if (cls && cls.split(/\s+/).includes('canvas-landmark')) return true;
      current = current.parentElement;
    }
  }
  return false;
}

function findSeatAtClientPoint(x: number, y: number): { tableId: string; seatIdx: number } | null {
  const elements = document.elementsFromPoint(x, y);
  for (const el of elements) {
    let cur: Element | null = el;
    while (cur) {
      const cls = cur.getAttribute('class');
      if (cls && cls.split(/\s+/).includes('canvas-seat')) {
        const tid = cur.getAttribute('data-table-id');
        const sidx = cur.getAttribute('data-seat-idx');
        if (tid && sidx !== null) return { tableId: tid, seatIdx: parseInt(sidx) };
      }
      cur = cur.parentElement;
    }
  }
  return null;
}

export function Canvas() {
  const tables = useStore(s => s.tables);
  const landmark = useStore(s => s.landmark);
  const updateLandmark = useStore(s => s.updateLandmark);
  const updateTable = useStore(s => s.updateTable);
  const addTable = useStore(s => s.addTable);
  const assignSeat = useStore(s => s.assignSeat);
  const swapSeats = useStore(s => s.swapSeats);
  const openModal = useModalStore(s => s.openModal);
  const selectedGuestId = useModalStore(s => s.selectedGuestId);
  const setSelectedGuestId = useModalStore(s => s.setSelectedGuestId);
  const setMoveModeGuestId = useModalStore(s => s.setMoveModeGuestId);
  const svgRef = useRef<SVGSVGElement>(null);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [dropHover, setDropHover] = useState<{ tableId: string; seatIdx: number } | null>(null);

  const dragInfo = useRef<{
    type: 'pan' | 'landmark' | 'table' | null;
    id?: string;
    startX: number;
    startY: number;
    initialPan?: { x: number, y: number };
    initialObj?: { x: number; y: number };
  }>({ type: null, startX: 0, startY: 0 });

  const [localLandmark, setLocalLandmark] = useState(landmark);
  const [localTables, setLocalTables] = useState(tables);

  useEffect(() => {
    if (dragInfo.current.type === null) {
      setLocalLandmark(landmark);
      setLocalTables(tables);
    }
  }, [landmark, tables]);

  // Document-level pointerup to cancel guest drag when released outside canvas
  useEffect(() => {
    const onPointerUp = () => {
      const { guestDragId: dragId } = useModalStore.getState();
      if (dragId) {
        useModalStore.getState().setGuestDrag(null);
        setDropHover(null);
      }
    };
    document.addEventListener('pointerup', onPointerUp);
    return () => document.removeEventListener('pointerup', onPointerUp);
  }, []);

  const getSVGPoint = (e: React.PointerEvent) => {
    if (!svgRef.current) return null;
    const pt = svgRef.current.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svgRef.current.getScreenCTM();
    if (!ctm) return null;
    return pt.matrixTransform(ctm.inverse());
  };

  const handleSeatClick = (
    tableId: string,
    seatIdx: number,
    guestId: string | null,
  ) => {
    const { selectedGuestId: freshSelected, moveModeGuestId: freshMove } = useModalStore.getState();

    if (freshMove) {
      if (guestId) swapSeats(freshMove, tableId, seatIdx);
      else assignSeat(freshMove, tableId, seatIdx);
      setMoveModeGuestId(null);
      return;
    }

    if (freshSelected) {
      if (guestId) swapSeats(freshSelected, tableId, seatIdx);
      else assignSeat(freshSelected, tableId, seatIdx);
      setSelectedGuestId(null);
      return;
    }

    if (guestId) openModal('seatAction', { guestId, tableId, seatIdx });
    else openModal('seatAction', { tableId, seatIdx, mode: 'pickGuest' });
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    const pt = getSVGPoint(e);
    if (!pt) return;

    if (isLandmarkAtPoint(e.clientX, e.clientY)) {
      e.currentTarget.setPointerCapture(e.pointerId);
      dragInfo.current = {
        type: 'landmark',
        startX: pt.x,
        startY: pt.y,
        initialObj: { ...localLandmark }
      };
      return;
    }

    const tableId = findTableAtPoint(e.clientX, e.clientY);
    if (tableId) {
      e.currentTarget.setPointerCapture(e.pointerId);
      const latestTables = useStore.getState().tables;
      const table = latestTables.find(t => String(t.id) === tableId);
      if (table) {
        dragInfo.current = {
          type: 'table',
          id: table.id,
          startX: pt.x,
          startY: pt.y,
          initialObj: { x: table.x, y: table.y }
        };
      }
      return;
    }

    e.currentTarget.setPointerCapture(e.pointerId);
    dragInfo.current = {
      type: 'pan',
      startX: e.clientX,
      startY: e.clientY,
      initialPan: { ...pan }
    };
    setIsPanning(true);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    // Guest drag from sidebar — highlight seat under cursor
    const { guestDragId: dragId, guestDragStart: dragStart } = useModalStore.getState();
    if (dragId && dragStart) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        const hit = findSeatAtClientPoint(e.clientX, e.clientY);
        setDropHover(prev => {
          if (!hit) return null;
          if (prev?.tableId === hit.tableId && prev.seatIdx === hit.seatIdx) return prev;
          return hit;
        });
      } else {
        setDropHover(null);
      }
      return;
    }

    if (dragInfo.current.type === 'pan' && dragInfo.current.initialPan) {
      const dx = e.clientX - dragInfo.current.startX;
      const dy = e.clientY - dragInfo.current.startY;
      setPan({
        x: dragInfo.current.initialPan.x + dx,
        y: dragInfo.current.initialPan.y + dy
      });
      return;
    }

    const pt = getSVGPoint(e);
    if (!pt || !dragInfo.current.initialObj) return;

    const dx = pt.x - dragInfo.current.startX;
    const dy = pt.y - dragInfo.current.startY;

    if (dragInfo.current.type === 'landmark') {
      setLocalLandmark({
        x: dragInfo.current.initialObj.x + dx,
        y: dragInfo.current.initialObj.y + dy
      });
    }

    if (dragInfo.current.type === 'table' && dragInfo.current.id) {
      setLocalTables(prev => prev.map(t =>
        t.id === dragInfo.current.id
          ? { ...t, x: dragInfo.current.initialObj!.x + dx, y: dragInfo.current.initialObj!.y + dy }
          : t
      ));
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    // Guest drag — process drop on seat
    const { guestDragId: dragId, guestDragStart: dragStart } = useModalStore.getState();
    if (dragId && dragStart) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        const hit = findSeatAtClientPoint(e.clientX, e.clientY);
        if (hit) {
          const { tables: freshTables } = useStore.getState();
          const table = freshTables.find(t => t.id === hit.tableId);
          if (table) {
            const occupantId = table.seats[hit.seatIdx];
            if (occupantId) swapSeats(dragId, hit.tableId, hit.seatIdx);
            else assignSeat(dragId, hit.tableId, hit.seatIdx);
          }
        }
      }
      useModalStore.getState().setGuestDrag(null);
      setDropHover(null);
      return;
    }

    e.currentTarget.releasePointerCapture(e.pointerId);

    if (dragInfo.current.type === 'landmark') {
      updateLandmark(localLandmark.x, localLandmark.y);
    }

    if (dragInfo.current.type === 'table' && dragInfo.current.id) {
      const table = localTables.find(t => t.id === dragInfo.current.id);
      if (table) {
        updateTable(table.id, { x: table.x, y: table.y });
      }
    }

    dragInfo.current = { type: null, startX: 0, startY: 0 };
    setIsPanning(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.05 : 0.05;
      setZoom(z => Math.max(0.3, Math.min(3, z + delta)));
    } else {
      setPan(p => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
    }
  };

  return (
    <div className={`absolute inset-0 overflow-hidden ${isPanning ? 'cursor-grabbing' : ''}`}>
      <svg
        ref={svgRef}
        className="w-full h-full touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
      >
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.5" fill="#C9A25B" opacity="0.3" />
          </pattern>
          <filter id="soft-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#C9A25B" floodOpacity="0.35" />
          </filter>
          <filter id="gold-tint" x="-10%" y="-10%" width="120%" height="120%">
            <feColorMatrix type="matrix" in="SourceGraphic" values="
              0.3 0.3 0   0   0.78
              0.2 0.3 0.1 0   0.63
              0   0.2 0.2 0   0.36
              0   0   0   1   0
            " />
          </filter>
        </defs>

        <rect width="100%" height="100%" fill="url(#grid)" className="pointer-events-none" />

        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`} className="transition-transform duration-75 ease-out">
          <Landmark data={localLandmark} />
          {localTables.map(table => (
            <TableGroup
              key={table.id}
              table={table}
              onEdit={() => openModal('table', { id: table.id })}
              selectedGuestId={selectedGuestId}
              dropHover={dropHover}
              onSeatClick={handleSeatClick}
            />
          ))}
        </g>
      </svg>

      <div className="absolute bottom-6 right-6 flex flex-col gap-3 items-end">
        <div className="flex gap-1.5 bg-secondary p-1.5 rounded-2xl shadow-[var(--shadow-card)] border border-accent/15 print-mode-hide">
          <button onClick={() => addTable('round')} className="w-10 h-10 flex items-center justify-center bg-white hover:bg-primary/10 rounded-xl font-bold text-xs text-text-main hover:text-primary transition-colors" title="Добавить круглый стол">⬤</button>
          <button onClick={() => addTable('rect')} className="w-10 h-10 flex items-center justify-center bg-white hover:bg-primary/10 rounded-xl font-bold text-xs text-text-main hover:text-primary transition-colors" title="Добавить прямоугольный стол">▬</button>
        </div>
        <div className="flex flex-col gap-1.5 bg-secondary p-1.5 rounded-2xl shadow-[var(--shadow-card)] border border-accent/15 print-mode-hide">
          <button onClick={() => setZoom(z => Math.min(3, z + 0.1))} className="w-9 h-9 flex items-center justify-center bg-white hover:bg-accent/10 rounded-xl font-bold text-text-main hover:text-accent transition-colors">+</button>
          <button onClick={() => { setZoom(1); setPan({x:0, y:0}); }} className="w-9 h-9 flex items-center justify-center bg-white hover:bg-accent/10 rounded-xl text-[10px] font-bold text-text-main hover:text-accent transition-colors">100%</button>
          <button onClick={() => setZoom(z => Math.max(0.3, z - 0.1))} className="w-9 h-9 flex items-center justify-center bg-white hover:bg-accent/10 rounded-xl font-bold text-text-main hover:text-accent transition-colors">-</button>
        </div>
      </div>
    </div>
  );
}
