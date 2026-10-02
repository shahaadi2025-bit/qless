import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App.tsx';
import { AuthProvider } from './context/AuthContext.tsx';
import { SocketProvider } from './context/SocketContext.tsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <SocketProvider>
        <App />
      </SocketProvider>
    </AuthProvider>
  </React.StrictMode>
);
