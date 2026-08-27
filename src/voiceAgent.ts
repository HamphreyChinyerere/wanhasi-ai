type VoiceMessage = {
  type?: string;
  text?: string;
  data?: string;
  status?: string;
  call_id?: string;
  name?: string;
  arguments?: Record<string, unknown>;
};

class MockVoiceSocket extends EventTarget {
  readyState = 1;
  private onMessage?: (message: VoiceMessage) => void;

  constructor(onMessage?: (message: VoiceMessage) => void) {
    super();
    this.onMessage = onMessage;
  }

  send(payload: string) {
    const message = JSON.parse(payload);

    if (message.type === "session.update") {
      setTimeout(() => {
        this.emit({ type: "session.ready" });
      }, 300);

      setTimeout(() => {
        this.emit({
          type: "transcript.agent",
          text: "Hello, I am WaNhasi. Mock mode is active, so no AssemblyAI credits are being used.",
        });
      }, 700);
    }
  }

  close() {
    this.readyState = 3;
  }

  private emit(message: VoiceMessage) {
    this.onMessage?.(message);
    this.dispatchEvent(
      new MessageEvent("message", {
        data: JSON.stringify(message),
      }),
    );
  }
}

async function getWeather(argumentsData: Record<string, unknown>) {
  if (argumentsData.use_current_location === true) {
    const position = await new Promise<GeolocationPosition>(
      (resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      },
    );

    const { latitude, longitude } = position.coords;

    const response = await fetch(
      `http://localhost:3001/api/weather/current?latitude=${latitude}&longitude=${longitude}`,
    );

    return response.json();
  }

  const location =
    typeof argumentsData.location === "string"
      ? argumentsData.location
      : "";

  const response = await fetch(
    `http://localhost:3001/api/weather?location=${encodeURIComponent(location)}`,
  );

  return response.json();
}

export async function connectVoiceAgent(
  onMessage?: (message: VoiceMessage) => void,
) {
  if (import.meta.env.VITE_VOICE_MODE === "mock") {
    const socket = new MockVoiceSocket(onMessage);

    setTimeout(() => {
      socket.send(
        JSON.stringify({
          type: "session.update",
        }),
      );
    }, 100);

    return socket;
  }

  const response = await fetch("http://localhost:3001/api/voice-token");
  const { token } = await response.json();

  const audioContext = new AudioContext({ sampleRate: 24000 });
  await audioContext.resume();
  await audioContext.audioWorklet.addModule("/pcm-processor.js");

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: false,
    },
  });

  const source = audioContext.createMediaStreamSource(stream);
  const processor = new AudioWorkletNode(audioContext, "pcm-processor");

  const url = new URL("wss://agents.assemblyai.com/v1/ws");
  url.searchParams.set("token", token);

  const socket = new WebSocket(url);
  let ready = false;
  let playbackTime = audioContext.currentTime;
  let pendingToolCall: VoiceMessage | null = null;

  processor.port.onmessage = (event) => {
    if (!ready || socket.readyState !== WebSocket.OPEN) return;

    const bytes = new Uint8Array(event.data);
    let binary = "";

    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }

    socket.send(
      JSON.stringify({
        type: "input.audio",
        audio: btoa(binary),
      }),
    );
  };

  source.connect(processor);

  socket.addEventListener("open", () => {
    socket.send(
      JSON.stringify({
        type: "session.update",
        session: {
          system_prompt:
            "You are WaNhasi, a helpful farming assistant for Zimbabwean farmers. When the user asks about weather, ask whether they want weather for their current phone location. If they agree, call get_weather with use_current_location true. If they provide a town or area, call get_weather with that location. Never invent weather data.",
          greeting: "Hello, I am WaNhasi. How can I help you today?",
          output: { voice: "ivy" },
          tools: [
            {
              type: "function",
              name: "get_weather",
              description:
                "Get live weather for a town or the user's current phone location.",
              parameters: {
                type: "object",
                properties: {
                  location: {
                    type: "string",
                    description: "Town or farming area",
                  },
                  use_current_location: {
                    type: "boolean",
                    description:
                      "True when the user agrees to use their phone location",
                  },
                },
              },
            },
          ],
        },
      }),
    );
  });

  socket.addEventListener("message", async (event) => {
    const message: VoiceMessage = JSON.parse(event.data);
    onMessage?.(message);

    if (message.type === "session.ready") {
      ready = true;
    }

    if (message.type === "tool.call") {
      pendingToolCall = message;
    }

    if (message.type === "reply.done" && pendingToolCall) {
      const toolCall = pendingToolCall;
      pendingToolCall = null;

      const result = await getWeather(toolCall.arguments ?? {});

      socket.send(
        JSON.stringify({
          type: "tool.result",
          call_id: toolCall.call_id,
          result: JSON.stringify(result),
        }),
      );
    }

    if (message.type === "reply.audio" && message.data) {
      const raw = atob(message.data);
      const pcm16 = new Int16Array(raw.length / 2);

      for (let i = 0; i < pcm16.length; i++) {
        pcm16[i] = raw.charCodeAt(i * 2) | (raw.charCodeAt(i * 2 + 1) << 8);
      }

      const audioBuffer = audioContext.createBuffer(
        1,
        pcm16.length,
        24000,
      );

      const channel = audioBuffer.getChannelData(0);

      for (let i = 0; i < pcm16.length; i++) {
        channel[i] = pcm16[i] / 32768;
      }

      const player = audioContext.createBufferSource();
      player.buffer = audioBuffer;
      player.connect(audioContext.destination);

      playbackTime = Math.max(playbackTime, audioContext.currentTime);
      player.start(playbackTime);
      playbackTime += audioBuffer.duration;
    }
  });

  socket.addEventListener("error", (error) => {
    console.error("Voice connection error:", error);
  });

  return socket;
}