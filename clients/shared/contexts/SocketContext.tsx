import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import toast from 'react-hot-toast';

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
  // Use a ref to track the active socket instance to avoid dependency cycles in connect
  const socketRef = useRef<Socket | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketUrl = url || import.meta.env.VITE_SOCKET_URL || 'http://localhost:3013';

  const connect = useCallback((token?: string) => {
    // If we already have a socket and it's active/connecting, skip
    if (socketRef.current) {
      // socket.connected is true when connected, active is true when trying to connect
      if (socketRef.current.connected || socketRef.current.active) {
        return;
      }
    }

    const authToken = token || localStorage.getItem('accessToken');

    const newSocket = io(socketUrl, {
      auth: authToken ? { token: authToken } : undefined,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      timeout: 10000,
    });

    socketRef.current = newSocket;

    newSocket.on('connect', () => {
      console.log('[Socket] Connected:', newSocket.id);
      setIsConnected(true);
      // Set the socket in state so consumers get the new instance ONLY when connected
      setSocket(newSocket);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error.message);
      setIsConnected(false);
      // Only show error toast if we were previously connected, avoiding spam on first load
      if (newSocket.active) {
        toast.error('Mất kết nối máy chủ. Đang thử lại...', { id: 'socket-error' });
      }
    });

    newSocket.on('reconnect', (attemptNumber: number) => {
      console.log('[Socket] Reconnected after', attemptNumber, 'attempts');
      setIsConnected(true);
      toast.success('Đã kết nối lại với máy chủ', { id: 'socket-error' });
    });

    newSocket.on('reconnect_failed', () => {
      console.error('[Socket] Reconnection failed');
      setIsConnected(false);
    });

  }, [socketUrl]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setSocket(null);
    setIsConnected(false);
  }, []);

  useEffect(() => {
    if (autoConnect) {
      const token = localStorage.getItem('accessToken');
      if (token) {
        connect(token);
      }
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
      }
    };
  }, [autoConnect, connect]);

  const value: SocketContextType = {
    socket,
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
