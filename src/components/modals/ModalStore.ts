import { create } from 'zustand';

interface ModalState {
  activeModal: 'guest' | 'table' | 'tags' | 'seatAction' | null;
  payload: any;
  selectedGuestId: string | null;
  moveModeGuestId: string | null;
  guestDragId: string | null;
  guestDragStart: { x: number; y: number } | null;
  openModal: (modal: ModalState['activeModal'], payload?: any) => void;
  closeModal: () => void;
  setSelectedGuestId: (id: string | null) => void;
  setMoveModeGuestId: (id: string | null) => void;
  setGuestDrag: (id: string | null, start?: { x: number; y: number } | null) => void;
}

export const useModalStore = create<ModalState>((set) => ({
  activeModal: null,
  payload: null,
  selectedGuestId: null,
  moveModeGuestId: null,
  guestDragId: null,
  guestDragStart: null,
  openModal: (modal, payload = null) => set({ activeModal: modal, payload }),
  closeModal: () => set({ activeModal: null, payload: null }),
  setSelectedGuestId: (id) => set({ selectedGuestId: id, moveModeGuestId: null }),
  setMoveModeGuestId: (id) => set({ moveModeGuestId: id, selectedGuestId: null }),
  setGuestDrag: (id, start = null) => set({ guestDragId: id, guestDragStart: start }),
}));
