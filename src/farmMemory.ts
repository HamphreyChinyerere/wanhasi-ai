import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import type { FarmProfile } from "./farmAssistant";

export type FarmMemory = FarmProfile & {
  lastConversationSummary?: string;
  updatedAt?: unknown;
};

function userDocument(userId: string) {
  return doc(db, "users", userId);
}

export async function loadFarmMemory(
  userId: string,
): Promise<FarmMemory | null> {
  const snapshot = await getDoc(userDocument(userId));

  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.data() as FarmMemory;
}

export async function saveFarmMemory(
  userId: string,
  profile: FarmProfile,
) {
  await setDoc(
    userDocument(userId),
    {
      ...profile,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function saveConversationSummary(
  userId: string,
  summary: string,
) {
  await setDoc(
    userDocument(userId),
    {
      lastConversationSummary: summary,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}