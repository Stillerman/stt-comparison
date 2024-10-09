/**
 * Running a local relay server will allow you to hide your API key
 * and run custom logic on the server
 *
 * Set the local relay server address to:
 * REACT_APP_LOCAL_RELAY_SERVER_URL=http://localhost:8081
 *
 * This will also require you to set OPENAI_API_KEY= in a `.env` file
 * You can run it with `npm run relay`, in parallel with `npm start`
 */
const LOCAL_RELAY_SERVER_URL: string =
  import.meta.env.REACT_APP_LOCAL_RELAY_SERVER_URL || "";

const modifiedInstructions = `System settings:
Tool use: enabled.

Instructions:
- You are an artificial intelligence agent responsible for helping test realtime voice capabilities
- Please make sure to respond with a helpful voice via audio
- Be kind, helpful, and curteous
- It is okay to ask the user questions
- Be open to exploration and conversation

Personality:
- Be upbeat and genuine
- Try speaking quickly as if excited
`;

import React, { useEffect, useRef, useCallback, useState } from "react";
import { RealtimeClient } from "@openai/realtime-api-beta";
import { ItemType } from "@openai/realtime-api-beta/dist/lib/client.js";
import { WavRecorder, WavStreamPlayer } from "../lib/wavtools/index.js";
import { WavRenderer } from "../utils/wav_renderer";
import { X, Edit, Zap, ArrowUp, ArrowDown } from "react-feather";
import {
  Box,
  Typography,
  Button,
  Paper,
  List,
  ListItem,
  ListItemText,
  Collapse,
  IconButton,
  Divider,
} from "@mui/material";
import { styled } from "@mui/system";
import {
  conversationWithStuttererPrompt,
  harshDebatePrompt,
} from "../../prompts.js";

/**
 * Type for all event logs
 */
interface RealtimeEvent {
  time: string;
  source: "client" | "server";
  count?: number;
  event: { [key: string]: any };
}

const StyledCanvas = styled("canvas")({
  width: "100%",
  height: "100%",
});

const VisualizationBox = styled(Box)({
  position: "absolute",
  display: "flex",
  bottom: 4,
  right: 8,
  padding: 4,
  borderRadius: 16,
  zIndex: 10,
  gap: 2,
});

export function ConsolePage({
  apiKey,
  startingPrompt = undefined,
  voiceMirror = false,
}: {
  apiKey: string;
  voiceMirror: boolean;
  startingPrompt?: string;
}) {
  /**
   * Ask user for API Key
   * If we're using the local relay server, we don't need this
   */

  /**
   * Instantiate:
   * - WavRecorder (speech input)
   * - WavStreamPlayer (speech output)
   * - RealtimeClient (API client)
   */
  const wavRecorderRef = useRef<WavRecorder>(
    new WavRecorder({ sampleRate: 24000 })
  );
  const wavStreamPlayerRef = useRef<WavStreamPlayer>(
    new WavStreamPlayer({ sampleRate: 24000 })
  );
  const clientRef = useRef<RealtimeClient>(
    new RealtimeClient(
      LOCAL_RELAY_SERVER_URL
        ? { url: LOCAL_RELAY_SERVER_URL }
        : {
            apiKey: apiKey,
            dangerouslyAllowAPIKeyInBrowser: true,
          }
    )
  );

  /**
   * References for
   * - Rendering audio visualization (canvas)
   * - Autoscrolling event logs
   * - Timing delta for event log displays
   */
  const clientCanvasRef = useRef<HTMLCanvasElement>(null);
  const serverCanvasRef = useRef<HTMLCanvasElement>(null);
  const eventsScrollHeightRef = useRef(0);
  const eventsScrollRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef<string>(new Date().toISOString());

  /**
   * All of our variables for displaying application state
   * - items are all conversation items (dialog)
   * - realtimeEvents are event logs, which can be expanded
   * - memoryKv is for set_memory() function
   * - coords, marker are for get_weather() function
   */
  const [items, setItems] = useState<ItemType[]>([]);
  const [realtimeEvents, setRealtimeEvents] = useState<RealtimeEvent[]>([]);
  const [expandedEvents, setExpandedEvents] = useState<{
    [key: string]: boolean;
  }>({});
  const [isConnected, setIsConnected] = useState(false);
  const [canPushToTalk, setCanPushToTalk] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  /**
   * Utility for formatting the timing of logs
   */
  const formatTime = useCallback((timestamp: string) => {
    const startTime = startTimeRef.current;
    const t0 = new Date(startTime).valueOf();
    const t1 = new Date(timestamp).valueOf();
    const delta = t1 - t0;
    const hs = Math.floor(delta / 10) % 100;
    const s = Math.floor(delta / 1000) % 60;
    const m = Math.floor(delta / 60_000) % 60;
    const pad = (n: number) => {
      let s = n + "";
      while (s.length < 2) {
        s = "0" + s;
      }
      return s;
    };
    return `${pad(m)}:${pad(s)}.${pad(hs)}`;
  }, []);

  /**
   * When you click the API key
   */
  const resetAPIKey = useCallback(() => {
    const apiKey = prompt("OpenAI API Key");
    if (apiKey !== null) {
      localStorage.clear();
      localStorage.setItem("tmp::voice_api_key", apiKey);
      window.location.reload();
    }
  }, []);

  /**
   * Connect to conversation:
   * WavRecorder taks speech input, WavStreamPlayer output, client is API client
   */
  const connectConversation = useCallback(async () => {
    const client = clientRef.current;
    const wavRecorder = wavRecorderRef.current;
    const wavStreamPlayer = wavStreamPlayerRef.current;

    // Set state variables
    startTimeRef.current = new Date().toISOString();
    setIsConnected(true);
    setRealtimeEvents([]);
    setItems(client.conversation.getItems());

    // Connect to microphone
    await wavRecorder.begin();

    // Connect to audio output
    await wavStreamPlayer.connect();

    // Connect to realtime API
    await client.connect();
    client.sendUserMessageContent([
      {
        type: `input_text`,
        // text: `Hello!`,
        text: startingPrompt ? startingPrompt : conversationWithStuttererPrompt,
      },
    ]);

    if (client.getTurnDetectionType() === "server_vad") {
      await wavRecorder.record((data) => client.appendInputAudio(data.mono));
    }
  }, []);

  /**
   * Disconnect and reset conversation state
   */
  const disconnectConversation = useCallback(async () => {
    setIsConnected(false);
    setRealtimeEvents([]);
    setItems([]);

    const client = clientRef.current;
    client.disconnect();

    const wavRecorder = wavRecorderRef.current;
    await wavRecorder.end(); // Ensure this stops the recording

    const wavStreamPlayer = wavStreamPlayerRef.current;
    await wavStreamPlayer.interrupt();

    // Add this line to stop the microphone stream
    await wavRecorder.stop(); // Ensure this releases the microphone
  }, []);

  const deleteConversationItem = useCallback(async (id: string) => {
    const client = clientRef.current;
    client.deleteItem(id);
  }, []);

  /**
   * In push-to-talk mode, start recording
   * .appendInputAudio() for each sample
   */
  const startRecording = async () => {
    setIsRecording(true);
    const client = clientRef.current;
    const wavRecorder = wavRecorderRef.current;
    const wavStreamPlayer = wavStreamPlayerRef.current;
    const trackSampleOffset = await wavStreamPlayer.interrupt();
    if (trackSampleOffset?.trackId) {
      const { trackId, offset } = trackSampleOffset;
      await client.cancelResponse(trackId, offset);
    }
    await wavRecorder.record((data) => client.appendInputAudio(data.mono));
  };

  /**
   * In push-to-talk mode, stop recording
   */
  const stopRecording = async () => {
    setIsRecording(false);
    const client = clientRef.current;
    const wavRecorder = wavRecorderRef.current;
    await wavRecorder.pause();
    client.createResponse();
  };

  /**
   * Switch between Manual <> VAD mode for communication
   */
  const changeTurnEndType = async (value: string) => {
    const client = clientRef.current;
    const wavRecorder = wavRecorderRef.current;
    if (value === "none" && wavRecorder.getStatus() === "recording") {
      await wavRecorder.pause();
    }
    client.updateSession({
      turn_detection: value === "none" ? null : { type: "server_vad" },
    });
    if (value === "server_vad" && client.isConnected()) {
      await wavRecorder.record((data) => client.appendInputAudio(data.mono));
    }
    setCanPushToTalk(value === "none");
  };

  /**
   * Auto-scroll the event logs
   */
  useEffect(() => {
    if (eventsScrollRef.current) {
      const eventsEl = eventsScrollRef.current;
      const scrollHeight = eventsEl.scrollHeight;
      // Only scroll if height has just changed
      if (scrollHeight !== eventsScrollHeightRef.current) {
        eventsEl.scrollTop = scrollHeight;
        eventsScrollHeightRef.current = scrollHeight;
      }
    }
  }, [realtimeEvents]);

  /**
   * Auto-scroll the conversation logs
   */
  useEffect(() => {
    const conversationEls = [].slice.call(
      document.body.querySelectorAll("[data-conversation-content]")
    );
    for (const el of conversationEls) {
      const conversationEl = el as HTMLDivElement;
      conversationEl.scrollTop = conversationEl.scrollHeight;
    }
  }, [items]);

  /**
   * Set up render loops for the visualization canvas
   */
  useEffect(() => {
    let isLoaded = true;

    const wavRecorder = wavRecorderRef.current;
    const clientCanvas = clientCanvasRef.current;
    let clientCtx: CanvasRenderingContext2D | null = null;

    const wavStreamPlayer = wavStreamPlayerRef.current;
    const serverCanvas = serverCanvasRef.current;
    let serverCtx: CanvasRenderingContext2D | null = null;

    const render = () => {
      if (isLoaded) {
        if (clientCanvas) {
          if (!clientCanvas.width || !clientCanvas.height) {
            clientCanvas.width = clientCanvas.offsetWidth;
            clientCanvas.height = clientCanvas.offsetHeight;
          }
          clientCtx = clientCtx || clientCanvas.getContext("2d");
          if (clientCtx) {
            clientCtx.clearRect(0, 0, clientCanvas.width, clientCanvas.height);
            const result = wavRecorder.recording
              ? wavRecorder.getFrequencies("voice")
              : { values: new Float32Array([0]) };
            WavRenderer.drawBars(
              clientCanvas,
              clientCtx,
              result.values,
              "#0099ff",
              10,
              0,
              8
            );
          }
        }
        if (serverCanvas) {
          if (!serverCanvas.width || !serverCanvas.height) {
            serverCanvas.width = serverCanvas.offsetWidth;
            serverCanvas.height = serverCanvas.offsetHeight;
          }
          serverCtx = serverCtx || serverCanvas.getContext("2d");
          if (serverCtx) {
            serverCtx.clearRect(0, 0, serverCanvas.width, serverCanvas.height);
            const result = wavStreamPlayer.analyser
              ? wavStreamPlayer.getFrequencies("voice")
              : { values: new Float32Array([0]) };
            WavRenderer.drawBars(
              serverCanvas,
              serverCtx,
              result.values,
              "#009900",
              10,
              0,
              8
            );
          }
        }
        window.requestAnimationFrame(render);
      }
    };
    render();

    return () => {
      isLoaded = false;
    };
  }, []);

  /**
   * Core RealtimeClient and audio capture setup
   * Set all of our instructions, tools, events and more
   */
  useEffect(() => {
    // Get refs
    const wavStreamPlayer = wavStreamPlayerRef.current;
    const client = clientRef.current;

    // Set instructions
    client.updateSession({ instructions: modifiedInstructions });
    // Set transcription, otherwise we don't get user transcriptions back
    client.updateSession({ input_audio_transcription: { model: "whisper-1" } });

    client.updateSession({
      voice: "echo",
    });

    // Add tools
    client.addTool(
      {
        name: "alert",
        description: "Alerts the user to a given message.",
        parameters: {
          type: "object",
          properties: {
            message: {
              type: "string",
              description: "The message to alert the user to.",
            },
          },
        },
      },
      async ({ message }: { [key: string]: any }) => {
        alert(message);
        return { ok: true };
      }
    );

    // handle realtime events from client + server for event logging
    client.on("realtime.event", (realtimeEvent: RealtimeEvent) => {
      setRealtimeEvents((realtimeEvents) => {
        const lastEvent = realtimeEvents[realtimeEvents.length - 1];
        if (lastEvent?.event.type === realtimeEvent.event.type) {
          // if we receive multiple events in a row, aggregate them for display purposes
          lastEvent.count = (lastEvent.count || 0) + 1;
          return realtimeEvents.slice(0, -1).concat(lastEvent);
        } else {
          return realtimeEvents.concat(realtimeEvent);
        }
      });
    });
    client.on("error", (event: any) => console.error(event));
    client.on("conversation.interrupted", async () => {
      const trackSampleOffset = await wavStreamPlayer.interrupt();
      if (trackSampleOffset?.trackId) {
        const { trackId, offset } = trackSampleOffset;
        await client.cancelResponse(trackId, offset);
      }
    });
    client.on("conversation.updated", async ({ item, delta }: any) => {
      const items = client.conversation.getItems();
      if (delta?.audio) {
        wavStreamPlayer.add16BitPCM(delta.audio, item.id);
      }
      if (item.status === "completed" && item.formatted.audio?.length) {
        const wavFile = await WavRecorder.decode(
          item.formatted.audio,
          24000,
          24000
        );
        item.formatted.file = wavFile;
      }
      setItems(items);
    });

    setItems(client.conversation.getItems());

    return () => {
      // cleanup; resets to defaults
      client.reset();
    };
  }, []);

  /**
   * Render the application
   */
  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        margin: "0 8px",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          padding: "8px 16px",
          minHeight: 40,
        }}
      >
        <Box
          sx={{ flexGrow: 1, display: "flex", alignItems: "center", gap: 1.5 }}
        >
          <img
            src="/openai-logomark.svg"
            alt="OpenAI Logo"
            style={{ width: 24, height: 24 }}
          />
          <Typography variant="h6">realtime console</Typography>
        </Box>
        {!LOCAL_RELAY_SERVER_URL && (
          <Button startIcon={<Edit />} onClick={resetAPIKey}>
            api key: {apiKey.slice(0, 3)}...
          </Button>
        )}
      </Box>
      <Box
        sx={{
          flexGrow: 1,
          display: "flex",
          overflow: "hidden",
          margin: "0 16px 24px",
        }}
      >
        <Box
          sx={{
            flexGrow: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <Paper
            elevation={3}
            sx={{
              flexGrow: 1,
              overflow: "hidden",
              position: "relative",
              marginBottom: 2,
              maxHeight: 200,
            }}
          >
            <Typography variant="h6" sx={{ padding: "16px 16px 4px" }}>
              Events
            </Typography>
            <VisualizationBox>
              <Box sx={{ position: "relative", height: 40, width: 100 }}>
                <StyledCanvas ref={clientCanvasRef} />
              </Box>
              <Box sx={{ position: "relative", height: 40, width: 100 }}>
                <StyledCanvas ref={serverCanvasRef} />
              </Box>
            </VisualizationBox>
            <List
              sx={{ height: "calc(100% - 60px)", overflow: "auto" }}
              ref={eventsScrollRef}
            >
              {!realtimeEvents.length && (
                <ListItem>
                  <ListItemText primary="awaiting connection..." />
                </ListItem>
              )}
              {realtimeEvents.map((realtimeEvent, i) => (
                <ListItem key={realtimeEvent.event.event_id}>
                  <ListItemText
                    primary={
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <Typography variant="caption">
                          {formatTime(realtimeEvent.time)}
                        </Typography>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            color:
                              realtimeEvent.source === "client"
                                ? "#0099ff"
                                : "#009900",
                          }}
                        >
                          {realtimeEvent.source === "client" ? (
                            <ArrowUp size={12} />
                          ) : (
                            <ArrowDown size={12} />
                          )}
                          <Typography variant="body2">
                            {realtimeEvent.source}
                          </Typography>
                        </Box>
                        <Typography variant="body2">
                          {realtimeEvent.event.type}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Collapse
                        in={!!expandedEvents[realtimeEvent.event.event_id]}
                      >
                        <Typography
                          variant="body2"
                          component="pre"
                          sx={{ whiteSpace: "pre-wrap" }}
                        >
                          {JSON.stringify(realtimeEvent.event, null, 2)}
                        </Typography>
                      </Collapse>
                    }
                  />
                  <IconButton
                    size="small"
                    onClick={() => {
                      const expanded = { ...expandedEvents };
                      expanded[realtimeEvent.event.event_id] =
                        !expanded[realtimeEvent.event.event_id];
                      setExpandedEvents(expanded);
                    }}
                  >
                    {expandedEvents[realtimeEvent.event.event_id] ? (
                      <ArrowUp />
                    ) : (
                      <ArrowDown />
                    )}
                  </IconButton>
                </ListItem>
              ))}
            </List>
          </Paper>
          <Paper
            elevation={3}
            sx={{ height: 200, overflow: "hidden", marginBottom: 2 }}
          >
            <Typography variant="h6" sx={{ padding: "16px 16px 4px" }}>
              conversation
            </Typography>
            <List
              sx={{ height: "calc(100% - 60px)", overflow: "auto" }}
              data-conversation-content
            >
              {!items.length && (
                <ListItem>
                  <ListItemText primary="awaiting connection..." />
                </ListItem>
              )}
              {items.map((conversationItem, i) => (
                <ListItem key={conversationItem.id}>
                  <ListItemText
                    primary={
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <Typography
                          variant="body2"
                          sx={{
                            color:
                              conversationItem.role === "user"
                                ? "#0099ff"
                                : "#009900",
                          }}
                        >
                          {(
                            conversationItem.role || conversationItem.type
                          ).replace(/_/g, " ")}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={() =>
                            deleteConversationItem(conversationItem.id)
                          }
                        >
                          <X size={12} />
                        </IconButton>
                      </Box>
                    }
                    secondary={
                      <Typography variant="body2">
                        {/* Render conversation item content here */}
                        {conversationItem.formatted.transcript ||
                          conversationItem.formatted.text ||
                          "(truncated)"}
                      </Typography>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
            }}
          >
            {/* <ToggleButtonGroup
              value={canPushToTalk ? "none" : "server_vad"}
              exclusive
              onChange={(_, value) => changeTurnEndType(value)}
            >
              <ToggleButton value="none">manual</ToggleButton>
              <ToggleButton value="server_vad">vad</ToggleButton>
            </ToggleButtonGroup> */}
            {isConnected && canPushToTalk && (
              <Button
                variant={isRecording ? "contained" : "outlined"}
                color={isRecording ? "secondary" : "primary"}
                disabled={!isConnected || !canPushToTalk}
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
              >
                {isRecording ? "release to send" : "push to talk"}
              </Button>
            )}
            <Button
              variant={isConnected ? "outlined" : "contained"}
              color={isConnected ? "primary" : "secondary"}
              startIcon={isConnected ? <X /> : <Zap />}
              onClick={
                isConnected ? disconnectConversation : connectConversation
              }
            >
              {isConnected ? "disconnect" : "connect"}
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
