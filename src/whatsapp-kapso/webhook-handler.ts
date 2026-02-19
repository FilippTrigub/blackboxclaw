/**
 * WhatsApp-Kapso Webhook Handler
 * 
 * Receives messages forwarded from remote-code and routes them to OpenClaw agents
 */

import type { IncomingMessage, ServerResponse } from "node:http";
import { loadConfig } from "../config/config.js";
import { normalizeWhatsAppKapsoTarget } from "../channels/plugins/normalize/whatsapp-kapso.js";
import { registerWhatsAppKapsoHttpHandler } from "./http/registry.js";

interface KapsoWebhookMessage {
  message: {
    id: string;
    from: string;
    timestamp: string;
    type: string;
    text?: {
      body: string;
    };
    context?: {
      id: string;
      from: string;
    };
  };
  conversation?: any;
  phone_number_id?: string;
}

/**
 * Read JSON body from request
 */
async function readJsonBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

/**
 * Send JSON response
 */
function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

/**
 * Verify webhook secret
 */
function verifyWebhookSecret(req: IncomingMessage, expectedSecret: string): boolean {
  const receivedSecret = req.headers["x-webhook-secret"];
  if (!receivedSecret || typeof receivedSecret !== "string") {
    return false;
  }
  return receivedSecret === expectedSecret;
}

/**
 * Process incoming WhatsApp message
 */
async function processIncomingMessage(
  message: KapsoWebhookMessage,
  log: (msg: string) => void
): Promise<void> {
  const { message: messageData } = message;
  
  if (!messageData) {
    log("[WhatsApp-Kapso] No message data in webhook payload");
    return;
  }

  // Extract message details
  const from = normalizeWhatsAppKapsoTarget(messageData.from);
  const text = messageData.text?.body || "";
  const messageId = messageData.id;
  const timestamp = new Date(parseInt(messageData.timestamp) * 1000);

  if (!from) {
    log(`[WhatsApp-Kapso] Invalid phone number: ${messageData.from}`);
    return;
  }

  if (!text) {
    log(`[WhatsApp-Kapso] Non-text message type ${messageData.type}, skipping`);
    return;
  }

  log(`[WhatsApp-Kapso] Processing message from ${from}: ${text.substring(0, 50)}...`);

  // TODO: Route message to OpenClaw agent
  // This will be implemented by the gateway runtime
  // For now, just log the message
  log(`[WhatsApp-Kapso] Message received: ${messageId} from ${from}`);
}

/**
 * Create webhook handler
 */
export function createWhatsAppKapsoWebhookHandler(params: {
  log: (msg: string) => void;
  webhookSecret: string;
}) {
  const { log, webhookSecret } = params;

  const handler = async (req: IncomingMessage, res: ServerResponse) => {
    try {
      // Verify webhook secret
      if (!verifyWebhookSecret(req, webhookSecret)) {
        log("[WhatsApp-Kapso] Invalid webhook secret");
        sendJson(res, 401, { success: false, error: "Unauthorized" });
        return;
      }

      // Read request body
      const body = await readJsonBody(req);
      const event = req.headers["x-webhook-event"];

      log(`[WhatsApp-Kapso] Received event: ${event}`);

      // Process based on event type
      if (event === "whatsapp.message.received") {
        await processIncomingMessage(body, log);
      } else {
        log(`[WhatsApp-Kapso] Unhandled event: ${event}`);
      }

      // Always return success
      sendJson(res, 200, { success: true });
    } catch (error) {
      log(`[WhatsApp-Kapso] Error processing webhook: ${error}`);
      sendJson(res, 200, { success: false, error: String(error) });
    }
  };

  return handler;
}

/**
 * Register WhatsApp-Kapso webhook handler
 */
export function registerWhatsAppKapsoWebhook(params: {
  log: (msg: string) => void;
}): () => void {
  const { log } = params;

  // Load config to get webhook secret
  const cfg = loadConfig();
  const webhookSecret = process.env.OPENCLAW_WEBHOOK_SECRET || 
                        cfg.channels?.whatsappKapso?.webhookSecret || 
                        "";

  if (!webhookSecret) {
    log("[WhatsApp-Kapso] Warning: No webhook secret configured");
  }

  const handler = createWhatsAppKapsoWebhookHandler({ log, webhookSecret });

  return registerWhatsAppKapsoHttpHandler({
    path: "/api/whatsapp/kapso/inbound",
    handler,
    log,
  });
}
