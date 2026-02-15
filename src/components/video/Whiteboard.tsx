import { useRef, useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { X, Eraser, Palette, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Json } from "@/integrations/supabase/types";

interface WhiteboardProps {
  videoSessionId: string;
  userId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface DrawingData {
  type: 'draw' | 'clear';
  x?: number;
  y?: number;
  color?: string;
  size?: number;
}

export function Whiteboard({ videoSessionId, userId, isOpen, onClose }: WhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(2);
  const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);

  useEffect(() => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        setContext(ctx);
      }
    }
  }, [isOpen]);

  const handleRemoteDrawing = useCallback((data: DrawingData) => {
    if (!context) return;

    if (data.type === 'clear') {
      context.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
    } else if (data.type === 'draw' && data.x !== undefined && data.y !== undefined) {
      context.strokeStyle = data.color || '#000000';
      context.lineWidth = data.size || 2;
      context.beginPath();
      context.moveTo(data.x, data.y);
      context.lineTo(data.x, data.y);
      context.stroke();
    }
  }, [context]);

  // Listen for whiteboard updates from other participants
  useEffect(() => {
    if (!isOpen) return;

    const channel = supabase
      .channel(`whiteboard-${videoSessionId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'video_signaling',
        filter: `video_session_id=eq.${videoSessionId}`,
      }, (payload) => {
        const msg = payload.new as {
          id: string;
          sender_id: string;
          message_type: string;
          payload: DrawingData;
          created_at: string;
        };
        if (msg.message_type === 'whiteboard' && msg.sender_id !== userId) {
          handleRemoteDrawing(msg.payload);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [videoSessionId, userId, isOpen, handleRemoteDrawing]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!context) return;
    setIsDrawing(true);
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    context.strokeStyle = color;
    context.lineWidth = brushSize;
    context.beginPath();
    context.moveTo(x, y);

    // Send to other participants
    sendDrawingData({ type: 'draw', x, y, color, size: brushSize });
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !context) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    context.lineTo(x, y);
    context.stroke();

    // Send to other participants
    sendDrawingData({ type: 'draw', x, y, color, size: brushSize });
  };

  const stopDrawing = () => {
    if (!context) return;
    setIsDrawing(false);
    context.beginPath();
  };

  const sendDrawingData = async (data: DrawingData) => {
    await supabase.from('video_signaling').insert({
      video_session_id: videoSessionId,
      sender_id: userId,
      message_type: 'whiteboard',
      payload: JSON.parse(JSON.stringify(data)) as Json,
    });
  };

  const clearCanvas = () => {
    if (!context || !canvasRef.current) return;
    context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    sendDrawingData({ type: 'clear' });
  };

  const downloadCanvas = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `whiteboard-${videoSessionId}.png`;
    link.href = canvasRef.current.toDataURL();
    link.click();
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      className="absolute top-0 right-0 bottom-0 w-96 bg-background/95 backdrop-blur-sm z-30 flex flex-col border-l border-border"
    >
      <div className="flex items-center justify-between p-4 border-b border-border">
        <span className="font-medium text-sm">Whiteboard</span>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Tools */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label htmlFor="color-picker" className="sr-only">Color</label>
            <Palette className="w-4 h-4" />
            <input
              id="color-picker"
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-8 h-8 rounded border border-border cursor-pointer"
              title="Choose color"
            />
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="brush-size" className="text-sm">Size:</label>
            <input
              id="brush-size"
              type="range"
              min="1"
              max="20"
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              className="w-16"
              title="Brush size"
            />
            <span className="text-sm w-6">{brushSize}</span>
          </div>
          <Button variant="outline" size="sm" onClick={clearCanvas}>
            <Eraser className="w-4 h-4 mr-1" />
            Clear
          </Button>
          <Button variant="outline" size="sm" onClick={downloadCanvas}>
            <Download className="w-4 h-4 mr-1" />
            Save
          </Button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 p-4">
        <canvas
          ref={canvasRef}
          width={320}
          height={400}
          className="w-full border border-border rounded-lg cursor-crosshair bg-white"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
        />
      </div>
    </motion.div>
  );
}