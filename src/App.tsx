import { useEffect } from 'react';
import { useStore } from './store';
import { subscribeToWedding } from './firebase';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { GuestModal } from './components/modals/GuestModal';
import { TagsModal } from './components/modals/TagsModal';
import { Canvas } from './components/canvas/Canvas';
import { Loader2 } from 'lucide-react';

function App() {
  const { initialize, isSyncing } = useStore();
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const weddingId = params.get('id') || 'default-wedding';
    
    // We only initialize once with data, then subsequent updates are handled
    let initialLoad = true;
    
    const unsubscribe = subscribeToWedding(weddingId, (data) => {
      if (initialLoad) {
        initialize(weddingId, data);
        initialLoad = false;
      } else {
        // If it's a subsequent update, we should ideally merge it carefully
        // to avoid overwriting local transient state like dragging.
        // For simplicity in this iteration, we merge it directly if not actively interacting.
        // A more robust app would use field-level merging or timestamps.
        useStore.setState(state => ({
           guests: data?.guests || state.guests,
           tables: data?.tables || state.tables,
           landmark: data?.landmark || state.landmark,
           tagColors: data?.tagColors || state.tagColors
        }));
      }
    });
    
    return () => unsubscribe();
  }, [initialize]);

  return (
    <div className="flex flex-col lg:flex-row h-screen w-screen overflow-hidden">
      <Header />
      <div className="flex flex-1 h-[calc(100vh-72px)] overflow-hidden absolute top-[72px] inset-x-0 bottom-0">
        <Sidebar />
        <main className="flex-1 relative bg-slate-200">
           <Canvas />
        </main>
      </div>

      <GuestModal />
      <TagsModal />
      
      {/* Global Sync Indicator */}
      {isSyncing && (
        <div className="fixed bottom-4 right-4 bg-slate-900/80 backdrop-blur text-white px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 shadow-lg z-50">
          <Loader2 size={16} className="animate-spin" />
          Синхронизация...
        </div>
      )}
    </div>
  );
}

export default App;
