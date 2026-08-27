# wanhasi-ai

## Architecture

WaNhasi AI uses a client-server architecture with AssemblyAI providing the core real-time voice agent capabilities.

```text
                         WaNhasi AI
                             │
                             ▼
                 ┌──────────────────────┐
                 │  React + TypeScript   │
                 │       Frontend        │
                 └──────────┬───────────┘
                            │
                       WebSocket
                            │
                            ▼
                 ┌──────────────────────┐
                 │ Express + TypeScript │
                 │       Backend        │
                 └──────────┬───────────┘
                            │
                            ▼
                 ┌──────────────────────┐
                 │      AssemblyAI      │
                 │   Voice Agent API    │
                 └──────────┬───────────┘
                            │
                    Voice Conversation
                            │
                            ▼
                         User 🎤

### Request Flow

1. The user opens the WaNhasi AI web application.
2. The React frontend captures the user's voice.
3. The frontend establishes a connection through the backend.
4. The Express backend communicates with AssemblyAI.
5. AssemblyAI processes the real-time voice conversation.
6. The AI generates a response.
7. The response is returned to the frontend as audio and transcript data.
8. The user hears the response and can continue the conversation.

### Security

The AssemblyAI API key is stored on the backend and is never exposed to the frontend or committed to the GitHub repository.