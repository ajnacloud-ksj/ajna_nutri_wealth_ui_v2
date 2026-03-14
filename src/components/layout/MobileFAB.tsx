import { Camera, Mic } from "lucide-react";
import { useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { QuickCaptureModal } from "@/components/capture/QuickCaptureModal";

export const MobileFAB = () => {
  const location = useLocation();
  const isMobile = useIsMobile();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Hide FAB on desktop or when on the capture page
  if (!isMobile || location.pathname === '/capture') {
    return null;
  }

  const handleCameraClick = () => {
    // Trigger native camera via file input
    fileInputRef.current?.click();
  };

  const handleMicClick = () => {
    // Open the capture modal (which has voice recording built in)
    setIsModalOpen(true);
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Open modal - the file will be set after modal opens
      setIsModalOpen(true);
      // Reset input so same file can be re-selected
      e.target.value = '';
    }
  };

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
        {/* Hidden file input for camera capture */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileSelected}
        />

        {/* Microphone Button */}
        <Button
          onClick={handleMicClick}
          className="h-14 w-14 rounded-full bg-green-600 hover:bg-green-700 shadow-lg hover:shadow-xl transition-all duration-200 active:scale-95"
          size="icon"
          aria-label="Voice Recording"
        >
          <Mic className="h-6 w-6 text-white" />
        </Button>

        {/* Camera Button */}
        <Button
          onClick={handleCameraClick}
          className="h-14 w-14 rounded-full bg-green-600 hover:bg-green-700 shadow-lg hover:shadow-xl transition-all duration-200 active:scale-95"
          size="icon"
          aria-label="Capture Image"
        >
          <Camera className="h-6 w-6 text-white" />
        </Button>
      </div>

      <QuickCaptureModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};
