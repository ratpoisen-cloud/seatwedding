import { useState } from 'react';
import { Modal } from './Modal';
import { useModalStore } from './ModalStore';
import { useStore } from '../../store';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

export function TableModal() {
  const { payload, closeModal } = useModalStore();
  const { tables, updateTable, deleteTable } = useStore();

  const table = payload?.id ? tables.find(t => t.id === payload.id) : null;
  const [name, setName] = useState(table?.name || '');
  const [seatCount, setSeatCount] = useState(table?.seats.length || 8);
  const [rotation, setRotation] = useState(table?.rotation || 0);

  const handleSave = () => {
    if (!table || !name.trim()) return;

    const newSeats = Array(seatCount).fill(null).map((_, i) => table.seats[i] ?? null);
    updateTable(table.id, { name: name.trim(), seats: newSeats, rotation });
    closeModal();
  };

  const handleDelete = () => {
    if (!table) return;
    if (confirm(`Удалить стол "${table.name}"? Гости будут рассажены.`)) {
      deleteTable(table.id);
      closeModal();
    }
  };

  if (!table) return null;

  return (
    <Modal id="table" title="Настройки стола">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-bold text-text-muted mb-1">Название стола</label>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Стол 1" autoFocus />
        </div>

        <div>
          <label className="block text-sm font-bold text-text-muted mb-1">Количество мест</label>
          <input
            type="number"
            min={2}
            max={20}
            value={seatCount}
            onChange={e => setSeatCount(Math.max(2, Math.min(20, parseInt(e.target.value) || 2)))}
            className="flex h-11 w-full rounded-xl border border-border bg-bg-main px-4 py-2 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-text-muted mb-1">Поворот (градусы)</label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={360}
              value={rotation}
              onChange={e => setRotation(parseInt(e.target.value))}
              className="flex-1 accent-primary"
            />
            <span className="text-sm font-bold text-text-main w-10 text-right">{rotation}°</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-text-muted pt-2">
          <span className="inline-block w-3 h-3 rounded-full bg-emerald-400" />
          Круглый стол • {table.seats.filter(s => s).length}/{table.seats.length} занято
        </div>
      </div>

      <div className="flex justify-between items-center mt-8">
        <Button variant="danger" onClick={handleDelete}>Удалить стол</Button>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={closeModal}>Отмена</Button>
          <Button variant="primary" onClick={handleSave}>Сохранить</Button>
        </div>
      </div>
    </Modal>
  );
}
