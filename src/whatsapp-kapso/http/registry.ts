import type { IncomingMessage, ServerResponse } from "node:http";

export type WhatsAppKapsoHttpRequestHandler = (
  req: IncomingMessage,
  res: ServerResponse,
) => Promise<void> | void;

type RegisterWhatsAppKapsoHttpHandlerArgs = {
  path?: string | null;
  handler: WhatsAppKapsoHttpRequestHandler;
  log?: (message: string) => void;
};

const whatsappKapsoHttpRoutes = new Map<string, WhatsAppKapsoHttpRequestHandler>();

export function normalizeWhatsAppKapsoWebhookPath(path?: string | null): string {
  const trimmed = path?.trim();
  if (!trimmed) {
    return "/api/whatsapp/kapso/inbound";
  }
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

export function registerWhatsAppKapsoHttpHandler(
  params: RegisterWhatsAppKapsoHttpHandlerArgs
): () => void {
  const normalizedPath = normalizeWhatsAppKapsoWebhookPath(params.path);
  if (whatsappKapsoHttpRoutes.has(normalizedPath)) {
    params.log?.(`whatsapp-kapso: webhook path ${normalizedPath} already registered`);
    return () => {};
  }
  whatsappKapsoHttpRoutes.set(normalizedPath, params.handler);
  return () => {
    whatsappKapsoHttpRoutes.delete(normalizedPath);
  };
}

export async function handleWhatsAppKapsoHttpRequest(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<boolean> {
  const url = new URL(req.url ?? "/", "http://localhost");
  const handler = whatsappKapsoHttpRoutes.get(url.pathname);
  if (!handler) {
    return false;
  }
  await handler(req, res);
  return true;
}
