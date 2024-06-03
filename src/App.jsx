import React, { useState, useEffect } from 'react';
import { Container, TextField, Button, Typography, Grid, Paper, CircularProgress, Box } from '@mui/material';
import { AudioRecorder } from 'react-audio-voice-recorder';
import OpenAI from 'openai';

const App = () => {
  const [openaiApiKey, setOpenaiApiKey] = useState(localStorage.getItem('openaiApiKey') || '');
  const [file, setFile] = useState(null);
  const [audioUrl, setAudioUrl] = useState('');
  const [openaiResult, setOpenaiResult] = useState('');
  const [openaiLoading, setOpenaiLoading] = useState(false);
  const [openaiTime, setOpenaiTime] = useState(null);
  const [ttsAudioUrl, setTtsAudioUrl] = useState('');

  const openai = new OpenAI({
    apiKey: openaiApiKey,
    dangerouslyAllowBrowser: true
  });

  useEffect(() => {
    localStorage.setItem('openaiApiKey', openaiApiKey);
  }, [openaiApiKey]);

  const handleRecordingComplete = (blob) => {
    const url = URL.createObjectURL(blob);
    const file = new File([blob], 'recording.webm', { type: blob.type });
    setFile(file);
    setAudioUrl(url);
  };

  const handleTranscription = async () => {
    if (!file || !openaiApiKey) {
      alert('Please provide all required inputs');
      return;
    }

    setOpenaiLoading(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('model', 'whisper-1');

    const startOpenaiTime = performance.now();

    try {
      // OpenAI Whisper STT request
      const response = await openai.audio.transcriptions.create({
        model: 'whisper-1',
        file: file,
        language: 'en',
      });

      const transcription = response.text;
      setOpenaiResult(transcription);
      setOpenaiTime(performance.now() - startOpenaiTime);
      setOpenaiLoading(false);

      // OpenAI TTS request
      const ttsResponse = await openai.audio.speech.create({
        model: 'text-to-speech-001',
        input: transcription,
        voice: 'alloy' // Use the appropriate voice here
      });

      const ttsAudioBlob = new Blob([ttsResponse.data.audio_content], { type: 'audio/mpeg' });
      const ttsAudioUrl = URL.createObjectURL(ttsAudioBlob);
      setTtsAudioUrl(ttsAudioUrl);

    } catch (error) {
      console.error(error);
      alert('Error occurred during transcription or TTS');
      setOpenaiLoading(false);
    }
  };

  return (
    <Container>
      <Typography variant="h4" gutterBottom>STT and TTS Tool</Typography>
      <TextField
        label="OpenAI API Key"
        variant="outlined"
        fullWidth
        margin="normal"
        value={openaiApiKey}
        onChange={(e) => setOpenaiApiKey(e.target.value)}
      />
      <AudioRecorder 
        onRecordingComplete={handleRecordingComplete}
        audioTrackConstraints={{
          noiseSuppression: true,
          echoCancellation: true,
        }}
        downloadOnSavePress={false}
        downloadFileExtension="webm"
      />
      {audioUrl && (
        <Box marginTop={2}>
          <audio controls src={audioUrl} />
        </Box>
      )}
      <Button variant="contained" color="secondary" onClick={handleTranscription} style={{ marginTop: 20 }}>
        Transcribe and Generate Speech
      </Button>
      <Grid container spacing={2} marginTop={2}>
        <Grid item xs={6}>
          <Paper elevation={3} style={{ padding: 16, minHeight: 200 }}>
            <Typography variant="h6">OpenAI Whisper STT Result</Typography>
            {openaiLoading ? (
              <Box display="flex" justifyContent="center">
                <CircularProgress />
              </Box>
            ) : (
              <>
                <Typography>{openaiResult}</Typography>
                {openaiTime && <Typography variant="body2">Time taken: {openaiTime.toFixed(2)} ms</Typography>}
              </>
            )}
          </Paper>
        </Grid>
        <Grid item xs={6}>
          <Paper elevation={3} style={{ padding: 16, minHeight: 200 }}>
            <Typography variant="h6">OpenAI TTS Result</Typography>
            {ttsAudioUrl ? (
              <audio controls src={ttsAudioUrl} />
            ) : (
              <Typography>No TTS audio generated yet</Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default App;
