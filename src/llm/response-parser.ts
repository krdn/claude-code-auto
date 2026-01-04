/**
 * LLM Response Parser
 *
 * LLM이 생성한 마크다운 응답을 구조화된 데이터로 변환합니다.
 * Planner, Coder, Reviewer 에이전트의 응답을 파싱합니다.
 */

import type {
  PlanResult,
  ImplementationResult,
  ReviewResult,
  AffectedFile,
  Phase,
  Task,
  Risk,
  FileChange,
  ReviewSummary,
  ReviewIssue,
  SecurityCheck,
  AgentInput,
} from '../types/agent.js';

// ==================== 정규식 패턴 (미리 컴파일) ====================

/** 헤딩 패턴 (## Title 또는 ### Title) */
const HEADING_PATTERN = /^(#{2,3})\s+(.+)$/gm;

/** 코드 블록 패턴 (```language\ncode\n```) */
const CODE_BLOCK_PATTERN = /```(\w+)?\n([\s\S]*?)```/g;

/** 파일 경로 패턴 (백틱으로 감싼 경로: `src/file.ts`) */
const BACKTICK_PATH_PATTERN = /`([a-zA-Z0-9/_.-]+\.[a-zA-Z0-9]+)`/g;

/** 테이블 행 패턴 */
const TABLE_ROW_PATTERN = /\|(.+)\|/g;

/** 리스트 항목 패턴 (-, *, 1., 2. 등) */
const LIST_ITEM_PATTERN = /^[\s]*[-*]|\d+\.\s+(.+)$/gm;

/** 파일 경로 헤딩 패턴 (#### src/file.ts) */
const FILE_HEADING_PATTERN = /^#{3,4}\s+([a-zA-Z0-9/_.-]+\.[a-zA-Z0-9]+)/gm;

// ==================== 마크다운 파싱 유틸리티 ====================

/**
 * 마크다운에서 특정 헤딩 섹션의 내용 추출
 *
 * @param markdown 마크다운 텍스트
 * @param heading 찾을 헤딩 (예: "## Title" 또는 "목표")
 * @returns 섹션 내용 (헤딩 제외, 다음 헤딩 전까지)
 */
export function extractSection(markdown: string, heading: string): string | null {
  // 헤딩 레벨 무시하고 제목만 매칭
  const headingText = heading.replace(/^#+\s*/, '').trim();

  // 대소문자 무시 검색
  const lines = markdown.split('\n');
  let startIndex = -1;
  let headingLevel = 0;

  // 헤딩 찾기
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/^(#{1,6})\s+(.+)$/);

    if (match) {
      const level = match[1].length;
      const title = match[2].trim();

      if (title.toLowerCase().includes(headingText.toLowerCase())) {
        startIndex = i + 1;
        headingLevel = level;
        break;
      }
    }
  }

  if (startIndex === -1) {
    return null;
  }

  // 다음 헤딩까지의 내용 추출 (모든 헤딩에서 정지)
  const contentLines: string[] = [];

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/^#{1,6}\s+/);

    if (match) {
      // 모든 헤딩에서 종료 (하위 섹션 포함)
      break;
    }

    contentLines.push(line);
  }

  return contentLines.join('\n').trim();
}

/**
 * 마크다운에서 모든 코드 블록 추출
 *
 * @param markdown 마크다운 텍스트
 * @returns 코드 블록 배열 (언어, 코드, 라벨)
 */
export function extractCodeBlocks(
  markdown: string
): Array<{ language: string; code: string; label?: string }> {
  const blocks: Array<{ language: string; code: string; label?: string }> = [];
  const lines = markdown.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 코드 블록 시작 (```language)
    const match = line.match(/^```(\w+)?/);
    if (match) {
      const language = match[1] || 'text';
      const codeLines: string[] = [];

      // 이전 라인에서 라벨 찾기 (파일 경로 헤딩 등)
      let label: string | undefined;
      if (i > 0) {
        const prevLine = lines[i - 1].trim();
        const labelMatch = prevLine.match(/^#{3,4}\s+([a-zA-Z0-9/_.-]+\.[a-zA-Z0-9]+)/);
        if (labelMatch) {
          label = labelMatch[1];
        }
      }

      // 코드 블록 종료(```)까지 읽기
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j].match(/^```\s*$/)) {
          i = j; // 인덱스 업데이트
          break;
        }
        codeLines.push(lines[j]);
      }

      blocks.push({
        language,
        code: codeLines.join('\n'),
        label,
      });
    }
  }

  return blocks;
}

/**
 * 마크다운에서 파일 변경사항 추출
 *
 * 파일 경로와 코드 블록을 매칭하여 파일 변경사항 추출
 *
 * @param markdown 마크다운 텍스트
 * @returns 파일 변경사항 배열
 */
export function extractFileChanges(
  markdown: string
): Array<{ path: string; content: string; changeType: 'create' | 'modify' | 'delete' }> {
  const changes: Array<{
    path: string;
    content: string;
    changeType: 'create' | 'modify' | 'delete';
  }> = [];

  // 1. 코드 블록 추출
  const codeBlocks = extractCodeBlocks(markdown);

  // 2. 파일 경로 헤딩으로 그룹화
  for (const block of codeBlocks) {
    if (block.label) {
      // 파일 경로가 라벨로 지정된 경우
      const changeType = determineChangeType(markdown, block.label);

      changes.push({
        path: block.label,
        content: block.code,
        changeType,
      });
    }
  }

  // 3. 라벨이 없는 코드 블록은 변경 파일 섹션에서 경로 추론
  const fileListSection = extractSection(markdown, '변경 파일');
  if (fileListSection) {
    const pathMatches = fileListSection.matchAll(BACKTICK_PATH_PATTERN);
    const paths = Array.from(pathMatches).map(m => m[1]);

    // 경로 순서대로 코드 블록과 매칭
    const unlabeledBlocks = codeBlocks.filter(b => !b.label);
    for (let i = 0; i < Math.min(paths.length, unlabeledBlocks.length); i++) {
      const path = paths[i];
      const block = unlabeledBlocks[i];
      const changeType = determineChangeType(markdown, path);

      // 이미 추가된 경로는 스킵
      if (!changes.some(c => c.path === path)) {
        changes.push({
          path,
          content: block.code,
          changeType,
        });
      }
    }
  }

  return changes;
}

/**
 * 파일 변경 유형 판단
 *
 * @param markdown 마크다운 전체 텍스트
 * @param filePath 파일 경로
 * @returns 변경 유형
 */
function determineChangeType(markdown: string, filePath: string): 'create' | 'modify' | 'delete' {
  const lowerMarkdown = markdown.toLowerCase();
  const pathContext = markdown
    .substring(
      Math.max(0, lowerMarkdown.indexOf(filePath) - 100),
      lowerMarkdown.indexOf(filePath) + filePath.length + 100
    )
    .toLowerCase();

  // 키워드로 판단
  if (
    pathContext.includes('새 파일') ||
    pathContext.includes('create') ||
    pathContext.includes('생성')
  ) {
    return 'create';
  }
  if (
    pathContext.includes('삭제') ||
    pathContext.includes('delete') ||
    pathContext.includes('제거')
  ) {
    return 'delete';
  }

  // 기본값: modify
  return 'modify';
}

/**
 * 셀 값 정규화 (백틱 제거, trim)
 */
function normalizeCell(value: string): string {
  return value.replace(/`/g, '').trim();
}

/**
 * changeType 한글 → 영문 매핑
 */
function normalizeChangeType(value: string): 'create' | 'modify' | 'delete' | string {
  const lower = value.toLowerCase().trim();

  // 생성 관련
  if (lower.includes('신규') || lower.includes('생성') || lower === 'create') {
    return 'create';
  }

  // 수정 관련
  if (lower.includes('수정') || lower.includes('변경') || lower === 'modify') {
    return 'modify';
  }

  // 삭제 관련
  if (lower.includes('삭제') || lower.includes('제거') || lower === 'delete') {
    return 'delete';
  }

  // 그 외는 원본 반환
  return value;
}

/**
 * 마크다운 테이블 파싱
 *
 * @param tableText 테이블 텍스트
 * @returns 행별 객체 배열
 */
export function parseMarkdownTable(tableText: string): Array<Record<string, string>> {
  const lines = tableText.split('\n').filter(line => line.trim().startsWith('|'));

  if (lines.length < 2) {
    return [];
  }

  // 헤더 파싱
  const headerLine = lines[0];
  const headers = headerLine
    .split('|')
    .map(h => normalizeCell(h))
    .filter(h => h);

  // 구분선 스킵 (---)
  const dataLines = lines.slice(2);

  // 데이터 행 파싱
  const rows: Array<Record<string, string>> = [];

  for (const line of dataLines) {
    const cells = line
      .split('|')
      .map(c => normalizeCell(c))
      .filter(c => c);

    if (cells.length === headers.length) {
      const row: Record<string, string> = {};
      for (let i = 0; i < headers.length; i++) {
        row[headers[i]] = cells[i];
      }
      rows.push(row);
    }
  }

  return rows;
}

/**
 * 마크다운 리스트 파싱
 *
 * @param listText 리스트 텍스트
 * @returns 리스트 항목 배열
 */
export function parseMarkdownList(listText: string): string[] {
  const items: string[] = [];
  const lines = listText.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    // 리스트 항목 패턴 매칭
    const match = trimmed.match(/^[-*]\s+(.+)$/) || trimmed.match(/^\d+\.\s+(.+)$/);

    if (match) {
      items.push(match[1].trim());
    }
  }

  return items;
}

// ==================== Planner 응답 파서 ====================

/**
 * Planner 에이전트의 마크다운 응답을 PlanResult로 변환
 *
 * @param markdown LLM 응답 마크다운
 * @param input 에이전트 입력 (request 등)
 * @returns PlanResult 객체
 */
export function parsePlannerResponseFromMarkdown(markdown: string, input: AgentInput): PlanResult {
  try {
    // 1. 제목 추출
    const titleMatch = markdown.match(/^##\s+작업\s*계획[:\s]+(.+)$/im);
    const title = titleMatch ? titleMatch[1].trim() : input.request.substring(0, 50);
    const foundTitle = !!titleMatch; // 실제로 제목을 찾았는지 추적

    // 2. 목표 추출
    const objectiveSection = extractSection(markdown, '목표');
    const objective = objectiveSection || input.request;

    // 3. 영향 파일 파싱
    const affectedFilesSection =
      extractSection(markdown, '영향 파일') || extractSection(markdown, '영향');
    const affectedFiles: AffectedFile[] = [];

    if (affectedFilesSection) {
      const tableRows = parseMarkdownTable(affectedFilesSection);
      for (const row of tableRows) {
        const rawChangeType = row['변경 유형'] || row['Change Type'] || 'modify';
        const normalizedChangeType = normalizeChangeType(rawChangeType);

        affectedFiles.push({
          path: row['파일'] || row['File'] || '',
          changeType: normalizedChangeType as 'create' | 'modify' | 'delete',
          description: row['설명'] || row['Description'] || '',
        });
      }
    }

    // 4. 단계별 계획 파싱
    const phasesSection =
      extractSection(markdown, '단계별 계획') || extractSection(markdown, '계획');
    const phases: Phase[] = [];

    if (phasesSection) {
      const phaseLines = phasesSection.split('\n');
      let currentPhase: Phase | null = null;

      for (const line of phaseLines) {
        const trimmed = line.trim();

        // Phase 헤딩 (1. **Phase 1**: Description)
        const phaseMatch = trimmed.match(/^(\d+)\.\s+\*\*(.+?)\*\*[:\s]*(.*)$/);
        if (phaseMatch) {
          if (currentPhase) {
            phases.push(currentPhase);
          }

          currentPhase = {
            number: parseInt(phaseMatch[1], 10),
            title: phaseMatch[2].trim(),
            tasks: [],
          };
        } else if (currentPhase && trimmed.match(/^[-*]\s+/)) {
          // Task 항목
          const taskText = trimmed.replace(/^[-*]\s+/, '').trim();
          currentPhase.tasks.push({
            id: `task-${currentPhase.number}-${currentPhase.tasks.length + 1}`,
            description: taskText,
            completed: false,
          });
        }
      }

      if (currentPhase) {
        phases.push(currentPhase);
      }
    }

    // 5. 리스크 파싱
    const risksSection = extractSection(markdown, '리스크') || extractSection(markdown, '고려사항');
    const risks: Risk[] = [];

    if (risksSection) {
      const riskLines = risksSection.split('\n');

      for (const line of riskLines) {
        const trimmed = line.trim();

        // - **impact**: description → mitigation
        const riskMatch = trimmed.match(
          /^[-*]\s+\*\*(high|medium|low)\*\*[:\s]+(.+?)(?:\s*→\s*(.+))?$/i
        );
        if (riskMatch) {
          risks.push({
            description: riskMatch[2].trim(),
            impact: riskMatch[1].toLowerCase() as 'high' | 'medium' | 'low',
            mitigation: riskMatch[3]?.trim() || '대응 방안 검토 필요',
          });
        }
      }
    }

    // 6. 유효성 검증 - 최소한 제목이라도 실제로 찾았으면 성공
    const hasAnyContent = foundTitle || affectedFiles.length > 0 || phases.length > 0;

    if (!hasAnyContent) {
      // 파싱된 내용이 전혀 없으면 실패로 처리
      return {
        role: 'planner',
        success: false,
        message: '계획 파싱 실패: 유효한 내용을 찾을 수 없습니다.',
        error: '마크다운에서 계획 정보를 추출할 수 없습니다.',
        title: input.request.substring(0, 50),
        objective: input.request,
        affectedFiles: [],
        phases: [],
        risks: [],
        approvalStatus: 'pending',
        nextStep: 'coder',
      };
    }

    return {
      role: 'planner',
      success: true,
      message: '계획이 수립되었습니다.',
      title,
      objective,
      affectedFiles,
      phases,
      risks,
      approvalStatus: 'pending',
      nextStep: 'coder',
    };
  } catch (error) {
    // 파싱 실패 시 기본값 반환
    return {
      role: 'planner',
      success: false,
      message: '계획 파싱 실패',
      error: error instanceof Error ? error.message : String(error),
      title: input.request.substring(0, 50),
      objective: input.request,
      affectedFiles: [],
      phases: [],
      risks: [],
      approvalStatus: 'pending',
      nextStep: 'coder',
    };
  }
}

// ==================== Coder 응답 파서 ====================

/**
 * Coder 에이전트의 마크다운 응답을 파싱하여 파일 변경사항 추출
 *
 * @param markdown LLM 응답 마크다운
 * @returns 파일 변경사항 및 메타 정보
 */
export function parseCoderResponseFromMarkdown(markdown: string): {
  message: string;
  fileChanges: Array<{
    path: string;
    content: string;
    changeType: 'create' | 'modify' | 'delete';
    summary: string;
    linesChanged: { added: number; removed: number };
  }>;
} {
  try {
    // 1. 메시지 추출
    const titleMatch = markdown.match(/^##\s+구현\s*완료[:\s]+(.+)$/im);
    const message = titleMatch ? titleMatch[1].trim() : '구현이 완료되었습니다.';

    // 2. 파일 변경사항 추출
    const rawChanges = extractFileChanges(markdown);

    // 3. 변경 파일 섹션에서 요약 추출
    const fileListSection = extractSection(markdown, '변경 파일');
    const summaryMap = new Map<string, string>();

    if (fileListSection) {
      const lines = fileListSection.split('\n');
      for (const line of lines) {
        const match = line.match(/^[-*]\s+`([^`]+)`[:\s]+(.+)$/);
        if (match) {
          summaryMap.set(match[1], match[2].trim());
        }
      }
    }

    // 4. 라인 수 계산
    const fileChanges = rawChanges.map(change => {
      const lines = change.content.split('\n');
      const added = lines.filter(l => !l.trim().startsWith('-')).length;
      const removed = lines.filter(l => l.trim().startsWith('-')).length;

      return {
        ...change,
        summary: summaryMap.get(change.path) || '파일 변경',
        linesChanged: { added, removed },
      };
    });

    return {
      message,
      fileChanges,
    };
  } catch (error) {
    // 파싱 실패 시 기본값 반환
    return {
      message: '구현 파싱 실패: ' + (error instanceof Error ? error.message : String(error)),
      fileChanges: [],
    };
  }
}

// ==================== Reviewer 응답 파서 ====================

/**
 * Reviewer 에이전트의 마크다운 응답을 ReviewResult로 변환
 *
 * @param markdown LLM 응답 마크다운
 * @returns ReviewResult 객체
 */
export function parseReviewerResponseFromMarkdown(markdown: string): ReviewResult {
  try {
    // 1. 점수 추출 (별표나 콜론 포함 패턴 허용)
    const scoreMatch = markdown.match(/점수[*:\s]+(\d+)/i) || markdown.match(/score[*:\s]+(\d+)/i);
    const score = scoreMatch ? parseInt(scoreMatch[1], 10) : 80;
    const foundScore = !!scoreMatch; // 실제로 점수를 찾았는지 추적

    // 2. 종합 평가 추출
    const summarySection = extractSection(markdown, '종합 평가');
    const summary: ReviewSummary = {
      quality: 'pass',
      security: 'pass',
      performance: 'pass',
      testCoverage: 'pass',
    };

    if (summarySection) {
      // 별표 등 마크다운 문자 허용
      const qualityMatch = summarySection.match(/품질[*:\s]+(pass|warning|fail)/i);
      const securityMatch = summarySection.match(/보안[*:\s]+(pass|warning|fail)/i);
      const performanceMatch = summarySection.match(/성능[*:\s]+(pass|warning|fail)/i);
      const coverageMatch = summarySection.match(/커버리지[*:\s]+(pass|warning|fail)/i);

      if (qualityMatch)
        summary.quality = qualityMatch[1].toLowerCase() as 'pass' | 'warning' | 'fail';
      if (securityMatch)
        summary.security = securityMatch[1].toLowerCase() as 'pass' | 'warning' | 'fail';
      if (performanceMatch)
        summary.performance = performanceMatch[1].toLowerCase() as 'pass' | 'warning' | 'fail';
      if (coverageMatch)
        summary.testCoverage = coverageMatch[1].toLowerCase() as 'pass' | 'warning' | 'fail';
    }

    // 3. 긍정적 요소 추출
    const positivesSection =
      extractSection(markdown, '긍정적 요소') || extractSection(markdown, '긍정');
    const positives = positivesSection ? parseMarkdownList(positivesSection) : [];

    // 4. Critical Issues 추출
    const criticalSection =
      extractSection(markdown, 'Critical Issues') || extractSection(markdown, '심각');
    const criticalIssues: ReviewIssue[] = [];

    if (criticalSection && !criticalSection.includes('없음')) {
      const issueLines = parseMarkdownList(criticalSection);
      for (const issue of issueLines) {
        // 파일:라인 - 설명
        const match = issue.match(/^([^:]+):(\d+)\s*-\s*(.+)$/);
        if (match) {
          criticalIssues.push({
            file: match[1].trim(),
            line: parseInt(match[2], 10),
            description: match[3].trim(),
          });
        } else {
          criticalIssues.push({
            file: '',
            description: issue,
          });
        }
      }
    }

    // 5. 개선 제안 추출
    const suggestionsSection =
      extractSection(markdown, '개선 제안') || extractSection(markdown, '제안');
    const suggestions: ReviewIssue[] = [];

    if (suggestionsSection) {
      const suggestionLines = parseMarkdownList(suggestionsSection);
      for (const suggestion of suggestionLines) {
        const match = suggestion.match(/^([^:]+):(\d+)\s*-\s*(.+)$/);
        if (match) {
          suggestions.push({
            file: match[1].trim(),
            line: parseInt(match[2], 10),
            description: match[3].trim(),
          });
        } else {
          suggestions.push({
            file: '',
            description: suggestion,
          });
        }
      }
    }

    // 6. 보안 검사 추출
    const securitySection =
      extractSection(markdown, '보안 검사') || extractSection(markdown, '보안');
    const securityCheck: SecurityCheck = {
      sqlInjection: 'na',
      xss: 'safe',
      csrf: 'na',
      authentication: 'proper',
      sensitiveData: 'none',
    };

    if (securitySection) {
      const parseSecurityValue = (text: string): 'safe' | 'warning' | 'vulnerable' | 'na' => {
        const lower = text.toLowerCase();
        if (lower.includes('safe')) return 'safe';
        if (lower.includes('warning')) return 'warning';
        if (lower.includes('vulnerable')) return 'vulnerable';
        return 'na';
      };

      const sqlMatch = securitySection.match(/SQL Injection[:\s]+([\w/]+)/i);
      const xssMatch = securitySection.match(/XSS[:\s]+([\w/]+)/i);
      const csrfMatch = securitySection.match(/CSRF[:\s]+([\w/]+)/i);

      if (sqlMatch) securityCheck.sqlInjection = parseSecurityValue(sqlMatch[1]);
      if (xssMatch) securityCheck.xss = parseSecurityValue(xssMatch[1]);
      if (csrfMatch) securityCheck.csrf = parseSecurityValue(csrfMatch[1]);
    }

    // 7. 최종 결정 추출
    const decisionSection =
      extractSection(markdown, '최종 결정') || extractSection(markdown, '결정');
    let decision: 'approved' | 'conditional' | 'rejected' = 'approved';

    if (decisionSection) {
      const lower = decisionSection.toLowerCase();
      // 순서 중요: 조건부를 먼저 체크 (조건부에도 "승인"이 포함될 수 있음)
      if (lower.includes('조건부') || lower.includes('조건') || lower.includes('conditional')) {
        decision = 'conditional';
      } else if (lower.includes('거부') || lower.includes('rejected') || lower.includes('reject')) {
        decision = 'rejected';
      } else if (
        lower.includes('승인') ||
        lower.includes('approved') ||
        lower.includes('approve')
      ) {
        decision = 'approved';
      }
    }

    // 유효성 검증 - 의미 있는 리뷰 내용이 없으면 실패
    const hasReviewContent =
      foundScore ||
      positives.length > 0 ||
      criticalIssues.length > 0 ||
      suggestions.length > 0 ||
      !!extractSection(markdown, '종합 평가');

    if (!hasReviewContent) {
      return {
        role: 'reviewer',
        success: false,
        message: '리뷰 파싱 실패: 유효한 내용을 찾을 수 없습니다.',
        error: '마크다운에서 리뷰 정보를 추출할 수 없습니다.',
        score: 0,
        summary: {
          quality: 'fail',
          security: 'fail',
          performance: 'fail',
          testCoverage: 'fail',
        },
        positives: [],
        criticalIssues: [],
        suggestions: [],
        securityCheck: {
          sqlInjection: 'na',
          xss: 'na',
          csrf: 'na',
          authentication: 'na',
          sensitiveData: 'na',
        },
        decision: 'rejected',
        nextStep: 'coder',
      };
    }

    return {
      role: 'reviewer',
      success: true,
      message: '코드 리뷰가 완료되었습니다.',
      score,
      summary,
      positives,
      criticalIssues,
      suggestions,
      securityCheck,
      decision,
      nextStep: decision === 'approved' ? 'complete' : 'coder',
    };
  } catch (error) {
    // 파싱 실패 시 기본값 반환
    return {
      role: 'reviewer',
      success: false,
      message: '리뷰 파싱 실패',
      error: error instanceof Error ? error.message : String(error),
      score: 0,
      summary: {
        quality: 'fail',
        security: 'fail',
        performance: 'fail',
        testCoverage: 'fail',
      },
      positives: [],
      criticalIssues: [],
      suggestions: [],
      securityCheck: {
        sqlInjection: 'na',
        xss: 'na',
        csrf: 'na',
        authentication: 'na',
        sensitiveData: 'na',
      },
      decision: 'rejected',
      nextStep: 'coder',
    };
  }
}
