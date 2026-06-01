import { useModalStore } from './ModalStore';
import { Modal } from './Modal';
import { useStore } from '../../store';
import { Button } from '../ui/Button';
import { RefreshCw, HelpCircle, UserMinus } from 'lucide-react';

export function SeatActionModal() {
  const { payload, closeModal } = useModalStore();
  const { guests, updateGuest, unseatGuest } = useStore();

  const guest = payload?.guestId ? guests.find(g => g.id === payload.guestId) : null;

  if (!guest) return null;

  const handleToggleQuestion = () => {
    updateGuest(guest.id, { isQuestion: !guest.isQuestion });
    closeModal();
  };

  const handleUnseat = () => {
    if (payload?.tableId && payload?.seatIdx !== undefined) {
      unseatGuest(payload.tableId, payload.seatIdx);
    }
    closeModal();
  };

  const handleSwap = () => {
    // For a complex flow, "Swap" from click might open a picker.
    // However, user requested swap via long-press drag-and-drop.
    // For the modal, we can offer to just edit the guest instead.
    closeModal();
    useModalStore.getState().openModal('guest', { id: guest.id });
  };

  return (
    <Modal id="seatAction" title={guest.name}>
      <p className="text-sm text-text-muted mb-6 -mt-2">Выберите действие для этого гостя за столом.</p>
      
      <div className="flex flex-col gap-3">
        <Button variant="secondary" className="w-full justify-start gap-3 h-12" onClick={handleSwap}>
          <RefreshCw size={18} /> Редактировать гостя
        </Button>
        <Button variant="secondary" className="w-full justify-start gap-3 h-12" onClick={handleToggleQuestion}>
          <HelpCircle size={18} className={guest.isQuestion ? 'text-amber-500' : ''} /> 
          {guest.isQuestion ? 'Убрать отметку "Под вопросом"' : 'Отметить "Под вопросом"'}
        </Button>
        <Button variant="danger" className="w-full justify-start gap-3 h-12 mt-2" onClick={handleUnseat}>
          <UserMinus size={18} /> Убрать с места
        </Button>
      </div>

      <div className="flex justify-end mt-6 pt-4 border-t border-border">
        <Button variant="ghost" onClick={closeModal}>Отмена</Button>
      </div>
    </Modal>
  );
}
