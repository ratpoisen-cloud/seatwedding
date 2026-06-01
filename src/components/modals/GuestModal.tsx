
import { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { useModalStore } from './ModalStore';
import { useStore, type GuestStatus } from '../../store';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

export function GuestModal() {
  const { payload, closeModal } = useModalStore();
  const { guests, tagColors, addGuest, updateGuest, deleteGuest } = useStore();
  
  const [name, setName] = useState('');
  const [tag, setTag] = useState('');
  const [status, setStatus] = useState<GuestStatus>('Приглашение принято');

  const isEdit = !!payload?.id;
  const guest = isEdit ? guests.find(g => g.id === payload.id) : null;

  useEffect(() => {
    if (guest) {
      setName(guest.name);
      setTag(guest.labels[0] || guest.group || ''); // Simplified mapping for now
      setStatus(guest.status);
    } else {
      setName('');
      setTag('');
      setStatus('Приглашение принято');
    }
  }, [guest, payload]);

  const handleSave = () => {
    if (!name.trim()) return;
    
    const data = {
      name,
      group: tag, // Keeping group field synced for legacy
      labels: tag ? [tag] : [],
      status,
      isQuestion: status === 'Под вопросом'
    };

    if (isEdit) {
      updateGuest(payload.id, data);
    } else {
      addGuest({ ...data, seated: false });
    }
    closeModal();
  };

  const handleDelete = () => {
    if (isEdit) {
      deleteGuest(payload.id);
      closeModal();
    }
  };

  return (
    <Modal id="guest" title={isEdit ? "Редактировать гостя" : "Новый гость"}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-bold text-text-muted mb-1">Имя и фамилия</label>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Иван Иванов" autoFocus />
        </div>
        
        <div>
          <label className="block text-sm font-bold text-text-muted mb-1">Группа / Тег</label>
          <select 
            className="flex h-11 w-full rounded-xl border border-border bg-bg-main px-4 py-2 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            value={tag}
            onChange={e => setTag(e.target.value)}
          >
            <option value="">Нет группы</option>
            {Object.keys(tagColors).map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-bold text-text-muted mb-1">Статус</label>
          <select 
            className="flex h-11 w-full rounded-xl border border-border bg-bg-main px-4 py-2 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            value={status}
            onChange={e => setStatus(e.target.value as GuestStatus)}
          >
            <option value="Приглашение принято">✅ Приглашение принято</option>
            <option value="Под вопросом">❓ Под вопросом</option>
            <option value="Отклонено">❌ Отклонено</option>
            <option value="Не приглашен">Не приглашен</option>
          </select>
        </div>
      </div>

      <div className="flex justify-between items-center mt-8">
        {isEdit ? (
          <Button variant="danger" onClick={handleDelete}>Удалить</Button>
        ) : <div />}
        <div className="flex gap-3">
          <Button variant="ghost" onClick={closeModal}>Отмена</Button>
          <Button variant="primary" onClick={handleSave}>Сохранить</Button>
        </div>
      </div>
    </Modal>
  );
}
