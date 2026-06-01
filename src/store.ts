import { create } from 'zustand';
import { saveWeddingData } from './firebase';

export type GuestStatus = "Приглашение принято" | "Отклонено" | "Не приглашен" | "Под вопросом";

export interface Guest {
  id: string;
  name: string;
  group: string;
  labels: string[];
  status: GuestStatus;
  seated: boolean;
  isQuestion: boolean;
}

export interface Table {
  id: string | number;
  name: string;
  type: "round" | "rect";
  x: number;
  y: number;
  rotation: number;
  seats: (string | null)[];
}

export interface Landmark {
  x: number;
  y: number;
}

export interface AppState {
  guests: Guest[];
  tables: Table[];
  landmark: Landmark;
  tagColors: Record<string, string>;
  weddingId: string;
  
  // UI State
  isSyncing: boolean;
  error: string | null;
  
  // Actions
  initialize: (weddingId: string, data: any) => void;
  setSyncing: (isSyncing: boolean) => void;
  setError: (error: string | null) => void;
  
  // Data Mutations
  addGuest: (guest: Omit<Guest, 'id'>) => void;
  updateGuest: (id: string, data: Partial<Guest>) => void;
  deleteGuest: (id: string) => void;
  
  addTable: (type: "round" | "rect") => void;
  updateTable: (id: string | number, data: Partial<Table>) => void;
  deleteTable: (id: string | number) => void;
  
  assignSeat: (guestId: string, tableId: string | number, seatIdx: number) => void;
  unseatGuest: (tableId: string | number, seatIdx: number) => void;
  swapSeats: (sourceGuestId: string, targetTableId: string | number, targetSeatIdx: number) => void;
  
  updateLandmark: (x: number, y: number) => void;
  updateTagColor: (tag: string, color: string) => void;
  deleteTagColor: (tag: string) => void;
  
  _sync: () => Promise<void>;
}

const defaultTags = {
  'Семья': '#10b981', // emerald
  'Друзья': '#3b82f6', // blue
  'Родители': '#f59e0b', // amber
  'Коллеги': '#64748b', // slate
  'VIP': '#8b5cf6' // violet
};

export const useStore = create<AppState>((set, get) => ({
  guests: [],
  tables: [],
  landmark: { x: 800, y: 500 },
  tagColors: { ...defaultTags },
  weddingId: 'default-wedding',
  
  isSyncing: false,
  error: null,
  
  initialize: (weddingId, data) => set({
    weddingId,
    guests: data?.guests || [],
    tables: data?.tables || [],
    landmark: data?.landmark || { x: 800, y: 500 },
    tagColors: data?.tagColors || { ...defaultTags },
    isSyncing: false,
    error: null,
  }),
  
  setSyncing: (isSyncing) => set({ isSyncing }),
  setError: (error) => set({ error }),
  
  // --- Helpers for Syncing ---
  _sync: async () => {
    const state = get();
    try {
      await saveWeddingData(state.weddingId, {
        guests: state.guests,
        tables: state.tables,
        landmark: state.landmark,
        tagColors: state.tagColors
      });
    } catch (e) {
      set({ error: "Ошибка сохранения" });
    }
  },

  // --- Guests ---
  addGuest: (guestData) => {
    const newGuest = { ...guestData, id: 'g' + Date.now() };
    set(state => ({ guests: [...state.guests, newGuest] }));
    get()._sync();
  },
  
  updateGuest: (id, data) => {
    set(state => ({
      guests: state.guests.map(g => g.id === id ? { ...g, ...data } : g)
    }));
    get()._sync();
  },
  
  deleteGuest: (id) => {
    set(state => ({
      guests: state.guests.filter(g => g.id !== id),
      tables: state.tables.map(t => ({
        ...t,
        seats: t.seats.map(s => s === id ? null : s)
      }))
    }));
    get()._sync();
  },

  // --- Tables ---
  addTable: (type) => {
    const newTable: Table = {
      id: 't' + Date.now(),
      name: `Стол ${get().tables.length + 1}`,
      type,
      x: 400, y: 400, rotation: 0,
      seats: Array(type === 'round' ? 8 : 10).fill(null)
    };
    set(state => ({ tables: [...state.tables, newTable] }));
    get()._sync();
  },
  
  updateTable: (id, data) => {
    set(state => {
      const newTables = state.tables.map(t => {
        if (t.id !== id) return t;
        return { ...t, ...data };
      });
      return { tables: newTables };
    });
    get()._sync();
  },
  
  deleteTable: (id) => {
    set(state => {
      const table = state.tables.find(t => t.id === id);
      if (!table) return state;
      const seatedIds = new Set(table.seats.filter(s => s));
      return {
        guests: state.guests.map(g => ({ ...g, seated: seatedIds.has(g.id) ? false : g.seated })),
        tables: state.tables.filter(t => t.id !== id)
      };
    });
    get()._sync();
  },

  // --- Seating Logic ---
  assignSeat: (guestId, tableId, seatIdx) => {
    set(state => {
      const table = state.tables.find(t => t.id === tableId);
      if (!table || seatIdx < 0 || seatIdx >= table.seats.length) return state;
      
      const existingGuestId = table.seats[seatIdx];
      let newGuests = [...state.guests];
      
      const newTables = state.tables.map(t => {
        if (t.id === tableId) {
          const newSeats = [...t.seats];
          newSeats[seatIdx] = guestId;
          return { ...t, seats: newSeats };
        }
        return t;
      });
      
      newGuests = newGuests.map(g => {
        if (g.id === guestId) return { ...g, seated: true };
        if (existingGuestId && g.id === existingGuestId) return { ...g, seated: false };
        return g;
      });
      
      return { guests: newGuests, tables: newTables };
    });
    get()._sync();
  },
  
  unseatGuest: (tableId, seatIdx) => {
    set(state => {
      const table = state.tables.find(t => t.id === tableId);
      if (!table || seatIdx < 0 || seatIdx >= table.seats.length) return state;
      
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
      return { guests: newGuests, tables: newTables };
    });
    get()._sync();
  },
  
  swapSeats: (sourceGuestId, targetTableId, targetSeatIdx) => {
    set(state => {
      const targetTable = state.tables.find(t => t.id === targetTableId);
      if (!targetTable || targetSeatIdx < 0 || targetSeatIdx >= targetTable.seats.length) return state;

      const targetGuestId = targetTable.seats[targetSeatIdx];

      // Find where source guest is currently seated
      let sourceTableId: string | number | null = null;
      let sourceSeatIdx = -1;
      
      for (const t of state.tables) {
        const idx = t.seats.indexOf(sourceGuestId);
        if (idx !== -1) {
          sourceTableId = t.id;
          sourceSeatIdx = idx;
          break;
        }
      }

      if (sourceTableId === targetTableId && sourceSeatIdx === targetSeatIdx) return state;

      const newTables = state.tables.map(t => {
        const newSeats = [...t.seats];
        
        // Remove source from its old place, or place target guest there (swap)
        if (t.id === sourceTableId) {
          newSeats[sourceSeatIdx] = targetGuestId || null;
        }
        
        // Place source guest in target place
        if (t.id === targetTableId) {
          newSeats[targetSeatIdx] = sourceGuestId;
        }
        
        return { ...t, seats: newSeats };
      });

      const newGuests = state.guests.map(g => {
        if (g.id === sourceGuestId) return { ...g, seated: true };
        // If an existing target guest was swapped to unseated (source came from list, not a table)
        if (g.id === targetGuestId && !sourceTableId) return { ...g, seated: false };
        return g;
      });

      return { tables: newTables, guests: newGuests };
    });
    get()._sync();
  },

  // --- Miscellaneous ---
  updateLandmark: (x, y) => {
    set({ landmark: { x, y } });
    get()._sync();
  },
  
  updateTagColor: (tag, color) => {
    set(state => ({ tagColors: { ...state.tagColors, [tag]: color } }));
    get()._sync();
  },

  deleteTagColor: (tag) => {
    set(state => {
      const newTagColors = { ...state.tagColors };
      delete newTagColors[tag];
      
      // Also remove this tag from guests who have it as their primary label
      const newGuests = state.guests.map(g => {
        if (g.labels[0] === tag) {
          return { ...g, labels: [] };
        }
        return g;
      });
      
      return { tagColors: newTagColors, guests: newGuests };
    });
    get()._sync();
  }
}));
