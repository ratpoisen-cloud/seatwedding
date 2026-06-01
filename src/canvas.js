import { state, updateState, moveGuestToSeat } from './state.js';

export const initCanvas = (onTableClick, onSeatClick) => {
  const svg = document.getElementById('hall-svg');
  
  // Using Pointer Events for unified Touch/Mouse
  svg.addEventListener('pointerdown', (e) => handlePointerDown(e, onTableClick, onSeatClick));
  window.addEventListener('pointermove', handlePointerMove);
  window.addEventListener('pointerup', handlePointerUp);
  window.addEventListener('pointercancel', handlePointerUp);
};

const getSVGPoint = (e) => {
  const svg = document.getElementById('hall-svg');
  const pt = svg.createSVGPoint();
  pt.x = e.clientX;
  pt.y = e.clientY;
  const ctm = svg.getScreenCTM();
  if (!ctm) return null;
  return pt.matrixTransform(ctm.inverse());
};

const handlePointerDown = (e, onTableClick, onSeatClick) => {
  const pt = getSVGPoint(e);
  if (!pt) return;

  const target = e.target;
  
  // 1. Dragging Landmark
  if (target.closest('#svg-landmark')) {
    e.target.setPointerCapture(e.pointerId);
    state.draggedLandmark = true;
    state.isDragging = true;
    state.dragOffset = { x: pt.x - state.landmark.x, y: pt.y - state.landmark.y };
    return;
  }

  // 2. Interacting with a Seat
  const seatEl = target.closest('.seat-circle');
  if (seatEl) {
    const tableId = seatEl.dataset.table;
    const seatIdx = parseInt(seatEl.dataset.idx);
    const guestId = seatEl.dataset.guest;

    if (guestId) {
      // It's occupied. Are we clicking or dragging? 
      // We will initiate a drag, but if it's a short tap, it will trigger click in pointerup.
      const guest = state.guests.find(g => g.id === guestId);
      if (guest) {
        state.draggedGuest = guest;
        state.dragSourceSeat = { tableId, seatIdx };
        
        // Show ghost
        const ghost = document.getElementById('drag-ghost');
        ghost.textContent = guest.name;
        ghost.style.display = 'block';
        ghost.style.left = e.clientX + 'px';
        ghost.style.top = e.clientY + 'px';
        
        e.preventDefault();
        return;
      }
    } else {
      // Empty seat clicked - open modal or just do nothing (user can drop here)
      // The user requested: "Если место пустое нажав на него должна появится возможность добавить гостя."
      onSeatClick(tableId, seatIdx, null);
      return;
    }
  }

  // 3. Interacting with a Table
  const tableGroup = target.closest('.table-group');
  if (tableGroup && !target.closest('.table-label')) {
    e.target.setPointerCapture(e.pointerId);
    const id = tableGroup.dataset.id;
    const table = state.tables.find(t => t.id === id);
    if (table) {
      state.draggedTable = table;
      state.isDragging = true;
      state.dragOffset = { x: pt.x - table.x, y: pt.y - table.y };
    }
    return;
  }

  // 4. Clicking Table Label
  if (target.closest('.table-label')) {
    const tableGroup = target.closest('.table-group');
    if (tableGroup) {
      onTableClick(tableGroup.dataset.id);
    }
  }
};

const handlePointerMove = (e) => {
  if (!state.isDragging && !state.draggedGuest) return;
  const pt = getSVGPoint(e);
  if (!pt) return;

  if (state.draggedTable) {
    state.draggedTable.x = pt.x - state.dragOffset.x;
    state.draggedTable.y = pt.y - state.dragOffset.y;
    // Fast DOM update
    const el = document.querySelector(`.table-group[data-id="${state.draggedTable.id}"]`);
    if (el) el.setAttribute('transform', `translate(${state.draggedTable.x}, ${state.draggedTable.y}) rotate(${state.draggedTable.rotation})`);
  }

  if (state.draggedLandmark) {
    state.landmark.x = pt.x - state.dragOffset.x;
    state.landmark.y = pt.y - state.dragOffset.y;
    const el = document.querySelector('#mushroom');
    if (el) el.setAttribute('transform', `translate(${state.landmark.x}, ${state.landmark.y})`);
  }

  if (state.draggedGuest) {
    const ghost = document.getElementById('drag-ghost');
    ghost.style.left = e.clientX + 'px';
    ghost.style.top = e.clientY + 'px';
  }
};

const handlePointerUp = (e) => {
  if (state.draggedGuest) {
    // If hovering over a seat, drop!
    if (state.hoveredSeat) {
      moveGuestToSeat(state.draggedGuest.id, state.hoveredSeat.tableId, state.hoveredSeat.idx);
    } else if (state.dragSourceSeat) {
      // If we didn't drop anywhere but we started from a seat, maybe it was a click?
      // For simplicity, we trigger the seat click action if it was dropped near its origin.
      // (A real app would measure distance, but here we just use the global window.app hook)
      if (window.app && window.app.onSeatActionClick) {
        window.app.onSeatActionClick(state.dragSourceSeat.tableId, state.dragSourceSeat.idx, state.draggedGuest.id);
      }
    }
  }
  
  if (state.isDragging) {
    updateState({}); // Final sync to Firebase
  }

  // Reset
  state.draggedTable = null;
  state.draggedLandmark = false;
  state.draggedGuest = null;
  state.dragSourceSeat = null;
  state.isDragging = false;
  document.getElementById('drag-ghost').style.display = 'none';
};

export const renderCanvas = () => {
  renderLandmark();
  renderTables();
};

const renderLandmark = () => {
  const container = document.getElementById('svg-landmark');
  container.innerHTML = `
    <g id="mushroom" class="landmark" transform="translate(${state.landmark.x}, ${state.landmark.y})">
      <path d="M-60,0 C-60,-50 60,-50 60,0 Z" fill="#ef4444" stroke="#991b1b" stroke-width="2" filter="url(#soft-shadow)"/>
      <circle cx="-25" cy="-20" r="10" fill="white"/>
      <circle cx="25" cy="-15" r="14" fill="white"/>
      <circle cx="0" cy="-35" r="8" fill="white"/>
      <rect x="-15" y="0" width="30" height="50" rx="6" fill="#fef3c7" stroke="#b45309" stroke-width="2"/>
    </g>
  `;
};

const renderTables = () => {
  const container = document.getElementById('svg-tables');
  container.innerHTML = '';

  state.tables.forEach(table => {
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.setAttribute("class", "table-group");
    group.setAttribute("data-id", table.id);
    group.setAttribute("transform", `translate(${table.x}, ${table.y}) rotate(${table.rotation})`);

    // Base shape
    const base = document.createElementNS("http://www.w3.org/2000/svg", table.type === 'round' ? "circle" : "rect");
    base.setAttribute("class", "table-base");
    
    // Config values (could be extracted)
    const roundRadius = 60;
    const rectW = 160;
    const rectH = 80;
    const seatRadius = 18;
    const seatDist = 55;

    if (table.type === 'round') {
      base.setAttribute("r", roundRadius);
    } else {
      base.setAttribute("width", rectW);
      base.setAttribute("height", rectH);
      base.setAttribute("x", -rectW / 2);
      base.setAttribute("y", -rectH / 2);
      base.setAttribute("rx", 12);
    }
    group.appendChild(base);

    // Label
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("class", "table-label");
    text.setAttribute("y", 6);
    text.textContent = table.name;
    group.appendChild(text);

    // Seats
    const count = table.seats.length;
    table.seats.forEach((guestId, idx) => {
      let x, y;
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

      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      const guest = guestId ? state.guests.find(gu => gu.id === guestId) : null;
      
      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("cx", x);
      circle.setAttribute("cy", y);
      circle.setAttribute("r", seatRadius);
      circle.setAttribute("class", `seat-circle ${guest ? 'occupied' : ''} ${guest && guest.isQuestion ? 'status-question' : ''}`);
      circle.dataset.table = table.id;
      circle.dataset.idx = idx;
      if (guestId) circle.dataset.guest = guestId;

      // Color based on Tag
      if (guest && guest.tag && state.tags[guest.tag]) {
        circle.style.fill = state.tags[guest.tag];
        circle.style.stroke = state.tags[guest.tag];
        circle.style.filter = 'brightness(1.1)';
      } else if (!guest) {
        circle.style.fill = '#f1f5f9';
        circle.style.stroke = '#cbd5e1';
      }

      circle.onpointerenter = () => {
        if (state.draggedGuest) {
          state.hoveredSeat = { tableId: table.id, idx };
          circle.style.stroke = '#000'; // highlight drop target
        }
      };
      circle.onpointerleave = () => {
        state.hoveredSeat = null;
        circle.style.stroke = guest && guest.tag && state.tags[guest.tag] ? state.tags[guest.tag] : (guest ? '#6366f1' : '#cbd5e1');
      };

      g.appendChild(circle);

      if (guest) {
        // Native SVG Tooltip
        const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
        title.textContent = `${guest.name} (${guest.tag || 'Без группы'})`;
        circle.appendChild(title);

        const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
        label.setAttribute("x", x);
        label.setAttribute("y", y + (y > 0 ? 32 : -22));
        label.setAttribute("class", "seat-label");
        label.setAttribute("transform", `rotate(${-table.rotation}, ${x}, ${y + (y > 0 ? 32 : -22)})`);
        label.textContent = (guest.name || '').split(' ')[0];
        g.appendChild(label);
      }

      group.appendChild(g);
    });

    container.appendChild(group);
  });
};
