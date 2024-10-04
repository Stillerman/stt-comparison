import React, { useState, useEffect } from "react";
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

const App = () => {
  const [openaiApiKey, setOpenaiApiKey] = useState(
    localStorage.getItem("openaiApiKey") || "sk-proj-xxx"
  );

  const [openaiLoading, setOpenaiLoading] = useState(false);
  const [ttsAudioUrl, setTtsAudioUrl] = useState("");

  const [isRecording, setIsRecording] = useState(false);

  const { startRecording, stopRecording, recordingBlob } = useAudioRecorder();

  const openai = new OpenAI({
    apiKey: openaiApiKey,
    dangerouslyAllowBrowser: true,
  });

  useEffect(() => {
    localStorage.setItem("openaiApiKey", openaiApiKey);
  }, [openaiApiKey]);

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
      setOpenaiLoading(false);

      const ttsResponse = await openai.audio.speech.create({
        model: "tts-1",
        input: transcription,
        voice: "alloy",
      });

      ttsResponse.blob().then((blob) => {
        const ttsAudioUrl = URL.createObjectURL(blob);
        setTtsAudioUrl(ttsAudioUrl);
      });
    } catch (error) {
      console.error(error);
      alert("Error occurred during transcription or TTS");
      setOpenaiLoading(false);
    }
  };

  const handleStartRecording = () => {
    console.log("Recording started");
    startRecording();
    setIsRecording(true);
  };

  const handleStopRecording = () => {
    console.log("Recording stopped");
    stopRecording();
    setIsRecording(false);
  };

  // Ensure cleanup on component unmount
  useEffect(() => {
    return () => {
      if (isRecording) {
        console.log("Cleaning up recording on unmount");
        stopRecording();
      }
    };
  }, [isRecording]);

  return (
    <>
      <AppBar position="static" className="MuiAppBar-root">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Voice Recorder
          </Typography>
        </Toolbar>
      </AppBar>

      <Box
        sx={{
          height: "100vh",
          width: "100vw",
          backgroundColor: isRecording ? "red" : "green",
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
              : "Click and hold or press space to record"}
          </Typography>

          {openaiLoading && (
            <Box display="flex" justifyContent="center">
              <CircularProgress />
            </Box>
          )}

          {ttsAudioUrl && <audio src={ttsAudioUrl} autoPlay />}
        </Container>
      </Box>
    </>
  );
};

export default App;
