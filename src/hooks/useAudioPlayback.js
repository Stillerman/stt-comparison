import { useState } from "react";

export const useAudioPlayback = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);

  const playAudio = (audioUrl, selectedTab, selectedOutput) => {
    setIsSpeaking(true);
    const audio = new Audio(audioUrl);
    if (selectedTab === 2) {
      audio.setSinkId(selectedOutput);
    }
    audio.onended = () => setIsSpeaking(false);
    audio.play();
  };

  const playAudioSequence = (
    userAudio,
    gpt4Audio,
    selectedTab,
    selectedOutput
  ) => {
    setIsSpeaking(true);
    const audio = new Audio(userAudio);
    if (selectedTab === 2) {
      audio.setSinkId(selectedOutput);
    }
    audio.onended = () => {
      const gpt4AudioElement = new Audio(gpt4Audio);
      if (selectedTab === 2) {
        gpt4AudioElement.setSinkId(selectedOutput);
      }
      gpt4AudioElement.onended = () => setIsSpeaking(false);
      gpt4AudioElement.play();
    };
    audio.play();
  };

  return { isSpeaking, playAudio, playAudioSequence };
};
