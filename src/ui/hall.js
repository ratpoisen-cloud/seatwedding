import { state, updateState, assignSeat, unseatGuest } from '../state.js';

const config = {
  seatRadius: 15,
  seatDistance: 45,
  tableRoundRadius: 50,
  tableRectWidth: 120,
  tableRectHeight: 60
};

export const initHall = () => {
  const svg = document.getElementById('hall-svg');
  
  svg.addEventListener('mousedown', handleMouseDown);
  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseup', handleMouseUp);

  // Touch support
  svg.addEventListener('touchstart', (e) => {
    const touch = e.touches[0];
    handleMouseDown({ target: e.target, clientX: touch.clientX, clientY: touch.clientY, preventDefault: () => e.preventDefault() });
  }, { passive: false });
  window.addEventListener('touchmove', (e) => {
    const touch = e.touches[0];
    handleMouseMove({ clientX: touch.clientX, clientY: touch.clientY });
  }, { passive: false });
  window.addEventListener('touchend', handleMouseUp);
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

const handleMouseDown = (e) => {
  const pt = getSVGPoint(e);
  if (!pt) return;
  
  // Check for Landmark Drag first
  if (e.target.closest('.landmark')) {
    state.draggedLandmark = true;
    state.isDragging = true;
    state.dragOffset = { x: pt.x - state.landmark.x, y: pt.y - state.landmark.y };
    return;
  }

  // Check for Table Drag
  const tableGroup = e.target.closest('.table-group');
  const isSeat = e.target.closest('.seat-circle');
  const isText = e.target.tagName === 'text';

  if (tableGroup && !isSeat && !isText) {
    const id = tableGroup.dataset.id;
    const table = state.tables.find(t => t.id === id);
    if (table) {
      state.draggedTable = table;
      state.isDragging = true;
      state.dragOffset = { x: pt.x - table.x, y: pt.y - table.y };
      const container = document.querySelector('.canvas-container');
      if (container) container.style.transition = 'none';
    }
    return;
  }
};

const handleMouseMove = (e) => {
  if (!state.isDragging && !state.draggedGuest) return;
  const pt = getSVGPoint(e);
  if (!pt) return;

  if (state.draggedTable) {
    state.draggedTable.x = pt.x - state.dragOffset.x;
    state.draggedTable.y = pt.y - state.dragOffset.y;
    const el = document.querySelector(`.table-group[data-id="${state.draggedTable.id}"]`);
    if (el) el.setAttribute('transform', `translate(${state.draggedTable.x}, ${state.draggedTable.y}) rotate(${state.draggedTable.rotation})`);
  }

  if (state.draggedLandmark) {
    state.landmark.x = pt.x - state.dragOffset.x;
    state.landmark.y = pt.y - state.dragOffset.y;
    const el = document.querySelector('.landmark');
    if (el) el.setAttribute('transform', `translate(${state.landmark.x}, ${state.landmark.y})`);
  }

  if (state.draggedGuest) {
    const ghost = document.getElementById('drag-ghost');
    ghost.style.left = e.clientX + 10 + 'px';
    ghost.style.top = e.clientY + 10 + 'px';
  }
};

const handleMouseUp = () => {
  if (state.draggedGuest && state.hoveredSeat) {
    assignSeat(state.draggedGuest.id, state.hoveredSeat.tableId, state.hoveredSeat.idx);
  }
  
  if (state.isDragging) {
    updateState({}); // Final sync to Firebase
    const container = document.querySelector('.canvas-container');
    if (container) container.style.transition = '';
  }

  state.draggedTable = null;
  state.draggedLandmark = false;
  state.draggedGuest = null;
  state.isDragging = false;
  document.getElementById('drag-ghost').style.display = 'none';
};

export const renderHall = () => {
  const container = document.getElementById('hall-content');
  const landmarkContainer = document.getElementById('landmark-content');
  
  landmarkContainer.innerHTML = `
    <g class="landmark" style="cursor: move;" transform="translate(${state.landmark.x}, ${state.landmark.y})">
      <path d="M-40,0 a 40,40 0 1,1 80,0 Z" fill="#e2e8f0" stroke="#94a3b8" stroke-width="2" />
      <rect x="-10" y="0" width="20" height="30" rx="5" fill="#f1f5f9" stroke="#94a3b8" stroke-width="2" />
      <circle cx="-15" cy="-15" r="5" fill="white" />
      <circle cx="15" cy="-10" r="4" fill="white" />
      <circle cx="0" cy="-25" r="6" fill="white" />
    </g>
  `;

  container.innerHTML = '';
  state.tables.forEach(table => {
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.setAttribute("class", "table-group");
    group.setAttribute("data-id", table.id);
    group.setAttribute("transform", `translate(${table.x}, ${table.y}) rotate(${table.rotation})`);

    const base = document.createElementNS("http://www.w3.org/2000/svg", table.type === 'round' ? "circle" : "rect");
    base.setAttribute("class", "table-base");
    if (table.type === 'round') {
      base.setAttribute("r", config.tableRoundRadius);
    } else {
      base.setAttribute("width", config.tableRectWidth);
      base.setAttribute("height", config.tableRectHeight);
      base.setAttribute("x", -config.tableRectWidth / 2);
      base.setAttribute("y", -config.tableRectHeight / 2);
      base.setAttribute("rx", 8);
    }
    group.appendChild(base);

    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("class", "table-label");
    text.setAttribute("y", 5);
    text.textContent = table.name;
    text.onclick = (e) => {
      e.stopPropagation();
      window.app.openTableModal(table.id);
    };
    group.appendChild(text);

    table.seats.forEach((guestId, idx) => {
      const seat = createSeat(table, idx, guestId);
      group.appendChild(seat);
    });

    container.appendChild(group);
  });
};

const createSeat = (table, idx, guestId) => {
  const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
  const count = table.seats.length;
  let x, y;

  if (table.type === 'round') {
    const angle = (idx / count) * Math.PI * 2;
    const dist = config.tableRoundRadius + config.seatDistance;
    x = Math.cos(angle) * dist;
    y = Math.sin(angle) * dist;
  } else {
    const perSide = Math.ceil(count / 2);
    const side = idx < perSide ? -1 : 1;
    const subIdx = idx % perSide;
    const step = config.tableRectWidth / (perSide + 0.5);
    x = -config.tableRectWidth / 2 + (subIdx + 0.75) * step;
    y = side * (config.tableRectHeight / 2 + config.seatDistance);
  }

  const guest = guestId ? state.guests.find(gu => gu.id === guestId) : null;
  const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  circle.setAttribute("cx", x);
  circle.setAttribute("cy", y);
  circle.setAttribute("r", config.seatRadius);
  
  let cls = 'seat-circle';
  if (guest) {
    cls += ' occupied';
    const labels = (guest.label || '').toLowerCase();
    if (labels.includes('семья') || labels.includes('родные')) cls += ' tag-family';
    else if (labels.includes('друг')) cls += ' tag-friends';
    else if (labels.includes('коллег') || labels.includes('работ')) cls += ' tag-work';
    else if (labels.includes('родител')) cls += ' tag-parents';
    else if (labels.includes('vip')) cls += ' tag-vip';

    if (guest.status === 'Под вопросом' || guest.isQuestion) cls += ' status-question';
  }
  circle.setAttribute('class', cls);

  // SVG Native tooltip
  if (guest) {
    const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
    title.textContent = `${guest.name} (${guest.group})`;
    circle.appendChild(title);
  }

  circle.onmouseover = () => {
    if (state.draggedGuest) {
      state.hoveredSeat = { tableId: table.id, idx };
      circle.style.stroke = 'var(--primary)';
    }
  };
  circle.onmouseout = () => {
    state.hoveredSeat = null;
    circle.style.stroke = '';
  };
  circle.onclick = (e) => {
    e.stopPropagation();
    if (guestId) window.app.openSeatMenu(e, table.id, idx, guestId);
    else if (state.draggedGuest) {
       assignSeat(state.draggedGuest.id, table.id, idx);
    }
  };

  g.appendChild(circle);

  if (guest) {
    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("x", x);
    label.setAttribute("y", y + (y > 0 ? 25 : -15));
    label.setAttribute("class", "seat-label");
    label.setAttribute("transform", `rotate(${-table.rotation}, ${x}, ${y + (y > 0 ? 25 : -15)})`);
    label.textContent = (guest.name || '').split(' ')[0];
    g.appendChild(label);
  }

  return g;
};
