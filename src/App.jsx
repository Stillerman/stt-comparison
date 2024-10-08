import React, { useState, useEffect } from "react";
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
  Tabs,
  Tab,
} from "@mui/material";
import HistoryIcon from "@mui/icons-material/History";
import { useAudioRecorder } from "react-audio-voice-recorder";
import useKeyDown from "./hooks/useKeyDown";
import AudioOutputSelector from "./components/AudioOutputSelector";
import { useAudioProcessing } from "./hooks/useAudioProcessing";
import { useAudioPlayback } from "./hooks/useAudioPlayback";

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
  const [conversation, setConversation] = useState([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState(0);
  const [audioOutputs, setAudioOutputs] = useState([]);
  const [selectedOutput, setSelectedOutput] = useState("");

  const { startRecording, stopRecording, recordingBlob, isRecording } =
    useAudioRecorder();
  const { openaiLoading, userAudioUrl, gpt4AudioUrl, processAudio } =
    useAudioProcessing(openaiApiKey);
  const { isSpeaking, playAudio, playAudioSequence } = useAudioPlayback();

  useEffect(() => {
    if (recordingBlob) {
      handleRecordingComplete(recordingBlob);
    }
  }, [recordingBlob]);

  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then((devices) => {
      const outputs = devices.filter((device) => device.kind === "audiooutput");
      setAudioOutputs(outputs);
      if (outputs.length > 0) {
        setSelectedOutput(outputs[0].deviceId);
      }
    });
  }, []);

  const handleOutputChange = (event) => {
    setSelectedOutput(event.target.value);
  };

  const handleRecordingComplete = async (blob) => {
    const file = new File([blob], "recording.webm", { type: blob.type });
    const result = await processAudio(file, selectedTab, conversation);

    if (result) {
      if (selectedTab === 1) {
        setConversation((prev) => [
          ...prev,
          { role: "user", content: result.userTranscription },
          { role: "assistant", content: result.gpt4Text },
        ]);
        playAudioSequence(
          result.userAudioUrl,
          result.gpt4AudioUrl,
          selectedTab,
          selectedOutput
        );
      } else {
        playAudio(result.userAudioUrl, selectedTab, selectedOutput);
      }
    }
  };

  const handleStartRecording = () => {
    console.log("Recording started");
    startRecording();
  };

  const handleStopRecording = () => {
    console.log("Recording stopped");
    stopRecording();
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
            Voice Chat with GPT-4o
          </Typography>
          <Tabs
            value={selectedTab}
            onChange={(e, newValue) => setSelectedTab(newValue)}
            textColor="inherit"
            indicatorColor="secondary"
          >
            <Tab label="Voice Mirror" />
            <Tab label="Arkenza Chat" />
            <Tab label="Zoom Meeting" />
          </Tabs>
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

          {selectedTab === 2 && ( // Show audio output selector for Zoom Meeting mode
            <Box mt={2} width="100%" maxWidth={300}>
              <AudioOutputSelector
                audioOutputs={audioOutputs}
                selectedOutput={selectedOutput}
                onOutputChange={handleOutputChange}
              />
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

          {conversation.length === 0 && (
            <ListItem>
              <ListItemText primary="No conversation history yet. Click and hold, press space, or touch to record." />
            </ListItem>
          )}
        </List>
      </Drawer>
    </>
  );
};

export default App;
