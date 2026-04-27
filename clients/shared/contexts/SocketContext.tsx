import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import type { ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  connect: (token?: string) => void;
  disconnect: () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

interface SocketProviderProps {
  children: ReactNode;
  url?: string;
  autoConnect?: boolean;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({
  children,
  url,
  autoConnect = false,
}) => {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketUrl = url || import.meta.env.VITE_SOCKET_URL || 'http://localhost:3013';

  const connect = useCallback((token?: string) => {
    if (socketRef.current?.connected) return;

    const authToken = token || localStorage.getItem('accessToken');

    socketRef.current = io(socketUrl, {
      auth: authToken ? { token: authToken } : undefined,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      timeout: 10000,
    });

    socketRef.current.on('connect', () => {
      console.log('[Socket] Connected:', socketRef.current?.id);
      setIsConnected(true);
    });

    socketRef.current.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
      setIsConnected(false);
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error.message);
      setIsConnected(false);
    });

    socketRef.current.on('reconnect', (attemptNumber) => {
      console.log('[Socket] Reconnected after', attemptNumber, 'attempts');
      setIsConnected(true);
    });

    socketRef.current.on('reconnect_failed', () => {
      console.error('[Socket] Reconnection failed');
      setIsConnected(false);
    });
  }, [socketUrl]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    }
  }, []);

  useEffect(() => {
    if (autoConnect) {
      const token = localStorage.getItem('accessToken');
      if (token) {
        connect(token);
      }
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  const value: SocketContextType = {
    socket: socketRef.current,
    isConnected,
    connect,
    disconnect,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
