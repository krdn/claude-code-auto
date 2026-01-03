---
name: test
description: 테스트 실행 및 분석. 테스트 결과를 분석하고 실패 원인을 파악합니다. "/test" 또는 "테스트 실행"으로 사용.
---

# Test Skill

## 개요

프로젝트의 테스트를 실행하고 결과를 분석합니다.
테스트 실패 시 원인을 파악하고 수정 방안을 제시합니다.

---

## 사용 시점

- `/test` 명령어
- "테스트 실행", "테스트 돌려줘"
- 코드 작성 완료 후
- PR 생성 전 검증

---

## 실행 방법

### 1. 테스트 환경 확인

```bash
# package.json 확인
cat package.json | grep -A 10 '"scripts"'

# 테스트 프레임워크 확인
# Jest, Vitest, Mocha 등
```

### 2. 테스트 실행

```bash
# 기본 테스트
npm test

# 커버리지 포함
npm run test:coverage

# 특정 파일만
npm test -- <파일 패턴>

# Watch 모드
npm test -- --watch
```

### 3. 결과 분석

```
분석 항목:
- 총 테스트 수
- 통과/실패 수
- 커버리지 비율
- 실패한 테스트 상세
```

### 4. 실패 원인 파악

```
실패 유형:
- 단언문 실패 (expect 불일치)
- 타임아웃
- 런타임 에러
- 모킹 문제
```

---

## 입력

| 항목 | 필수 | 설명 |
|------|------|------|
| 테스트 범위 | N | 전체 또는 특정 파일 |
| 옵션 | N | 커버리지, watch 등 |

---

## 출력

### 성공 시

```markdown
## 테스트 결과: 통과 ✅

### 요약
| 항목 | 값 |
|------|-----|
| 총 테스트 | 45개 |
| 통과 | 45개 |
| 실패 | 0개 |
| 시간 | 3.2초 |

### 커버리지
| 항목 | 비율 | 상태 |
|------|------|------|
| Statements | 87% | ✅ |
| Branches | 82% | ✅ |
| Functions | 91% | ✅ |
| Lines | 86% | ✅ |

### 다음 단계
테스트가 통과했습니다. 커밋을 진행하세요.
```

### 실패 시

```markdown
## 테스트 결과: 실패 ❌

### 요약
| 항목 | 값 |
|------|-----|
| 총 테스트 | 45개 |
| 통과 | 42개 |
| 실패 | 3개 |

### 실패한 테스트

#### 1. `UserService.test.ts`
**테스트**: should return user when found
**에러**:
```
Expected: { id: "1", name: "John" }
Received: { id: "1", name: "Jane" }
```
**원인 분석**: 테스트 데이터와 실제 반환값 불일치
**수정 방안**:
- 테스트 기대값 수정
- 또는 getUserById 로직 확인

#### 2. `AuthService.test.ts`
**테스트**: should handle token refresh
**에러**: Timeout - Async callback was not invoked within 5000ms
**원인 분석**: 비동기 처리 타임아웃
**수정 방안**:
- 테스트 타임아웃 증가
- 또는 모킹 확인

### 자동 수정 가능 여부
- 테스트 1: ⚠️ 수동 확인 필요
- 테스트 2: ✅ 자동 수정 가능

### 다음 단계
실패한 테스트를 수정한 후 다시 실행하세요.
```

---

## 커버리지 기준

| 레벨 | 기준 | 상태 |
|------|------|------|
| 최소 | 60% | ⚠️ 경고 |
| 권장 | 80% | ✅ 양호 |
| 우수 | 90%+ | 🌟 우수 |

### 커버리지 부족 시

```markdown
## 커버리지 경고

현재 커버리지: 65% (기준: 80%)

### 커버리지가 낮은 파일
| 파일 | 커버리지 | 미테스트 라인 |
|------|----------|--------------|
| `user.service.ts` | 45% | 23-45, 67-89 |
| `auth.utils.ts` | 52% | 12-20 |

### 권장 테스트 추가
1. `user.service.ts`의 에러 처리 케이스
2. `auth.utils.ts`의 엣지 케이스
```

---

## 테스트 유형

### 단위 테스트 (Unit)

```typescript
describe('UserService', () => {
  it('should create user', () => {
    const user = createUser({ name: 'John' });
    expect(user.name).toBe('John');
  });
});
```

### 통합 테스트 (Integration)

```typescript
describe('API Integration', () => {
  it('should create and fetch user', async () => {
    await createUser({ name: 'John' });
    const user = await getUser('1');
    expect(user.name).toBe('John');
  });
});
```

### E2E 테스트

```typescript
describe('User Flow', () => {
  it('should complete registration', async () => {
    await page.goto('/register');
    await page.fill('input[name=email]', 'test@test.com');
    await page.click('button[type=submit]');
    await expect(page).toHaveURL('/dashboard');
  });
});
```

---

## Self-healing

테스트 실패 시 자동 수정 시도:

```
실패 감지
  ↓
원인 분석
  ↓
자동 수정 가능?
  ├── Y → 수정 적용 → 재실행
  └── N → 수정 방안 제시
```

### 자동 수정 가능 케이스

| 유형 | 수정 방법 |
|------|----------|
| 타입 에러 | 타입 수정 |
| 기대값 불일치 | 기대값 업데이트 (확인 후) |
| 모킹 누락 | 모킹 추가 |
| 임포트 에러 | 임포트 수정 |

---

## 관련 문서

- [[Coder]] - 코드 작성 Agent
- [[Reviewer]] - 코드 리뷰 Agent
- [[Conventions]] - 테스트 규칙
