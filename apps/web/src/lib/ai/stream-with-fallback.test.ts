import { describe, expect, it } from "vitest";
import { hasCommittedContent } from "./stream-with-fallback";

async function* streamOf(...types: string[]) {
  for (const type of types) {
    yield { type };
  }
}

describe("hasCommittedContent", () => {
  it("text-delta 전에 error가 오면 커밋 전 실패로 판단한다", async () => {
    await expect(hasCommittedContent(streamOf("start", "error"))).resolves.toBe(false);
  });

  it("abort도 커밋 전 실패로 판단한다", async () => {
    await expect(hasCommittedContent(streamOf("start", "start-step", "abort"))).resolves.toBe(
      false,
    );
  });

  it("구조적 파트(start, start-step)는 건너뛰고 콘텐츠가 나오면 커밋으로 판단한다", async () => {
    await expect(
      hasCommittedContent(streamOf("start", "start-step", "text-delta", "error")),
    ).resolves.toBe(true);
  });

  it("도구 호출(tool-call)도 콘텐츠로 취급해 커밋으로 판단한다", async () => {
    await expect(hasCommittedContent(streamOf("start", "tool-call"))).resolves.toBe(true);
  });

  it("콘텐츠 없이 정상 종료되면 커밋으로 판단한다(빈 응답은 실패가 아님)", async () => {
    await expect(hasCommittedContent(streamOf("start", "start-step", "finish"))).resolves.toBe(
      true,
    );
  });
});
