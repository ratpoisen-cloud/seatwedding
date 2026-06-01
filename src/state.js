import { saveToCloud } from './firebase.js';

const weddingId = new URLSearchParams(window.location.search).get('id') || 'default-wedding';

// Default tag colors if none exist
const defaultTags = {
  'Семья': '#10b981', // emerald
  'Друзья': '#3b82f6', // blue
  'Родители': '#f59e0b', // amber
  'Коллеги': '#64748b', // slate
  'VIP': '#8b5cf6' // violet
};

export const state = {
  guests: [],
  tables: [],
  landmark: { x: 800, y: 500 },
  tags: { ...defaultTags },
  
  // Ephemeral UI state
  zoom: 1,
  draggedGuest: null,
  draggedTable: null,
  draggedLandmark: false,
  dragOffset: { x: 0, y: 0 },
  hoveredSeat: null,
  isDragging: false,
  selectedSeatData: null // For context menu action { guest, tableId, seatIdx }
};

const listeners = [];
export const subscribe = (callback) => listeners.push(callback);
const notify = () => listeners.forEach(cb => cb(state));

export const updateState = (newData, skipCloud = false) => {
  Object.assign(state, newData);
  notify();
  
  if (!skipCloud) {
    saveToCloud(weddingId, {
      guests: state.guests,
      tables: state.tables,
      landmark: state.landmark,
      tags: state.tags
    });
  }
};

// --- Actions ---

export const moveGuestToSeat = (guestId, targetTableId, targetSeatIdx) => {
  const guest = state.guests.find(g => g.id === guestId);
  const targetTable = state.tables.find(t => t.id === targetTableId);
  if (!guest || !targetTable) return;

  const existingGuestId = targetTable.seats[targetSeatIdx];

  // Find where the guest came from
  let sourceTableId = null;
  let sourceSeatIdx = -1;
  state.tables.forEach(t => {
    const idx = t.seats.indexOf(guestId);
    if (idx !== -1) {
      sourceTableId = t.id;
      sourceSeatIdx = idx;
    }
  });

  // If moving to same seat, do nothing
  if (sourceTableId === targetTableId && sourceSeatIdx === targetSeatIdx) return;

  const newTables = state.tables.map(t => {
    const newSeats = [...t.seats];
    
    // Remove from source or Swap
    if (t.id === sourceTableId) {
      newSeats[sourceSeatIdx] = existingGuestId || null;
    }
    
    // Place in target
    if (t.id === targetTableId) {
      newSeats[targetSeatIdx] = guestId;
    }
    
    return { ...t, seats: newSeats };
  });

  const newGuests = state.guests.map(g => {
    if (g.id === guestId) return { ...g, seated: true };
    // If an existing guest was swapped to unseated (sourceTableId was null)
    if (g.id === existingGuestId && !sourceTableId) return { ...g, seated: false };
    return g;
  });

  updateState({ tables: newTables, guests: newGuests });
};

export const unseatGuest = (tableId, seatIdx) => {
  const table = state.tables.find(t => t.id === tableId);
  if (!table || !table.seats[seatIdx]) return;
  
  const guestId = table.seats[seatIdx];
  const newTables = state.tables.map(t => {
    if (t.id === tableId) {
      const newSeats = [...t.seats];
      newSeats[seatIdx] = null;
      return { ...t, seats: newSeats };
    }
    return t;
  });

  const newGuests = state.guests.map(g => g.id === guestId ? { ...g, seated: false } : g);
  updateState({ tables: newTables, guests: newGuests });
};

export const saveGuest = (guestData) => {
  let newGuests;
  if (guestData.id) {
    newGuests = state.guests.map(g => g.id === guestData.id ? { ...g, ...guestData } : g);
  } else {
    newGuests = [...state.guests, { ...guestData, id: 'g' + Date.now(), seated: false }];
  }
  
  // Ensure the tag exists in our settings
  const newTags = { ...state.tags };
  if (guestData.tag && !newTags[guestData.tag]) {
    newTags[guestData.tag] = '#94a3b8'; // default gray
  }
  
  updateState({ guests: newGuests, tags: newTags });
};

export const deleteGuest = (id) => {
  const newGuests = state.guests.filter(g => g.id !== id);
  const newTables = state.tables.map(t => ({
    ...t, seats: t.seats.map(s => s === id ? null : s)
  }));
  updateState({ guests: newGuests, tables: newTables });
};

export const addTable = (type) => {
  const newTable = {
    id: 't' + Date.now(),
    name: `Стол ${state.tables.length + 1}`,
    type,
    x: 400, y: 400, rotation: 0,
    seats: Array(type === 'round' ? 8 : 10).fill(null)
  };
  updateState({ tables: [...state.tables, newTable] });
};

export const saveTable = (tableId, name, numSeats, rotation) => {
  const newTables = state.tables.map(t => {
    if (t.id !== tableId) return t;
    let newSeats = [...t.seats];
    if (numSeats > t.seats.length) {
      newSeats = [...newSeats, ...Array(numSeats - t.seats.length).fill(null)];
    } else if (numSeats < t.seats.length) {
      // Unseat guests from removed seats
      const removedGuests = newSeats.slice(numSeats).filter(g => g);
      if (removedGuests.length > 0) {
        state.guests = state.guests.map(g => removedGuests.includes(g.id) ? { ...g, seated: false } : g);
      }
      newSeats = newSeats.slice(0, numSeats);
    }
    return { ...t, name, seats: newSeats, rotation };
  });
  updateState({ tables: newTables });
};

export const deleteTable = (id) => {
  const table = state.tables.find(t => t.id === id);
  if (!table) return;
  const seatedIds = new Set(table.seats.filter(s => s));
  const newGuests = state.guests.map(g => ({ ...g, seated: seatedIds.has(g.id) ? false : g.seated }));
  const newTables = state.tables.filter(t => t.id !== id);
  updateState({ guests: newGuests, tables: newTables });
};

export const updateTags = (newTags) => {
  updateState({ tags: newTags });
};
