import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Camera, X, Check, RotateCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface PhotoCaptureProps {
  onPhotoCapture: (photoFile: File) => void;
  isUploading: boolean;
  deliveryNumber: string;
  onReset?: () => void; // ✅ Callback to reset parent state
}

export default function PhotoCapture({ onPhotoCapture, isUploading, deliveryNumber, onReset }: PhotoCaptureProps) {
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Open camera (mobile will show camera selector, desktop will show webcam)
  const openCamera = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Handle file selection from camera or gallery
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setCapturedPhoto(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      
      // Store file for upload
      (window as any)._capturedPhotoFile = file;
    }
  };

  // Confirm and upload photo
  const confirmPhoto = () => {
    const file = (window as any)._capturedPhotoFile;
    if (file) {
      onPhotoCapture(file);
    }
  };

  // Retake photo
  const retakePhoto = () => {
    setCapturedPhoto(null);
    (window as any)._capturedPhotoFile = null;
  };

  // Reset everything (for when stuck)
  const resetAll = () => {
    console.log('📸 [PhotoCapture] Resetting all state...');
    setCapturedPhoto(null);
    (window as any)._capturedPhotoFile = null;
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    // ✅ Reset parent state too
    if (onReset) {
      console.log('📸 [PhotoCapture] Calling parent onReset...');
      onReset();
    }
  };

  return (
    <Card className="border-2 border-blue-300 bg-blue-50/30">
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-blue-600" />
            <div className="flex-1">
              <h3 className="font-bold text-gray-900">צילום הוכחת משלוח</h3>
              <p className="text-xs text-gray-600">צלם את החבילה במיקום המסירה</p>
            </div>
          </div>

          {/* Photo Preview or Capture Button */}
          <AnimatePresence mode="wait">
            {capturedPhoto ? (
              <motion.div
                key="preview"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="space-y-3"
              >
                {/* Photo Preview */}
                <div className="relative rounded-lg overflow-hidden border-2 border-green-300">
                  <img 
                    src={capturedPhoto} 
                    alt="Delivery proof" 
                    className="w-full h-64 object-cover"
                  />
                  <div className="absolute top-2 right-2 bg-black/60 text-white px-2 py-1 rounded text-xs">
                    📦 {deliveryNumber}
                  </div>
                  <div className="absolute bottom-2 right-2 bg-black/60 text-white px-2 py-1 rounded text-xs">
                    {new Date().toLocaleString('he-IL')}
                  </div>
                </div>

                {/* Action Buttons */}
                {isUploading ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-2 py-4">
                      <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      <span className="text-lg font-bold text-blue-700">מעלה תמונה...</span>
                    </div>
                    <Button
                      onClick={resetAll}
                      variant="outline"
                      className="w-full gap-2 border-red-300 text-red-700 hover:bg-red-50"
                    >
                      <X className="w-4 h-4" />
                      בטל והתחל מחדש
                    </Button>
                    <p className="text-xs text-center text-gray-600">
                      אם ההעלאה תקועה, לחץ על "בטל והתחל מחדש"
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={retakePhoto}
                      variant="outline"
                      className="gap-2 border-orange-300 text-orange-700 hover:bg-orange-50"
                    >
                      <RotateCw className="w-4 h-4" />
                      צלם שוב
                    </Button>
                    <Button
                      onClick={confirmPhoto}
                      className="gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                    >
                      <Check className="w-4 h-4" />
                      אשר תמונה
                    </Button>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="capture"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
              >
                <Button
                  onClick={openCamera}
                  className="w-full py-8 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white gap-2"
                  disabled={isUploading}
                >
                  <Camera className="w-6 h-6" />
                  <span className="text-lg font-bold">צלם הוכחת משלוח</span>
                </Button>

                {/* Hidden file input - opens camera on mobile */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Info Banner */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-xs text-yellow-800 text-center">
              ⚠️ תמונה זו תישמר כראיה למשלוח. וודא שהחבילה נראית בבירור.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

