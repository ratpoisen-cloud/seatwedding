import { create } from 'zustand';

interface ModalState {
  activeModal: 'guest' | 'table' | 'tags' | 'seatAction' | null;
  payload: any;
  selectedGuestId: string | null;
  moveModeGuestId: string | null;
  openModal: (modal: ModalState['activeModal'], payload?: any) => void;
  closeModal: () => void;
  setSelectedGuestId: (id: string | null) => void;
  setMoveModeGuestId: (id: string | null) => void;
}

export const useModalStore = create<ModalState>((set) => ({
  activeModal: null,
  payload: null,
  selectedGuestId: null,
  moveModeGuestId: null,
  openModal: (modal, payload = null) => set({ activeModal: modal, payload }),
  closeModal: () => set({ activeModal: null, payload: null }),
  setSelectedGuestId: (id) => set({ selectedGuestId: id, moveModeGuestId: null }),
  setMoveModeGuestId: (id) => set({ moveModeGuestId: id, selectedGuestId: null }),
}));
