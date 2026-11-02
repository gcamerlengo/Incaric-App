import { demoBackend } from "./demo";
import { createFirebaseBackend, firebaseConfigured } from "./firebase";
import type { Backend } from "./types";

export const backend: Backend = firebaseConfigured ? createFirebaseBackend() : demoBackend;
