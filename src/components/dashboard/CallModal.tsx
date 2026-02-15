import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { 
  Phone, 
  PhoneOff, 
  Mic, 
  MicOff,
  Volume2,
  VolumeX,
  Grid,
  X,
  Wifi,
  WifiOff,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

interface CallModalProps {
  isOpen: boolean;
  onClose: () => void;
  partnerId?: string;
  partnerName: string;
  partnerAvatar: string | null;
  isVideoCall?: boolean;
  isIncoming?: boolean;
}

export function CallModal({
  isOpen,
  onClose,
  partnerId,
  partnerName,
  partnerAvatar,
  isVideoCall = false,
  isIncoming = false
}: CallModalProps) {
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isCallActive, setIsCallActive] = useState(isIncoming ? false : true);
  const [isAnswered, setIsAnswered] = useState(!isIncoming);
  const [isPartnerOnline, setIsPartnerOnline] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);

  const checkPartnerStatus = useCallback(async (partnerIdParam?: string) => {
    if (!partnerIdParam) return;
    setCheckingStatus(true);
    try {
      // Cast to any because this project uses custom migration tables not present in generated types
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res: any = await (supabase as any)
        .from("user_presence")
        .select("is_online")
        .eq("user_id", partnerIdParam)
        .maybeSingle();

      const isOnline = Boolean(res?.data?.is_online ?? res?.is_online);
      setIsPartnerOnline(isOnline);
    } catch (error) {
      console.error("Error checking partner status:", error);
      setIsPartnerOnline(false);
    } finally {
      setCheckingStatus(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && partnerId && !isIncoming) {
      checkPartnerStatus(partnerId);
    }
  }, [isOpen, partnerId, isIncoming, checkPartnerStatus]);

  useEffect(() => {
    if (!isOpen || !isCallActive) return;

    const interval = setInterval(() => {
      setDuration(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, isCallActive]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEndCall = () => {
    setIsCallActive(false);
    setDuration(0);
    onClose();
  };

  const handleAnswerCall = () => {
    setIsAnswered(true);
    setIsCallActive(true);
  };

  if (!isOpen) return null;

  // Show offline warning for outgoing calls
  if (!isIncoming && !isPartnerOnline && !checkingStatus) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md p-0 border-0 bg-gradient-to-b from-destructive/10 to-background overflow-hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center h-auto p-8"
          >
            <div className="mb-6 p-4 bg-destructive/20 rounded-full">
              <AlertCircle className="w-12 h-12 text-destructive" />
            </div>

            <h2 className="text-2xl font-bold mb-2 text-center">User Offline</h2>
            <p className="text-muted-foreground mb-8 text-center">
              {partnerName} is currently offline. They won't be able to answer {isVideoCall ? 'video' : 'voice'} calls right now.
            </p>

            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              <Button onClick={handleEndCall} variant="outline">
                Try Later
              </Button>
            </div>
          </motion.div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 border-0 bg-gradient-to-b from-primary/10 to-background overflow-hidden">
        {!isAnswered ? (
          // Incoming Call Screen
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center h-screen max-h-[600px] p-6"
          >
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="mb-6"
            >
              <Avatar className="w-24 h-24 ring-4 ring-primary/30">
                <AvatarImage src={partnerAvatar || ""} />
                <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
                  {partnerName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </motion.div>

            <h2 className="text-2xl font-bold mb-2 text-center">{partnerName}</h2>
            <p className="text-muted-foreground mb-8 text-center">
              {isVideoCall ? 'Incoming video call...' : 'Incoming call...'}
            </p>

            <div className="flex gap-4 mt-auto">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleEndCall}
                className="rounded-full p-4 bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
              >
                <PhoneOff className="w-6 h-6" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleAnswerCall}
                className="rounded-full p-4 bg-green-500 text-white hover:bg-green-600 transition-colors"
              >
                <Phone className="w-6 h-6" />
              </motion.button>
            </div>
          </motion.div>
        ) : (
          // Active Call Screen
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-between h-screen max-h-[600px] p-6 bg-gradient-to-b from-primary/5 to-background"
          >
            <div className="flex flex-col items-center">
              <Avatar className="w-20 h-20 mb-4 ring-4 ring-primary/30">
                <AvatarImage src={partnerAvatar || ""} />
                <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                  {partnerName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <h2 className="text-xl font-bold text-center">{partnerName}</h2>
              <p className="text-muted-foreground text-sm mt-2">
                {duration > 0 && formatDuration(duration)}
              </p>
            </div>

            {/* Call Controls */}
            <div className="flex gap-4 w-full justify-center">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsMuted(!isMuted)}
                className={`rounded-full p-3 transition-colors ${
                  isMuted
                    ? 'bg-destructive/20 text-destructive'
                    : 'bg-muted text-foreground hover:bg-muted/80'
                }`}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleEndCall}
                className="rounded-full p-3 bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
              >
                <PhoneOff className="w-5 h-5" />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className="rounded-full p-3 bg-muted text-foreground hover:bg-muted/80 transition-colors"
              >
                <Volume2 className="w-5 h-5" />
              </motion.button>
            </div>
          </motion.div>
        )}
      </DialogContent>
    </Dialog>
  );
}
