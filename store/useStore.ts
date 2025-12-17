import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

export interface UserInfo {
  id: string;
  name: string;
  imageUrl: string;
}

interface CallState {
  socket: Socket | null;
  onlineUsers: string[]; // List of IDs
  callStatus: 'idle' | 'calling' | 'incoming' | 'active';
  callType: 'audio' | 'video' | null;
  caller: UserInfo | null; 
  remoteUser: UserInfo | null;
  callId: string | null;
  remoteVideoEnabled: boolean;

  // Actions
  connectSocket: (userId: string, userInfo: any) => void;
  setIncomingCall: (caller: UserInfo, type: 'audio'|'video', callId: string) => void;
  startCalling: (target: UserInfo, type: 'audio'|'video') => void;
  acceptCall: () => void;
  rejectCall: () => void;
  resetCall: () => void;
  setRemoteVideoEnabled: (enabled: boolean) => void;
}

export const useStore = create<CallState>((set, get) => ({
  socket: null,
  onlineUsers: [],
  callStatus: 'idle',
  callType: null,
  caller: null,
  remoteUser: null,
  callId: null,
  remoteVideoEnabled: true,

  connectSocket: (userId, userInfo) => {
    if (get().socket) return;
    const newSocket = io(process.env.NEXT_PUBLIC_BACKEND_URL as string);
    newSocket.on('connect', () => {
      newSocket.emit('user-online', { userId, userInfo });
    });
    newSocket.on('online-users', (users) => set({ onlineUsers: users }));
    set({ socket: newSocket });
  },

  setIncomingCall: (caller, type, callId) => {
    set({ 
      callStatus: 'incoming', 
      caller, 
      remoteUser: caller, // The caller is the remote user for us
      callType: type,
      callId,
      remoteVideoEnabled: true
    });
  },

  startCalling: (target, type) => {
    set({
      callStatus: 'calling',
      remoteUser: target,
      callType: type,
      remoteVideoEnabled: true
    });
  },

  acceptCall: () => set({ callStatus: 'active' }),
  
  rejectCall: () => set({ callStatus: 'idle', caller: null, remoteUser: null, callId: null }),
  
  resetCall: () => set({ callStatus: 'idle', caller: null, remoteUser: null, callId: null }),

  setRemoteVideoEnabled: (enabled) => set({ remoteVideoEnabled: enabled }),
}));