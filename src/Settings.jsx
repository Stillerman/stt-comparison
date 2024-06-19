import React, { useState } from 'react';
import { TextField, Button, Typography, Box, Dialog, DialogTitle, DialogContent, DialogActions, FormControl, ToggleButton, Checkbox } from '@mui/material';

const Settings = ({ openaiApiKey, setOpenaiApiKey, showOriginalAudio, setShowOriginalAudio }) => {
  return <Box p={2} width="250px">
    <Typography variant="h6" gutterBottom>Settings</Typography>
    <FormControl fullWidth>
      <TextField
        label="OpenAI API Key"
        variant="outlined"
        fullWidth
        value={openaiApiKey}
        onChange={(e) => setOpenaiApiKey(e.target.value)}
      />
      <Checkbox
        checked={showOriginalAudio}
        label="Show Original Audio"
        onChange={e => setShowOriginalAudio(e.target.value)}
      />
    </FormControl>
    <Button variant="contained" color="primary" onClick={() => setOpenaiApiKey('')}>Reset</Button>
  </Box>
}

export default Settings;
