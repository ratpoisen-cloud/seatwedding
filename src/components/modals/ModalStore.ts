import { create } from 'zustand';

interface ModalState {
  activeModal: 'guest' | 'table' | 'tags' | 'seatAction' | null;
  payload: any;
  openModal: (modal: ModalState['activeModal'], payload?: any) => void;
  closeModal: () => void;
}

export const useModalStore = create<ModalState>((set) => ({
  activeModal: null,
  payload: null,
  openModal: (modal, payload = null) => set({ activeModal: modal, payload }),
  closeModal: () => set({ activeModal: null, payload: null }),
}));
