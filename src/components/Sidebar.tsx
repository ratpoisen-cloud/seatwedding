import { useState, useMemo } from 'react';
import { useStore } from '../store';
import { useModalStore } from './modals/ModalStore';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Tag, Plus, Edit2, Search, CheckCircle2, HelpCircle, XCircle } from 'lucide-react';
import { cn } from '../utils';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const guests = useStore(state => state.guests);
  const tagColors = useStore(state => state.tagColors);
  const { openModal, selectedGuestId, setSelectedGuestId } = useModalStore();
  const [search, setSearch] = useState('');

  const sortedGuests = useMemo(() => {
    return guests
      .filter(g =>
        g.name.toLowerCase().includes(search.toLowerCase()) ||
        (g.labels[0] || g.group || '').toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => {
        if (a.seated !== b.seated) return a.seated ? 1 : -1;
        return a.name.localeCompare(b.name);
      });
  }, [guests, search]);

  const handleGuestClick = (guestId: string) => {
    if (selectedGuestId === guestId) {
      setSelectedGuestId(null);
    } else {
      setSelectedGuestId(guestId);
    }
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-[#283618]/50 z-20 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside className={cn(
        "w-96 max-w-[85vw] flex flex-col bg-secondary border-r border-accent/15 h-full shadow-[var(--shadow-card)] z-30 absolute lg:static top-0 left-0 transition-transform duration-300 ease-in-out lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>

        <div className="flex-1 overflow-hidden flex flex-col p-5 gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-xl font-bold text-text-main">Гости</h2>
            <span className="text-xs text-text-muted font-semibold px-3 py-1 rounded-full border border-accent/20 bg-white">
              {guests.filter(g => !g.seated).length} / {guests.length}
            </span>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
            <Input
              placeholder="Поиск гостей..."
              className="pl-10"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <Button className="w-full gap-2" onClick={() => openModal('guest')}>
            <Plus size={18} /> Новый гость
          </Button>

          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
            {sortedGuests.map(g => {
              const tag = g.labels[0] || g.group;
              const color = tagColors[tag] || '#606c38';
              const isSelected = selectedGuestId === g.id;

              return (
                <div
                  key={g.id}
                  draggable="true"
                  onClick={() => handleGuestClick(g.id)}
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', g.id);
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  className={cn(
                    "group flex items-center justify-between p-3 rounded-xl border-2 transition-all cursor-grab active:cursor-grabbing",
                    g.seated
                      ? "border-dashed border-text-muted/30 bg-white/60 opacity-60 hover:opacity-80"
                      : "border-transparent bg-white hover:border-accent/30 hover:shadow-[var(--shadow-card)]",
                      g.isQuestion && "border-amber-300/60",
                      isSelected && "!border-primary !bg-white shadow-[var(--shadow-glow)]"
                  )}
                >
                  <div className="flex items-center gap-3 overflow-hidden min-w-0">
                    <div className={cn(
                      "w-9 h-9 rounded-full flex items-center justify-center shrink-0 font-bold text-sm",
                      isSelected ? "bg-primary text-white" : "bg-accent/10 text-text-muted"
                    )}>
                      {g.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex flex-col overflow-hidden min-w-0">
                      <span className={cn(
                        "font-bold text-sm truncate",
                        isSelected ? "text-primary" : "text-text-main"
                      )}>
                        {g.name}
                      </span>
                      <div className="flex items-center gap-2 flex-wrap">
                        {tag && (
                          <span className="text-[11px] font-semibold flex items-center gap-1" style={{ color }}>
                            <Tag size={10} /> {tag}
                          </span>
                        )}
                        {g.isQuestion ? (
                          <span className="text-[11px] text-amber-600 flex items-center gap-1"><HelpCircle size={10} /> Вопрос</span>
                        ) : g.status === 'Отклонено' ? (
                          <span className="text-[11px] text-danger flex items-center gap-1"><XCircle size={10} /> Отклонено</span>
                        ) : g.status === 'Приглашение принято' ? (
                          <span className="text-[11px] text-emerald-600 flex items-center gap-1"><CheckCircle2 size={10} /> Принято</span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openModal('guest', { id: g.id });
                    }}
                    className="opacity-0 group-hover:opacity-100 p-2 text-text-muted hover:text-accent transition-all focus:outline-none shrink-0"
                  >
                    <Edit2 size={16} />
                  </button>
                </div>
              )
            })}
            {sortedGuests.length === 0 && (
              <div className="text-center py-10 text-text-muted text-sm">
                {search ? 'Гостей не найдено' : 'Список гостей пуст'}
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
