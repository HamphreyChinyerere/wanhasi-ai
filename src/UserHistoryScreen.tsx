import type { ChatRecord } from "./chatStore";

type UserHistoryScreenProps = {
  email: string;
  uid: string;
  chats: ChatRecord[];
  onBack: () => void;
};

function UserHistoryScreen({
  email,
  uid,
  chats,
  onBack,
}: UserHistoryScreenProps) {
  return (
    <section className="history-screen">
      <span className="eyebrow">YOUR DATA</span>
      <h1>Conversation history</h1>

      <div className="account-data-card">
        <div>
          <span>Email</span>
          <strong>{email}</strong>
        </div>

        <div>
          <span>User ID</span>
          <code>{uid}</code>
        </div>
      </div>

      <div className="history-list">
        {chats.length === 0 ? (
          <div className="history-empty">
            No conversations have been saved yet.
          </div>
        ) : (
          chats.map((chat) => (
            <article className="history-chat" key={chat.id}>
              <h2>{chat.title}</h2>

              {(chat.messages ?? []).length === 0 ? (
                <p className="history-empty">
                  No messages in this chat.
                </p>
              ) : (
                chat.messages.map((message, index) => (
                  <div
                    className={`history-message ${message.role}`}
                    key={`${chat.id}-${index}`}
                  >
                    <strong>
                      {message.role === "user" ? "You" : "WaNhasi"}
                    </strong>
                    <p>{message.text}</p>
                  </div>
                ))
              )}
            </article>
          ))
        )}
      </div>

      <button
        type="button"
        className="history-back-button"
        onClick={onBack}
      >
        Back to chat
      </button>
    </section>
  );
}

export default UserHistoryScreen;