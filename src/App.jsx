import React, { useState, useEffect } from 'react';
import { Container, TextField, Button, Typography, Grid, Paper, CircularProgress, Box } from '@mui/material';
import axios from 'axios';

const App = () => {
  const [openaiApiKey, setOpenaiApiKey] = useState(localStorage.getItem('openaiApiKey') || '');
  const [googleApiKey, setGoogleApiKey] = useState(localStorage.getItem('googleApiKey') || '');
  const [file, setFile] = useState(null);
  const [fileUrl, setFileUrl] = useState('');
  const [googleResult, setGoogleResult] = useState('');
  const [openaiResult, setOpenaiResult] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const [openaiLoading, setOpenaiLoading] = useState(false);
  const [googleTime, setGoogleTime] = useState(null);
  const [openaiTime, setOpenaiTime] = useState(null);

  useEffect(() => {
    localStorage.setItem('openaiApiKey', openaiApiKey);
    localStorage.setItem('googleApiKey', googleApiKey);
  }, [openaiApiKey, googleApiKey]);

  const handleFileChange = (event) => {
    const uploadedFile = event.target.files[0];
    setFile(uploadedFile);
    setFileUrl(URL.createObjectURL(uploadedFile));
  };

  const handleRemoveFile = () => {
    setFile(null);
    setFileUrl('');
  };

  const handleTranscription = async () => {
    if (!file || !openaiApiKey || !googleApiKey) {
      alert('Please provide all required inputs');
      return;
    }

    setGoogleLoading(true);
    setOpenaiLoading(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('model', 'whisper-1');

    const startGoogleTime = performance.now();
    const startOpenaiTime = performance.now();

    try {
      // OpenAI Whisper STT request
      const openaiPromise = axios.post('https://api.openai.com/v1/audio/transcriptions', formData, {
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'multipart/form-data'
        }
      }).then(response => {
        setOpenaiResult(response.data.text);
        setOpenaiTime(performance.now() - startOpenaiTime);
        setOpenaiLoading(false);
      });

      // Convert file to base64 using FileReader
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = async () => {
        const base64data = reader.result.split(',')[1];

        // Google STT request
        const googlePromise = axios.post(`https://speech.googleapis.com/v1/speech:recognize?key=${googleApiKey}`, {
          config: {
            encoding: 'MP3',
            sampleRateHertz: 16000,
            languageCode: 'en-US',
            enableAutomaticPunctuation: true
          },
          audio: {
            content: base64data
          }
        }).then(response => {
          setGoogleResult(response.data.results.map(result => result.alternatives[0].transcript).join('\n'));
          setGoogleTime(performance.now() - startGoogleTime);
          setGoogleLoading(false);
        });

        await Promise.all([openaiPromise, googlePromise]);
      };

    } catch (error) {
      console.error(error);
      alert('Error occurred during transcription');
      setGoogleLoading(false);
      setOpenaiLoading(false);
    }
  };

  return (
    <Container>
      <Typography variant="h4" gutterBottom>STT Comparison Tool</Typography>
      <TextField
        label="OpenAI API Key"
        variant="outlined"
        fullWidth
        margin="normal"
        value={openaiApiKey}
        onChange={(e) => setOpenaiApiKey(e.target.value)}
      />
      <TextField
        label="Google API Key"
        variant="outlined"
        fullWidth
        margin="normal"
        value={googleApiKey}
        onChange={(e) => setGoogleApiKey(e.target.value)}
      />
      <input
        accept="audio/mp3"
        style={{ display: 'none' }}
        id="raised-button-file"
        type="file"
        onChange={handleFileChange}
      />
      <label htmlFor="raised-button-file">
        <Button variant="contained" color="primary" component="span">
          Upload MP3 File
        </Button>
      </label>
      {file && (
        <>
          <Button variant="contained" color="secondary" onClick={handleRemoveFile} style={{ marginLeft: 10 }}>
            Remove File
          </Button>
          <Box marginTop={2}>
            <audio controls src={fileUrl} />
          </Box>
        </>
      )}
      <Button variant="contained" color="secondary" onClick={handleTranscription} style={{ marginTop: 20 }}>
        Transcribe
      </Button>
      <Grid container spacing={2} marginTop={2}>
        <Grid item xs={6}>
          <Paper elevation={3} style={{ padding: 16, minHeight: 200 }}>
            <Typography variant="h6">Google STT Result</Typography>
            {googleLoading ? (
              <Box display="flex" justifyContent="center">
                <CircularProgress />
              </Box>
            ) : (
              <>
                <Typography>{googleResult}</Typography>
                {googleTime && <Typography variant="body2">Time taken: {googleTime.toFixed(2)} ms</Typography>}
              </>
            )}
          </Paper>
        </Grid>
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
      </Grid>
    </Container>
  );
};

export default App;
