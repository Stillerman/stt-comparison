import React from 'react';
import { TextField, Button, Typography, Box, Dialog, DialogTitle, DialogContent, DialogActions, FormControl, ToggleButton, Checkbox, Select, MenuItem } from '@mui/material';

const Settings = ({ openaiApiKey, setOpenaiApiKey, showOriginalAudio, setShowOriginalAudio, audioOutputDevices, selectedAudioOutput, setSelectedAudioOutput }) => {
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
        onChange={e => setShowOriginalAudio(e.target.checked)}
      />
      <Typography variant="subtitle1">Select Audio Output</Typography>
      <Select
        value={selectedAudioOutput}
        onChange={e => setSelectedAudioOutput(e.target.value)}
        displayEmpty
        fullWidth
      >
        {audioOutputDevices.map(device => (
          <MenuItem key={device.deviceId} value={device.deviceId}>
            {device.label || device.deviceId}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
    <Button variant="contained" color="primary" onClick={() => setOpenaiApiKey('')}>Reset</Button>
  </Box>
}

export default Settings;
