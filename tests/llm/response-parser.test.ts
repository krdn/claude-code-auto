/**
 * Response Parser 단위 테스트
 */

import { describe, it, expect } from 'vitest';
import {
  extractSection,
  extractCodeBlocks,
  extractFileChanges,
  parseMarkdownTable,
  parseMarkdownList,
  parsePlannerResponseFromMarkdown,
  parseCoderResponseFromMarkdown,
  parseReviewerResponseFromMarkdown,
} from '../../src/llm/response-parser.js';
import type { AgentInput } from '../../src/types/agent.js';

describe('Markdown Parser Utilities', () => {
  describe('extractSection', () => {
    it('should extract section content by heading', () => {
      const markdown = `## Title
Content here
### Sub
More content`;

      const result = extractSection(markdown, '## Title');
      expect(result).toBe('Content here');
    });

    it('should handle heading without ## prefix', () => {
      const markdown = `## 목표
이것은 목표입니다
### 세부사항
더 많은 내용`;

      const result = extractSection(markdown, '목표');
      expect(result).toBe('이것은 목표입니다');
    });

    it('should return null for non-existent heading', () => {
      const markdown = `## Title\nContent`;
      const result = extractSection(markdown, 'NotFound');
      expect(result).toBeNull();
    });

    it('should handle multiple lines of content', () => {
      const markdown = `## Section
Line 1
Line 2
Line 3
## Next Section`;

      const result = extractSection(markdown, 'Section');
      expect(result).toBe('Line 1\nLine 2\nLine 3');
    });
  });

  describe('extractCodeBlocks', () => {
    it('should extract all code blocks with language', () => {
      const markdown = `\`\`\`typescript
const x = 1;
\`\`\`

\`\`\`javascript
var y = 2;
\`\`\``;

      const blocks = extractCodeBlocks(markdown);
      expect(blocks).toHaveLength(2);
      expect(blocks[0]).toEqual({ language: 'typescript', code: 'const x = 1;' });
      expect(blocks[1]).toEqual({ language: 'javascript', code: 'var y = 2;' });
    });

    it('should extract label from file heading', () => {
      const markdown = `#### src/test.ts
\`\`\`typescript
export const test = 1;
\`\`\``;

      const blocks = extractCodeBlocks(markdown);
      expect(blocks[0].label).toBe('src/test.ts');
      expect(blocks[0].code).toContain('export const test = 1');
    });

    it('should handle code blocks without language tag', () => {
      const markdown = `\`\`\`
plain text
\`\`\``;

      const blocks = extractCodeBlocks(markdown);
      expect(blocks[0].language).toBe('text');
    });
  });

  describe('extractFileChanges', () => {
    it('should extract file path and code from markdown', () => {
      const markdown = `### 변경 파일
- \`src/test.ts\`: 테스트 파일

#### src/test.ts
\`\`\`typescript
export const test = 1;
\`\`\``;

      const changes = extractFileChanges(markdown);
      expect(changes).toHaveLength(1);
      expect(changes[0].path).toBe('src/test.ts');
      expect(changes[0].content).toContain('export const test = 1');
    });

    it('should determine change type from context', () => {
      const markdown = `### 변경 파일
- \`src/new.ts\`: 새 파일 생성

#### src/new.ts
\`\`\`typescript
export const newFile = true;
\`\`\``;

      const changes = extractFileChanges(markdown);
      expect(changes[0].changeType).toBe('create');
    });

    it('should handle modify as default change type', () => {
      const markdown = `#### src/existing.ts
\`\`\`typescript
export const existing = true;
\`\`\``;

      const changes = extractFileChanges(markdown);
      expect(changes[0].changeType).toBe('modify');
    });
  });

  describe('parseMarkdownTable', () => {
    it('should parse table rows into objects', () => {
      const tableText = `| 파일 | 변경 유형 | 설명 |
|------|----------|------|
| src/test.ts | create | 테스트 파일 |
| src/main.ts | modify | 메인 파일 수정 |`;

      const rows = parseMarkdownTable(tableText);
      expect(rows).toHaveLength(2);
      expect(rows[0]).toEqual({
        파일: 'src/test.ts',
        '변경 유형': 'create',
        설명: '테스트 파일',
      });
      expect(rows[1]['파일']).toBe('src/main.ts');
    });

    it('should return empty array for invalid table', () => {
      const tableText = 'Not a table';
      const rows = parseMarkdownTable(tableText);
      expect(rows).toEqual([]);
    });
  });

  describe('parseMarkdownList', () => {
    it('should parse bullet list items', () => {
      const listText = `- Item 1
- Item 2
- Item 3`;

      const items = parseMarkdownList(listText);
      expect(items).toEqual(['Item 1', 'Item 2', 'Item 3']);
    });

    it('should parse numbered list items', () => {
      const listText = `1. First
2. Second
3. Third`;

      const items = parseMarkdownList(listText);
      expect(items).toEqual(['First', 'Second', 'Third']);
    });

    it('should parse mixed list with asterisks', () => {
      const listText = `* Alpha
* Beta`;

      const items = parseMarkdownList(listText);
      expect(items).toEqual(['Alpha', 'Beta']);
    });
  });
});

describe('parsePlannerResponseFromMarkdown', () => {
  it('should parse complete plan response', () => {
    const markdown = `## 작업 계획: 테스트 기능 구현

### 목표
테스트 기능을 구현합니다.

### 영향 파일
| 파일 | 변경 유형 | 설명 |
|------|----------|------|
| src/test.ts | create | 테스트 파일 생성 |
| src/main.ts | modify | 메인 파일 수정 |

### 단계별 계획
1. **Phase 1**: 기본 구조 생성
   - 파일 생성
   - 타입 정의
2. **Phase 2**: 테스트 작성
   - 단위 테스트
   - 통합 테스트

### 리스크 및 고려사항
- **high**: 데이터 손실 가능성 → 백업 필수
- **medium**: 성능 저하 우려 → 최적화 필요`;

    const input: AgentInput = { request: '테스트 기능 구현' };
    const result = parsePlannerResponseFromMarkdown(markdown, input);

    expect(result.role).toBe('planner');
    expect(result.success).toBe(true);
    expect(result.title).toBe('테스트 기능 구현');
    expect(result.objective).toBe('테스트 기능을 구현합니다.');
    expect(result.affectedFiles).toHaveLength(2);
    expect(result.affectedFiles[0].path).toBe('src/test.ts');
    expect(result.affectedFiles[0].changeType).toBe('create');
    expect(result.phases).toHaveLength(2);
    expect(result.phases[0].number).toBe(1);
    expect(result.phases[0].tasks).toHaveLength(2);
    expect(result.risks).toHaveLength(2);
    expect(result.risks[0].impact).toBe('high');
    expect(result.approvalStatus).toBe('pending');
  });

  it('should handle minimal plan response', () => {
    const markdown = `## 작업 계획: 간단한 작업`;
    const input: AgentInput = { request: '간단한 작업' };
    const result = parsePlannerResponseFromMarkdown(markdown, input);

    expect(result.success).toBe(true);
    expect(result.affectedFiles).toEqual([]);
    expect(result.phases).toEqual([]);
    expect(result.risks).toEqual([]);
  });

  it('should handle parsing errors gracefully', () => {
    const markdown = 'Invalid markdown';
    const input: AgentInput = { request: 'test' };
    const result = parsePlannerResponseFromMarkdown(markdown, input);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.affectedFiles).toEqual([]);
  });
});

describe('parseCoderResponseFromMarkdown', () => {
  it('should parse file changes and extract code', () => {
    const markdown = `## 구현 완료: 파서 구현

### 변경 파일
- \`src/parser.ts\`: 파서 구현
- \`src/utils.ts\`: 유틸리티 추가

### 파일 변경사항

#### src/parser.ts
\`\`\`typescript
export function parse() {
  return true;
}
\`\`\`

#### src/utils.ts
\`\`\`typescript
export const helper = () => {};
\`\`\``;

    const result = parseCoderResponseFromMarkdown(markdown);

    expect(result.message).toBe('파서 구현');
    expect(result.fileChanges).toHaveLength(2);
    expect(result.fileChanges[0].path).toBe('src/parser.ts');
    expect(result.fileChanges[0].content).toContain('export function parse()');
    expect(result.fileChanges[0].summary).toBe('파서 구현');
    expect(result.fileChanges[1].path).toBe('src/utils.ts');
  });

  it('should calculate lines changed', () => {
    const markdown = `#### src/test.ts
\`\`\`typescript
export const a = 1;
export const b = 2;
export const c = 3;
\`\`\``;

    const result = parseCoderResponseFromMarkdown(markdown);

    expect(result.fileChanges[0].linesChanged.added).toBeGreaterThan(0);
  });

  it('should handle empty response gracefully', () => {
    const markdown = '## 구현 완료';
    const result = parseCoderResponseFromMarkdown(markdown);

    expect(result.message).toBeDefined();
    expect(result.fileChanges).toEqual([]);
  });
});

describe('parseReviewerResponseFromMarkdown', () => {
  it('should parse review with score and decision', () => {
    const markdown = `## 코드 리뷰: 테스트 리뷰

### 종합 평가
- **점수**: 90/100
- **품질**: pass
- **보안**: pass
- **성능**: warning
- **커버리지**: pass

### 긍정적 요소
- 타입 정의가 명확함
- 테스트 커버리지 우수

### Critical Issues
(없음)

### 개선 제안
- src/parser.ts:45 - 정규식 성능 최적화 권장
- src/utils.ts:12 - 에러 처리 추가 필요

### 보안 검사
- SQL Injection: N/A
- XSS: Safe
- CSRF: N/A

### 최종 결정
**승인** (Approved)`;

    const result = parseReviewerResponseFromMarkdown(markdown);

    expect(result.role).toBe('reviewer');
    expect(result.success).toBe(true);
    expect(result.score).toBe(90);
    expect(result.summary.quality).toBe('pass');
    expect(result.summary.performance).toBe('warning');
    expect(result.positives).toHaveLength(2);
    expect(result.criticalIssues).toHaveLength(0);
    expect(result.suggestions).toHaveLength(2);
    expect(result.suggestions[0].file).toBe('src/parser.ts');
    expect(result.suggestions[0].line).toBe(45);
    expect(result.securityCheck.xss).toBe('safe');
    expect(result.decision).toBe('approved');
    expect(result.nextStep).toBe('complete');
  });

  it('should parse conditional approval', () => {
    const markdown = `## 코드 리뷰

### 종합 평가
- **점수**: 75/100

### 최종 결정
**조건부 승인** (Conditional)`;

    const result = parseReviewerResponseFromMarkdown(markdown);

    expect(result.decision).toBe('conditional');
    expect(result.nextStep).toBe('coder');
  });

  it('should parse rejection', () => {
    const markdown = `## 코드 리뷰

### 최종 결정
**거부** (Rejected)`;

    const result = parseReviewerResponseFromMarkdown(markdown);

    expect(result.decision).toBe('rejected');
  });

  it('should handle parsing errors gracefully', () => {
    const markdown = 'Invalid review';
    const result = parseReviewerResponseFromMarkdown(markdown);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.decision).toBe('rejected');
  });
});
