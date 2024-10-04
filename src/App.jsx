import React, { useState, useEffect, useRef } from "react";
import {
  Container,
  Button,
  Typography,
  Drawer,
  Grid,
  Paper,
  CircularProgress,
  Box,
  AppBar,
  Toolbar,
} from "@mui/material";
import { useAudioRecorder } from "react-audio-voice-recorder";
import OpenAI from "openai";
import Settings from "./Settings";
import "./index.css";

const App = () => {
  const [openaiApiKey, setOpenaiApiKey] = useState(
    localStorage.getItem("openaiApiKey") || ""
  );
  const [showOriginalAudio, setShowOriginalAudio] = useState(false);
  const [allowFileUpload, setAllowFileUpload] = useState(false);
  const [runTts, setRunTts] = useState(true);

  const [audioUrl, setAudioUrl] = useState("");
  const [openaiResult, setOpenaiResult] = useState("");
  const [openaiLoading, setOpenaiLoading] = useState(false);
  const [openaiTime, setOpenaiTime] = useState(null);
  const [ttsAudioUrl, setTtsAudioUrl] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const audioRef = useRef();

  const [audioOutputDevices, setAudioOutputDevices] = useState([]);
  const [selectedAudioOutput, setSelectedAudioOutput] = useState("");

  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    navigator.mediaDevices
      .enumerateDevices()
      .then((devices) => {
        const audioOutputs = devices.filter(
          (device) => device.kind === "audiooutput"
        );
        setAudioOutputDevices(audioOutputs);
        if (audioOutputs.length > 0) {
          setSelectedAudioOutput(audioOutputs[0].deviceId); // Default to the first audio output
        }
      })
      .catch((error) => console.error("Error fetching devices", error));
  }, []);

  const { startRecording, stopRecording, recordingBlob } = useAudioRecorder();

  const openai = new OpenAI({
    apiKey: openaiApiKey,
    dangerouslyAllowBrowser: true,
  });

  useEffect(() => {
    localStorage.setItem("openaiApiKey", openaiApiKey);
  }, [openaiApiKey]);

  useEffect(() => {
    if (recordingBlob) {
      handleRecordingComplete(recordingBlob);
    }
  }, [recordingBlob]);

  const handleRecordingComplete = (blob) => {
    const url = URL.createObjectURL(blob);
    const file = new File([blob], "recording.webm", { type: blob.type });
    setAudioUrl(url);
    handleTranscription(file);
  };

  const handleTranscription = async (file) => {
    if (!file || !openaiApiKey) {
      alert("Please provide all required inputs");
      return;
    }

    setOpenaiLoading(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("model", "whisper-1");

    const startOpenaiTime = performance.now();

    try {
      // OpenAI Whisper STT request
      const response = await openai.audio.transcriptions.create({
        model: "whisper-1",
        file: file,
        language: "en",
      });

      const transcription = response.text;
      setOpenaiResult(transcription);
      setOpenaiTime(performance.now() - startOpenaiTime);
      setOpenaiLoading(false);

      if (runTts) {
        // OpenAI TTS request
        const ttsResponse = await openai.audio.speech.create({
          model: "tts-1",
          input: transcription,
          voice: "alloy", // Use the appropriate voice here
        });

        ttsResponse.blob().then((blob) => {
          // const ttsAudioBlob = new Blob([ttsResponse.data.audio_content], { type: 'audio/mpeg' });
          const ttsAudioUrl = URL.createObjectURL(blob);
          setTtsAudioUrl(ttsAudioUrl);
        });
      }
    } catch (error) {
      console.error(error);
      alert("Error occurred during transcription or TTS");
      setOpenaiLoading(false);
    }
  };

  useEffect(() => {
    if (audioRef.current && selectedAudioOutput) {
      audioRef.current.setSinkId(selectedAudioOutput).catch((error) => {
        console.error("Error setting audio output device:", error);
      });
    }
  }, [ttsAudioUrl, selectedAudioOutput]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.play();
    }
  }, [audioRef, ttsAudioUrl]);

  const handleStartRecording = () => {
    startRecording();
    setIsRecording(true);
  };

  const handleStopRecording = () => {
    stopRecording();
    setIsRecording(false);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === "Space" && !isRecording) {
        e.preventDefault();
        handleStartRecording();
      }
    };

    const handleKeyUp = (e) => {
      if (e.code === "Space") {
        e.preventDefault();
        handleStopRecording();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [isRecording, startRecording, stopRecording]);

  return (
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
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Voice Recorder
          </Typography>
          <Settings
            openaiApiKey={openaiApiKey}
            setOpenaiApiKey={setOpenaiApiKey}
            showOriginalAudio={showOriginalAudio}
            setShowOriginalAudio={setShowOriginalAudio}
            audioOutputDevices={audioOutputDevices}
            selectedAudioOutput={selectedAudioOutput}
            setSelectedAudioOutput={setSelectedAudioOutput}
            allowFileUpload={allowFileUpload}
            setAllowFileUpload={setAllowFileUpload}
            runTts={runTts}
            setRunTts={setRunTts}
          />
        </Toolbar>
      </AppBar>

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

        {ttsAudioUrl && <audio ref={audioRef} src={ttsAudioUrl} />}
      </Container>
    </Box>
  );
};

export default App;
