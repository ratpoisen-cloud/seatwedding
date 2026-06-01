
import { useModalStore } from './modals/ModalStore';
import { Button } from './ui/Button';
import { Settings, Share, Download, Menu } from 'lucide-react';

interface HeaderProps {
  onToggleMenu: () => void;
  onExport: () => void;
  onScreenshot: () => void;
}

export function Header({ onToggleMenu, onExport, onScreenshot }: HeaderProps) {
  const { openModal } = useModalStore();

  return (
    <header className="h-[72px] bg-bg-card border-b border-border flex items-center justify-between px-6 z-20 col-span-2">
      <div className="flex items-center gap-4">
        <button onClick={onToggleMenu} className="lg:hidden p-2 text-text-muted hover:bg-secondary rounded-lg">
          <Menu size={24} />
        </button>
        <h1 className="font-heading text-2xl font-bold text-primary">WeddingPlanner</h1>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => openModal('tags')} title="Настройки статусов и цветов">
          <Settings size={20} />
        </Button>
        <Button variant="secondary" className="hidden sm:flex gap-2" onClick={onExport}>
          <Download size={18} /> Экспорт
        </Button>
        <Button variant="primary" className="gap-2" onClick={onScreenshot}>
          <Share size={18} /> Поделиться
        </Button>
      </div>
    </header>
  );
}
