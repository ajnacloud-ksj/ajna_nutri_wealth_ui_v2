import { Camera, Mic } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";

export const MobileFAB = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();

  // Hide FAB on desktop or when on the capture page
  if (!isMobile || location.pathname === '/capture') {
    return null;
  }

  const handleCameraClick = () => {
    navigate('/capture');
  };

  const handleMicClick = () => {
    navigate('/capture');
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
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
  );
};
