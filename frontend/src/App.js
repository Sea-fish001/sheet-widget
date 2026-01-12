import React, { useEffect } from 'react';
import WidgetCanvas from './WidgetCanvas';
import 'handsontable/dist/handsontable.full.min.css';

function App() {
  useEffect(() => {
    const handleError = (event) => {
      if (event?.message?.includes('ResizeObserver loop completed')) {
        event.preventDefault();
      }
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <WidgetCanvas />
    </div>
  );
}

export default App;
