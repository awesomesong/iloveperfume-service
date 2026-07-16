import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// 로컬 `prisma dev`의 HTTP 프록시(DATABASE_URL)는 서버 바이너리와 @prisma/client 7.8.0
// 사이 버전 불일치로 런타임 쿼리에 쓸 수 없어(P6000), DIRECT_DATABASE_URL(TCP)이 있으면
// 드라이버 어댑터로 우회한다. 배포 환경(Prisma Accelerate)은 DIRECT_DATABASE_URL 없이
// DATABASE_URL(accelerateUrl)만으로 그대로 동작한다.
const directUrl = process.env.DIRECT_DATABASE_URL;

if (!directUrl && !process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL 또는 DIRECT_DATABASE_URL이 설정되어 있지 않습니다.");
}

export const prisma =
  globalForPrisma.prisma ??
  (directUrl
    ? new PrismaClient({ adapter: new PrismaPg({ connectionString: directUrl }) })
    : new PrismaClient({ accelerateUrl: process.env.DATABASE_URL! }));

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
