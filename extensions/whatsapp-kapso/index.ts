import type { PluginRuntime } from "openclaw/plugin-sdk";
import { whatsappKapsoPlugin } from "./src/channel.js";
import { setWhatsAppKapsoRuntime } from "./src/runtime.js";

export default function (runtime: PluginRuntime) {
  setWhatsAppKapsoRuntime(runtime);
  runtime.registerChannelPlugin(whatsappKapsoPlugin);
}
