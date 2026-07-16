import { tool } from "ai";
import { z } from "zod";

export const recommendFragranceTool = tool({
  description:
    "searchFragrances 도구가 방금 반환한 향수 중 하나를 최종 추천으로 확정한다. " +
    "그 결과 안에 있는 fragranceId만 사용할 수 있다 — 결과에 없는 id를 지어내면 안 된다. " +
    "마음에 드는 향수가 없으면 이 도구를 호출하지 말고 그냥 텍스트로 답한다.",
  inputSchema: z.object({
    fragranceId: z.string(),
    reasonText: z.string(),
  }),
  execute: async (input) => input,
});
