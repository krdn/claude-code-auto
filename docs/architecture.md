# Architecture

> AI Orchestrator Framework 시스템 구조

---

## Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           AI Orchestrator Framework                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                      │
│  │   Planner   │───▶│    Coder    │───▶│  Reviewer   │                      │
│  │   Agent     │    │   Agent     │    │   Agent     │                      │
│  └─────────────┘    └─────────────┘    └─────────────┘                      │
│         │                  │                  │                              │
│         ▼                  ▼                  ▼                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                          Skills Layer                                │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │    │
│  │  │interview │ │  commit  │ │review-pr │ │   test   │ │  deploy  │   │    │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│         │                  │                  │                              │
│         ▼                  ▼                  ▼                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                       Verification Layer                             │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────────┐    │    │
│  │  │  Lint    │ │TypeCheck │ │   Test   │ │   Self-healing Loop  │    │    │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────────────────┘    │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
                    ┌────────────────────────────────┐
                    │      User (Orchestrator)       │
                    │   • 승인/거부                   │
                    │   • 방향 제시                   │
                    │   • 최종 결정                   │
                    └────────────────────────────────┘
```

---

## Layer Architecture

### 1. Agent Layer (에이전트 계층)

AI 작업의 핵심 실행 단위입니다.

| Agent | 책임 | 입력 | 출력 |
|-------|------|------|------|
| Planner | 계획 수립 | 사용자 요청 | 구조화된 계획 |
| Coder | 코드 작성 | 승인된 계획 | 구현 코드 + 테스트 |
| Reviewer | 품질 검증 | 작성된 코드 | 리뷰 리포트 |

#### Agent 간 통신

```
Planner ──(계획)──▶ [승인] ──▶ Coder ──(코드)──▶ Reviewer
   ▲                                                 │
   └────────────────(피드백)─────────────────────────┘
```

### 2. Skills Layer (스킬 계층)

재사용 가능한 작업 절차의 모음입니다.

| 카테고리 | Skills | 설명 |
|----------|--------|------|
| Planning | interview | 요구사항 수집 및 명확화 |
| Development | commit, test | 코드 작성 및 테스트 |
| Review | review-pr | 코드 리뷰 및 품질 검증 |
| Operations | deploy, docs | 배포 및 문서화 |

### 3. Verification Layer (검증 계층)

자동화된 품질 보장 시스템입니다.

```
┌──────────────────────────────────────────────────────────────────┐
│                    Verification Pipeline                          │
│                                                                   │
│   [코드 변경]                                                     │
│       │                                                           │
│       ▼                                                           │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐                   │
│   │   Lint   │───▶│TypeCheck │───▶│   Test   │                   │
│   └──────────┘    └──────────┘    └──────────┘                   │
│       │               │               │                           │
│       ▼               ▼               ▼                           │
│   ┌──────────────────────────────────────────────────────────┐   │
│   │                  Results Analysis                         │   │
│   └──────────────────────────────────────────────────────────┘   │
│       │                                                           │
│       ├──(성공)──▶ Reviewer Agent ──▶ Commit/PR                  │
│       │                                                           │
│       └──(실패)──▶ Self-healing Loop (최대 3회)                  │
│                       │                                           │
│                       └──(3회 실패)──▶ 사용자 개입 요청          │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### 1. 기능 개발 흐름

```
1. 사용자 요청
   │
   ▼
2. Planner Agent
   ├── 요청 분석
   ├── 코드베이스 탐색
   ├── 영향 범위 파악
   └── 계획 문서 생성
   │
   ▼
3. 사용자 승인
   ├── 승인(Y) → 4로 진행
   ├── 수정 요청 → 2로 복귀
   └── 거부(N) → 종료
   │
   ▼
4. Coder Agent
   ├── 계획에 따른 구현
   ├── 테스트 코드 작성
   └── 코드 제출
   │
   ▼
5. Verification
   ├── 린트 검사
   ├── 타입 체크
   └── 테스트 실행
   │
   ├──(실패)──▶ Self-healing → 5로 복귀
   │
   ▼
6. Reviewer Agent
   ├── 코드 품질 검사
   ├── 보안 취약점 스캔
   └── 개선 제안
   │
   ▼
7. 커밋/PR 생성
```

### 2. Self-healing Loop

```
[테스트 실패]
     │
     ▼
[에러 로그 분석]
     │
     ▼
[수정 방안 도출]
     │
     ▼
[자동 수정 적용]
     │
     ▼
[재검증]
     │
     ├──(성공)──▶ 진행
     │
     └──(실패)──▶ 재시도 카운트 확인
                      │
                      ├──(< 3회)──▶ [에러 로그 분석]으로 복귀
                      │
                      └──(>= 3회)──▶ 사용자 개입 요청
```

---

## File Structure

```
project/
├── CLAUDE.md                     # AI 진입점 (핵심 규칙)
├── README.md                     # 프로젝트 소개
│
├── docs/                         # 문서
│   ├── ai-orchestrator.md        # 4대 역할 정의
│   ├── architecture.md           # 이 파일
│   ├── conventions.md            # 코딩 규칙
│   ├── workflow.md               # 워크플로우 상세
│   └── templates/                # 템플릿
│       ├── SKILL-TEMPLATE.md
│       ├── AGENT-TEMPLATE.md
│       └── PLAN-TEMPLATE.md
│
├── agents/                       # Agent 정의
│   ├── planner/AGENT.md
│   ├── coder/AGENT.md
│   └── reviewer/AGENT.md
│
├── skills/                       # Skill 정의
│   ├── interview/SKILL.md
│   ├── commit/SKILL.md
│   ├── review-pr/SKILL.md
│   ├── test/SKILL.md
│   ├── deploy/SKILL.md
│   └── docs/SKILL.md
│
├── workflows/                    # 워크플로우 정의
│   ├── feature-development.md
│   └── approval-flow.md
│
├── verification/                 # 검증 스크립트
│   ├── test-runner.sh
│   ├── lint-check.sh
│   └── self-healing/
│       └── auto-fix.md
│
├── .claude/                      # Claude 설정
│   ├── settings.local.json
│   └── SPEC.md
│
└── .github/
    └── workflows/                # CI/CD
        ├── ci.yml
        └── self-healing.yml
```

---

## Integration Points

### Claude Code 통합

| 기능 | 통합 방식 |
|------|----------|
| Agent 실행 | Task tool + subagent_type |
| Skill 실행 | Skill tool + 명령어 |
| 검증 실행 | Bash tool + 스크립트 |
| 파일 작업 | Read/Write/Edit tools |

### CI/CD 통합

```yaml
# GitHub Actions 연동
trigger:
  - push → CI Pipeline
  - PR → Review Pipeline
  - CI 실패 → Self-healing Pipeline
```

---

## Design Principles

1. **문서 중심 설계**
   - 모든 규칙과 절차를 마크다운으로 문서화
   - AI가 이해할 수 있는 구조화된 형식

2. **계층적 분리**
   - Agent, Skill, Verification 계층 분리
   - 각 계층의 독립적인 진화 가능

3. **자동화 우선**
   - 가능한 모든 검증을 자동화
   - 사용자 개입은 승인과 예외 처리에만

4. **확장 가능성**
   - 새 Agent/Skill 추가가 쉬운 구조
   - 프로젝트별 커스터마이징 지원

---

## Related Documents

- [CLAUDE.md](../CLAUDE.md) - 핵심 규칙
- [Conventions](./conventions.md) - 코딩 규칙
- [Workflow](./workflow.md) - 작업 흐름 상세
