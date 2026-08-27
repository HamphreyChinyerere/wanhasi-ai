type VoiceMessage = {
  type?: string;
  text?: string;
  data?: string;
  status?: string;
};

export async function connectVoiceAgent(
  onMessage?: (message: VoiceMessage) => void,
) {
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
            "You are WaNhasi, a helpful farming assistant for Zimbabwean farmers.",
          greeting: "Hello, I am WaNhasi. How can I help you today?",
          output: { voice: "ivy" },
        },
      }),
    );
  });

  socket.addEventListener("message", (event) => {
    const message: VoiceMessage = JSON.parse(event.data);
    onMessage?.(message);

    if (message.type === "session.ready") {
      ready = true;
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

    if (
      message.type === "reply.done" &&
      message.status === "interrupted"
    ) {
      playbackTime = audioContext.currentTime;
    }
  });

  return socket;
}