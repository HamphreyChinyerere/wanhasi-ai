import {
  addDoc,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";

export type ChatMessage = {
  role: "user" | "assistant";
  text: string;
  timestamp?: number;
};

export type ChatRecord = {
  id: string;
  title: string;
  pinned?: boolean;
  messages: ChatMessage[];
  createdAt?: unknown;
  updatedAt?: unknown;
};

const chatsCollection = (userId: string) =>
  collection(db, "users", userId, "chats");

const chatDocument = (userId: string, chatId: string) =>
  doc(db, "users", userId, "chats", chatId);

export async function createChat(
  userId: string,
  title: string,
): Promise<string> {
  const chat = await addDoc(chatsCollection(userId), {
    title: title.trim() || "New conversation",
    pinned: false,
    messages: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return chat.id;
}

export async function listRecentChats(
  userId: string,
): Promise<ChatRecord[]> {
  const snapshot = await getDocs(chatsCollection(userId));

  const chats = snapshot.docs.map((chat) => {
    const data = chat.data();

    return {
      id: chat.id,
      title:
        typeof data.title === "string"
          ? data.title
          : "New conversation",
      pinned: data.pinned === true,
      messages: Array.isArray(data.messages)
        ? (data.messages as ChatMessage[])
        : [],
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  });

  return chats.sort((first, second) => {
    if (first.pinned !== second.pinned) {
      return first.pinned ? -1 : 1;
    }

    return second.id.localeCompare(first.id);
  });
}

export async function saveChatMessage(
  userId: string,
  chatId: string,
  message: ChatMessage,
): Promise<void> {
  await updateDoc(chatDocument(userId, chatId), {
    messages: arrayUnion({
      role: message.role,
      text: message.text,
      timestamp: message.timestamp ?? Date.now(),
    }),
    updatedAt: serverTimestamp(),
  });
}

export async function renameChat(
  userId: string,
  chatId: string,
  title: string,
): Promise<void> {
  await updateDoc(chatDocument(userId, chatId), {
    title: title.trim(),
    updatedAt: serverTimestamp(),
  });
}

export async function toggleChatPin(
  userId: string,
  chatId: string,
  pinned: boolean,
): Promise<void> {
  await updateDoc(chatDocument(userId, chatId), {
    pinned,
    updatedAt: serverTimestamp(),
  });
}

export async function removeChat(
  userId: string,
  chatId: string,
): Promise<void> {
  await deleteDoc(chatDocument(userId, chatId));
}