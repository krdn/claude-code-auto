# Claude Code Auto 시스템 분석 보고서

## 1. 개요 (Overview)

**Claude Code Auto**는 인간 개발자와 AI 에이전트가 협업하는 **"Human-in-the-loop" AI 개발 오케스트레이션 프레임워크**입니다.
단순한 코드 생성을 넘어, **기획(Planning) → 승인(Approval) → 구현(Implementation) → 검증(Verification) → 리뷰(Review) → 커밋(Commit)**으로 이어지는 전체 SDLC(Software Development Life Cycle)를 AI가 주도하고 인간이 감독하는 구조를 가집니다.

> **Current Status (2026-01-04)**:
> **Phase 1 MVP** 상태입니다. 핵심 에이전트(Planner, Coder, Reviewer)와 Git 자동화(Commit)가 실제 LLM과 연동되어 작동합니다. 단, 일부 고급 스킬(Deploy, Interview 등)은 아직 시뮬레이션 단계이거나 스켈레톤 코드로 존재합니다.

---

## 2. 개발 목적 및 목표 (Purpose & Goals)

### 2.1 개발 목적

- **개발 프로세스의 표준화**: AI가 일관된 컨벤션과 프로세스로 코드를 작성하여 품질 편차를 줄입니다.
- **반복 업무 자동화**: 문맥 파악, 테스트 작성, 커밋 메시지 작성 등 번거로운 작업을 자동화하여 개발자는 고수준의 의사결정에 집중합니다.
- **안전한 AI 도입**: "자동 승인"이 아닌 "명시적 승인" 절차를 두어, AI가 생성한 코드의 부작용을 통제합니다.

### 2.2 핵심 목표

1.  **AI 오케스트레이션**: 여러 AI 에이전트가 각자의 역할(Role)에 맞춰 협업하는 시스템 구축.
2.  **검증된 코드 생성**: 테스트 코드 작성을 의무화하고, 실패 시 스스로 수정하는 **Self-healing** 메커니즘 구현.
3.  **투명한 작업 흐름**: AI의 사고 과정과 계획을 사용자가 명확히 이해하고 통제할 수 있도록 시각화.

---

## 3. 작동 원리 및 아키텍처 (Operating Principles & Architecture)

이 시스템은 **이벤트 기반의 상태 머신(Event-driven State Machine)**으로 동작하며, 3단계의 계층 구조를 가집니다.

### 3.1 워크플로우 엔진 (Workflow Orchestrator)

`src/engine/workflow-orchestrator.ts`가 전체 생명주기를 관리합니다.

- **Phase 1: Planning (기획)**
  - **Planner Agent (Claude Opus)**가 투입됩니다.
  - 사용자 요청을 분석하고, 프로젝트 구조(`fileManager.getDirectoryTree`)를 파악하여 `implementation_plan.md` 포맷의 계획을 수립합니다.
- **Phase 2: Approval (승인)**
  - 시스템이 `awaiting_approval` 상태로 대기합니다.
  - 사용자의 승인(`submitApproval`)이 있어야만 다음 단계로 넘어갑니다. (안전장치)
- **Phase 3: Implementation (구현)**
  - **Coder Agent (Claude Sonnet)**가 투입됩니다.
  - 승인된 계획에 따라 코드를 작성합니다.
  - **Self-healing Loop**: 작성 직후 `runValidation` (테스트/린트/타입체크)을 수행합니다. 실패 시 에러 로그를 분석하여 최대 3회까지 재시도를 수행합니다.
- **Phase 4: Review (검토)**
  - **Reviewer Agent (Claude Sonnet)**가 투입됩니다.
  - 변경된 코드의 diff, 테스트 결과, 린트 결과를 종합 분석하여 최종 승인 여부를 결정합니다.

### 3.2 에이전트 실행기 (Agent Executor)

`src/engine/agent-executor.ts`는 실제 LLM 클라이언트와 통신합니다.

- **Dual Mode**: `config.simulate` 값에 따라 시뮬레이션 모드(가상 응답)와 리얼 모드(Anthropic API 호출)를 전환할 수 있습니다.
- **Prompt Engineering**: `PromptBuilder`가 각 역할에 맞는 최적화된 프롬프트를 동적으로 생성합니다. (예: Coder에게는 관련 파일 내용과 코드베이스 구조를 주입)

### 3.3 스킬 시스템 (Skill Executor)

에이전트가 외부 세계와 상호작용하는 도구입니다.

- **구현됨**:
  - **Commit**: `GitClient`를 통해 변경사항을 감지하고, LLM이 diff를 분석해 Conventional Commits 규격의 메시지를 작성하고 커밋합니다.
- **미구현/시뮬레이션 중**:
  - **Test**: 현재는 시뮬레이션 또는 단순 placeholder입니다.
  - **Review-PR**, **Deploy**, **Interview**: 현재 시뮬레이션 상태입니다.

---

## 4. 심층 분석: AI 협업 메커니즘

이 시스템의 가장 큰 특징은 **단일 프롬프트가 아닌 연쇄적인 에이전트 체인**이라는 점입니다.

1.  **Context Propagation (맥락 전파)**:
    - Planner가 생성한 `PlanResult` 객체는 Coder에게 전달되어 "무엇을 해야 하는지" 가이드라인이 됩니다.
    - Coder가 생성한 `ImplementationResult` 객체는 Reviewer에게 전달되어 "무엇을 검증해야 하는지" 기준이 됩니다.

2.  **Strict Role Boundaries (엄격한 역할 경계)**:
    - **Planner**는 코드를 쓰지 않습니다. 오직 '계획'만 세웁니다.
    - **Coder**는 계획을 벗어난 코드를 쓰지 않도록 프롬프트로 제어됩니다.
    - **Reviewer**는 코드를 고치지 않습니다. 지적하고 승인/반려만 합니다.

3.  **Safety First (안전 우선)**:
    - 모든 중요 변경(L2 이상)은 사람의 승인을 거칩니다.
    - `WorkflowOrchestrator`는 에러 발생 시 즉시 중단되거나(Fail-fast), Self-healing을 시도(Fail-safe)하도록 설계되었습니다.

---

## 5. 결론 및 제언

Claude Code Auto는 **"신뢰할 수 있는 AI 코딩 파트너"**를 목표로 하는 정교한 시스템입니다. 현재 MVP 단계에서 핵심 코어(Planning-Coding-Reviewing 루프)는 실제 동작 가능한 수준으로 구현되었습니다.

**향후 과제**:

1.  **Test/Deploy 스킬의 구체화**: 시뮬레이션으로 남겨진 나머지 스킬들의 실제 구현.
2.  **Context Window 최적화**: 프로젝트 규모가 커질 경우 파일 내용을 전부 프롬프트에 넣을 수 없으므로, RAG(Retrieval-Augmented Generation) 도입 필요.
3.  **Human Feedback Loop 강화**: Reviewer의 지적 사항을 인간이 수정하거나, 인간의 피드백을 학습하는 루프 추가.
