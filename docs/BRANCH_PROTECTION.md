# Branch Protection 설정 가이드

이 문서는 GitHub Branch Protection Rules 설정 방법을 안내합니다.

## 권장 설정

### Main 브랜치 보호

Repository Settings → Branches → Add branch protection rule

**Branch name pattern:** `main`

#### 필수 설정

| 설정 | 값 | 설명 |
|------|-----|------|
| **Require a pull request before merging** | ✅ | PR 없이 직접 푸시 방지 |
| ├─ Require approvals | 1 | 최소 1명의 승인 필요 |
| ├─ Dismiss stale pull request approvals | ✅ | 코드 변경 시 기존 승인 무효화 |
| └─ Require approval of most recent push | ✅ | 마지막 푸시에 대한 승인 필요 |
| **Require status checks to pass** | ✅ | CI 통과 필수 |
| ├─ Require branches to be up to date | ✅ | base 브랜치와 최신 상태 유지 |
| └─ Status checks | `CI Pipeline`, `PR Validation` | 필수 통과 체크 |
| **Require conversation resolution** | ✅ | 모든 리뷰 코멘트 해결 필수 |
| **Require signed commits** | 선택 | 서명된 커밋만 허용 |
| **Require linear history** | ✅ | Squash/Rebase 머지만 허용 |
| **Do not allow bypassing** | ✅ | 관리자도 규칙 준수 |

#### 제한 설정

| 설정 | 값 | 설명 |
|------|-----|------|
| **Restrict who can push** | ✅ | 특정 사용자/팀만 푸시 가능 |
| **Allow force pushes** | ❌ | Force push 금지 |
| **Allow deletions** | ❌ | 브랜치 삭제 금지 |

---

## Approval Level별 보호 규칙

AI Orchestrator의 승인 레벨에 따른 권장 설정:

### L1 - 일반 코드 변경

```
Require approvals: 1
Auto-merge: 가능
Required reviewers: 없음
```

### L2 - 아키텍처 변경

```
Require approvals: 2
Auto-merge: 불가
Required reviewers: @architects
```

### L3 - 보안 관련

```
Require approvals: 2
Auto-merge: 불가
Required reviewers: @security-team
Additional: Security review 필수
```

### L4 - 프로덕션 배포

```
Require approvals: 3
Auto-merge: 불가
Required reviewers: @admins
Additional: Deploy approval 필수
```

---

## GitHub CLI로 설정하기

```bash
# Branch protection rule 생성
gh api repos/{owner}/{repo}/branches/main/protection \
  --method PUT \
  -H "Accept: application/vnd.github+json" \
  -f required_status_checks='{"strict":true,"contexts":["CI Pipeline","PR Validation"]}' \
  -f enforce_admins=true \
  -f required_pull_request_reviews='{"dismiss_stale_reviews":true,"require_code_owner_reviews":true,"required_approving_review_count":1}' \
  -f restrictions=null \
  -f required_linear_history=true \
  -f allow_force_pushes=false \
  -f allow_deletions=false
```

---

## Ruleset (권장)

GitHub Rulesets는 더 유연한 브랜치 보호를 제공합니다.

### Ruleset 생성

Repository Settings → Rules → Rulesets → New ruleset

```yaml
name: Main Branch Protection
target: branch
enforcement: active
bypass_actors:
  - repository_admin (deploy only)
conditions:
  ref_name:
    include: ["refs/heads/main"]
rules:
  - type: pull_request
    parameters:
      required_approving_review_count: 1
      dismiss_stale_reviews_on_push: true
      require_code_owner_review: true
      require_last_push_approval: true
  - type: required_status_checks
    parameters:
      strict_required_status_checks_policy: true
      required_status_checks:
        - context: "CI Pipeline"
        - context: "PR Validation"
  - type: non_fast_forward
  - type: required_linear_history
```

---

## 체크리스트

설정 완료 후 확인사항:

- [ ] Main 브랜치에 직접 푸시 불가 확인
- [ ] PR 없이 머지 불가 확인
- [ ] CI 실패 시 머지 불가 확인
- [ ] 승인 없이 머지 불가 확인
- [ ] Force push 불가 확인
- [ ] Auto-merge 동작 확인 (L1 라벨)

---

## 문제 해결

### "Required status check is expected" 오류

1. 워크플로우 파일이 올바르게 설정되었는지 확인
2. 워크플로우 이름이 정확히 일치하는지 확인
3. 최소 한 번은 해당 워크플로우가 실행되어야 함

### "Merge blocked" 오류

1. 필요한 승인 수 확인
2. 모든 status check 통과 확인
3. 충돌 해결 확인
4. 리뷰 코멘트 해결 확인

---

> 📝 **참고**: Branch protection은 GitHub Pro, Team, Enterprise에서 완전한 기능을 사용할 수 있습니다. Free 플랜에서는 public repository에서만 사용 가능합니다.
