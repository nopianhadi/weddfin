import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './src/index.css';

// Disable console.log globally in browser context
if (typeof window !== 'undefined' && typeof console !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  console.log = () => {};
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
