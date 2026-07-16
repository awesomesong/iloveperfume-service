import { tool } from "ai";
import { z } from "zod";
import { catalogService } from "@/services/catalog/catalog-service";

export const searchFragrancesTool = tool({
  description:
    "사용자의 취향(성별, 계열, 무드, 상황)에 맞는 향수를 카탈로그에서 검색한다. " +
    "향수를 추천할 때는 반드시 이 도구를 먼저 호출해서 얻은 결과 중에서만 fragranceId를 골라야 한다.",
  inputSchema: z.object({
    gender: z.enum(["MALE", "FEMALE", "UNISEX"]).optional(),
    family: z.string().optional(),
    moodTags: z.array(z.string()).optional(),
    occasionTags: z.array(z.string()).optional(),
    limit: z.number().int().positive().max(20).optional(),
  }),
  execute: async (input) => {
    const fragrances = await catalogService.searchFragrances(input);
    return { fragrances };
  },
});
