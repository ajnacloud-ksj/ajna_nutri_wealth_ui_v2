import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Loader2, Languages } from "lucide-react";
import { toast } from "sonner";
import { backendApi } from "@/lib/api/client";

type VoiceEngine = "groq" | "sarvam";

interface WhisperVoiceRecorderProps {
  onTranscription: (text: string) => void;
  disabled?: boolean;
  /** Compact mode shows just an icon button */
  compact?: boolean;
  /** Seconds of silence before auto-stop (default 2s) */
  silenceTimeout?: number;
  /** Default engine (default: "groq") */
  defaultEngine?: VoiceEngine;
}

/**
 * Records audio via MediaRecorder, sends to backend for transcription.
 * Supports OpenAI Whisper and Sarvam AI Saaras engines.
 * Auto-stops after detecting silence. Works across all browsers.
 */
const WhisperVoiceRecorder = ({
  onTranscription,
  disabled = false,
  compact = false,
  silenceTimeout = 2,
  defaultEngine = "groq",
}: WhisperVoiceRecorderProps) => {
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [engine, setEngine] = useState<VoiceEngine>(defaultEngine);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const hasSpeechRef = useRef(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };
  }, []);

  const transcribeAudio = useCallback(async (blob: Blob, mimeType: string) => {
    if (blob.size < 100) {
      toast.error("Recording too short. Try again.");
      return;
    }

    setTranscribing(true);
    try {
      const buffer = await blob.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
      );

      const format = mimeType.includes("mp4") ? "mp4" : "webm";

      const { data, error } = await backendApi.post("/v1/voice/transcribe", {
        audio: base64,
        format,
        engine,
        language: "unknown",
      });

      if (error || !data?.text) {
        toast.error(data?.error || "Transcription failed");
        return;
      }

      onTranscription(data.text);
      const engineLabel = data.engine === "sarvam" ? "Sarvam" : "Groq";
      toast.success(`${engineLabel}: "${data.text.slice(0, 60)}${data.text.length > 60 ? "..." : ""}"`);
    } catch (e: any) {
      toast.error("Transcription failed");
      console.error("Voice transcription error:", e);
    } finally {
      setTranscribing(false);
    }
  }, [onTranscription, engine]);

  const stopRecording = useCallback(() => {
    // Clean up silence detection
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
  }, []);

  const startSilenceDetection = useCallback((stream: MediaStream) => {
    try {
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.3;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const SILENCE_THRESHOLD = 15; // audio level below this = silence

      hasSpeechRef.current = false;

      const checkLevel = () => {
        if (!analyserRef.current) return;

        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((sum, v) => sum + v, 0) / dataArray.length;

        if (avg > SILENCE_THRESHOLD) {
          hasSpeechRef.current = true;
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
        } else if (hasSpeechRef.current && !silenceTimerRef.current) {
          // Silence after speech — start countdown
          silenceTimerRef.current = setTimeout(() => {
            toast.info("Silence detected — auto-stopping...");
            stopRecording();
            audioCtx.close().catch(() => {});
          }, silenceTimeout * 1000);
        }

        animFrameRef.current = requestAnimationFrame(checkLevel);
      };

      checkLevel();
    } catch (e) {
      console.warn("Silence detection not available:", e);
    }
  }, [silenceTimeout, stopRecording]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

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
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;

        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        await transcribeAudio(blob, recorder.mimeType || "audio/webm");
      };

      recorder.start(250);
      mediaRecorderRef.current = recorder;
      setRecording(true);
      const engineLabel = engine === "sarvam" ? "Sarvam AI" : "Groq Whisper";
      toast.success(`Recording (${engineLabel})... Speak now!`);

      startSilenceDetection(stream);
    } catch (e: any) {
      if (e.name === "NotAllowedError") {
        toast.error("Microphone permission denied. Please allow microphone access.");
      } else {
        toast.error("Could not start recording");
        console.error("MediaRecorder error:", e);
      }
    }
  }, [transcribeAudio, startSilenceDetection, engine]);

  const handleClick = () => {
    if (disabled || transcribing) return;
    if (recording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const toggleEngine = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (recording || transcribing) return;
    setEngine(prev => prev === "groq" ? "sarvam" : "groq");
    toast.info(`Switched to ${engine === "groq" ? "Sarvam AI" : "Groq Whisper"}`);
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
        title={recording ? "Stop recording" : transcribing ? "Transcribing..." : `Record voice (${engine})`}
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
    <div className="flex items-center gap-1">
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
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={toggleEngine}
        disabled={disabled || recording || transcribing}
        className="h-8 px-2 text-xs text-muted-foreground"
        title={`Using ${engine === "sarvam" ? "Sarvam AI Saaras" : "Groq Whisper"}. Click to switch.`}
      >
        <Languages className="h-3 w-3 mr-1" />
        {engine === "sarvam" ? "Sarvam" : "Groq"}
      </Button>
    </div>
  );
};

export default WhisperVoiceRecorder;
