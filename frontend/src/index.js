import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const ignoredResizeObserverMessages = [
  'ResizeObserver loop limit exceeded',
  'ResizeObserver loop completed with undelivered notifications.'
];

const suppressResizeObserverErrors = (event) => {
  if (!event?.message) {
    return;
  }
  if (ignoredResizeObserverMessages.some((message) => event.message.includes(message))) {
    event.stopImmediatePropagation();
  }
};

window.addEventListener('error', suppressResizeObserverErrors);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
