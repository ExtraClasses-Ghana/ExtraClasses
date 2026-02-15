import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Camera, Mic, MicOff, Volume2, CheckCircle, XCircle, Loader2 } from "lucide-react";

interface DeviceTestPanelProps {
  onReady: () => void;
  onCancel: () => void;
}

export function DeviceTestPanel({ onReady, onCancel }: DeviceTestPanelProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraOk, setCameraOk] = useState<boolean | null>(null);
  const [micOk, setMicOk] = useState<boolean | null>(null);
  const [micLevel, setMicLevel] = useState(0);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const animationRef = useRef<number>();
  const micLevelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    testDevices();
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  const testDevices = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setStream(mediaStream);
      setCameraOk(true);
      setMicOk(true);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }

      // Mic level meter
      const audioCtx = new AudioContext();
      const analyser = audioCtx.createAnalyser();
      const source = audioCtx.createMediaStreamSource(mediaStream);
      source.connect(analyser);
      analyser.fftSize = 256;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setMicLevel(Math.min(100, avg * 2));
        animationRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();
    } catch (err: any) {
      if (err.name === "NotAllowedError" || err.name === "NotFoundError") {
        setCameraOk(false);
        setMicOk(false);
      }
    }
  };

  const allReady = cameraOk && micOk;

  useEffect(() => {
    if (micLevelRef.current) {
      micLevelRef.current.style.width = `${micLevel}%`;
    }
  }, [micLevel]);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-display font-bold text-foreground">Device Check</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Make sure your camera and microphone are working
        </p>
      </div>

      {/* Camera preview */}
      <div className="relative rounded-xl overflow-hidden bg-muted aspect-video max-w-md mx-auto">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover mirror"
        />
        {cameraOk === null && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Status indicators */}
      <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Camera className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm font-medium flex-1">Camera</span>
            {cameraOk === null ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : cameraOk ? (
              <Badge className="bg-accent/20 text-accent"><CheckCircle className="w-3 h-3 mr-1" />OK</Badge>
            ) : (
              <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Mic className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm font-medium flex-1">Mic</span>
            {micOk === null ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : micOk ? (
              <Badge className="bg-accent/20 text-accent"><CheckCircle className="w-3 h-3 mr-1" />OK</Badge>
            ) : (
              <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Mic level */}
      {micOk && (
        <div className="max-w-md mx-auto">
          <div className="flex items-center gap-2 mb-1">
            <Volume2 className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Microphone Level</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              ref={micLevelRef}
              className="h-full bg-accent transition-all duration-75 rounded-full"
            />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-center gap-3">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={onReady} disabled={!allReady}>
          {allReady ? "Join Session" : "Checking devices..."}
        </Button>
      </div>
    </div>
  );
}
