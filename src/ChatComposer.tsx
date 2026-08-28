import { useState } from "react";
import { Mic, Send } from "lucide-react";

type ChatComposerProps = {
  onSend: (message: string) => void;
  onStartVoice: () => void;
  disabled?: boolean;
};

function ChatComposer({
  onSend,
  onStartVoice,
  disabled = false,
}: ChatComposerProps) {
  const [message, setMessage] = useState("");

  const submitMessage = () => {
    const trimmedMessage = message.trim();

    if (!trimmedMessage || disabled) {
      return;
    }

    onSend(trimmedMessage);
    setMessage("");
  };

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submitMessage();
    }
  };

  return (
    <form
      className="chat-composer"
      onSubmit={(event) => {
        event.preventDefault();
        submitMessage();
      }}
    >
      <textarea
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Message WaNhasi..."
        rows={1}
        disabled={disabled}
        aria-label="Message WaNhasi"
      />

      <div className="composer-actions">
        <button
          type="button"
          className="composer-icon-button"
          onClick={onStartVoice}
          disabled={disabled}
          aria-label="Start voice chat"
        >
          <Mic size={19} />
        </button>

        <button
          type="submit"
          className="composer-send-button"
          disabled={disabled || !message.trim()}
          aria-label="Send message"
        >
          <Send size={18} />
        </button>
      </div>
    </form>
  );
}

export default ChatComposer;