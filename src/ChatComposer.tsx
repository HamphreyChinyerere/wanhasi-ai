import {
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { Mic, SendHorizontal } from "lucide-react";

type ChatComposerProps = {
  onSend: (message: string) => void | Promise<void>;
  onStartVoice: () => void | Promise<void>;
  disabled?: boolean;
};

const MAX_LINES = 12;
const LINE_HEIGHT = 22;
const MAX_HEIGHT = MAX_LINES * LINE_HEIGHT;

function ChatComposer({
  onSend,
  onStartVoice,
  disabled = false,
}: ChatComposerProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const resizeTextarea = () => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = "auto";

    const nextHeight = Math.min(textarea.scrollHeight, MAX_HEIGHT);
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY =
      textarea.scrollHeight > MAX_HEIGHT ? "auto" : "hidden";
  };

  const submitMessage = async () => {
    const trimmedMessage = message.trim();

    if (!trimmedMessage || disabled) {
      return;
    }

    await onSend(trimmedMessage);
    setMessage("");

    requestAnimationFrame(() => {
      const textarea = textareaRef.current;

      if (!textarea) {
        return;
      }

      textarea.style.height = `${LINE_HEIGHT}px`;
      textarea.style.overflowY = "hidden";
    });
  };

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(event.target.value);
    resizeTextarea();
  };

  const handleKeyDown = (
    event: KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void submitMessage();
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void submitMessage();
  };

  return (
    <form className="chat-composer" onSubmit={handleSubmit}>
      <textarea
        ref={textareaRef}
        value={message}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Message WaNhasi..."
        aria-label="Message WaNhasi"
        rows={1}
        disabled={disabled}
      />

      <div className="composer-actions">
        <button
          type="button"
          className="composer-button"
          onClick={() => void onStartVoice()}
          disabled={disabled}
          aria-label="Start voice chat"
          title="Start voice chat"
        >
          <Mic size={19} />
        </button>

        <button
          type="submit"
          className="composer-button send"
          disabled={disabled || !message.trim()}
          aria-label="Send message"
          title="Send message"
        >
          <SendHorizontal size={19} />
        </button>
      </div>
    </form>
  );
}

export default ChatComposer;