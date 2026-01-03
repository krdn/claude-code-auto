---
name: docs
description: 문서 자동 생성. 코드를 분석하여 문서를 생성하거나 업데이트합니다. "/docs" 또는 "문서 생성"으로 사용.
---

# Docs Skill

## 개요

코드를 분석하여 문서를 자동으로 생성하거나 업데이트합니다.
API 문서, README, 변경 로그 등을 지원합니다.

---

## 사용 시점

- `/docs` 명령어
- "문서 생성", "README 업데이트"
- 기능 추가/변경 후
- API 변경 시

---

## 실행 방법

### 1. 코드 분석

```
분석 대상:
- 소스 코드 구조
- 함수/클래스 정의
- JSDoc/TSDoc 주석
- 타입 정의
```

### 2. 문서 생성/업데이트

#### README.md

```markdown
# Project Name

## Overview
<프로젝트 설명>

## Installation
```bash
npm install
```

## Usage
<사용 예시>

## API Reference
<API 목록>

## Contributing
<기여 가이드>

## License
<라이선스>
```

#### API 문서

```markdown
# API Reference

## Endpoints

### GET /api/users
사용자 목록을 조회합니다.

**Parameters**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| page | number | N | 페이지 번호 |
| limit | number | N | 페이지당 항목 수 |

**Response**
```json
{
  "users": [...],
  "total": 100
}
```
```

#### CHANGELOG.md

```markdown
# Changelog

## [1.2.0] - 2025-01-03

### Added
- 사용자 프로필 페이지 추가
- 프로필 수정 기능

### Fixed
- 로그인 세션 만료 버그 수정

### Changed
- API 응답 형식 변경
```

---

## 입력

| 항목 | 필수 | 설명 |
|------|------|------|
| 문서 유형 | N | readme, api, changelog 등 |
| 대상 경로 | N | 특정 모듈/디렉토리 |
| 형식 | N | markdown, html 등 |

---

## 출력

### 문서 생성 시

```markdown
## 문서 생성 완료

### 생성된 문서
| 문서 | 경로 | 상태 |
|------|------|------|
| README | `README.md` | 업데이트 |
| API Docs | `docs/api.md` | 신규 |
| Changelog | `CHANGELOG.md` | 업데이트 |

### 변경 내용

#### README.md
- Installation 섹션 업데이트
- 새 기능 설명 추가

#### docs/api.md
- 새 엔드포인트 3개 추가
- 응답 형식 업데이트

### 다음 단계
문서를 검토하고 커밋하세요.
```

---

## 문서 유형

### 1. README

프로젝트 개요 문서:
- 프로젝트 설명
- 설치 방법
- 사용 예시
- 설정 옵션
- 기여 가이드

### 2. API Reference

API 명세 문서:
- 엔드포인트 목록
- 요청/응답 형식
- 인증 방법
- 에러 코드

### 3. CHANGELOG

변경 이력 문서:
- 버전별 변경사항
- Added/Changed/Fixed/Removed
- Breaking changes

### 4. Architecture

아키텍처 문서:
- 시스템 구조
- 컴포넌트 관계
- 데이터 흐름
- 기술 결정

### 5. JSDoc/TSDoc

코드 내 문서:
```typescript
/**
 * 사용자 정보를 조회합니다.
 *
 * @param id - 사용자 ID
 * @returns 사용자 정보
 * @throws {NotFoundError} 사용자가 없을 때
 *
 * @example
 * const user = await getUser('123');
 */
async function getUser(id: string): Promise<User> {
  // ...
}
```

---

## 자동 문서화 규칙

### 코드에서 추출

| 소스 | 문서 항목 |
|------|----------|
| 함수 시그니처 | 파라미터, 반환 타입 |
| JSDoc 주석 | 설명, 예시 |
| 타입 정의 | 데이터 구조 |
| 테스트 코드 | 사용 예시 |

### 변경 감지

| 변경 유형 | 문서 업데이트 |
|----------|--------------|
| 새 함수 추가 | API 문서 추가 |
| 타입 변경 | 데이터 구조 업데이트 |
| 기능 추가 | README, CHANGELOG |
| 버그 수정 | CHANGELOG |

---

## Keep a Changelog 형식

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- 새로 추가된 기능

### Changed
- 기존 기능의 변경

### Deprecated
- 곧 제거될 기능

### Removed
- 제거된 기능

### Fixed
- 버그 수정

### Security
- 보안 관련 수정
```

---

## 관련 문서

- [[Workflow]] - 전체 워크플로우
- [[Conventions]] - 코딩 규칙
- [[Commit]] - 커밋 Skill
