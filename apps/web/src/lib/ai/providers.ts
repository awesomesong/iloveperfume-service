import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import type { LanguageModel } from "ai";

export const PROVIDER_IDS = ["anthropic", "openai", "google"] as const;
export type ProviderId = (typeof PROVIDER_IDS)[number];

// 실제 서비스 배포 전에 각 프로바이더 현재 모델 카탈로그와 대조해서 확인할 것(ADR-0001) —
// 환경변수로 덮어쓸 수 있게 해서 모델이 바뀌어도 코드 수정 없이 대응 가능하게 함.
const MODEL_ID: Record<ProviderId, string> = {
  anthropic: process.env.ANTHROPIC_MODEL_ID ?? "claude-sonnet-5",
  openai: process.env.OPENAI_MODEL_ID ?? "gpt-5.1",
  google: process.env.GOOGLE_MODEL_ID ?? "gemini-3-pro",
};

export function modelIdFor(provider: ProviderId): string {
  return MODEL_ID[provider];
}

export function resolveModel(provider: ProviderId): LanguageModel {
  switch (provider) {
    case "anthropic":
      return anthropic(MODEL_ID.anthropic);
    case "openai":
      return openai(MODEL_ID.openai);
    case "google":
      return google(MODEL_ID.google);
  }
}

export function pickRandomProvider(): ProviderId {
  return PROVIDER_IDS[Math.floor(Math.random() * PROVIDER_IDS.length)];
}

// 배정된 프로바이더를 1순위로, 나머지를 폴백 후보로 — 같은 대화 안에서는 항상 같은 순서라
// 폴백이 발생해도 재현 가능하다(ADR-0001).
export function buildFallbackChain(assigned: ProviderId): ProviderId[] {
  return [assigned, ...PROVIDER_IDS.filter((id) => id !== assigned)];
}
