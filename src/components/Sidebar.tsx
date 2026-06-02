import { useState } from 'react';
import { useStore } from '../store';
import { useModalStore } from './modals/ModalStore';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { User, Tag, Plus, Edit2, Search, CheckCircle2, HelpCircle, XCircle } from 'lucide-react';
import { cn } from '../utils';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const guests = useStore(state => state.guests);
  const tables = useStore(state => state.tables);
  const addTable = useStore(state => state.addTable);
  const tagColors = useStore(state => state.tagColors);
  const { openModal, selectedGuestId, setSelectedGuestId } = useModalStore();
  const [activeTab, setActiveTab] = useState<'guests' | 'tables'>('guests');
  const [search, setSearch] = useState('');

  const filteredGuests = guests
    .filter(g =>
      g.name.toLowerCase().includes(search.toLowerCase()) ||
      (g.labels[0] || g.group || '').toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => a.name.localeCompare(b.name));

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
          className="fixed inset-0 bg-slate-900/40 z-20 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside className={cn(
        "w-96 max-w-[85vw] flex flex-col bg-bg-card border-r border-border h-full shadow-lg z-30 absolute lg:static top-0 left-0 transition-transform duration-300 ease-in-out lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>

      <div className="flex border-b border-border">
        <button
          className={cn(
            "flex-1 py-4 font-bold text-sm transition-colors",
            activeTab === 'guests' ? "text-primary border-b-2 border-primary" : "text-text-muted hover:bg-secondary"
          )}
          onClick={() => setActiveTab('guests')}
        >
          Гости
        </button>
        <button
          className={cn(
            "flex-1 py-4 font-bold text-sm transition-colors",
            activeTab === 'tables' ? "text-primary border-b-2 border-primary" : "text-text-muted hover:bg-secondary"
          )}
          onClick={() => setActiveTab('tables')}
        >
          Столы
        </button>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === 'guests' ? (
          <div className="flex flex-col h-full p-4 gap-4">
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

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {filteredGuests.map(g => {
                const tag = g.labels[0] || g.group;
                const color = tagColors[tag] || '#94a3b8';
                const isSelected = selectedGuestId === g.id;

                return (
                  <div
                    key={g.id}
                    onClick={() => handleGuestClick(g.id)}
                    className={cn(
                      "group flex items-center justify-between p-3 rounded-xl border border-border bg-bg-card transition-all cursor-pointer",
                      g.seated ? "opacity-50 border-dashed bg-secondary" : "hover:border-primary/50 hover:shadow-sm",
                      g.isQuestion && "border-amber-300 ring-1 ring-amber-100",
                      isSelected && "ring-2 ring-primary border-primary shadow-sm"
                    )}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}20`, color }}>
                        <User size={16} />
                      </div>
                      <div className="flex flex-col overflow-hidden">
                        <span className="font-bold text-sm text-text-main truncate">{g.name}</span>
                        <div className="flex items-center gap-2">
                          {tag && <span className="text-[11px] font-semibold flex items-center gap-1" style={{ color }}><Tag size={10} /> {tag}</span>}
                          {g.isQuestion ? (
                            <span className="text-[11px] text-amber-600 flex items-center gap-1"><HelpCircle size={10}/> Вопрос</span>
                          ) : g.status === 'Отклонено' ? (
                            <span className="text-[11px] text-red-500 flex items-center gap-1"><XCircle size={10}/> Отклонено</span>
                          ) : g.status === 'Приглашение принято' ? (
                            <span className="text-[11px] text-emerald-600 flex items-center gap-1"><CheckCircle2 size={10}/> Принято</span>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openModal('guest', { id: g.id });
                      }}
                      className="opacity-0 group-hover:opacity-100 p-2 text-text-muted hover:text-primary transition-opacity focus:outline-none"
                    >
                      <Edit2 size={16} />
                    </button>
                  </div>
                )
              })}
              {filteredGuests.length === 0 && (
                <div className="text-center py-8 text-text-muted text-sm">
                  {search ? 'Гостей не найдено' : 'Список гостей пуст'}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full p-4 gap-4">
            <div className="flex gap-2">
              <Button className="flex-1" variant="secondary" onClick={() => addTable('round')}>⚪ Круглый</Button>
              <Button className="flex-1" variant="secondary" onClick={() => addTable('rect')}>▭ Прямоуг.</Button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {tables.map(table => {
                const seatedCount = table.seats.filter(s => s).length;
                return (
                  <div key={table.id} className="group flex items-center justify-between p-3 rounded-xl border border-border bg-bg-card hover:border-primary/50 hover:shadow-sm transition-all">
                    <div className="flex flex-col">
                      <span className="font-bold text-sm text-text-main">{table.name}</span>
                      <span className="text-[11px] text-text-muted">
                        {table.type === 'round' ? 'Круглый' : 'Прямоугольный'} • {seatedCount}/{table.seats.length} занято
                      </span>
                    </div>
                    <button
                      onClick={() => openModal('table', { id: table.id })}
                      className="p-2 text-text-muted hover:text-primary transition-colors focus:outline-none"
                    >
                      <Edit2 size={16} />
                    </button>
                  </div>
                )
              })}
              {tables.length === 0 && (
                <div className="text-center py-8 text-text-muted text-sm">
                  Нет добавленных столов
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
    </>
  );
}
