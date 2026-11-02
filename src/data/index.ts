import { demoBackend } from "./demo";
import { createSupabaseBackend, supabaseConfigured } from "./supabase";
import type { Backend } from "./types";

export const backend: Backend = supabaseConfigured ? createSupabaseBackend() : demoBackend;
