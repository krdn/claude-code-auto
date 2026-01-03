---
name: deploy
description: 배포 프로세스 실행. 빌드, 테스트, 배포를 순차적으로 수행합니다. "/deploy" 또는 "배포해줘"로 사용.
---

# Deploy Skill

## 개요

프로젝트를 빌드하고 배포합니다.
배포 전 검증을 수행하고, 배포 후 상태를 확인합니다.

---

## 사용 시점

- `/deploy` 명령어
- "배포해줘", "프로덕션 배포"
- 기능 완료 및 리뷰 승인 후
- 핫픽스 배포 시

---

## 실행 방법

### 1. 배포 전 검증

```bash
# 테스트 실행
npm test

# 린트 검사
npm run lint

# 타입 체크
npm run type-check

# 빌드
npm run build
```

### 2. 환경 확인

```bash
# 환경 변수 확인
echo $NODE_ENV

# 배포 설정 확인
cat deploy.config.js  # 또는 해당 설정 파일
```

### 3. 배포 실행

#### Vercel

```bash
vercel --prod
```

#### Docker

```bash
docker build -t app:latest .
docker push registry/app:latest
```

#### SSH 배포

```bash
ssh user@server 'cd /app && git pull && npm install && pm2 restart all'
```

### 4. 배포 후 확인

```bash
# 헬스 체크
curl https://app.example.com/health

# 로그 확인
vercel logs --prod  # 또는 해당 플랫폼 명령
```

---

## 입력

| 항목 | 필수 | 설명 |
|------|------|------|
| 환경 | N | staging / production (기본: staging) |
| 버전 | N | 배포 버전 태그 |
| 스킵 옵션 | N | 테스트 스킵 등 (권장하지 않음) |

---

## 출력

### 성공 시

```markdown
## 배포 완료 ✅

### 배포 정보
| 항목 | 값 |
|------|-----|
| 환경 | Production |
| 버전 | v1.2.3 |
| 시간 | 2025-01-03 15:30:00 |
| URL | https://app.example.com |

### 배포 전 검증
| 항목 | 상태 |
|------|------|
| 테스트 | ✅ 45/45 통과 |
| 린트 | ✅ 통과 |
| 빌드 | ✅ 성공 |

### 배포 후 확인
| 항목 | 상태 |
|------|------|
| 헬스 체크 | ✅ 정상 |
| 응답 시간 | 120ms |

### 다음 단계
- 모니터링 대시보드 확인
- 에러 로그 모니터링
```

### 실패 시

```markdown
## 배포 실패 ❌

### 실패 단계
빌드 단계에서 실패

### 에러 내용
```
Error: Cannot find module 'missing-package'
```

### 원인 분석
의존성 패키지 누락

### 조치 방안
1. `npm install missing-package` 실행
2. package.json 확인
3. 재배포

### 롤백 정보
이전 버전 (v1.2.2)이 현재 운영 중입니다.
```

---

## 배포 체크리스트

### 배포 전
- [ ] 모든 테스트 통과
- [ ] 코드 리뷰 완료
- [ ] main 브랜치에 머지
- [ ] 환경 변수 설정 확인
- [ ] 마이그레이션 준비 (필요시)

### 배포 중
- [ ] 빌드 성공
- [ ] 배포 스크립트 실행
- [ ] 배포 상태 모니터링

### 배포 후
- [ ] 헬스 체크 통과
- [ ] 스모크 테스트 통과
- [ ] 에러 로그 확인
- [ ] 성능 메트릭 확인

---

## 롤백 절차

문제 발생 시 즉시 롤백:

```bash
# 이전 버전으로 롤백
vercel rollback  # Vercel

# Docker 롤백
docker pull registry/app:previous
docker-compose up -d

# Git 기반 롤백
git revert HEAD
git push origin main
```

---

## 승인 레벨

| 환경 | 승인 레벨 | 승인자 |
|------|----------|--------|
| Development | L1 | 자동 |
| Staging | L2 | 개발자 |
| Production | L4 | 개발자 + 관리자 |

### Production 배포 시

```markdown
## Production 배포 승인 요청

**버전**: v1.2.3
**변경 내용**:
- 사용자 프로필 기능 추가
- 로그인 버그 수정

**위험 평가**: 낮음
**롤백 계획**: 이전 버전 (v1.2.2) 즉시 롤백 가능

배포를 승인하시겠습니까?
- [ ] 승인
- [ ] 거부
```

---

## 환경별 설정

### Staging

```yaml
environment: staging
url: https://staging.app.example.com
auto_deploy: true
branch: develop
```

### Production

```yaml
environment: production
url: https://app.example.com
auto_deploy: false
branch: main
approval_required: true
```

---

## 관련 문서

- [[Workflow]] - 전체 워크플로우
- [[Reviewer]] - 코드 리뷰 Agent
- [[Test]] - 테스트 Skill
