# Claude Max Plan으로 AI Orchestrator 사용하기

API 키 대신 Claude Max Plan 구독을 활용하여 AI Orchestrator를 사용하는 방법입니다.

---

## 개요

**두 가지 인증 방식**:

| 방식 | 비용 | 장점 | 단점 |
|------|------|------|------|
| **API 키** | 사용량 기반 요금<br/>($3-75/M tokens) | 무제한 사용<br/>프로그래밍 최적화 | 비용 발생<br/>별도 키 발급 필요 |
| **CLI (Max Plan)** | 월정액<br/>($20/month) | 고정 비용<br/>즉시 사용 가능 | 사용량 제한<br/>로컬 설치 필요 |

---

## CLI 방식 설정 (Max Plan 활용)

### 1단계: Claude Max Plan 구독 확인

```bash
# Claude Max Plan 구독 확인
# https://claude.ai/settings/billing
```

**필요사항**:
- ✅ Claude Pro 또는 Max Plan 구독
- ✅ 로컬에 Claude 설치 (claude.ai에서 다운로드)

### 2단계: Claude CLI 설치 확인

```bash
# Claude CLI 버전 확인
claude --version

# 출력 예시:
# claude version 1.0.0
```

**설치되지 않은 경우**:
1. https://claude.ai/download 방문
2. 운영체제에 맞는 Claude 다운로드
3. 설치 후 로그인

### 3단계: AI Orchestrator 설정

```bash
# .env 파일 생성
cp .env.example .env

# .env 파일 수정
nano .env
```

**.env 파일 내용**:
```bash
# LLM 인증 방식을 CLI로 변경
LLM_AUTH_METHOD=cli

# Claude CLI 경로 (기본값 사용 가능)
CLAUDE_CLI_PATH=claude

# API 키는 불필요 (주석 처리 가능)
# ANTHROPIC_API_KEY=
```

### 4단계: 작동 확인

```bash
# 빌드
npm run build

# 테스트 (시뮬레이션 모드)
npm test

# 실제 사용 (CLI 모드)
# config/development.ts에서 simulate: false 설정 필요
```

---

## CLI vs API 키 비교

### 성능 비교

| 항목 | API 키 | CLI (Max Plan) |
|------|--------|----------------|
| **응답 속도** | 빠름 (직접 API 호출) | 보통 (CLI 프록시) |
| **동시 요청** | 높음 (수백 개) | 제한적 (순차 처리) |
| **오프라인** | 불가능 | 불가능 |
| **스트리밍** | 지원 | 부분 지원 |

### 비용 비교 (월간 예상)

**API 키 방식**:
```
Planner: 100회 × Opus ($15/M) = $15-30
Coder: 500회 × Sonnet ($3/M) = $30-60
Reviewer: 300회 × Sonnet ($3/M) = $15-30
─────────────────────────────────────
총 예상 비용: $60-120/월
```

**CLI 방식 (Max Plan)**:
```
Claude Max Plan 구독료: $20/월
추가 비용: 없음 (사용량 제한 내)
─────────────────────────────────────
총 예상 비용: $20/월 (고정)
```

**💡 결론**: 월 100-300회 사용 시 CLI 방식이 경제적

---

## 사용 제한 사항

### Max Plan 사용량 제한

Claude Max Plan은 무제한이 아닙니다:

| 모델 | 시간당 제한 | 일일 제한 |
|------|-------------|-----------|
| Opus | 20 요청 | 100 요청 |
| Sonnet | 50 요청 | 300 요청 |
| Haiku | 100 요청 | 1000 요청 |

**제한 초과 시**:
- ⏳ 일시적으로 요청 차단
- ⏰ 시간/일 단위로 리셋
- 💳 API 키로 자동 전환 가능 (설정 시)

### CLI 방식의 제약사항

1. **순차 처리**: 병렬 요청 불가
2. **컨텍스트 공유 제한**: 세션 간 컨텍스트 유지 어려움
3. **에러 핸들링**: API보다 덜 정교함
4. **로그 제한**: 디버깅 정보 부족

---

## 하이브리드 모드 (권장)

평소에는 CLI, 대량 작업 시 API 키로 자동 전환:

**config/development.ts**:
```typescript
export const developmentConfig: Partial<OrchestratorConfig> = {
  llm: {
    authMethod: 'cli',  // 기본: CLI
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    cliPath: 'claude',
  },
  workflow: {
    // CLI 실패 시 API 키로 폴백
    fallbackToApiKey: true,
  },
};
```

---

## 문제 해결

### Claude CLI를 찾을 수 없음

```bash
Error: Command 'claude' not found
```

**해결책**:
1. Claude가 설치되어 있는지 확인
2. PATH에 claude 추가
3. 전체 경로 지정:
   ```bash
   CLAUDE_CLI_PATH=/Applications/Claude.app/Contents/MacOS/claude
   ```

### 인증 오류

```bash
Error: Not authenticated
```

**해결책**:
1. Claude 앱 실행
2. 로그인 확인
3. Max Plan 구독 확인

### 사용량 제한 초과

```bash
Error: Rate limit exceeded
```

**해결책**:
1. 잠시 대기 (1시간 후 리셋)
2. API 키 방식으로 전환
3. 하이브리드 모드 활성화

---

## 추천 사용 시나리오

### CLI 방식이 적합한 경우

✅ 개인 프로젝트
✅ 학습/실험용
✅ 월 300회 미만 사용
✅ 고정 예산 선호

### API 키 방식이 적합한 경우

✅ 프로덕션 환경
✅ 팀 협업 프로젝트
✅ 높은 트래픽
✅ CI/CD 파이프라인

---

## 다음 단계

1. ✅ CLI 방식 설정 완료
2. 📝 `npm test`로 작동 확인
3. 🚀 실제 프로젝트에 적용
4. 📊 사용량 모니터링
5. 💰 비용 최적화 (하이브리드 모드)

---

## 참고 링크

- [Claude Max Plan 구독](https://claude.ai/settings/billing)
- [Claude 다운로드](https://claude.ai/download)
- [API 키 발급](https://console.anthropic.com/account/keys)
- [Anthropic API 문서](https://docs.anthropic.com/)

---

**💡 팁**: 처음에는 CLI 방식으로 시작하고, 사용량이 늘어나면 API 키로 전환하는 것을 권장합니다!
