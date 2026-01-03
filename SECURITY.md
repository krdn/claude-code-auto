# Security Policy

## Supported Versions

현재 보안 업데이트를 지원하는 버전입니다.

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

### 취약점 보고 방법

보안 취약점을 발견하셨다면, 다음 방법 중 하나를 이용해 주세요:

1. **GitHub Security Advisories** (권장)
   - [새 Security Advisory 생성](https://github.com/krdn/claude-code-auto/security/advisories/new)
   - 비공개로 취약점을 보고할 수 있습니다

2. **이메일**
   - 저장소 관리자에게 직접 연락

### 보고 시 포함할 정보

- 취약점 유형 (예: XSS, SQL Injection, 인증 우회 등)
- 영향받는 파일 또는 컴포넌트
- 취약점 재현 단계
- 가능한 경우, 개념 증명(PoC) 코드
- 예상되는 영향도

### 응답 절차

| 단계 | 기간 | 설명 |
|------|------|------|
| 확인 | 48시간 | 보고 접수 확인 |
| 분류 | 7일 | 심각도 평가 및 우선순위 결정 |
| 수정 | 30일 | 취약점 패치 개발 |
| 공개 | 패치 후 | 보안 권고문 발행 |

### 심각도 분류

| 등급 | 기준 | 대응 시간 |
|------|------|----------|
| Critical | 시스템 장악, 데이터 유출 가능 | 24시간 |
| High | 인증 우회, 권한 상승 | 7일 |
| Medium | 정보 노출, 서비스 장애 | 30일 |
| Low | 경미한 정보 노출 | 90일 |

## Security Best Practices

이 프로젝트 사용 시 권장되는 보안 사항입니다:

### 1. 환경 변수 관리
```bash
# .env 파일은 절대 커밋하지 마세요
.env
.env.local
.env.*.local
```

### 2. 의존성 관리
```bash
# 정기적으로 보안 취약점 검사
npm audit

# 자동 수정
npm audit fix
```

### 3. CI/CD 보안
- GitHub Secrets 사용
- Dependabot 활성화
- CodeQL 스캔 활성화

## Acknowledgments

보안 취약점을 책임감 있게 보고해 주신 분들께 감사드립니다. 기여자 명단은 요청 시 공개됩니다.

---

*이 보안 정책은 프로젝트의 성장에 따라 업데이트될 수 있습니다.*
