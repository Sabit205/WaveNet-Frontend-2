import { useEffect, useRef, useState } from 'react';
import { useStore } from '@/store/useStore';
import { useUser } from '@clerk/nextjs';

const STUN_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' }
  ],
};

export const useWebRTC = () => {
  const { user } = useUser();
  const { socket, callStatus, remoteUser, callType, resetCall, callId } = useStore();
  
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const peerConnection = useRef<RTCPeerConnection | null>(null);

  // Initialize Media Stream
  useEffect(() => {
    if (callStatus === 'active' || callStatus === 'calling' || callStatus === 'incoming') {
      const initMedia = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: callType === 'video'
          });
          setLocalStream(stream);
        } catch (err) {
          console.error("Error accessing media devices:", err);
        }
      };
      initMedia();
    } else {
      // Cleanup on idle
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        setLocalStream(null);
      }
      setRemoteStream(null);
      if (peerConnection.current) {
        peerConnection.current.close();
        peerConnection.current = null;
      }
    }
  }, [callStatus, callType]);

  // Handle WebRTC Signaling
  useEffect(() => {
    if (!socket || !user || !remoteUser) return;

    const pc = new RTCPeerConnection(STUN_SERVERS);
    peerConnection.current = pc;

    // Add local tracks to peer connection
    if (localStream) {
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
      });
    }

    // Handle remote stream
    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice-candidate', {
          target: remoteUser.id,
          candidate: event.candidate
        });
      }
    };

    // Socket Listeners for WebRTC
    socket.on('webrtc-offer', async ({ offer }) => {
      if (callStatus !== 'active') return; // Should be active by now
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('webrtc-answer', {
        target: remoteUser.id,
        answer
      });
    });

    socket.on('webrtc-answer', async ({ answer }) => {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    });

    socket.on('ice-candidate', async ({ candidate }) => {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.error("Error adding ice candidate", e);
      }
    });

    // If we are the caller, create offer once 'active'
    if (callStatus === 'active') {
       // We need a way to distinguish who starts the offer. 
       // Convention: The caller creates the offer.
       // However, in 'active' state, both have joined.
       // We can check if we initiated the call via Store, but simpler:
       // If we initiated (Status was 'calling' before 'active'), we offer.
       // BUT, the state jumps from 'calling' -> 'active' instantly on accept event.
       // Let's rely on a flag or implicit rule: 
       // We will trigger offer creation manually from the component when state becomes active for the Caller.
    }

    return () => {
      socket.off('webrtc-offer');
      socket.off('webrtc-answer');
      socket.off('ice-candidate');
    };
  }, [socket, callStatus, remoteUser, localStream]);

  // Function to start offer (called by Caller)
  const createOffer = async () => {
    if (!peerConnection.current || !remoteUser || !socket) return;
    const offer = await peerConnection.current.createOffer();
    await peerConnection.current.setLocalDescription(offer);
    socket.emit('webrtc-offer', {
      target: remoteUser.id,
      offer
    });
  };

  const endCall = () => {
    if (socket && remoteUser) {
      socket.emit('end-call', { targetId: remoteUser.id, callId });
    }
    resetCall();
  };

  const toggleMic = () => {
    if(localStream) {
      localStream.getAudioTracks().forEach(track => track.enabled = !track.enabled);
    }
  };

  const toggleCamera = () => {
    if(localStream && callType === 'video') {
      localStream.getVideoTracks().forEach(track => track.enabled = !track.enabled);
    }
  };

  return { localStream, remoteStream, endCall, createOffer, toggleMic, toggleCamera };
};