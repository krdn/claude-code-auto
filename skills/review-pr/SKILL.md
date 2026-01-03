---
name: review-pr
description: Pull Request 생성 및 리뷰. PR을 생성하고 변경사항을 분석합니다. "/review-pr" 또는 "PR 만들어줘"로 사용.
---

# Review-PR Skill

## 개요

Pull Request를 생성하고 변경사항을 분석하여 리뷰를 수행합니다.
기존 PR의 리뷰도 지원합니다.

---

## 사용 시점

- `/review-pr` 명령어
- "PR 만들어줘", "풀리퀘스트 생성"
- "PR 리뷰해줘", "PR #123 확인"
- 기능 구현 완료 후

---

## 실행 방법

### PR 생성

#### 1. 현재 상태 확인

```bash
# 브랜치 상태
git status
git branch -a

# 원격과 비교
git log origin/main..HEAD --oneline

# 변경사항 확인
git diff origin/main...HEAD
```

#### 2. PR 생성

```bash
# 브랜치 푸시
git push -u origin <branch-name>

# PR 생성
gh pr create \
  --title "<title>" \
  --body "$(cat <<'EOF'
## Summary
<1-3 bullet points>

## Changes
- <change 1>
- <change 2>

## Test plan
- [ ] <test 1>
- [ ] <test 2>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

### PR 리뷰

#### 1. PR 정보 가져오기

```bash
# PR 상세 정보
gh pr view <number>

# PR diff
gh pr diff <number>

# PR 코멘트
gh api repos/{owner}/{repo}/pulls/{number}/comments
```

#### 2. 리뷰 수행

Reviewer Agent와 동일한 기준으로 검토:
- 코드 품질
- 보안 검사
- 성능 검사
- 테스트 확인

#### 3. 리뷰 코멘트 작성

```bash
# 리뷰 제출
gh pr review <number> \
  --approve|--request-changes|--comment \
  --body "<review comment>"
```

---

## 입력

| 항목 | 필수 | 설명 |
|------|------|------|
| PR 번호 | N | 기존 PR 리뷰 시 |
| 대상 브랜치 | N | 기본값: main |
| 제목 | N | PR 제목 (자동 생성) |

---

## 출력

### PR 생성 시

```markdown
## PR 생성 완료

**PR**: #123
**URL**: https://github.com/user/repo/pull/123
**브랜치**: feature/profile → main

### 요약
사용자 프로필 페이지를 추가합니다.

### 변경 파일
| 파일 | 변경 |
|------|------|
| `src/pages/profile.tsx` | +45 |
| `src/api/profile.ts` | +23 |
| `src/routes/index.ts` | +2 |

### 체크리스트
- [x] 테스트 통과
- [x] 린트 통과
- [ ] 리뷰 대기 중

### 다음 단계
리뷰어를 지정하고 리뷰를 요청하세요.
```

### PR 리뷰 시

```markdown
## PR 리뷰 결과

**PR**: #123 - 사용자 프로필 페이지 추가

### 요약
| 항목 | 상태 |
|------|------|
| 코드 품질 | ✅ 양호 |
| 보안 검사 | ✅ 통과 |
| 테스트 | ✅ 통과 |

### 긍정적 요소
- 타입 정의가 명확함
- 에러 처리가 적절함

### 개선 제안
| 파일 | 라인 | 제안 |
|------|------|------|
| `profile.tsx` | 23 | 로딩 상태 추가 권장 |

### 결론
✅ **승인 (Approve)**

머지해도 좋습니다.
```

---

## PR 템플릿

### 기능 추가

```markdown
## Summary
<기능 설명>

## Changes
- <변경 1>
- <변경 2>

## Screenshots (if applicable)
<스크린샷>

## Test plan
- [ ] <테스트 항목>

## Checklist
- [ ] 테스트 추가
- [ ] 문서 업데이트
- [ ] 린트/타입체크 통과
```

### 버그 수정

```markdown
## Summary
<버그 설명 및 수정 내용>

## Root cause
<원인 분석>

## Solution
<해결 방법>

## Test plan
- [ ] 버그 재현 테스트
- [ ] 회귀 테스트

Fixes #<issue-number>
```

---

## 리뷰 체크리스트

### 코드 품질
- [ ] 명확한 변수/함수명
- [ ] 적절한 주석
- [ ] 단일 책임 원칙
- [ ] 중복 코드 없음

### 보안
- [ ] 입력값 검증
- [ ] 인증/인가 확인
- [ ] 민감정보 노출 없음

### 테스트
- [ ] 테스트 포함
- [ ] 엣지 케이스 커버
- [ ] 커버리지 기준 충족

### 문서
- [ ] README 업데이트 (필요시)
- [ ] API 문서 업데이트 (필요시)

---

## 관련 명령어

```bash
# PR 목록
gh pr list

# PR 상태 확인
gh pr status

# PR 머지
gh pr merge <number> --squash

# PR 닫기
gh pr close <number>
```

---

## 관련 문서

- [[Reviewer]] - 코드 리뷰 Agent
- [[Commit]] - 커밋 Skill
- [[Workflow]] - 전체 워크플로우
