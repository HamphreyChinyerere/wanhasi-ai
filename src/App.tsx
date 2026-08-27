import { useState } from "react";
import "./App.css";
import { connectVoiceAgent } from "./voiceAgent";

function App() {
  const [status, setStatus] = useState("Not connected");
  const [transcripts, setTranscripts] = useState<string[]>([]);

  const handleStartVoice = async () => {
    try {
      setStatus("Connecting...");

      const socket = await connectVoiceAgent((message) => {
        if (message.type === "session.ready") {
          setStatus("Connected to WaNhasi");
        }

        if (message.type === "transcript.user" && message.text) {
          setTranscripts((current) => {
            const line = `You: ${message.text}`;
            return current.at(-1) === line ? current : [...current, line];
          });
        }

        if (message.type === "transcript.agent" && message.text) {
          setTranscripts((current) => {
            const line = `WaNhasi: ${message.text}`;
            return current.at(-1) === line ? current : [...current, line];
          });
        }
      });

      socket.addEventListener("error", () => {
        setStatus("Connection failed");
      });
    } catch (error) {
      setStatus("Connection failed");
      console.error(error);
    }
  };

  return (
    <main>
      <h1>WaNhasi AI</h1>
      <p>Your farming voice assistant</p>

      <button onClick={handleStartVoice}>
        Start WaNhasi
      </button>

      <p>Status: {status}</p>

      <section>
        {transcripts.map((transcript, index) => (
          <p key={`${transcript}-${index}`}>{transcript}</p>
        ))}
      </section>
    </main>
  );
}

export default App;