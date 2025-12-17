"use client";
import { useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';
import { useWebRTC } from '@/hooks/useWebRTC';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Video, Mic, MicOff, VideoOff, PhoneOff } from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import CallTimer from './CallTimer';

export default function CallManager() {
  const { user } = useUser();
  const { 
    socket, callStatus, caller, remoteUser, callType, callId, remoteVideoEnabled,
    acceptCall, rejectCall, resetCall 
  } = useStore();
  
  const { localStream, remoteStream, endCall, createOffer, toggleMic, toggleCamera } = useWebRTC();

  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);

  // Sync state when call starts
  useEffect(() => {
    if (callStatus === 'active') {
      setIsMicOn(true);
      // If started as audio, cam is off by default
      setIsCamOn(callType === 'video'); 
    }
  }, [callStatus, callType]);

  // Socket Events
  useEffect(() => {
    if (!socket) return;
    
    socket.on('incoming-call', (data) => useStore.getState().setIncomingCall(data.caller, data.callType, data.callId));
    
    socket.on('call-accepted', ({ receiver }) => {
      useStore.getState().acceptCall();
      setTimeout(() => createOffer(), 500);
    });

    socket.on('call-rejected', () => { alert('Call Rejected'); resetCall(); });
    socket.on('call-cancelled', () => resetCall());
    socket.on('end-call', () => resetCall());
    socket.on('call-error', (data) => { alert(data.message); resetCall(); });

    return () => {
      socket.off('incoming-call');
      socket.off('call-accepted');
      socket.off('call-rejected');
      socket.off('call-cancelled');
      socket.off('end-call');
      socket.off('call-error');
    }
  }, [socket, createOffer, resetCall]);

  const handleMicToggle = () => { toggleMic(); setIsMicOn(!isMicOn); };
  const handleCamToggle = () => { toggleCamera(); setIsCamOn(!isCamOn); };

  // --- 1. Incoming Call ---
  if (callStatus === 'incoming' && caller) {
    return (
      <Dialog open={true}>
        <DialogContent className="sm:max-w-md" onInteractOutside={e=>e.preventDefault()}>
          <DialogHeader><DialogTitle className="text-center">Incoming {callType} Call</DialogTitle></DialogHeader>
          <div className="flex flex-col items-center py-6 animate-pulse">
            <Avatar className="h-24 w-24 mb-4">
              <AvatarImage src={caller.imageUrl} />
              <AvatarFallback>{caller.name[0]}</AvatarFallback>
            </Avatar>
            <h3 className="text-xl font-semibold">{caller.name}</h3>
          </div>
          <DialogFooter className="flex justify-center gap-4">
             <Button variant="destructive" onClick={() => {
                socket?.emit('call-rejected', { callerId: caller.id, callId });
                rejectCall();
             }}>Reject</Button>
             <Button className="bg-green-600" onClick={() => {
                const receiverInfo = { id: user?.id, name: user?.fullName, avatar: user?.imageUrl };
                socket?.emit('call-accepted', { callerId: caller.id, receiver: receiverInfo, callId });
                acceptCall();
             }}>Accept</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // --- 2. Waiting Room ---
  if (callStatus === 'calling' && remoteUser) {
    return (
      <div className="fixed inset-0 bg-black/95 z-50 flex flex-col items-center justify-center text-white">
        <div className="flex flex-col items-center animate-bounce">
          <Avatar className="h-32 w-32 border-4 border-blue-500 mb-6">
            <AvatarImage src={remoteUser.imageUrl} />
            <AvatarFallback>{remoteUser.name?.[0]}</AvatarFallback>
          </Avatar>
          <h2 className="text-2xl font-bold">Calling {remoteUser.name}...</h2>
        </div>
        <Button variant="destructive" className="mt-10 rounded-full h-16 w-16" onClick={() => {
            socket?.emit('cancel-call', { receiverId: remoteUser.id, callId });
            resetCall();
        }}><PhoneOff /></Button>
      </div>
    );
  }

  // --- 3. Active Call ---
  if (callStatus === 'active') {
    // Determine if we show video or avatar for remote user
    // Show video IF: Call is Video type AND Remote stream exists AND Remote hasn't disabled video
    const showRemoteVideo = callType === 'video' && remoteStream && remoteVideoEnabled;

    return (
      <div className="fixed inset-0 bg-gray-900 z-50 flex flex-col">
        <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
          
          {showRemoteVideo ? (
             <video 
               autoPlay playsInline 
               className="w-full h-full object-contain"
               ref={video => { if (video) video.srcObject = remoteStream; }} 
             />
          ) : (
            // AVATAR UI (Used for Audio calls OR when remote video is OFF)
            <div className="flex flex-col items-center text-white p-4">
               <Avatar className="h-32 w-32 md:h-48 md:w-48 border-4 border-gray-600 mb-6 shadow-2xl">
                 <AvatarImage src={remoteUser?.imageUrl} />
                 <AvatarFallback>{remoteUser?.name?.[0]}</AvatarFallback>
               </Avatar>
               <h2 className="text-2xl md:text-3xl font-bold mb-2 text-center">{remoteUser?.name}</h2>
               <div className="text-green-400 font-mono text-xl"><CallTimer /></div>
               <p className="mt-4 text-gray-400">
                 {callType === 'audio' ? 'Audio Call' : 'Video Paused'}
               </p>
            </div>
          )}

          {/* Local Video Preview (Only if Video Call AND My Cam is On) */}
          {callType === 'video' && isCamOn && (
            <div className="absolute bottom-24 right-4 w-28 h-40 md:w-48 md:h-64 bg-gray-800 rounded-lg overflow-hidden border-2 border-white shadow-xl">
               <video 
                 autoPlay playsInline muted 
                 className="w-full h-full object-cover"
                 ref={video => { if (video) video.srcObject = localStream; }}
               />
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="h-24 bg-gray-900/90 flex items-center justify-center gap-6 md:gap-8 pb-4">
          <Button variant={isMicOn ? "secondary" : "destructive"} size="icon" className="h-12 w-12 rounded-full" onClick={handleMicToggle}>
            {isMicOn ? <Mic /> : <MicOff />}
          </Button>
          
          <Button variant="destructive" size="icon" className="h-16 w-16 rounded-full shadow-lg" onClick={endCall}>
            <PhoneOff className="h-8 w-8" />
          </Button>

          {callType === 'video' && (
            <Button variant={isCamOn ? "secondary" : "destructive"} size="icon" className="h-12 w-12 rounded-full" onClick={handleCamToggle}>
              {isCamOn ? <Video /> : <VideoOff />}
            </Button>
          )}
        </div>
      </div>
    );
  }

  return null;
}