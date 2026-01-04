/**
 * Agent Executor
 *
 * 개별 에이전트의 실행을 담당합니다.
 * Planner, Coder, Reviewer 에이전트를 실행하고 결과를 반환합니다.
 */

import type {
  AgentConfig,
  AgentInput,
  AgentOutput,
  AgentRole,
  AgentStatus,
  PlanResult,
  ImplementationResult,
  ReviewResult,
  ApprovalStatus,
  ModelType,
} from '../types/agent.js';
import type { DirectoryTreeNode } from '../types/file.js';
import { LlmClient } from '../llm/llm-client.js';
import type { ClaudeModel } from '../llm/anthropic-client.js';
import { PromptBuilder } from '../llm/prompt-builder.js';
import { FileManager } from '../fs/file-manager.js';
import { TestRunner } from '../test/test-runner.js';
import { config } from '../config/index.js';
import {
  parsePlannerResponseFromMarkdown,
  parseCoderResponseFromMarkdown,
  parseReviewerResponseFromMarkdown,
} from '../llm/response-parser.js';

/** 에이전트 실행기 설정 */
export interface AgentExecutorConfig {
  /** Self-healing 최대 시도 횟수 */
  maxHealingAttempts: number;
  /** 타임아웃 (ms) */
  timeout: number;
  /** 디버그 모드 */
  debug: boolean;
  /** 시뮬레이션 모드 */
  simulate: boolean;
}

/** 기본 설정 */
const DEFAULT_CONFIG: AgentExecutorConfig = {
  maxHealingAttempts: 3,
  timeout: 300000, // 5분
  debug: false,
  simulate: true,
};

/** 에이전트 설정 맵 */
const AGENT_CONFIGS: Record<AgentRole, AgentConfig> = {
  planner: {
    name: 'Planner',
    role: 'planner',
    description: '작업 계획 수립 에이전트',
    model: 'opus',
    maxRetries: 2,
  },
  coder: {
    name: 'Coder',
    role: 'coder',
    description: '코드 작성 에이전트',
    model: 'sonnet',
    maxRetries: 3,
  },
  reviewer: {
    name: 'Reviewer',
    role: 'reviewer',
    description: '코드 리뷰 에이전트',
    model: 'sonnet',
    maxRetries: 2,
  },
};

/**
 * Agent Executor 클래스
 *
 * 에이전트를 실행하고 결과를 수집합니다.
 */
export class AgentExecutor {
  private config: AgentExecutorConfig;
  private status: AgentStatus = 'idle';
  private currentAgent: AgentRole | null = null;
  private llmClient: LlmClient;
  private promptBuilder: PromptBuilder;
  private fileManager: FileManager;
  private testRunner: TestRunner;

  constructor(executorConfig: Partial<AgentExecutorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...executorConfig };

    // LLM 클라이언트 초기화 (설정에 따라 API 키 또는 CLI 방식)
    this.llmClient = new LlmClient({
      authMethod: config.llm.authMethod,
      apiKey: config.llm.apiKey,
      cliPath: config.llm.cliPath,
    });

    // 프롬프트 빌더 초기화
    this.promptBuilder = new PromptBuilder(config.promptsDir);

    // 파일 매니저 초기화
    this.fileManager = new FileManager({
      workingDir: process.cwd(),
      debug: this.config.debug,
    });

    // 테스트 러너 초기화
    this.testRunner = new TestRunner({
      workingDir: process.cwd(),
      debug: this.config.debug,
    });
  }

  /**
   * 현재 상태 반환
   */
  getStatus(): AgentStatus {
    return this.status;
  }

  /**
   * 현재 실행 중인 에이전트 반환
   */
  getCurrentAgent(): AgentRole | null {
    return this.currentAgent;
  }

  /**
   * Planner 에이전트 실행
   */
  async executePlanner(input: AgentInput): Promise<PlanResult> {
    this.status = 'running';
    this.currentAgent = 'planner';

    try {
      const agentConfig = AGENT_CONFIGS.planner;

      if (this.config.debug) {
        console.log(`[${agentConfig.name}] Starting with request: ${input.request}`);
      }

      // 시뮬레이션 모드일 경우 기존 로직 사용
      if (this.config.simulate) {
        const result = await this.simulatePlannerExecution(input);
        this.status = 'waiting_approval';
        return result;
      }

      // TODO(human): 프롬프트 컨텍스트 구성
      // input 객체에서 LLM에 전달할 정보를 선택하여 promptVariables 구성
      // 고려사항:
      // - userRequest: input.request
      // - projectContext: input.context에서 어떤 정보를 포함할지?
      // - codebaseInfo: 현재 코드베이스 구조 정보를 어떻게 수집할지?
      const promptVariables = {
        userRequest: input.request,
        projectContext: JSON.stringify(input.context || {}),
        codebaseInfo: '// TODO: 코드베이스 정보 수집 로직',
      };

      // 프롬프트 빌드
      const prompt = await this.promptBuilder.buildAgentPrompt('planner', promptVariables);

      // LLM 호출
      const llmResponse = await this.llmClient.complete({
        model: this.mapModelType(agentConfig.model),
        messages: [{ role: 'user', content: prompt }],
        maxTokens: config.agents.planner.maxTokens,
        temperature: config.agents.planner.temperature,
      });

      // 디버그: LLM 원본 응답 출력
      if (this.config.debug) {
        console.log(
          `[${agentConfig.name}] LLM Response (first 500 chars):`,
          llmResponse.substring(0, 500)
        );
        console.log(`[${agentConfig.name}] Full response length:`, llmResponse.length);
      }

      // LLM 응답 파싱
      const result = this.parsePlannerResponse(llmResponse, input);

      this.status = 'waiting_approval';
      return result;
    } catch (error) {
      this.status = 'failed';
      throw error;
    }
  }

  /**
   * Coder 에이전트 실행
   */
  async executeCoder(input: AgentInput): Promise<ImplementationResult> {
    if (!input.plan) {
      throw new Error('Coder requires an approved plan');
    }

    if (input.plan.approvalStatus !== 'approved') {
      throw new Error('Plan must be approved before execution');
    }

    this.status = 'running';
    this.currentAgent = 'coder';

    try {
      const agentConfig = AGENT_CONFIGS.coder;
      let attempts = 0;
      let result: ImplementationResult;

      // Self-healing 루프
      do {
        attempts++;

        if (this.config.debug) {
          console.log(
            `[${agentConfig.name}] Attempt ${attempts}/${this.config.maxHealingAttempts}`
          );
        }

        // 시뮬레이션 모드일 경우
        if (this.config.simulate) {
          result = await this.simulateCoderExecution(input, attempts);
        } else {
          // 실제 LLM 호출
          // 파일 내용 및 코드베이스 정보 수집
          const currentFiles = await this.readAffectedFiles(input.plan);
          const codebaseInfo = await this.getCodebaseInfo();

          if (this.config.debug) {
            console.log(`[${agentConfig.name}] currentFiles length:`, currentFiles.length);
            console.log(`[${agentConfig.name}] codebaseInfo length:`, codebaseInfo.length);
          }

          const promptVariables = {
            plan: JSON.stringify(input.plan),
            projectContext: JSON.stringify(input.context || {}),
            currentFiles,
            codebaseInfo,
          };

          const prompt = await this.promptBuilder.buildAgentPrompt('coder', promptVariables);

          if (this.config.debug) {
            console.log(`[${agentConfig.name}] Final prompt length:`, prompt.length);
            console.log(`[${agentConfig.name}] Calling LLM...`);
          }

          const llmResponse = await this.llmClient.complete({
            model: this.mapModelType(agentConfig.model),
            messages: [{ role: 'user', content: prompt }],
            maxTokens: config.agents.coder.maxTokens,
            temperature: config.agents.coder.temperature,
          });

          if (this.config.debug) {
            console.log(
              `[${agentConfig.name}] LLM Response received (length: ${llmResponse.length})`
            );
          }

          // 코드 검증 실행 (테스트, 타입 체크, Lint)
          const validationResults = await this.runValidation();

          // LLM 응답 파싱 및 파일 적용
          result = await this.parseCoderResponse(llmResponse, attempts, validationResults);
        }

        // 테스트 통과 시 루프 종료
        if (result.testResults.passed) {
          break;
        }

        // 최대 시도 횟수 도달
        if (attempts >= this.config.maxHealingAttempts) {
          result.nextStep = 'user_intervention';
          break;
        }
      } while (!result.testResults.passed);

      this.status = result.success ? 'completed' : 'failed';
      return result;
    } catch (error) {
      this.status = 'failed';
      throw error;
    }
  }

  /**
   * Reviewer 에이전트 실행
   */
  async executeReviewer(input: AgentInput): Promise<ReviewResult> {
    if (!input.implementation) {
      throw new Error('Reviewer requires implementation result');
    }

    this.status = 'running';
    this.currentAgent = 'reviewer';

    try {
      const agentConfig = AGENT_CONFIGS.reviewer;

      if (this.config.debug) {
        console.log(`[${agentConfig.name}] Reviewing ${input.implementation.files.length} files`);
      }

      // 시뮬레이션 모드일 경우
      if (this.config.simulate) {
        const result = await this.simulateReviewerExecution(input);
        this.status = 'completed';
        return result;
      }

      // 실제 LLM 호출
      // Lint 결과 수집
      const lintResult = await this.testRunner.runLint();
      const lintResults = {
        success: lintResult.success,
        errorCount: lintResult.errorCount,
        warningCount: lintResult.warningCount,
        problems: lintResult.problems.slice(0, 10), // 상위 10개만 포함
      };

      const promptVariables = {
        changedCode: JSON.stringify(input.implementation.files),
        plan: JSON.stringify(input.plan),
        testResults: JSON.stringify(input.implementation.testResults),
        lintResults: JSON.stringify(lintResults),
      };

      const prompt = await this.promptBuilder.buildAgentPrompt('reviewer', promptVariables);

      const llmResponse = await this.llmClient.complete({
        model: this.mapModelType(agentConfig.model),
        messages: [{ role: 'user', content: prompt }],
        maxTokens: config.agents.reviewer.maxTokens,
        temperature: config.agents.reviewer.temperature,
      });

      const result = this.parseReviewerResponse(llmResponse);

      this.status = 'completed';
      return result;
    } catch (error) {
      this.status = 'failed';
      throw error;
    }
  }

  /**
   * 에이전트 역할에 따라 실행
   */
  async execute(role: AgentRole, input: AgentInput): Promise<AgentOutput> {
    switch (role) {
      case 'planner':
        return this.executePlanner(input);
      case 'coder':
        return this.executeCoder(input);
      case 'reviewer':
        return this.executeReviewer(input);
      default:
        throw new Error(`Unknown agent role: ${role as string}`);
    }
  }

  /**
   * 실행기 리셋
   */
  reset(): void {
    this.status = 'idle';
    this.currentAgent = null;
  }

  // ==================== 헬퍼 메서드 ====================

  /**
   * 모델 타입 매핑 (기존 타입 → Claude 모델명)
   */
  private mapModelType(modelType: ModelType): ClaudeModel {
    const modelMap: Record<ModelType, ClaudeModel> = {
      opus: 'claude-opus-4',
      sonnet: 'claude-sonnet-4',
      haiku: 'claude-haiku-4',
    };
    return modelMap[modelType];
  }

  /**
   * 계획의 영향받는 파일들 읽기
   */
  private async readAffectedFiles(plan: PlanResult): Promise<string> {
    const fileContents: string[] = [];

    for (const file of plan.affectedFiles || []) {
      const result = await this.fileManager.readFile(file.path);
      if (result.success && result.data?.content) {
        fileContents.push(`=== ${file.path} ===\n${result.data.content}\n`);
      } else {
        fileContents.push(`=== ${file.path} ===\n[File does not exist or cannot be read]\n`);
      }
    }

    return fileContents.join('\n');
  }

  /**
   * 코드베이스 정보 수집
   */
  private async getCodebaseInfo(): Promise<string> {
    try {
      // 프로젝트 구조 요약
      const tree = await this.fileManager.getDirectoryTree('.', 2);
      if (!tree) {
        return 'Unable to read codebase structure';
      }

      const formatTree = (node: DirectoryTreeNode, indent: string = ''): string => {
        let result = `${indent}${node.name}${node.isDirectory ? '/' : ''}\n`;
        if (node.children) {
          for (const child of node.children) {
            result += formatTree(child, indent + '  ');
          }
        }
        return result;
      };

      return `Project Structure:\n${formatTree(tree)}`;
    } catch (error) {
      return 'Error reading codebase info';
    }
  }

  /**
   * 코드 검증 실행 (테스트, 타입 체크, Lint)
   */
  private async runValidation(): Promise<{
    testsPassed: boolean;
    typeCheckPassed: boolean;
    lintPassed: boolean;
    testResults: {
      passed: boolean;
      total: number;
      passedCount: number;
      failedCount: number;
      coverage: number;
      typeCheck: boolean;
      lint: boolean;
      details?: string;
    };
  }> {
    try {
      if (this.config.debug) {
        console.log('[Validation] Starting validation...');
      }

      // 1. 테스트 실행
      if (this.config.debug) {
        console.log('[Validation] Running tests...');
      }
      const testResult = await this.testRunner.runTests({
        framework: 'vitest',
      });
      if (this.config.debug) {
        console.log(
          '[Validation] Tests completed:',
          testResult.success,
          `(${testResult.passed}/${testResult.total})`
        );
      }

      // 2. 타입 체크
      if (this.config.debug) {
        console.log('[Validation] Running type check...');
      }
      const typeCheckResult = await this.testRunner.runTypeCheck();
      if (this.config.debug) {
        console.log('[Validation] Type check completed:', typeCheckResult.success);
      }

      // 3. Lint 체크
      if (this.config.debug) {
        console.log('[Validation] Running lint...');
      }
      const lintResult = await this.testRunner.runLint();
      if (this.config.debug) {
        console.log('[Validation] Lint completed:', lintResult.success);
      }

      const testsPassed = testResult.success;
      const typeCheckPassed = typeCheckResult.success;
      const lintPassed = lintResult.success;

      return {
        testsPassed,
        typeCheckPassed,
        lintPassed,
        testResults: {
          passed: testsPassed && typeCheckPassed && lintPassed,
          total: testResult.total,
          passedCount: testResult.passed,
          failedCount: testResult.failed,
          coverage: 0, // TODO: 커버리지 정보 파싱
          typeCheck: typeCheckPassed,
          lint: lintPassed,
          details: [
            `Tests: ${testResult.passed}/${testResult.total} passed`,
            `Type errors: ${typeCheckResult.errorCount}`,
            `Lint errors: ${lintResult.errorCount}, warnings: ${lintResult.warningCount}`,
          ].join('\n'),
        },
      };
    } catch (error) {
      // 검증 실행 실패 시 기본값 반환
      return {
        testsPassed: false,
        typeCheckPassed: false,
        lintPassed: false,
        testResults: {
          passed: false,
          total: 0,
          passedCount: 0,
          failedCount: 0,
          coverage: 0,
          typeCheck: false,
          lint: false,
          details: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  /**
   * 파일 변경사항을 실제 파일 시스템에 적용
   *
   * @param fileChanges 파일 변경사항 배열
   */
  private async applyFileChanges(
    fileChanges: Array<{
      path: string;
      content: string;
      changeType: 'create' | 'modify' | 'delete';
    }>
  ): Promise<void> {
    for (const change of fileChanges) {
      try {
        if (change.changeType === 'delete') {
          // 파일 삭제 (현재 FileManager에 deleteFile이 없으므로 스킵)
          if (this.config.debug) {
            console.log(`[AgentExecutor] Skipping file deletion: ${change.path}`);
          }
          continue;
        }

        // 파일 생성 또는 수정
        await this.fileManager.writeFile(change.path, change.content, {
          overwrite: true,
          createDir: true,
        });

        if (this.config.debug) {
          console.log(
            `[AgentExecutor] Applied ${change.changeType} to ${change.path} (${change.content.split('\n').length} lines)`
          );
        }
      } catch (error) {
        // 파일 쓰기 실패 시 로그만 출력하고 계속 진행
        console.error(
          `[AgentExecutor] Failed to apply changes to ${change.path}:`,
          error instanceof Error ? error.message : String(error)
        );
      }
    }
  }

  /**
   * Planner LLM 응답 파싱
   */
  private parsePlannerResponse(llmResponse: string, input: AgentInput): PlanResult {
    return parsePlannerResponseFromMarkdown(llmResponse, input);
  }

  /**
   * Coder LLM 응답 파싱 및 파일 적용
   */
  private async parseCoderResponse(
    llmResponse: string,
    attempts: number,
    validationResults?: {
      testsPassed: boolean;
      typeCheckPassed: boolean;
      lintPassed: boolean;
      testResults: {
        passed: boolean;
        total: number;
        passedCount: number;
        failedCount: number;
        coverage: number;
        typeCheck: boolean;
        lint: boolean;
        details?: string;
      };
    }
  ): Promise<ImplementationResult> {
    // 1. LLM 응답 파싱
    const parsed = parseCoderResponseFromMarkdown(llmResponse);

    // 2. 파일 변경사항 실제 적용
    if (parsed.fileChanges.length > 0) {
      await this.applyFileChanges(parsed.fileChanges);
    }

    // 3. 검증 결과와 결합
    const testResults = validationResults?.testResults || {
      passed: true,
      total: 0,
      passedCount: 0,
      failedCount: 0,
      coverage: 0,
      typeCheck: true,
      lint: true,
    };

    return {
      role: 'coder',
      success: testResults.passed,
      message: testResults.passed
        ? parsed.message || '구현이 완료되었습니다.'
        : `구현 검증 실패 (시도 ${attempts}/${this.config.maxHealingAttempts}):\n${testResults.details || ''}`,
      files: parsed.fileChanges.map(fc => ({
        path: fc.path,
        changeType: fc.changeType,
        summary: fc.summary || '파일 변경',
        linesChanged: fc.linesChanged || { added: 0, removed: 0 },
      })),
      testResults,
      healingAttempts: attempts,
      nextStep: testResults.passed ? 'reviewer' : 'coder',
    };
  }

  /**
   * Reviewer LLM 응답 파싱
   */
  private parseReviewerResponse(llmResponse: string): ReviewResult {
    return parseReviewerResponseFromMarkdown(llmResponse);
  }

  // ==================== 시뮬레이션 메서드 ====================
  // 실제 구현 시 AI 모델 호출로 대체됨

  private async simulatePlannerExecution(input: AgentInput): Promise<PlanResult> {
    // 시뮬레이션된 지연
    await this.delay(100);

    return {
      role: 'planner',
      success: true,
      message: '계획이 성공적으로 수립되었습니다.',
      title: `작업: ${input.request.substring(0, 50)}`,
      objective: input.request,
      affectedFiles: [],
      phases: [
        {
          number: 1,
          title: '기본 구현',
          tasks: [
            { id: 'task-1', description: '기본 구조 생성', completed: false },
            { id: 'task-2', description: '테스트 작성', completed: false },
          ],
        },
      ],
      risks: [],
      approvalStatus: 'pending',
      nextStep: 'coder',
    };
  }

  private async simulateCoderExecution(
    _input: AgentInput,
    attempt: number
  ): Promise<ImplementationResult> {
    await this.delay(100);

    // 첫 시도에서 실패할 확률 시뮬레이션 (테스트용)
    const passed = attempt > 1 || Math.random() > 0.3;

    return {
      role: 'coder',
      success: passed,
      message: passed ? '구현이 완료되었습니다.' : '테스트 실패, 재시도 중...',
      files: [],
      testResults: {
        passed,
        total: 10,
        passedCount: passed ? 10 : 7,
        failedCount: passed ? 0 : 3,
        coverage: 85,
        typeCheck: true,
        lint: true,
      },
      healingAttempts: attempt,
      nextStep: passed ? 'reviewer' : undefined,
    };
  }

  private async simulateReviewerExecution(_input: AgentInput): Promise<ReviewResult> {
    await this.delay(100);

    return {
      role: 'reviewer',
      success: true,
      message: '코드 리뷰가 완료되었습니다.',
      score: 85,
      summary: {
        quality: 'pass',
        security: 'pass',
        performance: 'pass',
        testCoverage: 'pass',
      },
      positives: ['타입 정의가 명확함', '테스트 커버리지 우수'],
      criticalIssues: [],
      suggestions: [],
      securityCheck: {
        sqlInjection: 'na',
        xss: 'safe',
        csrf: 'na',
        authentication: 'proper',
        sensitiveData: 'none',
      },
      decision: 'approved',
      nextStep: 'complete',
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * 계획 승인 처리
 */
export function approvePlan(plan: PlanResult): PlanResult {
  return {
    ...plan,
    approvalStatus: 'approved' as ApprovalStatus,
  };
}

/**
 * 계획 거부 처리
 */
export function rejectPlan(plan: PlanResult, reason?: string): PlanResult {
  return {
    ...plan,
    approvalStatus: 'rejected' as ApprovalStatus,
    message: reason || '사용자에 의해 거부되었습니다.',
    rejectionReason: reason,
  };
}

/**
 * 계획 수정 요청 처리
 */
export function requestRevision(plan: PlanResult, feedback: string): PlanResult {
  return {
    ...plan,
    approvalStatus: 'needs_revision' as ApprovalStatus,
    message: feedback,
  };
}

/**
 * 에이전트 설정 가져오기
 */
export function getAgentConfig(role: AgentRole): AgentConfig {
  return AGENT_CONFIGS[role];
}
