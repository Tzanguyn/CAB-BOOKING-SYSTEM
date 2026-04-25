import { useEffect, useRef } from 'react';
import { useSocket } from '../contexts/SocketContext';

/**
 * Hook to listen to a specific socket event.
 * Automatically subscribes/unsubscribes based on component lifecycle.
 *
 * @param eventName - The socket event to listen for
 * @param callback - Callback function when event is received
 */
export function useSocketEvent<T = unknown>(
  eventName: string,
  callback: (data: T) => void
): void {
  const { socket, isConnected } = useSocket();
  const callbackRef = useRef(callback);

  // Keep callback ref up to date
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!socket || !isConnected) return;

    const handler = (data: T) => {
      callbackRef.current(data);
    };

    socket.on(eventName, handler);

    return () => {
      socket.off(eventName, handler);
    };
  }, [socket, isConnected, eventName]);
}

/**
 * Hook to emit a socket event.
 * Returns a function that can be called to emit data.
 */
export function useSocketEmit() {
  const { socket, isConnected } = useSocket();

  return <T = unknown>(eventName: string, data?: T) => {
    if (socket && isConnected) {
      socket.emit(eventName, data);
    } else {
      console.warn(`[Socket] Cannot emit "${eventName}" - not connected`);
    }
  };
}
