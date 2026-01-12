import React from 'react';
import WidgetCanvas from './WidgetCanvas';
import 'handsontable/dist/handsontable.full.min.css';

if (typeof window !== 'undefined' && window.ResizeObserver) {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

function App() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <WidgetCanvas />
    </div>
  );
}

export default App;
