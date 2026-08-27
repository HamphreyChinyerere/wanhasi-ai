import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { auth } from "./firebase";

export function registerUser(email: string, password: string) {
  return createUserWithEmailAndPassword(auth, email, password);
}

export function loginUser(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}

export function logoutUser() {
  return signOut(auth);
}

export function watchAuthState(
  callback: (user: User | null) => void,
) {
  return onAuthStateChanged(auth, callback);
}