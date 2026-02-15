import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Mic, MicOff, Camera, CameraOff, PhoneOff, MessageSquare,
  Monitor, Clock, Send, X, Maximize2, Minimize2, PenTool, Circle
} from "lucide-react";
import { useWebRTC } from "@/hooks/useWebRTC";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Whiteboard } from "@/components/video/Whiteboard";

interface VideoCallInterfaceProps {
  videoSessionId: string;
  sessionId: string;
  userId: string;
  isTeacher: boolean;
  partnerName: string;
  subject: string;
  durationMinutes: number;
  onEnd: () => void;
}

interface ChatMessage {
  id: string;
  sender_id: string;
  content: string;
  timestamp: string;
}

export function VideoCallInterface({
  videoSessionId,
  sessionId,
  userId,
  isTeacher,
  partnerName,
  subject,
  durationMinutes,
  onEnd,
}: VideoCallInterfaceProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [showChat, setShowChat] = useState(false);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [showRecordingConsent, setShowRecordingConsent] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState<"good" | "fair" | "poor">("good");
  const containerRef = useRef<HTMLDivElement>(null);

  const {
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
  } = useWebRTC({
    videoSessionId,
    userId,
    onRemoteStream: (stream) => {
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = stream;
    },
    onConnectionStateChange: (state) => {
      if (state === "connected") setConnectionQuality("good");
      else if (state === "connecting") setConnectionQuality("fair");
    },
  });

  // Set local video
  useEffect(() => {
    const streamToShow = screenStream || localStream;
    if (streamToShow && localVideoRef.current) {
      localVideoRef.current.srcObject = streamToShow;
    }
  }, [localStream, screenStream]);

  // Start call on mount
  useEffect(() => {
    if (isTeacher) startCall();
  }, [isTeacher, startCall]);

  // Timer
  useEffect(() => {
    const interval = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // Listen for chat messages via signaling
  useEffect(() => {
    const channel = supabase
      .channel(`video-chat-${videoSessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "video_signaling",
          filter: `video_session_id=eq.${videoSessionId}`,
        },
        (payload) => {
          const msg = payload.new as any;
          if (msg.message_type === "chat") {
            setChatMessages((prev) => [
              ...prev,
              {
                id: msg.id,
                sender_id: msg.sender_id,
                content: msg.payload.content,
                timestamp: msg.created_at,
              },
            ]);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [videoSessionId]);

  const sendChatMessage = async () => {
    if (!chatInput.trim()) return;
    await (supabase.from("video_signaling") as any).insert({
      video_session_id: videoSessionId,
      sender_id: userId,
      message_type: "chat",
      payload: { content: chatInput.trim() },
    });
    setChatMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), sender_id: userId, content: chatInput.trim(), timestamp: new Date().toISOString() },
    ]);
    setChatInput("");
  };

  const handleEndCall = async () => {
    endCall();
    await (supabase.from("video_sessions") as any)
      .update({ status: "ended", ended_at: new Date().toISOString() })
      .eq("id", videoSessionId);
    onEnd();
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement && containerRef.current) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const remaining = durationMinutes * 60 - elapsedSeconds;
  const isOvertime = remaining < 0;
  const nearEnd = remaining > 0 && remaining <= 600; // 10 min warning

  return (
    <div ref={containerRef} className="relative w-full h-[calc(100vh-4rem)] bg-foreground rounded-xl overflow-hidden flex flex-col">
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 bg-gradient-to-b from-black/60 to-transparent">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="bg-black/40 text-white border-white/20">
            {subject}
          </Badge>
          <span className="text-white/80 text-sm">{partnerName}</span>
          {isRecording && (
            <Badge variant="destructive" className="animate-pulse">
              <Circle className="w-3 h-3 mr-1 fill-current" />
              REC
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-2 h-2 rounded-full",
            connectionQuality === "good" && "bg-accent",
            connectionQuality === "fair" && "bg-gold",
            connectionQuality === "poor" && "bg-destructive"
          )} />
          <Badge
            variant="outline"
            className={cn(
              "bg-black/40 border-white/20 font-mono",
              isOvertime ? "text-red-400" : nearEnd ? "text-yellow-400" : "text-white"
            )}
          >
            <Clock className="w-3 h-3 mr-1" />
            {isOvertime ? `-${formatTime(Math.abs(remaining))}` : formatTime(remaining)}
          </Badge>
        </div>
      </div>

      {/* Remote video (main) */}
      <div className="flex-1 relative">
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
        {connectionState !== "connected" && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/90">
            <div className="text-center">
              <div className="animate-pulse w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                <Camera className="w-8 h-8 text-primary" />
              </div>
              <p className="text-foreground font-medium">
                {connectionState === "new" ? "Waiting for participant..." : "Connecting..."}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Local video (PiP) */}
      <motion.div
        drag
        dragConstraints={containerRef}
        className="absolute bottom-24 right-4 z-10 w-36 h-28 md:w-48 md:h-36 rounded-xl overflow-hidden border-2 border-white/30 shadow-lg cursor-move"
      >
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover scale-x-[-1]"
        />
        {!isVideoEnabled && !isScreenSharing && (
          <div className="absolute inset-0 bg-muted flex items-center justify-center">
            <CameraOff className="w-6 h-6 text-muted-foreground" />
          </div>
        )}
        {isScreenSharing && (
          <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
            Screen
          </div>
        )}
      </motion.div>

      {/* Chat panel */}
      {showChat && (
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          className="absolute top-0 right-0 bottom-0 w-80 bg-background/95 backdrop-blur-sm z-30 flex flex-col border-l border-border"
        >
          <div className="flex items-center justify-between p-4 border-b border-border">
            <span className="font-medium text-sm">Chat</span>
            <Button variant="ghost" size="icon" onClick={() => setShowChat(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "max-w-[80%] p-2 rounded-lg text-sm",
                  msg.sender_id === userId
                    ? "ml-auto bg-primary text-primary-foreground"
                    : "bg-muted"
                )}
              >
                {msg.content}
              </div>
            ))}
          </div>
          <div className="p-3 border-t border-border flex gap-2">
            <Input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Type a message..."
              className="text-sm"
              onKeyDown={(e) => e.key === "Enter" && sendChatMessage()}
            />
            <Button size="icon" onClick={sendChatMessage}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </motion.div>
      )}

      {/* Whiteboard panel */}
      <Whiteboard
        videoSessionId={videoSessionId}
        userId={userId}
        isOpen={showWhiteboard}
        onClose={() => setShowWhiteboard(false)}
      />

      {/* Controls bar */}
      <div className="absolute bottom-0 left-0 right-0 z-20 p-4 bg-gradient-to-t from-black/60 to-transparent">
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="icon"
            className={cn(
              "rounded-full w-12 h-12 border-white/20",
              isAudioEnabled ? "bg-white/10 text-white hover:bg-white/20" : "bg-red-500 text-white hover:bg-red-600"
            )}
            onClick={toggleAudio}
          >
            {isAudioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </Button>

          <Button
            variant="outline"
            size="icon"
            className={cn(
              "rounded-full w-12 h-12 border-white/20",
              isVideoEnabled ? "bg-white/10 text-white hover:bg-white/20" : "bg-red-500 text-white hover:bg-red-600"
            )}
            onClick={toggleVideo}
          >
            {isVideoEnabled ? <Camera className="w-5 h-5" /> : <CameraOff className="w-5 h-5" />}
          </Button>

          <Button
            variant="outline"
            size="icon"
            className={cn(
              "rounded-full w-12 h-12 border-white/20",
              isScreenSharing ? "bg-accent text-accent-foreground hover:bg-accent/80" : "bg-white/10 text-white hover:bg-white/20"
            )}
            onClick={isScreenSharing ? stopScreenShare : startScreenShare}
          >
            <Monitor className="w-5 h-5" />
          </Button>

          <Button
            variant="destructive"
            size="icon"
            className="rounded-full w-14 h-14"
            onClick={handleEndCall}
          >
            <PhoneOff className="w-6 h-6" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            className="rounded-full w-12 h-12 bg-white/10 text-white border-white/20 hover:bg-white/20"
            onClick={() => setShowChat(!showChat)}
          >
            <MessageSquare className="w-5 h-5" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            className="rounded-full w-12 h-12 bg-white/10 text-white border-white/20 hover:bg-white/20"
            onClick={() => setShowWhiteboard(!showWhiteboard)}
          >
            <PenTool className="w-5 h-5" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            className={cn(
              "rounded-full w-12 h-12 border-white/20",
              isRecording ? "bg-red-500 text-white hover:bg-red-600" : "bg-white/10 text-white hover:bg-white/20"
            )}
            onClick={() => {
              if (isRecording) {
                stopRecording();
              } else {
                setShowRecordingConsent(true);
              }
            }}
          >
            <Circle className={cn("w-5 h-5", isRecording && "fill-current animate-pulse")} />
          </Button>

          <Button
            variant="outline"
            size="icon"
            className="rounded-full w-12 h-12 bg-white/10 text-white border-white/20 hover:bg-white/20"
            onClick={toggleFullscreen}
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {/* Recording Consent Dialog */}
      <Dialog open={showRecordingConsent} onOpenChange={setShowRecordingConsent}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Start Recording</DialogTitle>
            <DialogDescription>
              This will record the video call session. Both participants will be notified that recording is in progress.
              Make sure you have consent from all participants before proceeding.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowRecordingConsent(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                startRecording();
                setShowRecordingConsent(false);
              }}
            >
              Start Recording
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
