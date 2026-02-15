import { useState, useRef, useCallback } from "react";
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Loader2, ZoomIn, RotateCw } from "lucide-react";

interface ImageCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageFile: File;
  onCropComplete: (croppedBlob: Blob) => void;
}

function centerAspectCrop(mediaWidth: number, mediaHeight: number, aspect: number) {
  return centerCrop(
    makeAspectCrop({ unit: "%", width: 80 }, aspect, mediaWidth, mediaHeight),
    mediaWidth,
    mediaHeight
  );
}

export function ImageCropModal({ isOpen, onClose, imageFile, onCropComplete }: ImageCropModalProps) {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [scale, setScale] = useState(1);
  const [imgSrc, setImgSrc] = useState("");
  const [processing, setProcessing] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Load image when file changes
  useState(() => {
    if (imageFile) {
      const reader = new FileReader();
      reader.onload = () => setImgSrc(reader.result as string);
      reader.readAsDataURL(imageFile);
    }
  });

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    setCrop(centerAspectCrop(width, height, 1));
  }, []);

  const getCroppedImg = async (): Promise<Blob> => {
    const image = imgRef.current;
    if (!image || !completedCrop) throw new Error("No crop data");

    const canvas = document.createElement("canvas");
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    const outputSize = 400; // Output 400x400
    canvas.width = outputSize;
    canvas.height = outputSize;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No canvas context");

    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      outputSize,
      outputSize
    );

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Canvas toBlob failed"));
        },
        "image/jpeg",
        0.9
      );
    });
  };

  const handleSave = async () => {
    setProcessing(true);
    try {
      const blob = await getCroppedImg();
      onCropComplete(blob);
      onClose();
    } catch (error) {
      console.error("Error cropping image:", error);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Profile Photo</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Preview Info */}
          <p className="text-sm text-muted-foreground">
            Drag to reposition. The crop area will be used as your profile picture.
          </p>

          {/* Crop Area */}
          {imgSrc && (
            <div className="flex justify-center bg-muted rounded-lg overflow-hidden max-h-[400px]">
              <ReactCrop
                crop={crop}
                onChange={(c) => setCrop(c)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={1}
                circularCrop
              >
                <img
                  ref={imgRef}
                  src={imgSrc}
                  alt="Crop preview"
                  onLoad={onImageLoad}
                  style={{ transform: `scale(${scale})`, maxHeight: "400px" }}
                />
              </ReactCrop>
            </div>
          )}

          {/* Zoom Control */}
          <div className="flex items-center gap-3">
            <ZoomIn className="w-4 h-4 text-muted-foreground" />
            <Slider
              value={[scale]}
              onValueChange={([val]) => setScale(val)}
              min={0.5}
              max={3}
              step={0.1}
              className="flex-1"
            />
            <span className="text-sm text-muted-foreground w-12 text-right">
              {Math.round(scale * 100)}%
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={processing || !completedCrop}>
            {processing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              "Save Photo"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
