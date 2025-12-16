import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

export interface UserInfo {
  id: string;
  name: string;
  imageUrl: string;
}

interface CallState {
  socket: Socket | null;
  onlineUsers: { userId: string, userInfo: UserInfo }[]; // Updated type
  callStatus: 'idle' | 'calling' | 'incoming' | 'active';
  callType: 'audio' | 'video' | null;
  caller: UserInfo | null; 
  remoteUser: UserInfo | null;
  callId: string | null;
  
  // Actions
  connectSocket: (userId: string, userInfo: { name: string, imageUrl: string }) => void;
  setIncomingCall: (caller: UserInfo, type: 'audio'|'video', callId: string) => void;
  startCalling: (target: UserInfo, type: 'audio'|'video') => void;
  acceptCall: () => void;
  rejectCall: () => void;
  resetCall: () => void;
}

export const useStore = create<CallState>((set, get) => ({
  socket: null,
  onlineUsers: [],
  callStatus: 'idle',
  callType: null,
  caller: null,
  remoteUser: null,
  callId: null,

  connectSocket: (userId, userInfo) => {
    if (get().socket) return;
    
    const newSocket = io(process.env.NEXT_PUBLIC_BACKEND_URL as string);
    newSocket.on('connect', () => {
      // Send rich user info on connect
      newSocket.emit('user-online', { userId, userInfo: { id: userId, ...userInfo } });
    });

    newSocket.on('online-users', (users) => {
      set({ onlineUsers: users });
    });

    set({ socket: newSocket });
  },

  setIncomingCall: (caller, type, callId) => {
    set({ 
      callStatus: 'incoming', 
      caller: caller, 
      remoteUser: caller, 
      callType: type,
      callId
    });
  },

  startCalling: (target, type) => {
    set({
      callStatus: 'calling',
      remoteUser: target,
      callType: type
    });
  },

  acceptCall: () => set({ callStatus: 'active' }),
  
  rejectCall: () => set({ 
    callStatus: 'idle', 
    caller: null, 
    remoteUser: null, 
    callType: null,
    callId: null
  }),

  resetCall: () => set({ 
    callStatus: 'idle', 
    caller: null, 
    remoteUser: null, 
    callType: null, 
    callId: null
  }),
}));