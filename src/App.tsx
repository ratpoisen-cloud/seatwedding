import { useEffect } from 'react';
import { useStore } from './store';
import { subscribeToWedding } from './firebase';

function App() {
  const initialize = useStore(state => state.initialize);
  
  useEffect(() => {
    // Basic setup for now
    const params = new URLSearchParams(window.location.search);
    const weddingId = params.get('id') || 'default-wedding';
    
    const unsubscribe = subscribeToWedding(weddingId, (data) => {
      initialize(weddingId, data);
    });
    
    return () => unsubscribe();
  }, [initialize]);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-indigo-600 mb-4">WeddingPlanner V3</h1>
        <p className="text-gray-600">Initializing project and Firebase connection...</p>
      </div>
    </div>
  );
}

export default App;
