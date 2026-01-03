# Contributing Guide

AI Orchestrator Framework에 기여해 주셔서 감사합니다! 🎉

## 기여 방법

### 1. Issue 생성

새로운 기능 제안이나 버그 리포트는 [Issue 템플릿](https://github.com/krdn/claude-code-auto/issues/new/choose)을 사용해주세요.

- **Bug Report**: 버그 발견 시
- **Feature Request**: 새 기능 제안 시

### 2. Pull Request

#### 브랜치 전략

```
main          # 프로덕션 브랜치
├── develop   # 개발 브랜치
└── feat/*    # 기능 브랜치
    fix/*     # 버그 수정 브랜치
    docs/*    # 문서 브랜치
```

#### PR 프로세스

1. **Fork** 후 브랜치 생성
   ```bash
   git checkout -b feat/your-feature
   ```

2. **코드 작성** 및 테스트
   ```bash
   npm run lint
   npm run type-check
   npm test
   ```

3. **커밋** (Conventional Commits 형식)
   ```bash
   git commit -m "feat: add new feature"
   ```

4. **Push** 및 PR 생성
   ```bash
   git push origin feat/your-feature
   ```

---

## 코드 스타일

### Conventional Commits

모든 커밋 메시지는 다음 형식을 따릅니다:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Type 종류:**

| Type | 설명 |
|------|------|
| `feat` | 새로운 기능 |
| `fix` | 버그 수정 |
| `docs` | 문서 변경 |
| `style` | 포맷팅 (코드 변경 없음) |
| `refactor` | 리팩토링 |
| `test` | 테스트 추가/수정 |
| `chore` | 빌드, 설정 변경 |
| `perf` | 성능 개선 |
| `ci` | CI/CD 변경 |

**예시:**
```
feat(skills): add new deploy skill
fix(ci): resolve self-healing loop issue
docs(readme): update installation guide
```

### 코드 컨벤션

- **TypeScript** 사용
- **ESLint** + **Prettier** 규칙 준수
- **테스트 필수** (커버리지 70% 이상)

---

## 승인 레벨

PR은 변경 유형에 따라 승인 레벨이 결정됩니다:

| 레벨 | 대상 | 승인 요건 |
|------|------|----------|
| **L1** | 일반 코드 변경 | CI 통과 시 자동 머지 가능 |
| **L2** | 아키텍처 변경 | 리뷰어 1명 승인 필요 |
| **L3** | 보안 관련 | 보안 담당자 승인 필요 |
| **L4** | 프로덕션 영향 | 관리자 승인 필요 |

---

## 개발 환경 설정

### 필수 요구사항

- Node.js 20+
- npm 9+
- Git

### 설치

```bash
# 저장소 클론
git clone https://github.com/krdn/claude-code-auto.git
cd claude-code-auto

# 의존성 설치
npm install

# Git hooks 설정 (자동)
# husky가 자동으로 pre-commit, commit-msg 훅을 설정합니다
```

### 개발 명령어

```bash
npm run dev          # 개발 서버
npm run build        # 빌드
npm test             # 테스트
npm run test:coverage # 테스트 + 커버리지
npm run lint         # 린트 검사
npm run lint:fix     # 린트 자동 수정
npm run type-check   # 타입 체크
```

---

## 에이전트/스킬 추가

### 새 에이전트 추가

1. `docs/templates/AGENT-TEMPLATE.md` 복사
2. `agents/<name>/AGENT.md` 생성
3. CLAUDE.md에 등록

### 새 스킬 추가

1. `docs/templates/SKILL-TEMPLATE.md` 복사
2. `skills/<name>/SKILL.md` 생성
3. CLAUDE.md에 등록

---

## 문의

질문이나 도움이 필요하면:

- [GitHub Discussions](https://github.com/krdn/claude-code-auto/discussions)
- Issue에 `question` 라벨 추가

감사합니다! 🙏
