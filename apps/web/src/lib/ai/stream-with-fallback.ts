const CONTENT_PART_TYPES = new Set([
  "text-delta",
  "reasoning-delta",
  "tool-call",
  "tool-input-start",
  "file",
  "source",
  "custom",
]);

const FAILURE_PART_TYPES = new Set(["error", "abort"]);

// 'start'/'start-step' 같은 구조적 파트는 사용자에게 보이는 콘텐츠가 아니므로 건너뛰고,
// 실제 콘텐츠가 나오기 전에 실패 파트를 만나면 아직 클라이언트에 아무것도 보내지 않은
// 상태라고 판단해 다음 프로바이더로 넘어갈 수 있다(ADR-0001, 첫 토큰 전에만 폴백).
export async function hasCommittedContent(
  fullStream: AsyncIterable<{ type: string }>,
): Promise<boolean> {
  for await (const part of fullStream) {
    if (FAILURE_PART_TYPES.has(part.type)) return false;
    if (CONTENT_PART_TYPES.has(part.type)) return true;
  }

  return true; // 콘텐츠 없이 정상 종료(빈 응답)는 실패가 아니라 폴백 대상이 아니다
}
