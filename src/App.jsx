import React, { useState, useEffect, useRef } from "react";
import {
  Container,
  Typography,
  CircularProgress,
  Box,
  AppBar,
  Toolbar,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import HistoryIcon from "@mui/icons-material/History";
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
  const [userAudioUrl, setUserAudioUrl] = useState("");
  const [gpt4AudioUrl, setGpt4AudioUrl] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [conversation, setConversation] = useState([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
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
      // Transcribe user's speech
      const transcriptionResponse = await openai.audio.transcriptions.create({
        model: "whisper-1",
        file: file,
        language: "en",
      });

      const userTranscription = transcriptionResponse.text;

      // Generate TTS for user's speech
      const userTtsResponse = await openai.audio.speech.create({
        model: "tts-1",
        input: userTranscription,
        voice: "alloy",
      });

      const userAudioBlob = await userTtsResponse.blob();
      const userAudioUrl = URL.createObjectURL(userAudioBlob);
      setUserAudioUrl(userAudioUrl);

      // Generate GPT-4's response
      const gpt4Response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          ...conversation.map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
          { role: "user", content: userTranscription },
        ],
      });

      const gpt4Text = gpt4Response.choices[0].message.content;

      // Generate TTS for GPT-4's response
      const gpt4TtsResponse = await openai.audio.speech.create({
        model: "tts-1",
        input: gpt4Text,
        voice: "nova",
      });

      const gpt4AudioBlob = await gpt4TtsResponse.blob();
      const gpt4AudioUrl = URL.createObjectURL(gpt4AudioBlob);
      setGpt4AudioUrl(gpt4AudioUrl);

      // Update conversation history
      setConversation((prev) => [
        ...prev,
        { role: "user", content: userTranscription },
        { role: "assistant", content: gpt4Text },
      ]);

      setOpenaiLoading(false);
      playAudioSequence(userAudioUrl, gpt4AudioUrl);
    } catch (error) {
      console.error(error);
      alert("Error occurred during processing");
      setOpenaiLoading(false);
    }
  };

  const playAudioSequence = (userAudio, gpt4Audio) => {
    setIsSpeaking(true);
    const audio = new Audio(userAudio);
    audio.onended = () => {
      const gpt4AudioElement = new Audio(gpt4Audio);
      gpt4AudioElement.onended = () => setIsSpeaking(false);
      gpt4AudioElement.play();
    };
    audio.play();
  };

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.onended = () => {
        setIsSpeaking(false);
      };
    }
  }, [gpt4AudioUrl]);

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
      <AppBar position="fixed">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Voice Chat with GPT-4
          </Typography>
          <IconButton color="inherit" onClick={() => setIsHistoryOpen(true)}>
            <HistoryIcon />
          </IconButton>
        </Toolbar>
      </AppBar>
      <Box
        sx={{
          height: "100vh",
          width: "100vw",
          backgroundColor: getBackgroundColor(),
          cursor: "pointer",
          display: "flex",
          flexDirection: "column",
          paddingTop: "64px", // To account for the AppBar
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
        </Container>
      </Box>
      <Drawer
        anchor="right"
        open={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
      >
        <List sx={{ width: 300 }}>
          {conversation.map((msg, index) => (
            <ListItem key={index}>
              <ListItemText
                primary={msg.role === "user" ? "You" : "GPT-4"}
                secondary={msg.content}
              />
            </ListItem>
          ))}
        </List>
      </Drawer>
    </>
  );
};

export default App;
