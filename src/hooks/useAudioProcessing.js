import { useState } from "react";
import OpenAI from "openai";

export const useAudioProcessing = (openaiApiKey) => {
  const [openaiLoading, setOpenaiLoading] = useState(false);
  const [userAudioUrl, setUserAudioUrl] = useState("");
  const [gpt4AudioUrl, setGpt4AudioUrl] = useState("");

  const openai = new OpenAI({
    apiKey: openaiApiKey,
    dangerouslyAllowBrowser: true,
  });

  const processAudio = async (file, selectedTab, conversation) => {
    if (!file || !openaiApiKey) {
      alert("Please provide all required inputs");
      return;
    }

    setOpenaiLoading(true);

    try {
      const transcriptionResponse = await openai.audio.transcriptions.create({
        model: "whisper-1",
        file: file,
        language: "en",
      });

      const userTranscription = transcriptionResponse.text;

      const userTtsResponse = await openai.audio.speech.create({
        model: "tts-1",
        input: userTranscription,
        voice: "alloy",
      });

      const userAudioBlob = await userTtsResponse.blob();
      const userAudioUrl = URL.createObjectURL(userAudioBlob);
      setUserAudioUrl(userAudioUrl);

      if (selectedTab === 1) {
        const gpt4Response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            ...conversation.map((msg) => ({
              role: msg.role,
              content: msg.content,
            })),
            { role: "user", content: userTranscription },
          ],
        });

        const gpt4Text = gpt4Response.choices[0].message.content;

        const gpt4TtsResponse = await openai.audio.speech.create({
          model: "tts-1",
          input: gpt4Text,
          voice: "nova",
        });

        const gpt4AudioBlob = await gpt4TtsResponse.blob();
        const gpt4AudioUrl = URL.createObjectURL(gpt4AudioBlob);
        setGpt4AudioUrl(gpt4AudioUrl);

        setOpenaiLoading(false);
        return { userTranscription, gpt4Text, userAudioUrl, gpt4AudioUrl };
      } else {
        setOpenaiLoading(false);
        return { userTranscription, userAudioUrl };
      }
    } catch (error) {
      console.error(error);
      alert("Error occurred during processing");
      setOpenaiLoading(false);
      return null;
    }
  };

  return { openaiLoading, userAudioUrl, gpt4AudioUrl, processAudio };
};
