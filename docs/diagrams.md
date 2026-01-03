# System Diagrams

> Mermaid 다이어그램을 사용한 시스템 시각화

---

## 전체 아키텍처

```mermaid
flowchart TB
    subgraph User["👤 User (Orchestrator)"]
        Request[요청]
        Approve[승인/거부]
        Review[검토]
    end

    subgraph Agents["🤖 Agent Layer"]
        Planner[Planner Agent]
        Coder[Coder Agent]
        Reviewer[Reviewer Agent]
    end

    subgraph Skills["⚡ Skills Layer"]
        Interview[/interview]
        Commit[/commit]
        Test[/test]
        ReviewPR[/review-pr]
        Deploy[/deploy]
        Docs[/docs]
    end

    subgraph Verification["✅ Verification Layer"]
        Lint[ESLint]
        TypeCheck[TypeScript]
        UnitTest[Vitest]
        Security[Security Scan]
    end

    subgraph CICD["🔄 CI/CD"]
        CI[CI Pipeline]
        SelfHealing[Self-healing]
        AutoMerge[Auto Merge]
        Release[Release]
    end

    Request --> Planner
    Planner --> Approve
    Approve -->|Yes| Coder
    Coder --> Verification
    Verification -->|Pass| Reviewer
    Verification -->|Fail| SelfHealing
    SelfHealing -->|Fixed| Verification
    SelfHealing -->|Failed| Review
    Reviewer --> AutoMerge
    AutoMerge --> Release

    Planner -.-> Interview
    Coder -.-> Test
    Coder -.-> Commit
    Reviewer -.-> ReviewPR
```

---

## 워크플로우

```mermaid
sequenceDiagram
    participant U as User
    participant P as Planner
    participant C as Coder
    participant V as Verification
    participant R as Reviewer
    participant G as GitHub

    U->>P: 기능 요청
    P->>P: 요청 분석
    P->>P: 계획 수립
    P->>U: 계획 제출

    alt 승인
        U->>C: 계획 승인
        C->>C: 코드 작성
        C->>C: 테스트 작성
        C->>V: 검증 요청

        loop Self-healing (최대 3회)
            V->>V: 린트/타입체크/테스트
            alt 실패
                V->>C: 자동 수정
                C->>V: 재검증
            end
        end

        V->>R: 검증 완료
        R->>R: 코드 리뷰
        R->>G: PR 생성
        G->>G: CI 실행
        G->>U: 머지 대기
    else 거부
        U->>P: 수정 요청
    end
```

---

## 승인 레벨

```mermaid
flowchart LR
    subgraph L1["L1 - 일반 변경"]
        L1A[코드 수정]
        L1B[버그 수정]
        L1C[리팩토링]
    end

    subgraph L2["L2 - 아키텍처"]
        L2A[구조 변경]
        L2B[의존성 추가]
        L2C[설정 변경]
    end

    subgraph L3["L3 - 보안"]
        L3A[인증/인가]
        L3B[암호화]
        L3C[보안 설정]
    end

    subgraph L4["L4 - 프로덕션"]
        L4A[배포]
        L4B[DB 마이그레이션]
        L4C[인프라 변경]
    end

    L1 -->|Auto Merge| Deploy1[자동 배포]
    L2 -->|1 Reviewer| Deploy2[수동 배포]
    L3 -->|Security Team| Deploy3[보안 검토 후 배포]
    L4 -->|Admin + Team| Deploy4[관리자 승인 후 배포]
```

---

## CI/CD 파이프라인

```mermaid
flowchart TD
    Push[Push/PR] --> CI

    subgraph CI[CI Pipeline]
        Quality[Code Quality]
        Security[Security Scan]
        Test[Test]
        Build[Build]
    end

    Quality --> Test
    Security --> Test
    Test --> Build

    Build -->|Success| Merge{Auto Merge?}
    Build -->|Failure| Healing[Self-healing]

    Merge -->|L1| AutoMerge[Auto Merge]
    Merge -->|L2+| ManualReview[Manual Review]

    AutoMerge --> Release[Release]
    ManualReview --> Release
    Healing -->|Fixed| CI
    Healing -->|Failed| Issue[Create Issue]
```

---

## 에이전트 상태 머신

```mermaid
stateDiagram-v2
    [*] --> Idle

    Idle --> Planning: 새 요청
    Planning --> WaitingApproval: 계획 완료
    WaitingApproval --> Coding: 승인
    WaitingApproval --> Planning: 수정 요청
    WaitingApproval --> Idle: 거부

    Coding --> Verifying: 코드 완료
    Verifying --> Reviewing: 검증 통과
    Verifying --> Healing: 검증 실패
    Healing --> Verifying: 수정 완료
    Healing --> Blocked: 수정 실패 (3회)

    Reviewing --> Completed: 리뷰 통과
    Reviewing --> Coding: 수정 필요

    Blocked --> Idle: 사용자 개입
    Completed --> [*]
```

---

## 데이터 흐름

```mermaid
flowchart LR
    subgraph Input
        UserReq[사용자 요청]
        Context[컨텍스트]
    end

    subgraph Processing
        Parse[요청 파싱]
        Analyze[분석]
        Generate[코드 생성]
        Verify[검증]
    end

    subgraph Output
        Code[코드]
        Tests[테스트]
        Docs[문서]
        PR[Pull Request]
    end

    UserReq --> Parse
    Context --> Parse
    Parse --> Analyze
    Analyze --> Generate
    Generate --> Verify
    Verify --> Code
    Verify --> Tests
    Verify --> Docs
    Code --> PR
    Tests --> PR
    Docs --> PR
```

---

> 💡 **Tip**: VS Code에서 [Markdown Preview Mermaid Support](https://marketplace.visualstudio.com/items?itemName=bierner.markdown-mermaid) 확장을 설치하면 다이어그램을 미리볼 수 있습니다.
