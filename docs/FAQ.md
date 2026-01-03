# AI Orchestrator FAQ

> 초보 개발자를 위한 자주 묻는 질문 모음

---

## 목차

1. [시스템 개요](#1-시스템-개요)
2. [설치 및 시작하기](#2-설치-및-시작하기)
3. [CLI 사용법](#3-cli-사용법)
4. [기술 아키텍처](#4-기술-아키텍처)
5. [트러블슈팅](#5-트러블슈팅)
6. [고급 사용법](#6-고급-사용법)

---

## 1. 시스템 개요

### Q1. AI Orchestrator가 뭔가요?

**AI Orchestrator**는 AI가 개발 작업을 수행하고, 사용자가 감독하는 협업 프레임워크입니다.

쉽게 말해, AI가 코드를 작성하고 테스트하면서 사용자는 "오케스트라 지휘자"처럼 전체 흐름을 관리합니다.

```
┌─────────────────────────────────────────────┐
│  사용자 (지휘자)                              │
│    ↓ 요청                                    │
│  AI Orchestrator                             │
│    ├── Planner (계획 수립)                   │
│    ├── Coder (코드 작성)                     │
│    └── Reviewer (코드 리뷰)                  │
│    ↓ 결과                                    │
│  완성된 코드                                  │
└─────────────────────────────────────────────┘
```

---

### Q2. 이 시스템의 핵심 철학은 무엇인가요?

4가지 핵심 원칙을 따릅니다:

| 원칙 | 설명 | 예시 |
|------|------|------|
| **명확한 규칙** | 모호한 명령 금지 | "적당히 수정해줘" ❌ → "로그인 함수에 에러 처리 추가해줘" ✓ |
| **자동화된 검증** | AI 결과물을 테스트로 검증 | 코드 작성 후 자동으로 테스트 실행 |
| **승인 기반 실행** | AI 계획 → 사용자 승인 → 실행 | 사용자가 계획을 검토하고 승인해야 진행 |
| **맥락 중심** | AI가 전체 시스템을 이해 | CLAUDE.md, docs/ 폴더로 맥락 제공 |

---

### Q3. 어떤 문제를 해결하나요?

개발 과정에서 흔히 겪는 문제들을 해결합니다:

| 문제 | AI Orchestrator 해결책 |
|------|------------------------|
| AI가 맥락을 모름 | CLAUDE.md로 프로젝트 전체 맥락 제공 |
| 실수하면 복구 어려움 | 승인 단계에서 사전 검토 |
| 일관성 없는 코드 | 규칙과 컨벤션을 문서화 |
| 테스트 누락 | 자동 검증 단계 포함 |
| 반복 작업 | 스킬(Skill)로 자동화 |

---

### Q4. 에이전트(Agent)란 무엇인가요?

**에이전트**는 특정 역할을 담당하는 AI 작업 단위입니다. 3가지 에이전트가 순차적으로 협력합니다:

| 에이전트 | 역할 | 사용 모델 | 하는 일 |
|----------|------|-----------|---------|
| **Planner** | 계획 수립 | Claude Opus | 요청 분석, 영향 범위 파악, 단계별 계획 작성 |
| **Coder** | 코드 작성 | Claude Sonnet | 계획에 따른 구현, 테스트 코드 포함 |
| **Reviewer** | 코드 리뷰 | Claude Sonnet | 품질 검증, 보안/성능 검사, 개선 제안 |

> **비유**: 건축으로 치면 Planner는 설계사, Coder는 시공자, Reviewer는 감리사입니다.

---

### Q5. 스킬(Skill)이란 무엇인가요?

**스킬**은 재사용 가능한 작업 명령입니다. 슬래시(`/`) 명령어로 실행합니다:

| 스킬 | 명령어 | 하는 일 |
|------|--------|---------|
| Interview | `/interview` | 요구사항 수집을 위한 질문-응답 |
| Commit | `/commit` | Git 커밋 메시지 작성 및 커밋 |
| Test | `/test` | 테스트 실행 및 결과 분석 |
| Review PR | `/review-pr` | Pull Request 생성 및 리뷰 |
| Deploy | `/deploy` | 배포 프로세스 실행 |
| Docs | `/docs` | 문서 자동 생성 |

```bash
# CLI에서 스킬 실행 예시
npx ai-orchestrator skill commit
npx ai-orchestrator skill test
```

---

### Q6. 워크플로우는 어떻게 동작하나요?

워크플로우는 에이전트들이 순차적으로 실행되는 전체 흐름입니다:

```
사용자 요청
    ↓
┌─────────────────────────────────┐
│ 1. Planner Agent                │ ← 계획 수립
└─────────────────────────────────┘
    ↓
┌─────────────────────────────────┐
│ 2. 사용자 승인 대기              │ ← 여기서 계획 검토!
│    (Y: 승인 / N: 거부)           │
└─────────────────────────────────┘
    ↓ (승인 시)
┌─────────────────────────────────┐
│ 3. Coder Agent                  │ ← 코드 작성
└─────────────────────────────────┘
    ↓
┌─────────────────────────────────┐
│ 4. 자동 검증                     │ ← 테스트, 린트, 타입체크
│    (실패 시 Self-healing)        │
└─────────────────────────────────┘
    ↓
┌─────────────────────────────────┐
│ 5. Reviewer Agent               │ ← 코드 리뷰
└─────────────────────────────────┘
    ↓
┌─────────────────────────────────┐
│ 6. 커밋/PR 생성                  │
└─────────────────────────────────┘
```

---

## 2. 설치 및 시작하기

### Q7. 어떻게 설치하나요?

**1단계: 저장소 클론**
```bash
git clone https://github.com/your-org/ai-orchestrator.git
cd ai-orchestrator
```

**2단계: 의존성 설치**
```bash
npm install
```

**3단계: 빌드**
```bash
npm run build
```

**4단계: CLI 전역 등록 (선택사항)**
```bash
npm link
```

이제 `ai-orchestrator` 명령어를 어디서든 사용할 수 있습니다!

---

### Q8. 최소 시스템 요구사항은?

| 항목 | 요구사항 |
|------|----------|
| Node.js | v18 이상 |
| npm | v9 이상 |
| 운영체제 | Windows, macOS, Linux |
| Git | v2.0 이상 |

**버전 확인 방법:**
```bash
node --version   # v18.0.0 이상
npm --version    # v9.0.0 이상
git --version    # v2.0.0 이상
```

---

### Q9. 첫 번째 워크플로우를 어떻게 실행하나요?

**방법 1: npx 사용**
```bash
npx ai-orchestrator run "간단한 Hello World 함수 만들어줘"
```

**방법 2: npm 스크립트 사용**
```bash
npm run cli -- run "로그인 기능 추가해줘"
```

**방법 3: 전역 설치 후 사용**
```bash
ai-orchestrator run "사용자 인증 기능 추가"
```

> **팁**: 처음에는 간단한 요청으로 시작하세요. 시스템이 어떻게 동작하는지 익힌 후 복잡한 작업을 요청하면 됩니다.

---

### Q10. 시뮬레이션 모드란?

**시뮬레이션 모드**는 실제 명령을 실행하지 않고 흐름만 확인하는 모드입니다.

| 모드 | 설명 | 플래그 |
|------|------|--------|
| 시뮬레이션 (기본) | 가상 결과 반환, 실제 실행 없음 | (기본값) |
| 실제 모드 | 실제 git, npm 등 명령 실행 | `--no-simulate` |

```bash
# 시뮬레이션 모드 (안전하게 테스트)
npx ai-orchestrator run "기능 추가"

# 실제 모드 (주의! 실제로 실행됨)
npx ai-orchestrator run "기능 추가" --no-simulate
```

> **주의**: 실제 모드는 git commit, 파일 변경 등이 실제로 일어납니다. 처음에는 시뮬레이션 모드로 연습하세요.

---

## 3. CLI 사용법

### Q11. 사용 가능한 명령어는 무엇인가요?

| 명령어 | 설명 | 예시 |
|--------|------|------|
| `run <요청>` | 워크플로우 실행 | `ai-orchestrator run "로그인 기능"` |
| `skill <이름>` | 개별 스킬 실행 | `ai-orchestrator skill commit` |
| `status` | 현재 상태 확인 | `ai-orchestrator status` |
| `help` | 도움말 표시 | `ai-orchestrator help` |
| `version` | 버전 표시 | `ai-orchestrator version` |

---

### Q12. 워크플로우를 실행하려면? (`run`)

`run` 명령어로 전체 워크플로우(Planner → Coder → Reviewer)를 실행합니다:

```bash
# 기본 사용
npx ai-orchestrator run "사용자 인증 기능 추가"

# 옵션과 함께 사용
npx ai-orchestrator run "버그 수정" --debug --auto-approve
```

**실행 흐름:**
1. Planner가 계획 수립
2. 사용자 승인 대기 (auto-approve 아닌 경우)
3. Coder가 코드 작성
4. 자동 검증 (테스트, 린트)
5. Reviewer가 리뷰
6. 결과 출력

---

### Q13. 개별 스킬을 실행하려면? (`skill`)

`skill` 명령어로 특정 스킬만 독립적으로 실행합니다:

```bash
# Git 커밋
npx ai-orchestrator skill commit

# 테스트 실행
npx ai-orchestrator skill test

# PR 리뷰
npx ai-orchestrator skill review-pr

# 문서 생성
npx ai-orchestrator skill docs

# 인터뷰 (요구사항 수집)
npx ai-orchestrator skill interview
```

> **팁**: 워크플로우 전체가 필요 없고 특정 작업만 필요할 때 유용합니다.

---

### Q14. 옵션들은 어떤 의미인가요?

| 옵션 | 설명 | 기본값 |
|------|------|--------|
| `--debug` | 디버그 정보 출력 | false |
| `--auto-approve` | 자동 승인 (사용자 확인 건너뜀) | false |
| `--auto-commit` | 완료 후 자동 커밋 | false |
| `--no-simulate` | 실제 실행 모드 | simulate=true |

```bash
# 모든 옵션 사용 예시
npx ai-orchestrator run "기능 추가" \
  --debug \
  --auto-approve \
  --auto-commit \
  --no-simulate
```

---

### Q15. 디버그 모드는 언제 사용하나요?

`--debug` 옵션은 다음 상황에서 유용합니다:

- 워크플로우가 실패했을 때 원인 파악
- 각 단계에서 어떤 일이 일어나는지 확인
- 이벤트 흐름 추적

```bash
npx ai-orchestrator run "기능 추가" --debug
```

**디버그 출력 예시:**
```
[10:30:15] workflow:started
[10:30:15] ▶ Planner 에이전트 실행 중...
[10:30:18] ✓ Planner 에이전트 완료
[10:30:18] agent:completed { role: 'planner', duration: 3000 }
...
```

---

### Q16. 자동 승인(--auto-approve)은 언제 사용하나요?

**권장 사용 상황:**
- ✅ CI/CD 파이프라인에서 자동화된 실행
- ✅ 신뢰할 수 있는 간단한 작업
- ✅ 반복적인 작업 자동화

**비권장 상황:**
- ❌ 처음 사용하는 경우 (흐름 이해 필요)
- ❌ 중요한 아키텍처 변경
- ❌ 보안 관련 코드 수정

```bash
# CI 환경에서 자동화 예시
npx ai-orchestrator run "린트 에러 수정" --auto-approve --no-simulate
```

---

## 4. 기술 아키텍처

### Q17. 시스템 전체 구조는 어떻게 되나요?

```
ai-orchestrator/
├── src/
│   ├── engine/                    # 핵심 엔진
│   │   ├── agent-executor.ts      # 에이전트 실행
│   │   ├── skill-executor.ts      # 스킬 실행
│   │   └── workflow-orchestrator.ts # 워크플로우 조율
│   ├── types/                     # 타입 정의
│   │   ├── agent.ts               # 에이전트 타입
│   │   ├── skill.ts               # 스킬 타입
│   │   └── workflow.ts            # 워크플로우 타입
│   ├── cli/                       # CLI 인터페이스
│   │   ├── index.ts               # 메인 CLI
│   │   └── utils.ts               # 유틸리티
│   └── index.ts                   # 진입점
├── docs/                          # 문서
├── tests/                         # 테스트
└── package.json
```

---

### Q18. 에이전트는 어떤 순서로 실행되나요?

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Planner    │ → │    Coder     │ → │   Reviewer   │
│ (Claude Opus)│    │(Claude Sonnet)│    │(Claude Sonnet)│
└──────────────┘    └──────────────┘    └──────────────┘
       │                   │                   │
       ▼                   ▼                   ▼
    계획 수립          코드 작성            코드 리뷰
       │                   │                   │
       ▼                   ▼                   ▼
  사용자 승인 ─────► 자동 검증 ─────►  결과 출력
```

각 에이전트의 결과는 다음 에이전트의 입력이 됩니다.

---

### Q19. Self-healing이란 무엇인가요?

**Self-healing**은 테스트 실패 시 자동으로 수정을 시도하는 기능입니다.

```
Coder가 코드 작성
       ↓
   테스트 실행
       ↓
   실패? ───────────────────┐
       │                    │
       ↓ (성공)             ↓ (실패)
   다음 단계         ┌───────────────┐
                     │ 에러 분석      │
                     │ 자동 수정 시도  │
                     │ (최대 3회)     │
                     └───────────────┘
                            │
                    3회 모두 실패?
                            │
                            ↓
                    사용자 개입 요청
```

**설정 예시 (코드 내부):**
```typescript
const executor = new AgentExecutor({
  maxHealingAttempts: 3,  // 최대 3회 재시도
});
```

---

### Q20. 승인 레벨(L1-L4)이란?

변경의 중요도에 따라 다른 승인 절차를 적용합니다:

| 레벨 | 대상 | 승인 방식 |
|------|------|----------|
| **L1** | 일반 코드 변경 | 자동 승인 (테스트 통과 시) |
| **L2** | 아키텍처 변경 | 사용자 명시적 승인 필요 |
| **L3** | 보안 관련 변경 | 사용자 + 리뷰어 승인 |
| **L4** | 프로덕션 배포 | 사용자 + 관리자 승인 |

> **예시**: 단순 버그 수정(L1)은 테스트만 통과하면 자동 진행, 인증 시스템 변경(L3)은 반드시 사람이 확인.

---

### Q21. 이벤트 시스템은 어떻게 동작하나요?

워크플로우는 **이벤트 기반**으로 동작합니다. 각 단계에서 이벤트가 발생합니다:

```typescript
// 이벤트 리스닝 예시
orchestrator.on((event) => {
  console.log(`[${event.type}] ${event.timestamp}`);
});
```

**이벤트 종류:**

| 이벤트 | 설명 |
|--------|------|
| `workflow:started` | 워크플로우 시작 |
| `agent:started` | 에이전트 실행 시작 |
| `agent:completed` | 에이전트 완료 |
| `approval:requested` | 승인 요청 |
| `approval:received` | 승인 응답 수신 |
| `skill:started` | 스킬 실행 시작 |
| `workflow:completed` | 워크플로우 완료 |
| `workflow:failed` | 워크플로우 실패 |

---

### Q22. 타입스크립트를 사용하는 이유는?

**타입스크립트의 장점:**

| 장점 | 설명 |
|------|------|
| **타입 안전성** | 컴파일 시점에 오류 발견 |
| **자동 완성** | IDE에서 정확한 제안 |
| **문서화** | 타입이 곧 문서 |
| **리팩토링** | 안전한 코드 변경 |

```typescript
// 타입 정의 예시 (src/types/workflow.ts)
export interface WorkflowContext {
  id: string;
  request: string;
  status: WorkflowStatus;
  currentStep: WorkflowStep;
  agentResults: {
    planner?: PlanResult;
    coder?: ImplementationResult;
    reviewer?: ReviewResult;
  };
}
```

---

## 5. 트러블슈팅

### Q23. "Module not found" 에러가 발생해요

**증상:**
```
Error: Cannot find module '.../workflow-orchestrator'
```

**원인:** ES 모듈에서 `.js` 확장자가 누락됨

**해결책:**
```bash
# 1. 빌드 다시 실행
npm run build

# 2. 그래도 안 되면 node_modules 정리
rm -rf node_modules dist
npm install
npm run build
```

---

### Q24. 테스트가 실패해요

**1단계: 어떤 테스트가 실패하는지 확인**
```bash
npm test
```

**2단계: 특정 테스트만 실행**
```bash
npm test -- --grep "테스트이름"
```

**3단계: 커버리지 확인**
```bash
npm run test:coverage
```

**일반적인 원인:**
- 타입 오류: `npm run type-check` 실행
- 린트 오류: `npm run lint:fix` 실행
- 의존성 문제: `npm install` 다시 실행

---

### Q25. 빌드가 안 돼요

**증상:**
```
error TS2307: Cannot find module './something'
```

**해결 순서:**

```bash
# 1. 타입 체크
npm run type-check

# 2. 에러 메시지 확인 후 수정

# 3. 빌드 재시도
npm run build
```

**흔한 원인:**
| 에러 | 해결책 |
|------|--------|
| 모듈 못 찾음 | import 경로에 `.js` 추가 |
| 타입 불일치 | 타입 정의 수정 |
| 문법 오류 | 해당 파일 수정 |

---

### Q26. CLI 명령어가 인식되지 않아요

**증상:**
```bash
ai-orchestrator: command not found
```

**해결책:**

**방법 1: npx 사용 (권장)**
```bash
npx ai-orchestrator help
```

**방법 2: npm link 재실행**
```bash
npm run build
npm link
```

**방법 3: 직접 실행**
```bash
node dist/cli/index.js help
```

---

### Q27. 승인 대기에서 멈춰있어요

**원인:** 워크플로우가 사용자 승인을 기다리고 있음

**해결책:**

**방법 1: 프로그래밍 방식으로 승인**
```typescript
orchestrator.submitApproval({
  workflowId: 'workflow-id',
  approved: true,
  respondedAt: new Date(),
});
```

**방법 2: 자동 승인 옵션 사용**
```bash
npx ai-orchestrator run "요청" --auto-approve
```

**방법 3: 워크플로우 취소**
```typescript
orchestrator.cancel();
```

---

### Q28. 워크플로우가 취소됐어요

**상태 확인:**
```bash
npx ai-orchestrator status
```

**일반적인 취소 원인:**
| 원인 | 해결책 |
|------|--------|
| 사용자가 계획 거부 | 새 워크플로우로 다시 시도 |
| Self-healing 3회 실패 | 에러 로그 확인 후 수동 수정 |
| 타임아웃 | 네트워크 확인, 재시도 |

---

## 6. 고급 사용법

### Q29. 새로운 스킬을 추가하려면?

**1단계: 스킬 타입 추가** (`src/types/skill.ts`)
```typescript
export type SkillName =
  | 'commit'
  | 'test'
  | 'your-new-skill';  // 추가

export const SKILL_CONFIGS: Record<SkillName, SkillConfig> = {
  // 기존 스킬들...
  'your-new-skill': {
    name: 'your-new-skill',
    command: '/your-skill',
    description: '새로운 스킬 설명',
    timeout: 30000,
  },
};
```

**2단계: 실행 로직 추가** (`src/engine/skill-executor.ts`)
```typescript
async execute(skillName: SkillName, input: SkillInput): Promise<SkillOutput> {
  switch (skillName) {
    // 기존 케이스들...
    case 'your-new-skill':
      return this.executeYourNewSkill(input);
  }
}

private async executeYourNewSkill(input: SkillInput): Promise<SkillOutput> {
  // 스킬 로직 구현
  return {
    success: true,
    output: '결과',
  };
}
```

**3단계: 테스트 추가** (`tests/engine/skill-executor.test.ts`)

---

### Q30. 커스텀 에이전트를 만들려면?

**1단계: 에이전트 타입 추가** (`src/types/agent.ts`)
```typescript
export type AgentRole =
  | 'planner'
  | 'coder'
  | 'reviewer'
  | 'your-agent';  // 추가
```

**2단계: 실행 로직 추가** (`src/engine/agent-executor.ts`)
```typescript
async execute(role: AgentRole, input: AgentInput): Promise<AgentOutput> {
  switch (role) {
    // 기존 케이스들...
    case 'your-agent':
      return this.executeYourAgent(input);
  }
}
```

**3단계: 워크플로우에 통합** (`src/engine/workflow-orchestrator.ts`)

---

### Q31. CI/CD에 통합하려면?

**GitHub Actions 예시** (`.github/workflows/ai-workflow.yml`):
```yaml
name: AI Orchestrator

on:
  push:
    branches: [main]

jobs:
  run-workflow:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - run: npm ci
      - run: npm run build

      # 자동 승인, 실제 모드로 실행
      - run: |
          npx ai-orchestrator run "린트 에러 자동 수정" \
            --auto-approve \
            --no-simulate
```

---

### Q32. 다른 프로젝트에 적용하려면?

**1단계: 필수 파일 복사**
```
your-project/
├── CLAUDE.md          # 프로젝트 규칙 정의
├── docs/              # 추가 문서
│   └── conventions.md
└── .github/
    └── workflows/     # CI 워크플로우
```

**2단계: CLAUDE.md 커스터마이징**
- 프로젝트 특성에 맞게 규칙 수정
- 사용할 스킬 정의
- 승인 레벨 설정

**3단계: 의존성 추가**
```json
{
  "devDependencies": {
    "ai-orchestrator": "^0.1.0"
  }
}
```

**4단계: 스크립트 추가**
```json
{
  "scripts": {
    "ai": "npx ai-orchestrator"
  }
}
```

---

## 도움이 더 필요하신가요?

- **문서**: [docs/](../docs/) 폴더 참고
- **이슈**: [GitHub Issues](../../issues)에서 질문
- **기여**: [CONTRIBUTING.md](../CONTRIBUTING.md) 참고

---

> 마지막 업데이트: 2025년 1월
