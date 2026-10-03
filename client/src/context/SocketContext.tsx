import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { playQueueChime, stopQueueSound, unmuteQueueSound } from '../components/AudioChime.ts';
import { SOCKET_URL } from '../config.ts';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  lastEvent: any;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  lastEvent: null
});

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<any>(null);

  useEffect(() => {
    // Connect to dynamic socket URL (Render in cloud, localhost in development)
    const socketInstance = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    socketInstance.on('connect', () => {
      console.log('⚡ [Client Socket] Connected to QLESS Real-Time Server');
      setIsConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('🔌 [Client Socket] Disconnected');
      setIsConnected(false);
    });

    socketInstance.on('queue:event', (eventData: any) => {
      console.log('📡 [Queue Event Received]', eventData);
      setLastEvent(eventData);

      // If token is called, trigger sound chime
      if (['TOKEN_SERVING', 'TOKEN_COMPLETED', 'TOKEN_NO_SHOW'].includes(eventData.type)) {
        stopQueueSound();
      }

      if (eventData.type === 'TOKEN_CALLED') {
        unmuteQueueSound();
        playQueueChime(eventData.data?.announcement_text);
      }
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected, lastEvent }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
