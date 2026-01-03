# Claude Code Auto 시스템 분석 보고서

## 1. 개요 (Overview)

**Claude Code Auto**는 AI 에이전트들이 협업하여 소프트웨어 개발 작업을 수행하는 **자동화 오케스트레이션 프레임워크**입니다. 단순한 코딩 보조를 넘어, 기획(Planner)부터 구현(Coder), 리뷰(Reviewer), 그리고 커밋(Skill)까지의 전체 개발 수명주기를 관리하도록 설계되었습니다.

> **⚠️ 현재 상태 알림**:
> 현재 코드베이스는 아키텍처와 로직의 흐름을 정의한 **프로토타입(Prototype)** 단계입니다. 실제 LLM(Claude) 호출이나 Git 명령어 실행 로직은 인터페이스만 정의되어 있으며, 내부 구현은 시뮬레이션(`simulate`)으로 대체되어 있습니다.

---

## 2. 핵심 아키텍처 (Core Architecture)

이 시스템은 명확한 역할 분담을 가진 **Multi-Agent System**을 기반으로 합니다.

### 2.1 워크플로우 (Workflow)

`WorkflowOrchestrator`가 전체 프로세스를 관장하며, 다음 순서로 엄격하게 진행됩니다:

1.  **Planning Phase (기획)**: Planner 에이전트가 사용자 요청을 분석하고 `implementation_plan.md`와 같은 계획을 수립합니다.
2.  **Approval Phase (승인)**: 사용자가 계획을 검토하고 승인합니다. (CLI에서 `--auto-approve` 옵션 제공)
3.  **Implementation Phase (구현)**: Coder 에이전트가 코드를 작성하고 테스트를 수행합니다. 실패 시 Self-healing(자가 치유) 루프를 돕니다.
4.  **Review Phase (검토)**: Reviewer 에이전트가 코드를 분석하여 보안, 성능, 스타일을 점검합니다.
5.  **Commit Phase (완료)**: 변경 사항을 커밋하고 문서화합니다.

### 2.2 주요 컴포넌트 (Components)

- **Engine (`src/engine/`)**:
  - `WorkflowOrchestrator`: 상태 머신(State Machine) 역할을 하며 단계 전이를 관리합니다.
  - `AgentExecutor`: 각 에이전트(Planner, Coder, Reviewer)의 실행을 담당합니다. 현재는 시뮬레이션 데이터를 반환합니다.
  - `SkillExecutor`: 도구(Git, Test 등)의 실행을 담당합니다. 시뮬레이션 모드와 실제 모드를 구분하도록 설계되었으나, 실제 모드(`performX`)는 아직 구현되지 않았습니다.

- **CLI (`src/cli/`)**:
  - 사용자와 상호작용하는 진입점입니다. `run`, `skill`, `status` 명령어를 지원합니다.

---

## 3. 에이전트 상세 (Agents)

각 에이전트는 `agents/<role>/AGENT.md`에 정의된 페르소나와 프롬프트 전략을 따르도록 설계되었습니다.

| 에이전트     | 모델          | 역할 및 책임                                                                                                                                   |
| :----------- | :------------ | :--------------------------------------------------------------------------------------------------------------------------------------------- |
| **Planner**  | Claude Opus   | **아키텍트**. 전체 코드베이스를 분석하고 영향 범위를 파악하여 단계별 계획을 수립합니다. 파일 생성/삭제 권한은 없으며 오직 '계획'만 산출합니다. |
| **Coder**    | Claude Sonnet | **개발자**. 승인된 계획을 바탕으로 실제 코드를 작성합니다. 테스트 코드를 작성하고 실행하여 구현을 검증합니다.                                  |
| **Reviewer** | Claude Sonnet | **시니어 개발자/QA**. 구현된 코드를 정적 분석하고 취약점, 버그, 컨벤션 위반을 찾아냅니다.                                                      |

## 4. 스킬 시스템 (Skills)

에이전트가 현실 세계와 상호작용하기 위한 도구들입니다. `skills/<name>/SKILL.md`에 정의되어 있습니다.

- **Commit**: Git 상태를 분석하고 Conventional Commits 규칙에 따라 커밋 메시지를 생성합니다.
- **Test**: 테스트를 실행하고 결과를 파싱하여 에이전트에게 피드백을 제공합니다.
- **Review-PR**: GitHub PR을 생성하거나 리뷰 코멘트를 답니다.
- **Deploy, Docs, Interview**: (설계상 존재) 배포, 문서화, 요구사항 수집 도구.

---

## 5. 구현 상태 분석 (Current Status Analysis)

소스 코드를 정밀 분석한 결과, 이 프로젝트는 현재 **구조적 검증 단계**에 있습니다.

1.  **시뮬레이션 중심**: `AgentExecutor`와 `SkillExecutor`는 기본적으로 `simulate: true`로 설정되어 있으며, 내부 로직도 하드코딩된 시뮬레이션 응답(`simulatePlannerExecution` 등)을 반환합니다.
2.  **LLM 연동 미구현**: 실제 Claude API를 호출하는 코드가 `// TODO(human): 실제 AI 모델 호출 로직 구현` 주석과 함께 비워져 있습니다.
3.  **의존성 부재**: `package.json`에 `dependencies`(런타임 의존성)가 하나도 없으며, 오직 `devDependencies`만 존재합니다. 이는 이 프로젝트가 아직 실행 가능한 제품이라기보다 '디자인 패턴'이나 'boilerplate'임을 시사합니다.

## 6. 결론 및 추천

이 시스템은 **매우 잘 설계된 AI 에이전트 아키텍처**를 보여줍니다. 특히 다음 부분에서 배울 점이 많습니다:

- 역할이 뚜렷한 **전문가 에이전트 모델** (Planner-Coder-Reviewer 분업)
- **Self-healing** 메커니즘 (테스트 실패 시 재시도)
- 명시적인 **승인 절차** (Human-in-the-loop)
- 프로젝트 문서화 (`docs/FAQ.md`, `AGENT.md` 등) 수준이 매우 높음

**향후 발전 방향**:
이 프레임워크를 실제로 작동시키기 위해서는 `src/engine/` 내의 `simulateX` 메서드들을 실제 Anthropic API 호출 및 Shell Command 실행(`child_process`) 로직으로 대체해야 합니다.
