---
name: commit
description: Git 커밋 자동화. 변경사항 분석 후 의미있는 커밋 메시지 작성. "/commit" 또는 "커밋해줘"로 사용.
---

# Commit Skill

## 개요

Git 변경사항을 분석하고 Conventional Commits 형식의 의미 있는 커밋 메시지를 자동으로 작성하여 커밋합니다.

---

## 사용 시점

- `/commit` 명령어
- "커밋해줘", "변경사항 저장"
- 코드 리뷰 승인 후
- 기능 구현 완료 후

---

## 실행 방법

### 1. 변경사항 분석

```bash
# 상태 확인
git status

# 스테이징된 변경 확인
git diff --staged

# 스테이징 안 된 변경 확인
git diff

# 최근 커밋 스타일 확인
git log --oneline -5
```

### 2. 커밋 메시지 생성

Conventional Commits 형식:

```
<type>(<scope>): <subject>

<body>

<footer>
```

#### Type 종류

| Type | 설명 | 예시 |
|------|------|------|
| feat | 새로운 기능 | feat(auth): 로그인 기능 추가 |
| fix | 버그 수정 | fix(api): 응답 형식 오류 수정 |
| docs | 문서 변경 | docs(readme): 설치 가이드 추가 |
| style | 코드 포맷팅 | style: 들여쓰기 수정 |
| refactor | 리팩토링 | refactor(user): 서비스 분리 |
| test | 테스트 추가 | test(auth): 로그인 테스트 추가 |
| chore | 빌드/설정 변경 | chore: 의존성 업데이트 |
| perf | 성능 개선 | perf(query): 인덱스 최적화 |

#### Scope (선택)

영향받는 모듈/기능 명시:
- `auth`, `user`, `api`, `ui`, `db`, etc.

#### Subject 규칙

- 명령형 현재 시제 ("add" not "added")
- 첫 글자 소문자
- 마침표 없음
- 50자 이내

### 3. 커밋 실행

```bash
# 모든 변경사항 스테이징
git add -A

# 커밋 (HEREDOC 사용)
git commit -m "$(cat <<'EOF'
<type>(<scope>): <subject>

<body>

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## 입력

| 항목 | 필수 | 설명 |
|------|------|------|
| 변경 파일 | Y | git status로 감지 |
| 메시지 힌트 | N | 사용자 제공 커밋 메시지 힌트 |

---

## 출력

### 성공 시

```markdown
## 커밋 완료

**해시**: `abc1234`
**메시지**: feat(profile): 사용자 프로필 페이지 추가

**변경 파일** (3개):
- `src/pages/profile.tsx` (신규)
- `src/routes/index.ts` (수정)
- `src/pages/__tests__/profile.test.tsx` (신규)

**다음 단계**:
- `git push` - 원격 저장소에 푸시
- `/review-pr` - PR 생성 및 리뷰
```

### 실패 시

```markdown
## 커밋 실패

**원인**: <에러 메시지>

**조치 방안**:
- <권장 조치 1>
- <권장 조치 2>
```

---

## 안전 검사

### 커밋 전 확인

| 검사 항목 | 설명 |
|----------|------|
| 보안 파일 | `.env`, `credentials`, 비밀키 포함 여부 |
| 빌드 결과물 | `dist/`, `build/`, `node_modules/` |
| 대용량 파일 | 100MB 이상 파일 |
| 디버그 코드 | `console.log`, `debugger` 문 |

### 금지 항목 발견 시

```markdown
## 커밋 차단

다음 파일은 커밋하면 안 됩니다:

**보안 위험**:
- `.env` - 환경 변수 (비밀 정보 포함 가능)

**불필요한 파일**:
- `node_modules/` - 의존성 폴더

`.gitignore`에 추가하시겠습니까?
```

---

## 예시

### 단일 기능 커밋

```markdown
## 변경사항 분석

**수정된 파일**:
- src/pages/profile.tsx (신규, 45줄)
- src/api/profile.ts (신규, 23줄)
- src/routes/index.ts (수정, +2줄)

**변경 유형**: 새로운 기능 추가

**생성된 커밋 메시지**:
```
feat(profile): 사용자 프로필 페이지 추가

- 프로필 조회 페이지 구현
- 프로필 API 연동
- 라우트 등록

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```
```

### 버그 수정 커밋

```markdown
**생성된 커밋 메시지**:
```
fix(auth): 세션 만료 시 무한 루프 수정

토큰 갱신 로직에서 race condition으로 인해
무한 루프가 발생하는 문제를 수정합니다.

Fixes #123

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```
```

---

## 주의사항

- 보안 파일은 절대 커밋하지 않음
- 빌드 결과물은 .gitignore에 등록 확인
- 빈 커밋 생성 방지
- 대용량 파일 경고
- pre-commit 훅 실패 시 수정 후 재시도

---

## 관련 문서

- [[Reviewer]] - 코드 리뷰 Agent
- [[Conventions]] - 코딩 규칙
- [[Workflow]] - 전체 워크플로우
