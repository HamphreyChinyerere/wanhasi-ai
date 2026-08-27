import {
  addDoc,
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
  messages: ChatMessage[];
  createdAt?: unknown;
  updatedAt?: unknown;
};

function chatsCollection(userId: string) {
  return collection(db, "users", userId, "chats");
}

export async function createChat(
  userId: string,
  title = "New conversation",
) {
  const reference = await addDoc(chatsCollection(userId), {
    title,
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

  return snapshot.docs.map((chat) => ({
    id: chat.id,
    ...(chat.data() as Omit<ChatRecord, "id">),
  }));
}

export async function saveChatMessage(
  userId: string,
  chatId: string,
  message: ChatMessage,
) {
  const chatReference = doc(db, "users", userId, "chats", chatId);

  const snapshot = await getDocs(
    query(chatsCollection(userId), limit(50)),
  );

  const existingChat = snapshot.docs.find(
    (item) => item.id === chatId,
  );

  const existingMessages =
    (existingChat?.data().messages as ChatMessage[] | undefined) ?? [];

  await updateDoc(chatReference, {
    messages: [...existingMessages, message],
    updatedAt: serverTimestamp(),
  });
}

export async function renameChat(
  userId: string,
  chatId: string,
  title: string,
) {
  await updateDoc(doc(db, "users", userId, "chats", chatId), {
    title,
    updatedAt: serverTimestamp(),
  });
}

export async function removeChat(userId: string, chatId: string) {
  await deleteDoc(doc(db, "users", userId, "chats", chatId));
}