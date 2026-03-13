import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { backendApi } from "@/lib/api/client";

interface WhisperVoiceRecorderProps {
  onTranscription: (text: string) => void;
  disabled?: boolean;
  /** Compact mode shows just an icon button */
  compact?: boolean;
}

/**
 * Records audio via MediaRecorder, sends to backend Whisper API for transcription.
 * Works across all browsers (Chrome, Safari, Firefox, Edge).
 */
const WhisperVoiceRecorder = ({ onTranscription, disabled = false, compact = false }: WhisperVoiceRecorderProps) => {
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Pick a supported mime type
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/mp4")
        ? "audio/mp4"
        : "";

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        // Stop all tracks
        stream.getTracks().forEach((t) => t.stop());

        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        if (blob.size < 100) {
          toast.error("Recording too short. Try again.");
          return;
        }

        // Convert to base64
        setTranscribing(true);
        try {
          const buffer = await blob.arrayBuffer();
          const base64 = btoa(
            new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
          );

          const format = recorder.mimeType?.includes("mp4") ? "mp4" : "webm";

          const { data, error } = await backendApi.post("/v1/voice/transcribe", {
            audio: base64,
            format,
          });

          if (error || !data?.text) {
            toast.error(data?.error || "Transcription failed");
            return;
          }

          onTranscription(data.text);
          toast.success(`Transcribed: "${data.text.slice(0, 60)}${data.text.length > 60 ? "..." : ""}"`);
        } catch (e: any) {
          toast.error("Transcription failed");
          console.error("Whisper transcription error:", e);
        } finally {
          setTranscribing(false);
        }
      };

      recorder.start(250); // collect chunks every 250ms
      mediaRecorderRef.current = recorder;
      setRecording(true);
      toast.success("Recording... Speak now!");
    } catch (e: any) {
      if (e.name === "NotAllowedError") {
        toast.error("Microphone permission denied. Please allow microphone access.");
      } else {
        toast.error("Could not start recording");
        console.error("MediaRecorder error:", e);
      }
    }
  }, [onTranscription]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
  }, []);

  const handleClick = () => {
    if (disabled || transcribing) return;
    if (recording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  if (compact) {
    return (
      <Button
        type="button"
        variant={recording ? "destructive" : "ghost"}
        size="sm"
        onClick={handleClick}
        disabled={disabled || transcribing}
        className="h-8 w-8 p-0"
        title={recording ? "Stop recording" : transcribing ? "Transcribing..." : "Record voice"}
      >
        {transcribing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : recording ? (
          <Square className="h-3.5 w-3.5" />
        ) : (
          <Mic className="h-4 w-4" />
        )}
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant={recording ? "destructive" : "outline"}
      size="sm"
      onClick={handleClick}
      disabled={disabled || transcribing}
      className="flex items-center gap-2"
    >
      {transcribing ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Transcribing...
        </>
      ) : recording ? (
        <>
          <Square className="h-4 w-4" />
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
          </span>
          Stop
        </>
      ) : (
        <>
          <Mic className="h-4 w-4" />
          Voice
        </>
      )}
    </Button>
  );
};

export default WhisperVoiceRecorder;
