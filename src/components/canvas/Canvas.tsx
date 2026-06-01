import React, { useRef, useState, useEffect } from 'react';
import { useStore } from '../../store';
import { Landmark } from './Landmark';
import { TableGroup } from './TableGroup';
import { useModalStore } from '../modals/ModalStore';

export function Canvas() {
  const { tables, landmark, updateLandmark, updateTable, assignSeat } = useStore();
  const { openModal } = useModalStore();
  const svgRef = useRef<SVGSVGElement>(null);

  // Viewport State
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);

  // Dragging State (Local for performance, synced on drop)
  const [localLandmark, setLocalLandmark] = useState(landmark);
  const [localTables, setLocalTables] = useState(tables);
  
  // Interaction tracking
  const dragInfo = useRef<{
    type: 'pan' | 'landmark' | 'table' | null;
    id?: string | number;
    startX: number;
    startY: number;
    initialPan?: { x: number, y: number };
    initialObj?: { x: number, y: number };
  }>({ type: null, startX: 0, startY: 0 });

  // Sync local state when global changes (e.g. from Firebase)
  useEffect(() => {
    if (dragInfo.current.type === null) {
      setLocalLandmark(landmark);
      setLocalTables(tables);
    }
  }, [landmark, tables]);

  // Handle global zoom controls (temporary, should probably be moved to a shared state or context if Header needs them)
  // For now, we'll keep zoom local and let the user pan/zoom via mouse/touch.

  const getSVGPoint = (e: React.PointerEvent) => {
    if (!svgRef.current) return null;
    const pt = svgRef.current.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svgRef.current.getScreenCTM();
    if (!ctm) return null;
    return pt.matrixTransform(ctm.inverse());
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    // Only left click
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    const pt = getSVGPoint(e);
    if (!pt) return;

    const target = e.target as HTMLElement;

    // 1. Dragging Landmark
    if (target.closest('.canvas-landmark')) {
      e.currentTarget.setPointerCapture(e.pointerId);
      dragInfo.current = {
        type: 'landmark',
        startX: pt.x,
        startY: pt.y,
        initialObj: { ...localLandmark }
      };
      return;
    }

    // 2. Dragging Table
    const tableGroup = target.closest('.canvas-table');
    const isSeat = target.closest('.canvas-seat');
    const isLabel = target.tagName === 'text';

    if (tableGroup && !isSeat && !isLabel) {
      e.currentTarget.setPointerCapture(e.pointerId);
      const id = (tableGroup as HTMLElement).dataset.id;
      const table = localTables.find(t => String(t.id) === id);
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

    // 3. Panning the canvas
    if (!target.closest('.canvas-interactive')) {
      e.currentTarget.setPointerCapture(e.pointerId);
      dragInfo.current = {
        type: 'pan',
        startX: e.clientX,
        startY: e.clientY,
        initialPan: { ...pan }
      };
      setIsPanning(true);
    }
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
    // Zoom logic could be added here
    if (e.ctrlKey) {
      e.preventDefault();
      // Implementation for pinch-to-zoom
    }
  };

  // Drag and Drop from Sidebar
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const guestId = e.dataTransfer.getData('guestId');
    if (!guestId) return;

    // If dropped on a seat
    const seatEl = (e.target as HTMLElement).closest('.canvas-seat');
    if (seatEl) {
      const tableId = (seatEl as HTMLElement).dataset.tableId;
      const seatIdx = parseInt((seatEl as HTMLElement).dataset.seatIdx || '-1');
      if (tableId && seatIdx >= 0) {
        assignSeat(guestId, tableId, seatIdx);
      }
    }
  };

  return (
    <div 
      className={`absolute inset-0 overflow-hidden ${isPanning ? 'cursor-grabbing' : ''}`}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
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
            <circle cx="2" cy="2" r="1.5" fill="#cbd5e1" />
          </pattern>
          <filter id="soft-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#cbd5e1" floodOpacity="0.5" />
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
            />
          ))}
        </g>
      </svg>
      
      {/* Temporary Zoom Controls. Realistically, we'd hook these to global state to be used by Header too */}
      <div className="absolute bottom-6 right-6 flex flex-col gap-2 bg-white p-2 rounded-2xl shadow-lg border border-slate-200">
        <button onClick={() => setZoom(z => Math.min(3, z + 0.1))} className="w-10 h-10 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-slate-700">+</button>
        <button onClick={() => { setZoom(1); setPan({x:0, y:0}); }} className="w-10 h-10 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-700">100%</button>
        <button onClick={() => setZoom(z => Math.max(0.3, z - 0.1))} className="w-10 h-10 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-slate-700">-</button>
      </div>
    </div>
  );
}
