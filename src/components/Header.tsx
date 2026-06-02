
import { useModalStore } from './modals/ModalStore';
import { Button } from './ui/Button';
import { Settings, Download, Share2, Menu } from 'lucide-react';

interface HeaderProps {
  onToggleMenu: () => void;
  onExport: () => void;
  onScreenshot: () => void;
}

export function Header({ onToggleMenu, onExport, onScreenshot }: HeaderProps) {
  const { openModal } = useModalStore();

  return (
    <header className="h-[72px] bg-secondary border-b-2 border-primary/30 flex items-center justify-between px-6 z-20">
      <div className="flex items-center gap-4">
        <button onClick={onToggleMenu} className="lg:hidden p-2 text-text-muted hover:bg-primary/10 rounded-xl transition-colors">
          <Menu size={24} />
        </button>
        <h1 className="font-heading text-2xl font-bold text-primary tracking-tight">SeatWedding</h1>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => openModal('tags')} title="Настройки статусов и цветов">
          <Settings size={20} />
        </Button>
        <Button variant="secondary" className="hidden sm:flex gap-2" onClick={onExport}>
          <Download size={18} /> Экспорт
        </Button>
        <Button variant="primary" className="gap-2" onClick={onScreenshot}>
          <Share2 size={18} /> Поделиться
        </Button>
      </div>
    </header>
  );
}
