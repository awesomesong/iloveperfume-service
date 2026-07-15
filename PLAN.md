# I Love Perfume 리뉴얼 — MVP 아키텍처 계획

## Context

향수 커뮤니티 앱을 AI 챗봇이 향수를 추천하고 구매까지 유도하는 수익형 서비스로 리뉴얼한다. 기존 리포는 리팩토링이 어렵고 문서화가 부족해서, 데이터 마이그레이션 없이 완전히 새 저장소에서 시작한다.

검증할 가설(이게 MVP의 전부): "AI 챗봇이 향수를 추천하면 사용자가 구매 링크를 클릭하는가."

---

## 1. 확정 사항

| 항목 | 결정 | 핵심 이유(한 줄) |
|---|---|---|
| 아키텍처 특성 우선순위 | 민첩성 1순위, 수분 내 장애 탐지·자동 대응 2순위 (ADR-0000) | 상시 on-call 없이, 애매하면 더 민첩한 쪽으로 |
| 저장소 구조 | apps/web(Vercel) 단일 앱으로 시작, pnpm workspace만, packages 미리 안 쪼갬 | MVP 핵심 흐름(스트리밍 응답)은 SSE로 충분 — Next.js API route가 처리. WebSocket 지속연결이 필요한 기능(여러 사용자 간 실시간 상태 공유 등)이 실제로 생기면 그때 apps/realtime(Fly.io)을 새 ADR로 추가한다 |
| 프레임워크 | Next.js 16 | 파셜 프리렌더링이 "정적 상품정보+AI 실시간 추천" 조합에 적합. Medusa.js(카트·결제 강점, 이 프로젝트엔 불필요)·Astro(정적 콘텐츠용, 실시간 채팅엔 부적합) 기각 |
| DB/ORM | Prisma 7 | Rust→TS/WASM 재작성으로 서버리스 콜드스타트 약점 해소, Drizzle 전환 이득 없음 |
| 인증 | Better Auth | NextAuth는 2025.09부로 보안패치만 하는 유지보수 모드 |
| AI 스트리밍 | Vercel AI SDK(streamText+tool()) | 수동 SSE 파싱 대체, tool calling·관측성 내장 |
| UI 컴포넌트 | HeroUI | shadcn/ui 기반인 Radix UI가 유지보수 중단 상태 — React Aria 기반인 HeroUI가 더 안전 |
| 디자인시스템(토큰·룩앤필) | 완전 신규 설계 | 기존 문서는 기술적으로 꼼꼼하지만(WCAG 검증 완료) 실제 화면 품질은 확인 안 됨 → 화면 재사용 없이 새로 설계 |
| 인프라 | Upstash Redis(레이트리밋) / Sentry(에러) / Langfuse(LLM 로그) / Uptime 체크 | 기존 in-memory 레이트리밋은 서버리스 다중 인스턴스에서 안 먹힘 |
| 협업 프로세스 | 칸반(동시 진행 1개) + ADR(되돌리기 비싼 결정만 기록) | 혼자 개발이지만 문서화는 비타협 |

---

## 2. 도메인 모델 — 4개 경계

```
Catalog ← Recommendation ← Conversation
              ↑
      Conversion/Affiliate
```

- Conversation: 대화·메시지. Catalog를 읽고 Recommendation을 씀. Conversion은 절대 모름
- Catalog: 향수·제휴링크. 아무것도 의존 안 함(최하위). searchFragrances(...)가 AI 도구가 호출하는 유일한 진입점
- Recommendation: AI가 이 대화에서 왜 이 향수를 추천했는지 기록. fragranceSnapshotJson으로 카탈로그가 바뀌어도 사용자가 본 화면 그대로 재현 — 제휴 고지(disclosure)가 여기 필수 필드
- Conversion/Affiliate: 클릭 이벤트 로그. 가장 얇게 유지(민첩성 원칙)

규칙: 다른 컨텍스트 데이터는 그 컨텍스트의 서비스 모듈을 통해서만 읽는다(prisma.fragrance 직접 호출 금지, catalogService.searchFragrances()만). 기존 리포의 실제 버그(챗봇이 DB를 직접 찌름)를 막는 규칙이다.

---

## 3. 핵심 흐름 & API (MVP는 이거 하나만)

대화 시작 → 메시지 전송(AI 스트리밍+도구호출) → 추천 카드(고지 배지 포함) → 클릭 기록

| API | 설명 |
|---|---|
| POST /api/conversations | 대화 생성 |
| POST /api/conversations/:id/messages | SSE 스트리밍 응답. 내부에서 searchFragrances() 도구호출(별도 REST 아님), onFinish에서 Recommendation 생성 |
| POST /api/recommendations/:id/click | 클릭 기록 — MVP 성공 지표의 원천 데이터, sendBeacon으로 빠르게 |
| GET /api/conversations/:id | 히스토리 재로드 |

응답에 disclosure 필드는 제휴링크가 있는 모든 추천에 타입 레벨로 필수.

---

## 4. 테스트 전략

민첩성 우선 원칙에 맞춰 무거운 테스트 스위트를 먼저 만들지 않는다. MVP 단계에서는 위험이 큰 지점만 방어한다.

| 계층 | 범위 | 방식 |
|---|---|---|
| 타입 방어 | API 경계 전체 | TypeScript strict + Zod 스키마 검증(요청/응답) |
| 단위 테스트(최소) | catalogService.searchFragrances 필터 로직, disclosure 필수 여부 판정 로직 | Vitest — 이 두 개만. 나머지는 아직 안 씀 |
| 환각 방지 가드레일 | AI가 추천한 fragranceId가 실제 도구 호출 결과 안에 있는지 | 런타임 assert — 벗어나면 추천 자체를 버리고 "결과 없음"으로 처리. 이게 이 프로젝트에서 제일 중요한 검증 |
| E2E | 핵심 흐름 1개(대화→추천→클릭) | 자동화 없이 수동 검증 — 사람이 브라우저로 한 번 실행. Playwright 등은 흐름이 2개 이상으로 늘어날 때 도입 |
| CI 게이트 | lint + typecheck + 위 단위테스트 | PR마다 실행 |

**테스트 커버리지 확장 규칙**: 서비스 모듈(catalogService 같은)이 하나 늘어날 때마다 그 모듈에 최소 1개 단위테스트를 같이 추가한다. 코드가 늘어나는 만큼 테스트도 저절로 따라가게 하는 게 목적 — 나중에 몰아서 채우지 않는다.

나중에(가설 검증 후) 추가할 것: LLM 응답 품질 평가(golden dataset), Langfuse 기반 회귀 추적, Playwright E2E 확장(핵심 흐름 2개 이상 시) — 지금은 범위 밖.

---

## 5. 작업 방식

칸반, 동시 진행 1개 제한. 아래 체크리스트를 순서대로, 하나 끝나면 검증하고 다음으로.

**협업 플로우: GitHub Flow.** 체크리스트 항목마다 이슈 생성 → 그 이슈 번호로 브랜치(`n-slug`, 예: `2-design-system`) → 작업 → PR 생성(이슈 연결, `Closes #n`) → 리뷰 확인 후 main에 머지 → 이슈 자동 종료. main은 항상 배포 가능한 상태를 유지하고 직접 커밋하지 않는다(리포 골격처럼 이 규칙 자체를 만들기 전 커밋된 것은 예외).

1. pnpm workspace 골격(apps/web) + CLAUDE.md + ADR-0000 파일화
2. 디자인시스템 신규 설계 — 색상·타이포·스페이싱 토큰부터(기존 화면 참고 안 함)
3. Prisma 스키마(4개 컨텍스트) → migrate dev
4. Better Auth(Google/Kakao/이메일)
5. catalogService(searchFragrances 등) + 단위테스트
6. AI SDK tool 정의 + 환각 방지 가드레일
7. POST /messages 라우트(streamText+onFinish)
8. POST /click 라우트
9. 채팅 UI + 추천 카드 + 고지 배지
10. Redis 레이트리밋 + Sentry + Uptime 체크 + CI 게이트

검증: 1~4 후 pnpm dev 기동 확인 → 7~8 후 실제 대화 1턴으로 DB row 생성 확인 → 9 후 브라우저 E2E 1회 → 6의 가드레일은 빈 검색 결과 케이스로 1회 수동 재현.

---

## 6. 남은 오픈 아이템 (실행 전 확정 필요)

1. 저장소 위치: 로컬 폴더 먼저(예: iloveperfume-service) → GitHub은 그 다음 (추천)
2. MVP 성공 지표: 제휴링크 클릭 전환율을 1순위로 추천 — 도메인 설계가 이미 이걸 중심으로 돼 있어 추가 계측 비용 없음

---

## 7. 이 계획만으로는 "오래 쓰는 서비스"가 안 된다 — 검증 후 로드맵

이 MVP는 "AI 추천→클릭" 메커니즘이 실제로 작동하는지만 확인하는 범위다. 재방문·장기 사용을 만드는 요소는 일부러 다음 단계로 미뤘다 — 검증 안 된 메커니즘 위에 재방문 기능부터 쌓으면 순서가 거꾸로다.

가설이 검증되면(클릭 전환율이 의미 있는 수준) 다음을 추가한다. Amazon Rufus의 "쇼핑 메모리"(구매·검색 이력 기반 장기 개인화)와 Sephora Beauty Insider(퀴즈·구매이력으로 취향 프로필 축적) 패턴을 참고한다.

- ScentProfile(취향 프로필): 온보딩 퀴즈 + 대화가 쌓일수록 추천이 좋아짐 — 지금 도메인 모델에 없는 "장기 기억" 계층
- 찜하기/저장: 추천받은 향수를 나중에 다시 보기
- 재입장 유도: "새 향수 입고", "지난번 취향과 비슷한 신제품" 같은 알림
- 구매 이력 연동: 클릭을 넘어 실제 구매까지 추적(제휴사 전환 API 연동 가능하면)
- 커뮤니티 요소 재도입: 기존 앱에 있던 리뷰·갤러리를 검증된 AI 추천과 결합

이 항목들은 지금 설계하지 않는다 — MVP 검증 후 별도 계획으로 다룬다. 문서에 빠진 게 아니라 순서상 다음이라는 뜻이다.

---

## 8. 스케일 전환점 (지금 만들지 않음 — 트리거 조건만 기록)

지금 당장 구현하지 않지만, 사용자가 늘었을 때 가장 먼저 터질 지점과 그 신호가 왔을 때 취할 조치를 미리 적어둔다. 신호가 안 오면 손대지 않는다.

| 지점 | 터지는 신호 | 그때 할 일 |
|---|---|---|
| DB 커넥션 | 서버리스 동시 실행이 늘면서 "too many connections" 에러 발생 | Prisma Accelerate 또는 PgBouncer 연결 풀링 도입 |
| LLM 비용 | 일일 토큰 비용이 매출(클릭 전환) 대비 감당 안 되는 수준 | 대화당/사용자당 요청 한도, 모델 다운그레이드 정책 추가 |
| 실시간 다중 사용자 동기화 | 여러 사용자 간 상태를 실시간 공유해야 하는 기능이 실제로 필요해짐 | 그때 apps/realtime(Fly.io) 추가, 새 ADR 작성 |
