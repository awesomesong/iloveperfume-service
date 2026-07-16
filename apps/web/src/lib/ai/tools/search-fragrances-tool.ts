import { tool } from "ai";
import { z } from "zod";
import { catalogService } from "@/services/catalog/catalog-service";

export const searchFragrancesTool = tool({
  description:
    "사용자의 취향(성별, 계열, 무드, 상황)에 맞는 향수를 카탈로그에서 검색한다. " +
    "향수를 추천할 때는 반드시 이 도구를 먼저 호출해서 얻은 결과 중에서만 fragranceId를 골라야 한다.",
  inputSchema: z.object({
    gender: z.enum(["MALE", "FEMALE", "UNISEX"]).optional(),
    family: z
      .string()
      .optional()
      .describe(
        '카탈로그에 저장된 한국어 계열명과 정확히 일치해야 한다(예: "우디", "시트러스", "플로럴"). 영어로 번역하지 말 것.',
      ),
    moodTags: z
      .array(z.string())
      .optional()
      .describe('카탈로그의 한국어 무드 태그와 일치해야 한다(예: "은은한", "포근한", "상쾌한").'),
    occasionTags: z
      .array(z.string())
      .optional()
      .describe('카탈로그의 한국어 상황 태그와 일치해야 한다(예: "데이트", "오피스", "여름").'),
    limit: z.number().int().positive().max(20).optional(),
  }),
  execute: async (input) => {
    const fragrances = await catalogService.searchFragrances(input);
    // Prisma가 반환하는 createdAt/updatedAt은 Date 객체라 그대로 반환하면 이 결과가
    // 다음 스텝에서 모델에게 다시 전달될 때(JSON 전용 스키마 검증) 실패한다 — JSON 라운드트립으로
    // 직렬화 가능한 값으로만 정리한다.
    return { fragrances: JSON.parse(JSON.stringify(fragrances)) as typeof fragrances };
  },
});
