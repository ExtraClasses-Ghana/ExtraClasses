import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UseWebRTCOptions {
  videoSessionId: string;
  userId: string;
  onRemoteStream: (stream: MediaStream) => void;
  onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
}

export function useWebRTC({
  videoSessionId,
  userId,
  onRemoteStream,
  onConnectionStateChange,
}: UseWebRTCOptions) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>("new");
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const getICEServers = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("turn-credentials");
      if (error) throw error;
      return data.iceServers || [{ urls: "stun:stun.l.google.com:19302" }];
    } catch {
      return [{ urls: "stun:stun.l.google.com:19302" }];
    }
  };

  const initializeMedia = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      setLocalStream(stream);
      return stream;
    } catch (error) {
      console.error("Error accessing media devices:", error);
      // Try audio-only fallback
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        setLocalStream(audioStream);
        setIsVideoEnabled(false);
        return audioStream;
      } catch {
        throw new Error("Cannot access camera or microphone");
      }
    }
  }, []);

  const createPeerConnection = useCallback(async (stream: MediaStream) => {
    const iceServers = await getICEServers();
    const pc = new RTCPeerConnection({ iceServers });
    peerConnection.current = pc;

    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    pc.ontrack = (event) => {
      if (event.streams[0]) onRemoteStream(event.streams[0]);
    };

    pc.onicecandidate = async (event) => {
      if (event.candidate) {
        await (supabase.from("video_signaling") as any).insert({
          video_session_id: videoSessionId,
          sender_id: userId,
          message_type: "ice-candidate",
          payload: { candidate: event.candidate.toJSON() },
        });
      }
    };

    pc.onconnectionstatechange = () => {
      setConnectionState(pc.connectionState);
      onConnectionStateChange?.(pc.connectionState);
    };

    return pc;
  }, [videoSessionId, userId, onRemoteStream, onConnectionStateChange]);

  const startCall = useCallback(async () => {
    const stream = await initializeMedia();
    const pc = await createPeerConnection(stream);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    await (supabase.from("video_signaling") as any).insert({
      video_session_id: videoSessionId,
      sender_id: userId,
      message_type: "offer",
      payload: { sdp: offer },
    });
  }, [initializeMedia, createPeerConnection, videoSessionId, userId]);

  const answerCall = useCallback(async (offerSdp: RTCSessionDescriptionInit) => {
    const stream = await initializeMedia();
    const pc = await createPeerConnection(stream);

    await pc.setRemoteDescription(new RTCSessionDescription(offerSdp));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    await (supabase.from("video_signaling") as any).insert({
      video_session_id: videoSessionId,
      sender_id: userId,
      message_type: "answer",
      payload: { sdp: answer },
    });
  }, [initializeMedia, createPeerConnection, videoSessionId, userId]);

  // Listen for signaling messages
  useEffect(() => {
    const channel = supabase
      .channel(`video-signaling-${videoSessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "video_signaling",
          filter: `video_session_id=eq.${videoSessionId}`,
        },
        async (payload) => {
          const msg = payload.new as any;
          if (msg.sender_id === userId) return;

          const pc = peerConnection.current;
          if (!pc) return;

          switch (msg.message_type) {
            case "offer":
              await answerCall(msg.payload.sdp);
              break;
            case "answer":
              await pc.setRemoteDescription(new RTCSessionDescription(msg.payload.sdp));
              break;
            case "ice-candidate":
              if (msg.payload.candidate) {
                await pc.addIceCandidate(new RTCIceCandidate(msg.payload.candidate));
              }
              break;
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [videoSessionId, userId, answerCall]);

  const toggleAudio = useCallback(() => {
    localStream?.getAudioTracks().forEach((t) => (t.enabled = !t.enabled));
    setIsAudioEnabled((prev) => !prev);
  }, [localStream]);

  const toggleVideo = useCallback(() => {
    localStream?.getVideoTracks().forEach((t) => (t.enabled = !t.enabled));
    setIsVideoEnabled((prev) => !prev);
  }, [localStream]);

  const startScreenShare = useCallback(async () => {
    try {
      const screen = await navigator.mediaDevices.getDisplayMedia({
        video: { mediaSource: "screen" },
        audio: false,
      });
      setScreenStream(screen);
      setIsScreenSharing(true);

      // Add screen track to peer connection
      const pc = peerConnection.current;
      if (pc) {
        const videoSender = pc.getSenders().find(s => s.track?.kind === 'video');
        if (videoSender) {
          videoSender.replaceTrack(screen.getVideoTracks()[0]);
        }
      }

      // Handle when user stops sharing via browser UI
      screen.getVideoTracks()[0].addEventListener('ended', () => {
        stopScreenShare();
      });

      return screen;
    } catch (error) {
      console.error("Error starting screen share:", error);
      throw error;
    }
  }, []);

  const stopScreenShare = useCallback(() => {
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
      setScreenStream(null);
      setIsScreenSharing(false);

      // Switch back to camera
      const pc = peerConnection.current;
      if (pc && localStream) {
        const videoSender = pc.getSenders().find(s => s.track?.kind === 'video');
        if (videoSender) {
          videoSender.replaceTrack(localStream.getVideoTracks()[0]);
        }
      }
    }
  }, [screenStream, localStream]);

  const startRecording = useCallback(async () => {
    try {
      const combinedStream = new MediaStream();

      // Add local audio/video
      if (localStream) {
        localStream.getTracks().forEach(track => combinedStream.addTrack(track));
      }

      // Add remote audio/video (this will be available after connection)
      const pc = peerConnection.current;
      if (pc) {
        pc.getReceivers().forEach(receiver => {
          if (receiver.track) {
            combinedStream.addTrack(receiver.track);
          }
        });
      }

      const mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType: 'video/webm;codecs=vp9,opus'
      });

      mediaRecorderRef.current = mediaRecorder;
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `recording-${videoSessionId}-${new Date().toISOString()}.webm`;
        a.click();
        URL.revokeObjectURL(url);
        setRecordedChunks([]);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordedChunks(chunks);

    } catch (error) {
      console.error('Error starting recording:', error);
    }
  }, [localStream, videoSessionId]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  const endCall = useCallback(() => {
    if (isRecording) {
      stopRecording();
    }
    localStream?.getTracks().forEach((t) => t.stop());
    screenStream?.getTracks().forEach((t) => t.stop());
    peerConnection.current?.close();
    peerConnection.current = null;
    setLocalStream(null);
    setScreenStream(null);
    setIsScreenSharing(false);
    setIsRecording(false);
    if (channelRef.current) supabase.removeChannel(channelRef.current);
  }, [localStream, screenStream, isRecording, stopRecording]);

  return {
    localStream,
    screenStream,
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    isRecording,
    connectionState,
    startCall,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    startRecording,
    stopRecording,
    endCall,
    initializeMedia,
  };
}
