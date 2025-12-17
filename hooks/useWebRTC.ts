import { useEffect, useRef, useState } from 'react';
import { useStore } from '@/store/useStore';
import { useUser } from '@clerk/nextjs';

const STUN_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
  ],
};

export const useWebRTC = () => {
  const { user } = useUser();
  const { socket, callStatus, remoteUser, callType, resetCall, callId, setRemoteVideoEnabled } = useStore();
  
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const peerConnection = useRef<RTCPeerConnection | null>(null);

  // 1. Initialize Media (Audio fix: Always get audio)
  useEffect(() => {
    if (callStatus === 'active' || callStatus === 'calling' || callStatus === 'incoming') {
      const initMedia = async () => {
        try {
          // IMPORTANT: If video is false, we still need audio.
          const constraints = {
            audio: true,
            video: callType === 'video' 
          };
          const stream = await navigator.mediaDevices.getUserMedia(constraints);
          setLocalStream(stream);
        } catch (err) {
          console.error("Error accessing media:", err);
        }
      };
      initMedia();
    } else {
      // CLEANUP
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop()); // Turn off hardware
        setLocalStream(null);
      }
      setRemoteStream(null);
      if (peerConnection.current) {
        peerConnection.current.close();
        peerConnection.current = null;
      }
    }
  }, [callStatus, callType]);

  // 2. WebRTC Logic
  useEffect(() => {
    if (!socket || !user || !remoteUser) return;

    // Only create PeerConnection if we have the local stream ready
    if (!localStream) return; 

    const pc = new RTCPeerConnection(STUN_SERVERS);
    peerConnection.current = pc;

    localStream.getTracks().forEach(track => {
      pc.addTrack(track, localStream);
    });

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice-candidate', { target: remoteUser.id, candidate: event.candidate });
      }
    };

    socket.on('webrtc-offer', async ({ offer }) => {
      if (callStatus !== 'active') return;
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('webrtc-answer', { target: remoteUser.id, answer });
    });

    socket.on('webrtc-answer', async ({ answer }) => {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    });

    socket.on('ice-candidate', async ({ candidate }) => {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) { console.error(e); }
    });

    socket.on('remote-media-state', ({ kind, enabled }) => {
      if (kind === 'video') setRemoteVideoEnabled(enabled);
    });

    return () => {
      socket.off('webrtc-offer');
      socket.off('webrtc-answer');
      socket.off('ice-candidate');
      socket.off('remote-media-state');
    };
  }, [socket, callStatus, remoteUser, localStream]);

  const createOffer = async () => {
    if (!peerConnection.current || !remoteUser || !socket) return;
    const offer = await peerConnection.current.createOffer();
    await peerConnection.current.setLocalDescription(offer);
    socket.emit('webrtc-offer', { target: remoteUser.id, offer });
  };

  const endCall = () => {
    if (socket && remoteUser) {
      socket.emit('end-call', { targetId: remoteUser.id, callId });
    }
    resetCall();
  };

  const toggleMic = () => {
    if(localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
        // Optionally emit event to show mute icon on other side
      });
    }
  };

  const toggleCamera = () => {
    if(localStream && callType === 'video') {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
        // Emit event to update UI on remote side
        socket?.emit('toggle-media', { 
           targetId: remoteUser?.id, 
           kind: 'video', 
           enabled: track.enabled 
        });
      });
    }
  };

  return { localStream, remoteStream, endCall, createOffer, toggleMic, toggleCamera };
};