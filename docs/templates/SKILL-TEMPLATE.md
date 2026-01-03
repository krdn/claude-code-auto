# Skill Template

> 새로운 Skill을 정의할 때 이 템플릿을 사용하세요.

---

## 사용법

1. 이 파일을 복사하여 `skills/<skill-name>/SKILL.md`로 저장
2. 아래 섹션을 채워 Skill 정의
3. CLAUDE.md의 Skills 테이블에 추가

---

## 템플릿

```markdown
---
name: <skill-name>
description: <한 줄 설명>. "/<명령어>" 또는 "<자연어 트리거>"로 사용.
---

# <Skill Name>

## 개요

<Skill의 목적과 기능을 2-3문장으로 설명>

---

## 사용 시점

- `/<명령어>` 명령어
- "<자연어 트리거 1>"
- "<자연어 트리거 2>"

---

## 실행 방법

### 1. <단계 1 제목>

<단계 1 설명>

```bash
# 필요한 명령어가 있다면
<명령어>
```

### 2. <단계 2 제목>

<단계 2 설명>

### 3. <단계 3 제목>

<단계 3 설명>

---

## 입력

| 항목 | 필수 | 설명 |
|------|------|------|
| <입력1> | Y/N | <설명> |
| <입력2> | Y/N | <설명> |

---

## 출력

### 성공 시

```markdown
## <작업> 완료

**결과**: <결과 요약>
**상세**:
- <상세 1>
- <상세 2>
```

### 실패 시

```markdown
## <작업> 실패

**원인**: <에러 원인>
**조치**: <권장 조치>
```

---

## 예시

### 입력 예시

```
<사용자 입력 예시>
```

### 출력 예시

```
<출력 예시>
```

---

## 주의사항

- <주의사항 1>
- <주의사항 2>

---

## 관련 문서

- [관련 Skill 1](../related-skill/SKILL.md)
- [관련 문서](../../docs/related.md)
```

---

## 예시: Commit Skill

```markdown
---
name: commit
description: Git 커밋 자동화. 변경사항 분석 후 의미있는 커밋 메시지 작성. "/commit" 또는 "커밋해줘"로 사용.
---

# Commit Skill

## 개요

Git 변경사항을 분석하고 의미 있는 커밋 메시지를 자동으로 작성하여 커밋합니다.

---

## 사용 시점

- `/commit` 명령어
- "커밋해줘"
- "변경사항 저장해줘"

---

## 실행 방법

### 1. 변경사항 분석

```bash
git status
git diff --staged
git diff
```

### 2. 커밋 메시지 생성

Conventional Commits 형식으로 메시지 작성:
- type: feat, fix, docs, style, refactor, test, chore
- scope: 영향 받는 모듈
- subject: 변경 내용 요약

### 3. 커밋 실행

```bash
git add -A
git commit -m "<type>(<scope>): <subject>"
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

**해시**: abc1234
**메시지**: feat(auth): 로그인 기능 추가
**변경 파일**: 3개
- src/auth/login.ts
- src/auth/login.test.ts
- src/routes/index.ts
```

---

## 주의사항

- `.env`, `credentials` 등 보안 파일 커밋 방지
- 빌드 결과물(`dist/`, `node_modules/`) 커밋 방지
- 빈 커밋 생성 방지
```
