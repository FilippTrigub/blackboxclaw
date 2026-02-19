/**
 * WhatsApp-Kapso Channel Plugin
 * 
 * Simplified WhatsApp channel that receives messages forwarded from remote-code
 * via Kapso.ai webhook. No pairing/QR code required.
 */

import {
  type ChannelPlugin,
  type OpenClawConfig,
  DEFAULT_ACCOUNT_ID,
} from "openclaw/plugin-sdk";
import {
  normalizeWhatsAppKapsoMessagingTarget,
  looksLikeWhatsAppKapsoTargetId,
} from "../../../src/channels/plugins/normalize/whatsapp-kapso.js";

// Simplified account type for WhatsApp-Kapso
export interface WhatsAppKapsoAccount {
  accountId: string;
  name: string | null;
  enabled: boolean;
  config: {
    enabled?: boolean;
    remoteCodeUrl?: string;
    webhookSecret?: string;
    dmPolicy?: "pairing" | "allowlist" | "open" | "disabled";
    allowFrom?: (string | number)[];
  };
  remoteCodeUrl: string;
  webhookSecret: string;
}

/**
 * Resolve WhatsApp-Kapso account configuration
 */
function resolveWhatsAppKapsoAccount(cfg: OpenClawConfig, accountId?: string): WhatsAppKapsoAccount {
  const resolvedAccountId = accountId ?? DEFAULT_ACCOUNT_ID;
  const channelConfig = cfg.channels?.whatsappKapso;
  
  // Get remote-code URL and webhook secret from environment or config
  const remoteCodeUrl = process.env.REMOTE_CODE_URL || channelConfig?.remoteCodeUrl || "";
  const webhookSecret = process.env.OPENCLAW_WEBHOOK_SECRET || channelConfig?.webhookSecret || "";

  return {
    accountId: resolvedAccountId,
    name: channelConfig?.name || null,
    enabled: channelConfig?.enabled ?? true,
    config: {
      enabled: channelConfig?.enabled,
      remoteCodeUrl: channelConfig?.remoteCodeUrl,
      webhookSecret: channelConfig?.webhookSecret,
      dmPolicy: channelConfig?.dmPolicy,
      allowFrom: channelConfig?.allowFrom,
    },
    remoteCodeUrl,
    webhookSecret,
  };
}

/**
 * Send message via remote-code (which forwards to Kapso API)
 */
async function sendWhatsAppKapsoMessage(
  to: string,
  text: string,
  account: WhatsAppKapsoAccount
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    if (!account.remoteCodeUrl) {
      return { success: false, error: "Remote-code URL not configured" };
    }

    if (!account.webhookSecret) {
      return { success: false, error: "Webhook secret not configured" };
    }

    const response = await fetch(`${account.remoteCodeUrl}/api/whatsapp/kapso/outbound`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Secret": account.webhookSecret,
      },
      body: JSON.stringify({
        to,
        message: text,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `Remote-code error: ${response.status} ${errorText}` };
    }

    const result = await response.json();
    return {
      success: true,
      messageId: result.messageId || result.id,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * WhatsApp-Kapso Channel Plugin
 */
export const whatsappKapsoPlugin: ChannelPlugin<WhatsAppKapsoAccount, null> = {
  id: "whatsapp-kapso",
  meta: {
    name: "WhatsApp (Kapso)",
    description: "WhatsApp messaging via Kapso.ai (no pairing required)",
    quickstartAllowFrom: true,
  },
  capabilities: {
    chatTypes: ["direct"],
    reactions: false,
    threads: false,
    media: false,
    polls: false,
    nativeCommands: false,
    blockStreaming: false,
  },
  reload: { configPrefixes: ["channels.whatsappKapso"] },
  config: {
    listAccountIds: () => [DEFAULT_ACCOUNT_ID],
    resolveAccount: (cfg, accountId) => resolveWhatsAppKapsoAccount(cfg, accountId),
    defaultAccountId: () => DEFAULT_ACCOUNT_ID,
    setAccountEnabled: ({ cfg, enabled }) => {
      const next = { ...cfg };
      if (!next.channels) {
        next.channels = {};
      }
      next.channels.whatsappKapso = {
        ...next.channels.whatsappKapso,
        enabled,
      };
      return next;
    },
    deleteAccount: ({ cfg }) => {
      const next = { ...cfg };
      if (next.channels?.whatsappKapso) {
        delete next.channels.whatsappKapso;
      }
      return next;
    },
    isConfigured: (account) => Boolean(account.remoteCodeUrl && account.webhookSecret),
    describeAccount: (account) => ({
      accountId: account.accountId,
      name: account.name,
      enabled: account.enabled,
      configured: Boolean(account.remoteCodeUrl && account.webhookSecret),
    }),
    resolveAllowFrom: ({ cfg }) => {
      const account = resolveWhatsAppKapsoAccount(cfg);
      return (account.config.allowFrom ?? []).map((entry) => String(entry));
    },
    formatAllowFrom: ({ allowFrom }) =>
      allowFrom
        .map((entry) => String(entry).trim())
        .filter(Boolean)
        .map((entry) => entry.replace(/^whatsapp:/i, "")),
  },
  security: {
    resolveDmPolicy: ({ cfg, account }) => ({
      policy: account.config.dmPolicy ?? "open",
      allowFrom: account.config.allowFrom ?? [],
      policyPath: "channels.whatsappKapso.dmPolicy",
      allowFromPath: "channels.whatsappKapso.",
      approveHint: "openclaw pairing approve whatsapp-kapso <PHONE>",
      normalizeEntry: (raw) => raw.replace(/^whatsapp:/i, ""),
    }),
    collectWarnings: () => [],
  },
  messaging: {
    normalizeTarget: normalizeWhatsAppKapsoMessagingTarget,
    targetResolver: {
      looksLikeId: looksLikeWhatsAppKapsoTargetId,
      hint: "<phone number>",
    },
  },
  outbound: {
    deliveryMode: "direct",
    chunker: (text, limit) => {
      // Simple text chunking (WhatsApp limit is ~4096 chars)
      const chunks: string[] = [];
      let remaining = text;
      while (remaining.length > 0) {
        chunks.push(remaining.slice(0, limit));
        remaining = remaining.slice(limit);
      }
      return chunks;
    },
    chunkerMode: "text",
    textChunkLimit: 4000,
    sendText: async ({ to, text, accountId, cfg }) => {
      const account = resolveWhatsAppKapsoAccount(cfg, accountId);
      const result = await sendWhatsAppKapsoMessage(to, text, account);
      return {
        channel: "whatsapp-kapso",
        success: result.success,
        messageId: result.messageId,
        error: result.error,
      };
    },
  },
  status: {
    defaultRuntime: {
      accountId: DEFAULT_ACCOUNT_ID,
      running: true, // Always "running" since it's webhook-based
      lastStartAt: null,
      lastStopAt: null,
      lastError: null,
    },
    collectStatusIssues: () => [],
    buildChannelSummary: ({ snapshot }) => ({
      configured: snapshot.configured ?? false,
      running: true, // Webhook-based, always running
      lastError: snapshot.lastError ?? null,
    }),
    buildAccountSnapshot: ({ account, runtime }) => ({
      accountId: account.accountId,
      name: account.name,
      enabled: account.enabled,
      configured: Boolean(account.apiKey && account.webhookSecret),
      running: true,
      lastError: runtime?.lastError ?? null,
    }),
  },
  gateway: {
    // No active gateway needed - webhook-based
    startAccount: async () => {
      // No-op: webhook-based channel doesn't need active connection
      return Promise.resolve();
    },
    logoutAccount: async ({ cfg }) => {
      // Clear configuration
      const next = { ...cfg };
      if (next.channels?.whatsappKapso) {
        delete next.channels.whatsappKapso;
      }
      return { cleared: true, envToken: false, loggedOut: true };
    },
  },
};
