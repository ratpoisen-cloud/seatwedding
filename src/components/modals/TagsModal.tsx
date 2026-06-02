
import { useState } from 'react';
import { Modal } from './Modal';
import { useModalStore } from './ModalStore';
import { useStore } from '../../store';
import { Button } from '../ui/Button';
import { Trash2 } from 'lucide-react';

export function TagsModal() {
  const { closeModal } = useModalStore();
  const { tagColors, updateTagColor, deleteTagColor } = useStore();
  
  // Local state for adding a new tag
  const [newTagName, setNewTagName] = useState('');

  const handleAddTag = () => {
    const name = newTagName.trim();
    if (name && !tagColors[name]) {
      updateTagColor(name, '#94a3b8'); // Default gray
      setNewTagName('');
    }
  };

  const handleDeleteTag = (tag: string) => {
    if (confirm(`Удалить группу "${tag}"? Это уберет цвет у всех гостей в этой группе.`)) {
       deleteTagColor(tag);
    }
  };

  return (
    <Modal id="tags" title="Настройка групп">
      <p className="text-sm text-text-muted mb-4 -mt-2">Эти цвета используются для окрашивания мест на плане.</p>
      
      <div className="space-y-3 max-h-64 overflow-y-auto pr-2 mb-6">
        {Object.entries(tagColors).map(([tag, color]) => (
          <div key={tag} className="flex items-center gap-3">
            <input
              type="color"
              value={color}
              onChange={(e) => updateTagColor(tag, e.target.value)}
              className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0 overflow-hidden bg-transparent [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-none [&::-webkit-color-swatch]:rounded-lg"
            />
            <input
              type="text"
              readOnly
              value={tag}
              className="flex-1 h-10 rounded-lg border border-border bg-secondary px-3 text-sm focus:outline-none"
            />
            <button
              onClick={() => handleDeleteTag(tag)}
              className="p-2 rounded-lg text-red-500 hover:bg-red-100 transition-colors focus:outline-none"
              title="Удалить"
            >
              <Trash2 size={20} />
            </button>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input 
          type="text" 
          placeholder="Новая группа..." 
          value={newTagName}
          onChange={e => setNewTagName(e.target.value)}
          className="flex-1 h-11 rounded-xl border border-border bg-white px-4 text-sm focus:outline-none focus:border-accent"
        />
        <Button onClick={handleAddTag}>Добавить</Button>
      </div>

      <div className="flex justify-end mt-6 pt-4 border-t border-border">
        <Button variant="ghost" onClick={closeModal}>Закрыть</Button>
      </div>
    </Modal>
  );
}
