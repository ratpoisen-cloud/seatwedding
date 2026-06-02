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

export function Canvas() {
  const tables = useStore(s => s.tables);
  const landmark = useStore(s => s.landmark);
  const updateLandmark = useStore(s => s.updateLandmark);
  const updateTable = useStore(s => s.updateTable);
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
    // Read fresh state from store to avoid stale closures
    const { selectedGuestId: freshSelected, moveModeGuestId: freshMove } = useModalStore.getState();

    // Priority 1: moveMode is active → пересаживаем гостя
    if (freshMove) {
      if (guestId) {
        swapSeats(freshMove, tableId, seatIdx);
      } else {
        assignSeat(freshMove, tableId, seatIdx);
      }
      setMoveModeGuestId(null);
      return;
    }

    // Priority 2: selectedGuestId is active → сажаем выбранного из списка
    if (freshSelected) {
      if (guestId) {
        swapSeats(freshSelected, tableId, seatIdx);
      } else {
        assignSeat(freshSelected, tableId, seatIdx);
      }
      setSelectedGuestId(null);
      return;
    }

    // Priority 3: nothing selected
    if (guestId) {
      // Занятое место → открываем модалку действий
      openModal('seatAction', { guestId, tableId, seatIdx });
    } else {
      // Пустое место → создаём нового гостя
      openModal('guest', { targetTableId: tableId, targetSeatIdx: seatIdx });
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    const pt = getSVGPoint(e);
    if (!pt) return;

    // 1. Landmark
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

    // 2. Table drag
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

    // 3. Pan
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
              onSeatClick={handleSeatClick}
            />
          ))}
        </g>
      </svg>

      <div className="absolute bottom-6 right-6 flex flex-col gap-1.5 bg-secondary p-1.5 rounded-2xl shadow-[var(--shadow-card)] border border-primary/20 print-mode-hide">
        <button onClick={() => setZoom(z => Math.min(3, z + 0.1))} className="w-9 h-9 flex items-center justify-center bg-white hover:bg-primary/10 rounded-xl font-bold text-text-main hover:text-primary transition-colors">+</button>
        <button onClick={() => { setZoom(1); setPan({x:0, y:0}); }} className="w-9 h-9 flex items-center justify-center bg-white hover:bg-primary/10 rounded-xl text-[10px] font-bold text-text-main hover:text-primary transition-colors">100%</button>
        <button onClick={() => setZoom(z => Math.max(0.3, z - 0.1))} className="w-9 h-9 flex items-center justify-center bg-white hover:bg-primary/10 rounded-xl font-bold text-text-main hover:text-primary transition-colors">-</button>
      </div>
    </div>
  );
}
