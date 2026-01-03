# Conventions

> 코딩 규칙 및 스타일 가이드

---

## Overview

이 문서는 AI와 사용자가 일관된 코드를 작성하기 위한 규칙을 정의합니다.

---

## Naming Conventions

### 변수 및 함수

| 항목 | 규칙 | 예시 |
|------|------|------|
| 변수 | camelCase | `userName`, `isActive` |
| 상수 | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT`, `API_URL` |
| 함수 | camelCase (동사로 시작) | `getUserById`, `validateInput` |
| 클래스 | PascalCase | `UserService`, `HttpClient` |
| 인터페이스 | PascalCase | `IUserRepository`, `ConfigOptions` |
| 타입 | PascalCase | `UserRole`, `ApiResponse` |
| Enum | PascalCase (값은 UPPER_SNAKE) | `Status.ACTIVE`, `Role.ADMIN` |

### 파일 및 디렉토리

| 항목 | 규칙 | 예시 |
|------|------|------|
| 파일 (일반) | kebab-case | `user-service.ts`, `api-client.ts` |
| 파일 (컴포넌트) | PascalCase | `UserProfile.tsx`, `Button.tsx` |
| 파일 (테스트) | `*.test.ts` 또는 `*.spec.ts` | `user-service.test.ts` |
| 디렉토리 | kebab-case | `user-management/`, `api-clients/` |

---

## Code Style

### TypeScript

```typescript
// 1. 타입 명시 (추론 가능해도 명시 권장)
const userName: string = 'John';
const count: number = 0;

// 2. 인터페이스 정의
interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

// 3. 함수 타입 명시
function getUserById(id: string): Promise<User | null> {
  // ...
}

// 4. 화살표 함수 (콜백에서 사용)
const users = data.map((item): User => ({
  id: item.id,
  name: item.name,
  email: item.email,
  createdAt: new Date(item.created_at),
}));

// 5. async/await 사용 (Promise.then 대신)
async function fetchUser(id: string): Promise<User> {
  const response = await fetch(`/api/users/${id}`);
  return response.json();
}

// 6. 에러 처리
try {
  const user = await fetchUser(id);
} catch (error) {
  if (error instanceof NotFoundError) {
    // 특정 에러 처리
  }
  throw error; // 재throw
}
```

### Import 순서

```typescript
// 1. 외부 라이브러리
import { useState, useEffect } from 'react';
import axios from 'axios';

// 2. 내부 모듈 (절대 경로)
import { UserService } from '@/services/user-service';
import { Button } from '@/components/ui/button';

// 3. 상대 경로
import { formatDate } from './utils';
import type { User } from './types';
```

---

## Documentation

### JSDoc 주석

```typescript
/**
 * 사용자 정보를 조회합니다.
 *
 * @param id - 사용자 ID
 * @returns 사용자 정보 또는 null (찾지 못한 경우)
 * @throws {ValidationError} ID 형식이 잘못된 경우
 *
 * @example
 * const user = await getUserById('user-123');
 * if (user) {
 *   console.log(user.name);
 * }
 */
async function getUserById(id: string): Promise<User | null> {
  // ...
}
```

### 인라인 주석

```typescript
// 주석은 "왜"를 설명 (무엇을 하는지가 아니라)

// Bad: 배열을 순회한다
for (const item of items) { ... }

// Good: 중복 제거를 위해 역순으로 순회
for (let i = items.length - 1; i >= 0; i--) { ... }
```

---

## Git Commit Messages

### 형식

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type

| Type | 설명 |
|------|------|
| feat | 새로운 기능 |
| fix | 버그 수정 |
| docs | 문서 변경 |
| style | 코드 포맷팅 (동작 변경 없음) |
| refactor | 리팩토링 (기능 변경 없음) |
| test | 테스트 추가/수정 |
| chore | 빌드, 설정 변경 |
| perf | 성능 개선 |

### 예시

```
feat(auth): 소셜 로그인 기능 추가

- Google OAuth 연동
- Kakao OAuth 연동
- 기존 이메일 로그인과 통합

Closes #123
```

---

## Testing

### 테스트 파일 구조

```typescript
describe('UserService', () => {
  // Setup
  let userService: UserService;

  beforeEach(() => {
    userService = new UserService();
  });

  describe('getUserById', () => {
    it('should return user when found', async () => {
      // Arrange
      const userId = 'user-123';

      // Act
      const user = await userService.getUserById(userId);

      // Assert
      expect(user).toBeDefined();
      expect(user.id).toBe(userId);
    });

    it('should return null when not found', async () => {
      // Arrange
      const userId = 'non-existent';

      // Act
      const user = await userService.getUserById(userId);

      // Assert
      expect(user).toBeNull();
    });
  });
});
```

### 테스트 네이밍

```typescript
// Pattern: should [expected behavior] when [condition]

it('should return user when found', ...);
it('should throw error when invalid id', ...);
it('should update name when valid input', ...);
```

---

## Error Handling

### 에러 클래스 정의

```typescript
// 기본 에러 클래스
class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

// 구체적 에러
class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super(`${resource} not found: ${id}`, 'NOT_FOUND', 404);
  }
}

class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', 400);
  }
}
```

### 에러 처리 패턴

```typescript
// Service layer - 에러 발생
async function getUserById(id: string): Promise<User> {
  const user = await repository.findById(id);
  if (!user) {
    throw new NotFoundError('User', id);
  }
  return user;
}

// Controller layer - 에러 처리
async function handleGetUser(req, res) {
  try {
    const user = await getUserById(req.params.id);
    res.json(user);
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
```

---

## Project Structure

### 기본 구조

```
src/
├── components/           # UI 컴포넌트
│   ├── ui/              # 기본 UI 요소
│   └── features/        # 기능별 컴포넌트
├── services/            # 비즈니스 로직
├── repositories/        # 데이터 접근
├── utils/               # 유틸리티 함수
├── types/               # 타입 정의
├── hooks/               # 커스텀 훅
├── constants/           # 상수 정의
└── config/              # 설정
```

### 모듈 구조

```
feature/
├── index.ts             # Public exports
├── feature.service.ts   # 비즈니스 로직
├── feature.repository.ts # 데이터 접근
├── feature.types.ts     # 타입 정의
├── feature.utils.ts     # 유틸리티
└── __tests__/           # 테스트
    └── feature.test.ts
```

---

## Forbidden Patterns

### 하지 말아야 할 것

```typescript
// 1. any 사용 금지
const data: any = fetchData(); // Bad
const data: unknown = fetchData(); // Good (검증 필요)

// 2. 중첩 콜백 금지
getData((data) => {
  processData(data, (result) => {
    saveData(result, () => { ... }); // Bad
  });
});
// Good: async/await 사용

// 3. 매직 넘버 금지
if (retryCount > 3) { ... } // Bad
if (retryCount > MAX_RETRY_COUNT) { ... } // Good

// 4. 긴 함수 금지 (50줄 초과)
// 함수를 작게 분리

// 5. 깊은 중첩 금지 (3단계 초과)
// early return 패턴 사용
```

---

## Related Documents

- [CLAUDE.md](../CLAUDE.md) - 핵심 규칙
- [Architecture](./architecture.md) - 시스템 구조
- [Workflow](./workflow.md) - 작업 흐름
