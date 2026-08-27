import {
  addDoc,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";

export type ChatMessage = {
  role: "user" | "assistant";
  text: string;
  createdAt?: unknown;
};

export type ChatRecord = {
  id: string;
  title: string;
  pinned?: boolean;
  messages: ChatMessage[];
  createdAt?: unknown;
  updatedAt?: unknown;
};

function chatsCollection(userId: string) {
  return collection(db, "users", userId, "chats");
}

function chatDocument(userId: string, chatId: string) {
  return doc(db, "users", userId, "chats", chatId);
}

export async function createChat(
  userId: string,
  title: string,
) {
  const reference = await addDoc(chatsCollection(userId), {
    title,
    pinned: false,
    messages: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return reference.id;
}

export async function listRecentChats(
  userId: string,
): Promise<ChatRecord[]> {
  const chatsQuery = query(
    chatsCollection(userId),
    orderBy("updatedAt", "desc"),
    limit(50),
  );

  const snapshot = await getDocs(chatsQuery);

  const chats = snapshot.docs.map((chat) => ({
    id: chat.id,
    ...(chat.data() as Omit<ChatRecord, "id">),
  }));

  return chats.sort((first, second) => {
    if (first.pinned && !second.pinned) {
      return -1;
    }

    if (!first.pinned && second.pinned) {
      return 1;
    }

    return 0;
  });
}

export async function saveChatMessage(
  userId: string,
  chatId: string,
  message: ChatMessage,
) {
  await updateDoc(chatDocument(userId, chatId), {
    messages: arrayUnion({
      role: message.role,
      text: message.text,
      createdAt: new Date().toISOString(),
    }),
    updatedAt: serverTimestamp(),
  });
}

export async function renameChat(
  userId: string,
  chatId: string,
  title: string,
) {
  await updateDoc(chatDocument(userId, chatId), {
    title: title.trim() || "Untitled conversation",
    updatedAt: serverTimestamp(),
  });
}

export async function toggleChatPin(
  userId: string,
  chatId: string,
  pinned: boolean,
) {
  await updateDoc(chatDocument(userId, chatId), {
    pinned,
    updatedAt: serverTimestamp(),
  });
}

export async function removeChat(
  userId: string,
  chatId: string,
) {
  await deleteDoc(chatDocument(userId, chatId));
}