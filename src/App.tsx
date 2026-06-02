import { useEffect, useState, useRef } from 'react';
import { useStore } from './store';
import { subscribeToWedding } from './firebase';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { GuestModal } from './components/modals/GuestModal';
import { TableModal } from './components/modals/TableModal';
import { TagsModal } from './components/modals/TagsModal';
import { SeatActionModal } from './components/modals/SeatActionModal';
import { Canvas } from './components/canvas/Canvas';
import { Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { toPng } from 'html-to-image';

function App() {
  const initialize = useStore(state => state.initialize);
  const isSyncing = useStore(state => state.isSyncing);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const weddingId = params.get('id') || 'default-wedding';
    
    // We only initialize once with data, then subsequent updates are handled
    let initialLoad = true;
    
    const unsubscribe = subscribeToWedding(weddingId, (data) => {
      if (!data) return;

      const mergedData = { ...data };
      if (!mergedData.tagColors) mergedData.tagColors = { ...useStore.getState().tagColors };
      
      // Dynamic mapping for legacy labels
      if (mergedData.guests) {
        mergedData.guests = mergedData.guests.map((g: any) => {
          if (!g.labels) g.labels = [];
          
          let tag = g.labels[0] || g.group || '';
          
          if (tag && !mergedData.tagColors[tag]) {
             const lbl = tag.toLowerCase();
             if (lbl.includes('семья жениха')) mergedData.tagColors[tag] = '#34d399';
             else if (lbl.includes('семья невесты')) mergedData.tagColors[tag] = '#059669';
             else if (lbl.includes('друзья жениха')) mergedData.tagColors[tag] = '#60a5fa';
             else if (lbl.includes('друзья невесты')) mergedData.tagColors[tag] = '#2563eb';
             else if (lbl.includes('семья') || lbl.includes('родные')) mergedData.tagColors[tag] = '#10b981';
             else if (lbl.includes('друг')) mergedData.tagColors[tag] = '#3b82f6';
             else if (lbl.includes('родител')) mergedData.tagColors[tag] = '#f59e0b';
             else if (lbl.includes('жених и невеста')) mergedData.tagColors[tag] = '#ec4899';
             else mergedData.tagColors[tag] = '#94a3b8';
          }

          if (tag && g.labels.length === 0) {
            g.labels = [tag];
          }

          return g;
        });
      }

      if (initialLoad) {
        initialize(weddingId, mergedData);
        initialLoad = false;
      } else {
        useStore.setState(state => ({
           guests: mergedData.guests || state.guests,
           tables: mergedData.tables || state.tables,
           landmark: mergedData.landmark || state.landmark,
           tagColors: mergedData.tagColors || state.tagColors
        }));
      }
    });
    
    return () => unsubscribe();
  }, [initialize]);

  const exportExcel = () => {
    const { guests, tables } = useStore.getState();
    const data = guests.map(g => {
      const table = tables.find(t => t.seats.includes(g.id));
      let seatNum = table ? table.seats.indexOf(g.id) + 1 : '';
      return {
        'Имя': g.name,
        'Группа/Тег': g.labels[0] || g.group || '',
        'Статус': g.status + (g.isQuestion ? ' (Под вопросом)' : ''),
        'Стол': table ? table.name : 'Не рассажен',
        'Место': seatNum
      };
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Рассадка");
    XLSX.writeFile(wb, "Wedding_Seating_Plan.xlsx");
  };

  const takeScreenshot = async () => {
    if (!canvasWrapperRef.current) return;
    
    // Add print mode class to hide UI overlays during screenshot
    document.body.classList.add('print-mode');
    
    try {
      const dataUrl = await toPng(canvasWrapperRef.current, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: '#e2e8f0', // match canvas-area
      });
      
      const link = document.createElement('a');
      link.download = 'wedding-seating-plan.png';
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Screenshot failed', err);
      alert('Не удалось сделать скриншот');
    } finally {
      document.body.classList.remove('print-mode');
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      <Header 
        onToggleMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
        onExport={exportExcel}
        onScreenshot={takeScreenshot}
      />
      <div className="flex flex-1 h-[calc(100vh-72px)] overflow-hidden relative">
        <Sidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
        <main className="flex-1 relative bg-slate-200" ref={canvasWrapperRef}>
           <Canvas />
        </main>
      </div>

      <GuestModal />
      <TableModal />
      <TagsModal />
      <SeatActionModal />
      
      {/* Global Sync Indicator */}
      {isSyncing && (
        <div className="fixed bottom-4 right-4 bg-slate-900/80 backdrop-blur text-white px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 shadow-lg z-50 print-mode-hide">
          <Loader2 size={16} className="animate-spin" />
          Синхронизация...
        </div>
      )}
    </div>
  );
}

export default App;
