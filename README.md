# AI Orchestrator Framework

[![CI Pipeline](https://github.com/krdn/claude-code-auto/actions/workflows/ci.yml/badge.svg)](https://github.com/krdn/claude-code-auto/actions/workflows/ci.yml)
[![PR Validation](https://github.com/krdn/claude-code-auto/actions/workflows/pr-validation.yml/badge.svg)](https://github.com/krdn/claude-code-auto/actions/workflows/pr-validation.yml)
[![CodeQL](https://github.com/krdn/claude-code-auto/actions/workflows/codeql.yml/badge.svg)](https://github.com/krdn/claude-code-auto/actions/workflows/codeql.yml)
[![codecov](https://codecov.io/gh/krdn/claude-code-auto/branch/main/graph/badge.svg)](https://codecov.io/gh/krdn/claude-code-auto)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)

> **AI가 개발의 전 과정을 수행하고, 사용자가 오케스트레이터로서 감독하는 협업 체계**

Claude Code 중심의 AI 개발 워크플로우 프레임워크입니다. 계획 → 승인 → 실행 → 검증의 체계적인 개발 프로세스를 제공합니다.

---

## 🚀 Phase 1 MVP 완료! (2026-01-04)

**Phase 1 MVP가 완성되었습니다!** 실제 LLM 통합과 Git 자동화가 구현되어 프로덕션 사용이 가능합니다.

### 주요 구현 사항
- ✅ **LLM 통합**: Anthropic Claude API (Opus 4, Sonnet 4, Haiku 4)
- ✅ **CLI 인증**: Claude Max Plan 구독으로 무제한 사용 ($20/월)
- ✅ **하이브리드 모드**: CLI 실패 시 API 키로 자동 폴백
- ✅ **Git 자동화**: 실제 Git 작업 (status, diff, add, commit)
- ✅ **프롬프트 시스템**: prompts/ 폴더로 프롬프트 분리 및 템플릿화
- ✅ **설정 관리**: 환경별 설정 (dev/prod), .env 지원
- ✅ **AgentExecutor**: Planner, Coder, Reviewer 모두 실제 LLM 호출
- ✅ **SkillExecutor**: commit 스킬 실제 구현 (LLM 생성 커밋 메시지)

### 🔑 인증 방식 선택

AI Orchestrator는 두 가지 LLM 인증 방식을 지원합니다:

| 방식 | 비용 | 설정 난이도 | 추천 대상 |
|------|------|------------|----------|
| **API 키** | 사용량 기반 ($60-120/월) | 쉬움 | 프로덕션, 대규모 사용 |
| **CLI (Max Plan)** | 고정 $20/월 | 중간 | 개발/테스트, 개인 프로젝트 |

#### 방식 1: API 키 (권장)
```bash
# 1. API 키 설정
cp .env.example .env
# .env 파일에서 다음 설정:
# LLM_AUTH_METHOD=api-key
# ANTHROPIC_API_KEY=sk-ant-your-key-here

# 2. 빌드 및 테스트
npm run build
npm test
```

#### 방식 2: Claude CLI (Max Plan 구독자)
```bash
# 1. Claude Code CLI 설치 확인
claude --version

# 2. 환경 설정
cp .env.example .env
# .env 파일에서 다음 설정:
# LLM_AUTH_METHOD=cli
# CLAUDE_CLI_PATH=claude

# 3. 빌드 및 테스트
npm run build
npm test
```

**상세 가이드**: [CLI 인증 설정 가이드](./docs/MAX_PLAN_SETUP.md)

#### 하이브리드 모드 (권장)
CLI와 API 키를 함께 설정하면, CLI 실패 시 자동으로 API 키로 전환됩니다:

```bash
# .env 설정
LLM_AUTH_METHOD=cli
CLAUDE_CLI_PATH=claude
ANTHROPIC_API_KEY=sk-ant-your-key-here  # 폴백용
LLM_FALLBACK_TO_API_KEY=true
```

**다음 단계**: [Phase 2 로드맵](#phase-2-확장-예정) 참조

---

## Quick Start

```bash
# 1. 저장소 클론
git clone https://github.com/krdn/claude-code-auto.git
cd claude-code-auto

# 2. 의존성 설치
npm install

# 3. 개발 시작
# Claude Code에서 CLAUDE.md를 읽고 작업을 시작합니다
```

---

## 핵심 원칙

| # | 원칙 | 설명 |
|---|------|------|
| 1 | **명확한 규칙** | 모호한 명령 금지, 모든 규칙을 문서화 |
| 2 | **자동화된 검증** | AI 결과물은 자동 테스트로 검증 |
| 3 | **승인 기반 실행** | AI 계획 → 사용자 승인 → 실행 |
| 4 | **맥락 중심** | AI가 전체 시스템을 이해할 수 있는 구조 |

---

## 에이전트 (Agents)

AI 작업은 3단계 에이전트 체계로 수행됩니다.

| Agent | 역할 | 트리거 | 파일 |
|-------|------|--------|------|
| **Planner** | 계획 수립 | `/plan`, 새 기능 요청 | [`agents/planner/AGENT.md`](./agents/planner/AGENT.md) |
| **Coder** | 코드 작성 | 계획 승인 후 자동 | [`agents/coder/AGENT.md`](./agents/coder/AGENT.md) |
| **Reviewer** | 코드 리뷰 | 구현 완료 후 자동 | [`agents/reviewer/AGENT.md`](./agents/reviewer/AGENT.md) |

---

## 스킬 (Skills)

재사용 가능한 작업 절차입니다.

| Skill | 용도 | 명령어 | 파일 |
|-------|------|--------|------|
| **interview** | 기획 인터뷰 및 요구사항 수집 | `/interview` | [`skills/interview/SKILL.md`](./skills/interview/SKILL.md) |
| **commit** | Git 커밋 메시지 작성 및 커밋 | `/commit` | [`skills/commit/SKILL.md`](./skills/commit/SKILL.md) |
| **test** | 테스트 실행 및 분석 | `/test` | [`skills/test/SKILL.md`](./skills/test/SKILL.md) |
| **review-pr** | Pull Request 리뷰 | `/review-pr` | [`skills/review-pr/SKILL.md`](./skills/review-pr/SKILL.md) |
| **deploy** | 배포 프로세스 | `/deploy` | [`skills/deploy/SKILL.md`](./skills/deploy/SKILL.md) |
| **docs** | 문서 자동 생성 | `/docs` | [`skills/docs/SKILL.md`](./skills/docs/SKILL.md) |

---

## 워크플로우

### 기본 흐름

```
사용자 요청
    │
    ▼
┌─────────────────────────────────────┐
│  Planner Agent - 계획 수립          │
│  • 요청 분석 • 영향 범위 파악        │
└───────────────┬─────────────────────┘
                ▼
        [사용자 승인 대기]
         승인(Y) / 거부(N)
                │
                ▼ (승인)
┌─────────────────────────────────────┐
│  Coder Agent - 구현                 │
│  • 코드 작성 • 테스트 코드 포함      │
└───────────────┬─────────────────────┘
                ▼
┌─────────────────────────────────────┐
│  자동 검증 (CI Pipeline)            │
│  • 타입 체크 • 린트 • 테스트        │
└───────┬───────────────┬─────────────┘
        ▼ (실패)        ▼ (성공)
  Self-healing      Reviewer Agent
  자동 수정 시도         │
        │               ▼
        └────────► 커밋/PR 생성
```

### 승인 레벨 (Approval Levels)

| 레벨 | 대상 | 승인 방식 |
|------|------|----------|
| **L1** | 일반 코드 변경 | 자동 (테스트 통과 시) |
| **L2** | 아키텍처 변경 | 사용자 명시적 승인 |
| **L3** | 보안 관련 변경 | 사용자 + 리뷰어 승인 |
| **L4** | 프로덕션 배포 | 사용자 + 관리자 승인 |

상세: [`workflows/approval-flow.md`](./workflows/approval-flow.md)

---

## CI/CD 파이프라인

| 파이프라인 | 설명 | 트리거 |
|-----------|------|--------|
| **CI Pipeline** | 코드 품질, 테스트, 빌드, 보안 검사 | Push, PR |
| **Self-healing** | CI 실패 시 자동 수정 시도 (최대 3회) | CI 실패 |
| **PR Validation** | PR 제목, 설명, 크기, 충돌 검증 | PR 생성/수정 |
| **PR Labeler** | 파일, 크기, 승인 레벨 자동 라벨링 | PR 생성/수정 |
| **Auto Merge** | L1 레벨 + 테스트 통과 시 자동 머지 | CI 성공 |
| **Release** | Semantic Release 기반 자동 버전 관리 | main 브랜치 푸시 |

### CI Pipeline 상세

```
┌────────────────┐   ┌────────────────┐   ┌────────────────┐   ┌────────────────┐
│  Code Quality  │   │  Security Scan │   │     Test       │   │     Build      │
│  ────────────  │   │  ────────────  │   │  ────────────  │   │  ────────────  │
│  • TypeScript  │   │  • npm audit   │   │  • Vitest      │   │  • tsc build   │
│  • ESLint      │   │  • TruffleHog  │   │  • Coverage    │   │  • 아티팩트     │
└────────────────┘   └────────────────┘   └────────────────┘   └────────────────┘
```

---

## 개발 도구

### Pre-commit Hooks

커밋 전 자동 검증을 수행합니다.

| Hook | 기능 |
|------|------|
| **pre-commit** | lint-staged로 린트/포맷 자동 수정 |
| **commit-msg** | Conventional Commits 형식 검증 |

### 템플릿

| 템플릿 | 용도 | 파일 |
|--------|------|------|
| **PR Template** | Pull Request 작성 가이드 | [`.github/PULL_REQUEST_TEMPLATE.md`](./.github/PULL_REQUEST_TEMPLATE.md) |
| **Bug Report** | 버그 리포트 폼 | [`.github/ISSUE_TEMPLATE/bug_report.yml`](./.github/ISSUE_TEMPLATE/bug_report.yml) |
| **Feature Request** | 기능 요청 폼 | [`.github/ISSUE_TEMPLATE/feature_request.yml`](./.github/ISSUE_TEMPLATE/feature_request.yml) |

### 자동화 설정

| 설정 | 용도 | 파일 |
|------|------|------|
| **Dependabot** | 의존성 자동 업데이트 | [`.github/dependabot.yml`](./.github/dependabot.yml) |
| **Labeler** | 파일 기반 자동 라벨링 | [`.github/labeler.yml`](./.github/labeler.yml) |
| **Semantic Release** | 자동 버전 관리 | [`.releaserc.json`](./.releaserc.json) |

---

## 프로젝트 구조

```
claude-code-auto/
├── CLAUDE.md                 # 핵심 규칙 (AI 진입점)
├── README.md                 # 프로젝트 소개
│
├── agents/                   # 에이전트 정의
│   ├── planner/AGENT.md      # 계획 수립 에이전트
│   ├── coder/AGENT.md        # 코드 작성 에이전트
│   └── reviewer/AGENT.md     # 코드 리뷰 에이전트
│
├── skills/                   # 스킬 정의
│   ├── interview/SKILL.md    # 인터뷰 스킬
│   ├── commit/SKILL.md       # 커밋 스킬
│   ├── test/SKILL.md         # 테스트 스킬
│   ├── review-pr/SKILL.md    # PR 리뷰 스킬
│   ├── deploy/SKILL.md       # 배포 스킬
│   └── docs/SKILL.md         # 문서 생성 스킬
│
├── workflows/                # 워크플로우 정의
│   ├── feature-development.md
│   └── approval-flow.md
│
├── docs/                     # 문서
│   ├── ai-orchestrator.md    # 4대 역할 정의
│   ├── architecture.md       # 시스템 구조
│   ├── conventions.md        # 코딩 규칙
│   ├── workflow.md           # 워크플로우 가이드
│   ├── BRANCH_PROTECTION.md  # 브랜치 보호 설정
│   └── templates/            # 문서 템플릿
│
├── .github/                  # GitHub 설정
│   ├── workflows/            # CI/CD 파이프라인
│   │   ├── ci.yml
│   │   ├── self-healing.yml
│   │   ├── pr-validation.yml
│   │   ├── pr-labeler.yml
│   │   ├── auto-merge.yml
│   │   └── release.yml
│   ├── ISSUE_TEMPLATE/       # 이슈 템플릿
│   ├── PULL_REQUEST_TEMPLATE.md
│   ├── dependabot.yml
│   └── labeler.yml
│
├── src/                      # 소스 코드
│   └── index.ts
│
├── tests/                    # 테스트
│   └── index.test.ts
│
├── verification/             # 검증 스크립트
│   └── self-healing/
│
└── .claude/                  # Claude 설정
    ├── settings.local.json
    └── SPEC.md               # 프로젝트 명세
```

---

## 개발 명령어

```bash
# 의존성 설치
npm install

# 테스트 실행
npm test

# 테스트 (커버리지 포함)
npm run test:coverage

# 린트 검사
npm run lint

# 린트 자동 수정
npm run lint:fix

# 타입 체크
npm run type-check

# 빌드
npm run build

# 개발 서버
npm run dev
```

---

## 관련 문서

### 내부 문서
- [CLAUDE.md](./CLAUDE.md) - 핵심 규칙 및 진입점
- [AI Orchestrator Guide](./docs/ai-orchestrator.md) - 4대 역할 상세
- [Architecture](./docs/architecture.md) - 시스템 구조
- [Conventions](./docs/conventions.md) - 코딩 규칙
- [Workflow Guide](./docs/workflow.md) - 작업 흐름 상세
- [Branch Protection](./docs/BRANCH_PROTECTION.md) - 브랜치 보호 설정
- [CLI 인증 설정](./docs/MAX_PLAN_SETUP.md) - Claude Max Plan 사용 가이드

### 외부 링크
- [GitHub Wiki](https://github.com/krdn/claude-code-auto/wiki)
- [Claude Code 내장 도구](https://github.com/krdn/claude-code-auto/wiki/Claude-Code-내장-도구)

---

## 참고 영상

[![Claude Code Interview Mode](https://img.youtube.com/vi/OzezWml65NU/maxresdefault.jpg)](https://www.youtube.com/watch?v=OzezWml65NU)

**[Claude Code Interview Mode: AI와 협업하여 완벽한 프로젝트 기획하기!](https://www.youtube.com/watch?v=OzezWml65NU)**

---

## License

MIT License
