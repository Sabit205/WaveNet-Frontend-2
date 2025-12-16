"use client";
import { useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';
import { useWebRTC } from '@/hooks/useWebRTC';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Phone, Video, Mic, MicOff, VideoOff, PhoneOff } from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import CallTimer from './CallTimer';

export default function CallManager() {
  const { user } = useUser();
  const { 
    socket, callStatus, caller, remoteUser, callType, callId,
    acceptCall, rejectCall, resetCall 
  } = useStore();
  
  const { localStream, remoteStream, endCall, createOffer, toggleMic, toggleCamera } = useWebRTC();

  // Local State for UI Feedback
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);

  // Sync state with call type
  useEffect(() => {
    if (callStatus === 'active') {
      setIsMicOn(true);
      setIsCamOn(callType === 'video');
    }
  }, [callStatus, callType]);

  useEffect(() => {
    if (!socket) return;
    
    // Handlers
    socket.on('incoming-call', (data) => {
      useStore.getState().setIncomingCall(data.caller, data.callType, data.callId);
    });

    socket.on('call-accepted', ({ receiver }) => {
      useStore.getState().acceptCall();
      setTimeout(() => createOffer(), 500);
    });

    socket.on('call-rejected', () => { alert('Call Rejected'); resetCall(); });
    socket.on('call-cancelled', () => resetCall());
    socket.on('end-call', () => resetCall());

    return () => {
      socket.off('incoming-call');
      socket.off('call-accepted');
      socket.off('call-rejected');
      socket.off('call-cancelled');
      socket.off('end-call');
    }
  }, [socket, createOffer, resetCall]);

  const handleMicToggle = () => {
    toggleMic();
    setIsMicOn(!isMicOn);
  };

  const handleCamToggle = () => {
    toggleCamera();
    setIsCamOn(!isCamOn);
  };

  // --- 1. Incoming Call Modal ---
  if (callStatus === 'incoming' && caller) {
    return (
      <Dialog open={true}>
        <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
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

  // --- 2. Waiting Room ---
  if (callStatus === 'calling' && remoteUser) {
    return (
      <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center text-white">
        <div className="flex flex-col items-center animate-bounce">
          <Avatar className="h-32 w-32 border-4 border-blue-500 mb-6">
            <AvatarImage src={remoteUser.imageUrl} />
            <AvatarFallback>{remoteUser.name?.[0]}</AvatarFallback>
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

  // --- 3. Active Call ---
  if (callStatus === 'active') {
    return (
      <div className="fixed inset-0 bg-gray-900 z-50 flex flex-col">
        {/* Main View Area */}
        <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
          
          {/* Conditional UI: Video vs Audio */}
          {callType === 'video' ? (
            // VIDEO MODE
            <>
              {remoteStream ? (
                <video 
                  autoPlay 
                  playsInline 
                  // FIX: Use object-contain so full video is seen (bars if ratio mismatch)
                  // Use object-cover if you prefer filling screen (crops content)
                  className="w-full h-full object-contain bg-black"
                  ref={video => { if (video) video.srcObject = remoteStream; }} 
                />
              ) : (
                <div className="text-white flex flex-col items-center">
                   <p>Connecting video...</p>
                </div>
              )}
            </>
          ) : (
            // AUDIO MODE UI
            <div className="flex flex-col items-center text-white">
               <Avatar className="h-32 w-32 border-4 border-gray-600 mb-6 shadow-2xl">
                 <AvatarImage src={remoteUser?.imageUrl} />
                 <AvatarFallback>{remoteUser?.name?.[0]}</AvatarFallback>
               </Avatar>
               <h2 className="text-3xl font-bold mb-2">{remoteUser?.name}</h2>
               <div className="text-green-400 font-mono text-xl">
                 <CallTimer />
               </div>
               <p className="mt-4 text-gray-400">WaveNet Audio Call</p>
            </div>
          )}

          {/* Local Preview (Only for Video Call) */}
          {callType === 'video' && (
            <div className="absolute bottom-24 right-4 w-32 h-48 bg-gray-800 rounded-lg overflow-hidden border-2 border-white shadow-xl">
               <video 
                 autoPlay 
                 playsInline 
                 muted 
                 className="w-full h-full object-cover"
                 ref={video => { if (video) video.srcObject = localStream; }}
               />
            </div>
          )}
          
          {/* Timer Overlay for Video Call */}
          {callType === 'video' && (
            <div className="absolute top-6 left-6 bg-black/50 px-4 py-2 rounded-full text-white backdrop-blur-sm">
              <CallTimer />
            </div>
          )}
        </div>

        {/* Controls Bar */}
        <div className="h-24 bg-gray-900/90 backdrop-blur-md flex items-center justify-center gap-8 pb-4">
          
          {/* Mic Toggle */}
          <Button 
            variant={isMicOn ? "secondary" : "destructive"} 
            size="icon" 
            className="h-12 w-12 rounded-full" 
            onClick={handleMicToggle}
          >
            {isMicOn ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
          </Button>
          
          {/* End Call */}
          <Button 
            variant="destructive" 
            size="icon" 
            className="h-16 w-16 rounded-full shadow-lg" 
            onClick={endCall}
          >
            <PhoneOff className="h-8 w-8" />
          </Button>

          {/* Camera Toggle (Only show if call was started as video) */}
          {callType === 'video' && (
            <Button 
              variant={isCamOn ? "secondary" : "destructive"} 
              size="icon" 
              className="h-12 w-12 rounded-full" 
              onClick={handleCamToggle}
            >
              {isCamOn ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
            </Button>
          )}
        </div>
      </div>
    );
  }

  return null;
}