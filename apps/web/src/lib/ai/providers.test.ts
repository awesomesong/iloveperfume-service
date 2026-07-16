import { describe, expect, it } from "vitest";
import { buildFallbackChain, PROVIDER_IDS } from "./providers";

describe("buildFallbackChain", () => {
  it("배정된 프로바이더를 1순위로 두고 나머지를 뒤에 붙인다", () => {
    expect(buildFallbackChain("openai")).toEqual(["openai", "anthropic", "google"]);
  });

  it("모든 프로바이더를 정확히 한 번씩만 포함한다", () => {
    for (const assigned of PROVIDER_IDS) {
      const chain = buildFallbackChain(assigned);
      expect(chain).toHaveLength(PROVIDER_IDS.length);
      expect(new Set(chain)).toEqual(new Set(PROVIDER_IDS));
    }
  });
});
