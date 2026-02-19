import type { PluginRuntime } from "openclaw/plugin-sdk";

let runtime: PluginRuntime | null = null;

export function setWhatsAppKapsoRuntime(next: PluginRuntime) {
  runtime = next;
}

export function getWhatsAppKapsoRuntime(): PluginRuntime {
  if (!runtime) {
    throw new Error("WhatsApp-Kapso runtime not initialized");
  }
  return runtime;
}
