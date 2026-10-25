import { io } from 'socket.io-client';
import { store } from '../store';

let socket;
// Singleton; the auth callback always sends the latest access token (also on reconnect).
export const getSocket = () => {
  if (!socket) {
    socket = io(import.meta.env.VITE_SOCKET_URL || window.location.origin, {
      autoConnect: false, withCredentials: true,
      auth: (cb) => cb({ token: store.getState().auth.accessToken }),
    });
  }
  return socket;
};
