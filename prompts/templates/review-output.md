# Review Output Template

이 템플릿은 Reviewer Agent가 생성하는 리뷰 문서의 표준 형식입니다.

## 코드 리뷰: {{title}}

### 승인 여부
{{#if approved}}
- [x] 승인 (Approve)
{{else if requestChanges}}
- [x] 조건부 승인 (Request Changes)
{{else}}
- [x] 거부 (Reject)
{{/if}}

### 코드 품질 (5점 만점)
- 가독성: {{quality.readability}}/5
- 유지보수성: {{quality.maintainability}}/5
- 테스트 품질: {{quality.testQuality}}/5
- 문서화: {{quality.documentation}}/5

### 발견된 이슈

#### 🔴 Critical (즉시 수정 필요)
{{#each issues.critical}}
- **{{this.file}}:{{this.line}}**: {{this.description}}
  ```typescript
  // 수정 제안
  {{this.suggestion}}
  ```
{{/each}}

#### 🟡 Warning (개선 권장)
{{#each issues.warning}}
- **{{this.file}}:{{this.line}}**: {{this.description}}
{{/each}}

#### 🟢 Info (참고사항)
{{#each issues.info}}
- {{this.description}}
{{/each}}

### 보안 검사
- [{{#if security.xss}}x{{else}} {{/if}}] XSS 취약점 없음
- [{{#if security.sqlInjection}}x{{else}} {{/if}}] SQL Injection 취약점 없음
- [{{#if security.cmdInjection}}x{{else}} {{/if}}] Command Injection 취약점 없음
- [{{#if security.sensitiveData}}x{{else}} {{/if}}] 민감 정보 노출 없음
- [{{#if security.errorHandling}}x{{else}} {{/if}}] 적절한 에러 처리

### 성능 검사
- [{{#if performance.loops}}x{{else}} {{/if}}] 불필요한 루프 없음
- [{{#if performance.memoryLeak}}x{{else}} {{/if}}] 메모리 누수 가능성 없음
- [{{#if performance.async}}x{{else}} {{/if}}] 비동기 처리 적절
- [{{#if performance.caching}}x{{else}} {{/if}}] 캐싱 고려됨

### 테스트 검증
- 커버리지: {{coverage}}% (목표: 85%)
{{#if missingTests}}
- **누락된 테스트 케이스**:
  {{#each missingTests}}
  - {{this}}
  {{/each}}
{{/if}}

### 개선 제안
{{#each suggestions}}
{{@index}}. {{this}}
{{/each}}

### 다음 단계
{{#if approved}}
- /commit 실행 가능
- PR 생성 가능
{{else if requestChanges}}
- 수정 후 재검토 요청
{{else}}
- 계획 단계로 복귀
{{/if}}
