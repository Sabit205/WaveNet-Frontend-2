"use client";
import { useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { useWebRTC } from '@/hooks/useWebRTC';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Phone, Video, Mic, MicOff, VideoOff, PhoneOff } from 'lucide-react';
import { useUser } from '@clerk/nextjs';

export default function CallManager() {
  const { user } = useUser();
  const { 
    socket, callStatus, caller, remoteUser, callType, callId,
    acceptCall, rejectCall, resetCall 
  } = useStore();
  
  const { localStream, remoteStream, endCall, createOffer, toggleMic, toggleCamera } = useWebRTC();

  // Listen for socket events related to call flow
  useEffect(() => {
    if (!socket) return;

    socket.on('incoming-call', (data) => {
      // data: { caller, callType, callId }
      useStore.getState().setIncomingCall(data.caller, data.callType, data.callId);
    });

    socket.on('call-accepted', ({ receiver }) => {
      useStore.getState().acceptCall();
      // As caller, once accepted, initiate offer
      setTimeout(() => createOffer(), 500);
    });

    socket.on('call-rejected', () => {
      alert('Call Rejected');
      resetCall();
    });

    socket.on('call-cancelled', () => {
      resetCall();
    });

    socket.on('end-call', () => {
      resetCall();
    });

    return () => {
      socket.off('incoming-call');
      socket.off('call-accepted');
      socket.off('call-rejected');
      socket.off('call-cancelled');
      socket.off('end-call');
    }
  }, [socket, createOffer, resetCall]);

  // --- Incoming Call Modal ---
  if (callStatus === 'incoming' && caller) {
    return (
      <Dialog open={true}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">Incoming {callType} Call</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center py-6 animate-pulse">
            <Avatar className="h-24 w-24 mb-4">
              <AvatarImage src={caller.imageUrl} />
              <AvatarFallback>{caller.name[0]}</AvatarFallback>
            </Avatar>
            <h3 className="text-xl font-semibold">{caller.name}</h3>
          </div>
          <DialogFooter className="flex justify-center gap-4 sm:justify-center">
             <Button variant="destructive" onClick={() => {
                socket?.emit('call-rejected', { callerId: caller.id, callId });
                rejectCall();
             }}>
               Reject
             </Button>
             <Button className="bg-green-600 hover:bg-green-700" onClick={() => {
                socket?.emit('call-accepted', { callerId: caller.id, receiver: { id: user?.id, name: user?.fullName, avatar: user?.imageUrl }, callId });
                acceptCall();
             }}>
               Accept
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // --- Waiting Room (Caller side) ---
  if (callStatus === 'calling' && remoteUser) {
    return (
      <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center text-white">
        <div className="flex flex-col items-center animate-bounce">
          <Avatar className="h-32 w-32 border-4 border-blue-500 mb-6">
            <AvatarImage src={remoteUser.imageUrl} />
            <AvatarFallback>{remoteUser.name[0]}</AvatarFallback>
          </Avatar>
          <h2 className="text-2xl font-bold">Calling {remoteUser.name}...</h2>
        </div>
        <Button 
          variant="destructive" 
          className="mt-10 rounded-full p-6 h-16 w-16"
          onClick={() => {
            socket?.emit('cancel-call', { receiverId: remoteUser.id, callId });
            resetCall();
          }}
        >
          <PhoneOff />
        </Button>
      </div>
    );
  }

  // --- Active Call Interface ---
  if (callStatus === 'active') {
    return (
      <div className="fixed inset-0 bg-gray-900 z-50 flex flex-col">
        {/* Remote Video (Full Screen) */}
        <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
          {remoteStream ? (
            <video 
              autoPlay 
              playsInline 
              className="w-full h-full object-cover"
              ref={video => { if (video) video.srcObject = remoteStream; }} 
            />
          ) : (
             <div className="text-white flex flex-col items-center">
               <Avatar className="h-24 w-24 mb-4">
                 <AvatarImage src={remoteUser?.imageUrl} />
                 <AvatarFallback>U</AvatarFallback>
               </Avatar>
               <p>Connecting...</p>
             </div>
          )}

          {/* Local Video (PiP) */}
          <div className="absolute bottom-24 right-4 w-32 h-48 bg-gray-800 rounded-lg overflow-hidden border-2 border-white shadow-xl">
             <video 
               autoPlay 
               playsInline 
               muted 
               className="w-full h-full object-cover"
               ref={video => { if (video) video.srcObject = localStream; }}
             />
          </div>
        </div>

        {/* Controls Bar */}
        <div className="h-20 bg-gray-800 flex items-center justify-center gap-6">
          <Button variant="secondary" size="icon" className="rounded-full" onClick={toggleMic}>
            <Mic className="h-6 w-6" />
          </Button>
          
          <Button variant="destructive" size="icon" className="h-14 w-14 rounded-full" onClick={endCall}>
            <PhoneOff className="h-8 w-8" />
          </Button>

          {callType === 'video' && (
            <Button variant="secondary" size="icon" className="rounded-full" onClick={toggleCamera}>
              <Video className="h-6 w-6" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  return null;
}