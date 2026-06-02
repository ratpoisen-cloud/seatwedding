import { useState } from 'react';
import { useModalStore } from './ModalStore';
import { Modal } from './Modal';
import { useStore } from '../../store';
import { Button } from '../ui/Button';
import { UserMinus, Repeat, Move, ArrowLeft, Check, User } from 'lucide-react';

export function SeatActionModal() {
  const { payload, closeModal, setMoveModeGuestId } = useModalStore();
  const { guests, tagColors, swapSeats, unseatGuest } = useStore();
  const [step, setStep] = useState<'actions' | 'replaceList'>('actions');

  const guest = payload?.guestId ? guests.find(g => g.id === payload.guestId) : null;
  const tableId: string | undefined = payload?.tableId;
  const seatIdx: number | undefined = payload?.seatIdx;

  const unseatedGuests = guests.filter(g => !g.seated && g.id !== payload?.guestId);

  if (!guest || !tableId || seatIdx === undefined) return null;

  const handleUnseat = () => {
    unseatGuest(tableId, seatIdx);
    closeModal();
  };

  const handleReplaceWith = (replacementId: string) => {
    swapSeats(replacementId, tableId, seatIdx);
    closeModal();
  };

  const handleMove = () => {
    setMoveModeGuestId(guest.id);
    closeModal();
  };

  if (step === 'replaceList') {
    return (
      <Modal id="seatAction" title="Заменить гостя">
        <p className="text-sm text-text-muted mb-4">
          Кого посадить на место <strong>{guest.name}</strong>?
        </p>

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {unseatedGuests.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-8">Нет свободных гостей</p>
          ) : (
            unseatedGuests.map(g => {
              const tag = g.labels[0] || g.group;
              const color = tagColors[tag] || '#94a3b8';
              return (
                <button
                  key={g.id}
                  onClick={() => handleReplaceWith(g.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-border bg-white hover:border-primary/50 hover:shadow-sm transition-all text-left cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}20`, color }}>
                    <User size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-bold text-sm text-text-main block truncate">{g.name}</span>
                    {tag && <span className="text-[11px] text-text-muted">{tag}</span>}
                  </div>
                  <Check size={18} className="text-primary shrink-0" />
                </button>
              );
            })
          )}
        </div>

        <div className="flex justify-between mt-6 pt-4 border-t border-border">
          <Button variant="ghost" onClick={() => setStep('actions')}>
            <ArrowLeft size={16} /> Назад
          </Button>
          <Button variant="ghost" onClick={closeModal}>Отмена</Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal id="seatAction" title={guest.name}>
      <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-secondary">
        <div className="text-sm text-text-muted">
          {guest.labels?.[0] && (
            <span className="font-semibold" style={{ color: tagColors[guest.labels[0]] || '#94a3b8' }}>
              {guest.labels[0]}
            </span>
          )}
          <span className="text-text-muted ml-2">
            {guest.isQuestion ? '❓ Под вопросом' :
             guest.status === 'Приглашение принято' ? '✅ Принято' :
             guest.status === 'Отклонено' ? '❌ Отклонено' :
             guest.status === 'Не приглашен' ? 'Не приглашен' : ''}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Button variant="danger" className="w-full justify-start gap-3 h-12" onClick={handleUnseat}>
          <UserMinus size={18} /> Убрать с места
        </Button>
        <Button variant="secondary" className="w-full justify-start gap-3 h-12" onClick={() => setStep('replaceList')}>
          <Repeat size={18} /> Заменить другим гостем
        </Button>
        <Button variant="secondary" className="w-full justify-start gap-3 h-12" onClick={handleMove}>
          <Move size={18} /> Пересадить на другое место
        </Button>
      </div>

      <div className="flex justify-end mt-6 pt-4 border-t border-border">
        <Button variant="ghost" onClick={closeModal}>Отмена</Button>
      </div>
    </Modal>
  );
}
