# ModuDrive-WEB 프로젝트 세팅 결과

## 1. 기술 스택

| 영역 | 선택 | 비고 |
|---|---|---|
| 빌드 도구 | Vite 5 | Node 18.19.1 환경 호환을 위해 5.x 고정 (Vite 6/7은 Node 20+ 요구) |
| 프레임워크 | React 18 + TypeScript | strict 모드 |
| 라우팅 | React Router 6 (`createBrowserRouter`) | v7은 Node 20+ 요구라 6 고정 |
| 서버 상태 | TanStack Query 5 | devtools 포함 |
| 클라이언트 상태 | Zustand | 아직 사용처 없음 — 인증 등 실제 전역 상태가 필요할 때 추가 |
| 폼 | React Hook Form + Zod (`@hookform/resolvers`) | |
| HTTP 클라이언트 | Axios | `ApiResponse<T>` 언래핑 인터셉터 적용 |
| 스타일 | Tailwind CSS 3 | v4는 Node 20+ 요구라 3 고정 |
| 테스트 | Vitest 2 + Testing Library + jsdom + MSW | Vitest 4/jsdom 최신판은 Node 20+ 전용 의존성(rolldown, `@exodus/bytes`) 때문에 실행 자체가 깨져서 다운그레이드 |
| 포맷터/린트 | ESLint 9(flat config) + Prettier | |

**Node 버전 관련 참고**: 현재 환경 Node는 18.19.1인데 최신 Vite/Vitest/jsdom/React Router 메이저 버전은 대부분 Node 20+를 요구합니다. 위 표의 다운그레이드는 전부 그 때문이며, `npm audit`에 뜨는 esbuild 관련 moderate~critical 취약점(개발 서버 전용, 프로덕션 번들과 무관)도 같은 이유로 남아있습니다. **Node를 20 LTS 이상으로 올리면 전부 최신 메이저로 올리고 이 취약점도 해소할 수 있습니다.** 지금 당장 문제는 없지만 알아두시면 좋습니다.

## 2. 아키텍처 (bulletproof-react 참조)

```
src/
  app/            # 앱 진입점: provider, router, routes
    routes/
    app.tsx
    provider.tsx  # QueryClientProvider 등 전역 프로바이더
    router.tsx    # createBrowserRouter
  components/ui/  # 공용 UI 컴포넌트 (아직 비어있음, 화면 만들며 채움)
  config/
    env.ts        # import.meta.env를 zod로 검증
  features/       # 기능 단위 모듈 (auth, files, ... ) — 화면 구현 시 추가
  hooks/          # 공용 훅
  lib/
    api-client.ts # axios 인스턴스 (ApiResponse 언래핑, 401 처리)
    react-query.ts
  stores/         # 전역 상태 (zustand)
  testing/
    setup-tests.ts
  types/
    api.ts        # 백엔드 ApiResponse<T> 타입
  utils/
    cn.ts         # clsx + tailwind-merge
```

- `features/*`는 서로 직접 import 하지 못하도록 ESLint `no-restricted-imports`로 막아뒀습니다 (`@/features/*/*` 패턴 금지 → 반드시 `@/features/<name>` 공개 배럴을 통해서만 참조). bulletproof-react의 핵심인 "기능 간 경계" 규칙을 별도 플러그인 없이 ESLint 내장 규칙으로 구현했습니다.
- 경로 별칭 `@/` → `src/` (tsconfig + vite.config 양쪽 설정 완료).
- 아직 실제 화면(`features/*`)은 만들지 않았습니다. 이번 단계는 뼈대 + 화면 목록 정리까지입니다.

## 3. 백엔드 연동 설정

- `ModuDrive-API`의 게이트웨이(`gateway-service`, 포트 10001)가 CORS 허용 origin으로 `http://localhost:3000`(도커의 `host.docker.internal:3000`)을 기대하고 있어서, **Vite dev 서버 포트를 3000으로 고정**했습니다 (`vite.config.ts`의 `server.port`).
- `.env.development`에 `VITE_API_BASE_URL=http://localhost:10001` 설정 — 모든 API 호출은 게이트웨이를 경유합니다.
- `src/types/api.ts`는 백엔드 `common:core`의 `ApiResponse<T>` 응답 포맷(`status`, `message`, `data`)을 그대로 반영했습니다.

## 4. 동작 확인

- `npm run lint` — 통과
- `npx tsc -b` — 통과
- `npm run build` — 통과 (dist 산출물 정상 생성 확인 후 삭제)
- `npm run dev` → `http://localhost:3000` 200 응답, React/Tailwind 정상 렌더링 확인
- `npx vitest run` — 스모크 테스트(`app.test.tsx`, App 렌더링 확인) 통과
- 백엔드 게이트웨이(`http://localhost:10001`)는 현재 기동 중이며 응답 확인함

## 5. 백엔드 API 분석 결과 — 필요한 화면 UI 목록

`ModuDrive-API`의 컨트롤러(auth/member/file/storage-service)를 직접 읽고 정리했습니다. `notification-service`는 애플리케이션 클래스만 있고 컨트롤러가 아직 없어 **백엔드 미구현 상태**이므로 화면 목록에서 제외했습니다 (게이트웨이 라우팅과 서킷브레이커 설정은 이미 있어 나중에 붙을 예정으로 보입니다).

### A. 인증 / 회원 (auth-service, member-service)

| # | 화면 | 사용 API | 비고 |
|---|---|---|---|
| 1 | 로그인 | `POST /api/v1/auth/login` | 성공 시 access/refresh 토큰 저장 |
| 2 | 회원가입 | `POST /api/v1/member/sign-up` (name, email, password) | |
| 3 | 내 프로필 (선택) | `GET /api/v1/member/find` (X_USER_ID 헤더) | 간단한 사용자 정보 표시용. 필수 화면은 아님 |

### B. 드라이브 / 파일 (file-service, storage-service)

| # | 화면 | 사용 API | 비고 |
|---|---|---|---|
| 4 | 드라이브 메인 (파일 탐색기) | `GET /api/v1/directories?userId&path` | 경로 기반 브레드크럼 네비게이션. 리스트/그리드 뷰 |
| 5 | 새 폴더 만들기 | `POST /api/v1/directories` | 모달 |
| 6 | 파일 업로드 | `POST /api/v1/files/metadata` → `POST /api/v1/storage/upload` (단순) 또는 `POST/PUT /api/v1/storage/upload/resumable/**` (대용량, 청크 단위 + 진행률) → `PUT /api/v1/files/{fileId}/uploaded` | 드래그앤드롭, 업로드 진행률 표시. 파일 크기 기준으로 simple/resumable 분기 필요 |
| 7 | 파일 다운로드 | `GET /api/v1/storage/download/{fileId}` | |
| 8 | 파일 상세/속성 패널 | `GET /api/v1/files/{fileId}` | 이름, 크기, 상태(PENDING/UPLOADED/DELETED), 소유자 |
| 9 | 파일 버전 기록 | `GET /api/v1/files/{fileId}/revisions?limit` | |
| 10 | 파일 삭제 확인 | `DELETE /api/v1/files/{fileId}` | soft delete (상태만 DELETED로 변경) |
| 11 | 파일 공유 다이얼로그 | `POST /api/v1/files/{fileId}/share` (sharedWithUserId, permission: READ/WRITE) | |

- 신규 회원의 루트 네임스페이스(`POST /api/v1/namespaces`)는 별도 화면이 아니라 **가입/최초 로그인 시점에 자동 호출**하는 온보딩 로직으로 처리하면 됩니다.
- 백엔드에 "휴지통 목록" 조회 API가 없어(soft delete만 있고 DELETED 상태 필터 조회 엔드포인트 없음) 휴지통 화면은 목록에서 제외했습니다. 필요하면 백엔드에 먼저 API 추가가 필요합니다.

### C. 공통 레이아웃 / 상태

| # | 항목 | 비고 |
|---|---|---|
| 12 | 전역 레이아웃 (사이드바 + 헤더) | 로그인 후 인증 가드로 보호되는 라우트 그룹 |
| 13 | 로딩 / 빈 폴더 / 에러 / 404 상태 | 각 화면 공통으로 필요 |

## 6. 다음 단계 제안

1. `features/auth` (로그인, 회원가입, 인증 가드 + 토큰 저장 zustand store)
2. `features/drive` (탐색기, 폴더 생성, 업로드/다운로드, 상세/버전/공유)
3. 공용 레이아웃 및 라우트 보호 로직

바로 이어서 만들지, 특정 화면부터 우선 작업할지 알려주시면 진행하겠습니다.
