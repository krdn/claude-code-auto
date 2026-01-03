# Plan Output Template

이 템플릿은 Planner Agent가 생성하는 계획 문서의 표준 형식입니다.

## 작업 계획: {{title}}

### 목표
{{objective}}

### 영향 파일
| 파일 | 변경 유형 | 설명 |
|------|----------|------|
{{#each affectedFiles}}
| {{this.path}} | {{this.changeType}} | {{this.description}} |
{{/each}}

### 단계별 계획
{{#each phases}}
{{@index}}. **{{this.name}}**: {{this.description}}
   - {{#each this.tasks}}{{this}}{{/each}}
{{/each}}

### 리스크 및 고려사항
{{#each risks}}
- **{{this.level}}**: {{this.description}}
{{/each}}

### 테스트 계획
{{#each testPlan}}
- {{this}}
{{/each}}

### 승인 레벨
**레벨**: {{approvalLevel}}
**이유**: {{approvalReason}}

### 예상 시간
{{estimatedTime}}

### 승인 요청
위 계획을 진행해도 될까요? (Y/N)
