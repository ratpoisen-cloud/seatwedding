import { saveToCloud } from './firebase.js';

const weddingId = new URLSearchParams(window.location.search).get('id') || 'default-wedding';

export const state = {
  guests: [],
  tables: [],
  landmark: { x: 600, y: 400 },
  zoom: 1,
  draggedGuest: null,
  draggedTable: null,
  draggedLandmark: false,
  hoveredSeat: null,
  isDragging: false,
  selectedSeatGuest: null,
  selectedSeatData: null
};

const listeners = [];

export const subscribe = (callback) => {
  listeners.push(callback);
};

const notify = () => {
  listeners.forEach(cb => cb(state));
};

export const updateState = (newData, skipCloud = false) => {
  Object.assign(state, newData);
  notify();
  if (!skipCloud) {
    saveToCloud(weddingId, {
      guests: state.guests,
      tables: state.tables,
      landmark: state.landmark
    });
  }
};

// Actions
export const addGuest = (guest) => {
  const newGuest = {
    id: 'g' + Date.now(),
    name: guest.name || 'Новый гость',
    group: guest.group || 'Друзья',
    status: guest.status || 'Приглашение принято',
    label: guest.label || '',
    isQuestion: false,
    seated: false,
    ...guest
  };
  updateState({ guests: [...state.guests, newGuest] });
};

export const deleteGuest = (id) => {
  const guests = state.guests.filter(g => g.id !== id);
  const tables = state.tables.map(t => ({
    ...t,
    seats: t.seats.map(sid => sid === id ? null : sid)
  }));
  updateState({ guests, tables });
};

export const addTable = (type) => {
  const newTable = {
    id: 't' + Date.now(),
    name: `Стол ${state.tables.length + 1}`,
    type,
    x: 300,
    y: 300,
    rotation: 0,
    seats: Array(type === 'round' ? 6 : 8).fill(null)
  };
  updateState({ tables: [...state.tables, newTable] });
};

export const deleteTable = (id) => {
  const table = state.tables.find(t => t.id === id);
  if (!table) return;
  
  const seatedIds = new Set(table.seats.filter(s => s));
  const guests = state.guests.map(g => ({
    ...g,
    seated: seatedIds.has(g.id) ? false : g.seated
  }));
  const tables = state.tables.filter(t => t.id !== id);
  updateState({ guests, tables });
};

export const assignSeat = (guestId, tableId, seatIdx) => {
  const guest = state.guests.find(g => g.id === guestId);
  const table = state.tables.find(t => t.id === tableId);
  if (!guest || !table) return;

  if (seatIdx < 0 || seatIdx >= table.seats.length) return;
  if (table.seats[seatIdx]) return;

  const tables = state.tables.map(t => {
    if (t.id === tableId) {
      const newSeats = [...t.seats];
      newSeats[seatIdx] = guestId;
      return { ...t, seats: newSeats };
    }
    return t;
  });

  const guests = state.guests.map(g => g.id === guestId ? { ...g, seated: true } : g);
  updateState({ guests, tables });
};

export const unseatGuest = (tableId, seatIdx) => {
  const table = state.tables.find(t => t.id === tableId);
  if (!table) return;
  
  if (seatIdx < 0 || seatIdx >= table.seats.length) return;
  const guestId = table.seats[seatIdx];
  
  const tables = state.tables.map(t => {
    if (t.id === tableId) {
      const newSeats = [...t.seats];
      newSeats[seatIdx] = null;
      return { ...t, seats: newSeats };
    }
    return t;
  });

  const guests = state.guests.map(g => g.id === guestId ? { ...g, seated: false } : g);
  updateState({ guests, tables });
};
