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

if (typeof window !== 'undefined') {
  const originalConsoleError = window.console?.error;
  if (originalConsoleError) {
    window.console.error = (...args) => {
      const firstArg = args[0];
      if (
        typeof firstArg === 'string' &&
        firstArg.includes('ResizeObserver loop completed with undelivered notifications')
      ) {
        return;
      }
      originalConsoleError(...args);
    };
  }
}

function App() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <WidgetCanvas />
    </div>
  );
}

export default App;
