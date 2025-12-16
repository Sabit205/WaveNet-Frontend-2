import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

interface User {
  id: string;
  name: string;
  imageUrl: string;
}

interface CallState {
  socket: Socket | null;
  onlineUsers: string[];
  callStatus: 'idle' | 'calling' | 'incoming' | 'active';
  callType: 'audio' | 'video' | null;
  caller: User | null; // The person calling US
  remoteUser: User | null; // The person WE are in a call with
  callId: string | null;
  
  // Actions
  connectSocket: (userId: string) => void;
  setOnlineUsers: (users: string[]) => void;
  setIncomingCall: (caller: User, type: 'audio'|'video', callId: string) => void;
  startCalling: (target: User, type: 'audio'|'video') => void;
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

  connectSocket: (userId) => {
    if (get().socket) return;
    
    const newSocket = io(process.env.NEXT_PUBLIC_BACKEND_URL as string);
    newSocket.on('connect', () => {
      console.log('Connected to socket');
      newSocket.emit('user-online', userId);
    });

    newSocket.on('online-users', (users) => {
      set({ onlineUsers: users });
    });

    set({ socket: newSocket });
  },

  setOnlineUsers: (users) => set({ onlineUsers: users }),

  setIncomingCall: (caller, type, callId) => {
    set({ 
      callStatus: 'incoming', 
      caller: caller, 
      remoteUser: caller, // For incoming, remote is the caller
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