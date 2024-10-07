import React, { useState, useEffect, useRef } from "react";
import {
  Container,
  Typography,
  CircularProgress,
  Box,
  AppBar,
  Toolbar,
} from "@mui/material";
import { useAudioRecorder } from "react-audio-voice-recorder";
import OpenAI from "openai";
import "./index.css";
import useKeyDown from "./hooks/useKeyDown";

function getOpenaiApiKey() {
  if (localStorage.getItem("openaiApiKey")) {
    return localStorage.getItem("openaiApiKey");
  } else {
    const key = prompt("Enter your OpenAI API key");
    localStorage.setItem("openaiApiKey", key);
    return key;
  }
}

const openaiApiKey = getOpenaiApiKey();

const App = () => {
  const [openaiLoading, setOpenaiLoading] = useState(false);
  const [ttsAudioUrl, setTtsAudioUrl] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef(null);

  const { startRecording, stopRecording, recordingBlob, isRecording } =
    useAudioRecorder();

  const openai = new OpenAI({
    apiKey: openaiApiKey,
    dangerouslyAllowBrowser: true,
  });

  useEffect(() => {
    console.log("recordingBlob updated");
    if (recordingBlob) {
      handleRecordingComplete(recordingBlob);
    }
  }, [recordingBlob]);

  const handleRecordingComplete = (blob) => {
    const url = URL.createObjectURL(blob);
    const file = new File([blob], "recording.webm", { type: blob.type });
    handleTranscription(file);
  };

  const handleTranscription = async (file) => {
    if (!file || !openaiApiKey) {
      alert("Please provide all required inputs");
      return;
    }

    setOpenaiLoading(true);

    try {
      const response = await openai.audio.transcriptions.create({
        model: "whisper-1",
        file: file,
        language: "en",
      });

      const transcription = response.text;

      const ttsResponse = await openai.audio.speech.create({
        model: "tts-1",
        input: transcription,
        voice: "alloy",
      });

      ttsResponse.blob().then((blob) => {
        setOpenaiLoading(false);

        const ttsAudioUrl = URL.createObjectURL(blob);
        setTtsAudioUrl(ttsAudioUrl);
        setOpenaiLoading(false);
        setIsSpeaking(true);
      });
    } catch (error) {
      console.error(error);
      alert("Error occurred during transcription or TTS");
      setOpenaiLoading(false);
    }
  };

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.onended = () => {
        setIsSpeaking(false);
      };
    }
  }, [ttsAudioUrl]);

  const handleStartRecording = () => {
    console.log("Recording started");
    startRecording();
    console.log("isRecording after start:", isRecording);
  };

  const handleStopRecording = () => {
    console.log("Recording stopped");
    stopRecording();
    console.log("isRecording after stop:", isRecording);
  };

  useKeyDown(
    "Space",
    () => {
      if (!isRecording) {
        console.log("Space key pressed, starting recording");
        handleStartRecording();
      }
    },
    () => {
      if (isRecording) {
        console.log("Space key released, stopping recording");
        handleStopRecording();
      }
    },
    [isRecording, handleStartRecording, handleStopRecording]
  );

  const getBackgroundColor = () => {
    if (isRecording) return "red";
    if (openaiLoading) return "yellow";
    if (isSpeaking) return "blue";
    return "green";
  };

  return (
    <>
      <Box
        sx={{
          height: "100vh",
          width: "100vw",
          backgroundColor: getBackgroundColor(),
          cursor: "pointer",
          display: "flex",
          flexDirection: "column",
        }}
        onMouseDown={handleStartRecording}
        onMouseUp={handleStopRecording}
        onTouchStart={handleStartRecording}
        onTouchEnd={handleStopRecording}
      >
        <Container
          sx={{
            flexGrow: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Typography variant="h4" align="center" gutterBottom>
            {isRecording
              ? "Recording..."
              : openaiLoading
              ? "Processing..."
              : isSpeaking
              ? "Speaking..."
              : "Click and hold, press space, or touch to record"}
          </Typography>

          {openaiLoading && (
            <Box display="flex" justifyContent="center">
              <CircularProgress />
            </Box>
          )}

          {ttsAudioUrl && <audio ref={audioRef} src={ttsAudioUrl} autoPlay />}
        </Container>
      </Box>
    </>
  );
};

export default App;
