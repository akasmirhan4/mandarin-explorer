import "server-only";

import Anthropic from "@anthropic-ai/sdk";

import { env } from "~/env";

let client: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  if (!client) {
    client = new Anthropic({
      apiKey: env.ANTHROPIC_API_KEY,
      baseURL: env.ANTHROPIC_BASE_URL,
      defaultHeaders: env.ANTHROPIC_GATEWAY_TOKEN
        ? { "cf-aig-authorization": `Bearer ${env.ANTHROPIC_GATEWAY_TOKEN}` }
        : undefined,
      timeout: 120_000,
    });
  }
  return client;
}

export const TRANSLATION_MODEL = "claude-sonnet-4-6";
