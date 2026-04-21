import "server-only";

import Anthropic from "@anthropic-ai/sdk";

import { env } from "~/env";

let client: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  if (!client) {
    client = new Anthropic({
      apiKey: env.ANTHROPIC_API_KEY,
      timeout: 30_000,
    });
  }
  return client;
}

export const TRANSLATION_MODEL = "claude-sonnet-4-6";
