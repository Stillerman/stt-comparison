import React from "react";
import { FormControl, InputLabel, Select, MenuItem } from "@mui/material";

const AudioOutputSelector = ({
  audioOutputs,
  selectedOutput,
  onOutputChange,
}) => {
  return (
    <FormControl fullWidth>
      <InputLabel id="audio-output-label">Audio Output</InputLabel>
      <Select
        labelId="audio-output-label"
        id="audio-output-select"
        value={selectedOutput}
        label="Audio Output"
        onChange={onOutputChange}
      >
        {audioOutputs.map((device) => (
          <MenuItem key={device.deviceId} value={device.deviceId}>
            {device.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default AudioOutputSelector;
