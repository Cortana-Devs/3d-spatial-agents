import { useState, useRef, useCallback } from "react";

export function useSpeechToText() {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err: any) {
      console.error("Microphone access denied or failed:", err);
      setError("Microphone access denied or failed. Please check permissions.");
    }
  }, []);

  const stopRecording = useCallback((): Promise<string> => {
    return new Promise((resolve, reject) => {
      const mediaRecorder = mediaRecorderRef.current;
      if (!mediaRecorder) {
        reject(new Error("No active recording"));
        return;
      }

      mediaRecorder.onstop = async () => {
        setIsRecording(false);
        setIsTranscribing(true);

        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm;codecs=opus",
        });

        audioChunksRef.current = [];

        // Convert blob to base64
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64data = reader.result?.toString().split(",")[1];
          if (!base64data) {
            setIsTranscribing(false);
            reject(new Error("Failed to encode audio"));
            return;
          }

          try {
            const response = await fetch("/api/audio/stt", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ audioContent: base64data }),
            });

            if (!response.ok) {
              throw new Error(`Google STT API returned ${response.status}`);
            }

            const { transcript } = await response.json();
            setIsTranscribing(false);
            resolve(transcript);
          } catch (err: any) {
            console.error("Transcription error:", err);
            setError(err.message || "Failed to transcribe audio.");
            setIsTranscribing(false);
            reject(err);
          }
        };

        // Stop all audio tracks
        mediaRecorder.stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.stop();
    });
  }, []);

  return { isRecording, isTranscribing, error, startRecording, stopRecording };
}
