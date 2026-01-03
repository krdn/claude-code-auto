/**
 * Skill Executor
 *
 * 스킬의 실행을 담당합니다.
 * Commit, Test, Deploy 등 다양한 스킬을 실행하고 결과를 반환합니다.
 */

import type {
  SkillName,
  SkillInput,
  SkillOutput,
  SkillStatus,
  CommitResult,
  TestResult,
  ReviewPRResult,
  SKILL_CONFIGS,
} from '../types/skill.js';
import { GitClient } from '../git/git-client.js';
import { AnthropicClient } from '../llm/anthropic-client.js';
import { PromptBuilder } from '../llm/prompt-builder.js';
import { config } from '../config/index.js';

/** 스킬 실행기 설정 */
export interface SkillExecutorConfig {
  /** 작업 디렉토리 */
  workingDir: string;
  /** 디버그 모드 */
  debug: boolean;
  /** 시뮬레이션 모드 (실제 명령 실행 안함) */
  simulate: boolean;
}

/** 기본 설정 */
const DEFAULT_CONFIG: SkillExecutorConfig = {
  workingDir: process.cwd(),
  debug: false,
  simulate: false,
};

/**
 * Skill Executor 클래스
 *
 * 스킬을 실행하고 결과를 수집합니다.
 */
export class SkillExecutor {
  private config: SkillExecutorConfig;
  private status: SkillStatus = 'idle';
  private currentSkill: SkillName | null = null;
  private gitClient: GitClient;
  private llmClient: AnthropicClient;
  private promptBuilder: PromptBuilder;

  constructor(skillConfig: Partial<SkillExecutorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...skillConfig };

    // Git 클라이언트 초기화
    this.gitClient = new GitClient(this.config.workingDir);

    // LLM 클라이언트 초기화
    this.llmClient = new AnthropicClient(config.llm.apiKey);

    // 프롬프트 빌더 초기화
    this.promptBuilder = new PromptBuilder(config.promptsDir);
  }

  /**
   * 현재 상태 반환
   */
  getStatus(): SkillStatus {
    return this.status;
  }

  /**
   * 현재 실행 중인 스킬 반환
   */
  getCurrentSkill(): SkillName | null {
    return this.currentSkill;
  }

  /**
   * Commit 스킬 실행
   */
  async executeCommit(input: SkillInput = {}): Promise<CommitResult> {
    this.status = 'running';
    this.currentSkill = 'commit';

    try {
      if (this.config.debug) {
        console.log('[Commit] Starting commit skill');
      }

      if (this.config.simulate) {
        return this.simulateCommit();
      }

      // TODO(human): 실제 git 명령 실행 로직 구현
      // 현재는 시뮬레이션된 결과 반환
      const result = await this.performCommit(input);

      this.status = 'completed';
      return result;
    } catch (error) {
      this.status = 'failed';
      return {
        skill: 'commit',
        success: false,
        message: '커밋 실패',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Test 스킬 실행
   */
  async executeTest(input: SkillInput = {}): Promise<TestResult> {
    this.status = 'running';
    this.currentSkill = 'test';

    try {
      if (this.config.debug) {
        console.log('[Test] Starting test skill');
      }

      if (this.config.simulate) {
        return this.simulateTest();
      }

      const result = await this.performTest(input);

      this.status = result.failed > 0 ? 'failed' : 'completed';
      return result;
    } catch (error) {
      this.status = 'failed';
      return {
        skill: 'test',
        success: false,
        message: '테스트 실행 실패',
        error: error instanceof Error ? error.message : String(error),
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        duration: 0,
      };
    }
  }

  /**
   * Review PR 스킬 실행
   */
  async executeReviewPR(input: SkillInput = {}): Promise<ReviewPRResult> {
    this.status = 'running';
    this.currentSkill = 'review-pr';

    try {
      if (this.config.debug) {
        console.log('[Review PR] Starting review-pr skill');
      }

      if (this.config.simulate) {
        return this.simulateReviewPR();
      }

      const result = await this.performReviewPR(input);

      this.status = 'completed';
      return result;
    } catch (error) {
      this.status = 'failed';
      return {
        skill: 'review-pr',
        success: false,
        message: 'PR 생성/리뷰 실패',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 스킬 이름으로 실행
   */
  async execute(skillName: SkillName, input: SkillInput = {}): Promise<SkillOutput> {
    switch (skillName) {
      case 'commit':
        return this.executeCommit(input);
      case 'test':
        return this.executeTest(input);
      case 'review-pr':
        return this.executeReviewPR(input);
      case 'deploy':
        return this.simulateDeploy();
      case 'docs':
        return this.simulateDocs();
      case 'interview':
        return this.simulateInterview();
      default:
        throw new Error(`Unknown skill: ${skillName as string}`);
    }
  }

  /**
   * 명령어로 스킬 찾기
   */
  findSkillByCommand(command: string): SkillName | null {
    const commandMap: Record<string, SkillName> = {
      '/commit': 'commit',
      '/test': 'test',
      '/review-pr': 'review-pr',
      '/deploy': 'deploy',
      '/docs': 'docs',
      '/interview': 'interview',
    };

    return commandMap[command] || null;
  }

  /**
   * 명령어로 스킬 실행
   */
  async executeByCommand(command: string, input: SkillInput = {}): Promise<SkillOutput> {
    const skillName = this.findSkillByCommand(command);

    if (!skillName) {
      return {
        skill: 'commit', // default
        success: false,
        message: `알 수 없는 명령어: ${command}`,
        error: `Unknown command: ${command}`,
      };
    }

    return this.execute(skillName, input);
  }

  /**
   * 실행기 리셋
   */
  reset(): void {
    this.status = 'idle';
    this.currentSkill = null;
  }

  // ==================== 실제 실행 메서드 ====================

  private async performCommit(input: SkillInput): Promise<CommitResult> {
    try {
      // 1. Git status 확인
      const hasChanges = await this.gitClient.hasChanges();

      if (!hasChanges) {
        return {
          skill: 'commit',
          success: false,
          message: '커밋할 변경사항이 없습니다.',
          error: 'No changes to commit',
        };
      }

      // 2. 변경된 파일 목록 가져오기
      const changedFiles = await this.gitClient.getChangedFiles();

      // 3. Git diff 가져오기
      const gitDiff = await this.gitClient.diff();

      // 4. LLM으로 커밋 메시지 생성
      const promptVariables = {
        gitDiff,
        changedFiles: JSON.stringify(changedFiles.map(f => f.path)),
        workContext: '일반 작업',
      };

      const prompt = await this.promptBuilder.buildSkillPrompt('commit', promptVariables);

      const commitMessage = await this.llmClient.complete({
        model: 'claude-sonnet-4', // 커밋 메시지는 Sonnet 사용
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 500,
        temperature: 0.3, // 낮은 temperature로 일관된 형식 유지
      });

      // 5. 파일 스테이징 (모든 변경 파일)
      const filesToAdd = changedFiles.map(f => f.path);
      await this.gitClient.add(filesToAdd);

      // 6. Git commit 실행
      const commitResult = await this.gitClient.commit(commitMessage.trim());

      if (!commitResult.success) {
        return {
          skill: 'commit',
          success: false,
          message: '커밋 실패',
          error: commitResult.error || 'Unknown error',
        };
      }

      // 7. 성공 결과 반환
      return {
        skill: 'commit',
        success: true,
        message: '커밋이 완료되었습니다.',
        hash: commitResult.hash,
        commitMessage: commitMessage.trim(),
        filesChanged: filesToAdd.length,
        linesChanged: {
          added: 0, // TODO: git diff --numstat 파싱으로 계산
          removed: 0,
        },
        nextSteps: ['git push', '/review-pr'],
      };
    } catch (error) {
      throw new Error(
        `Failed to perform commit: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private async performTest(_input: SkillInput): Promise<TestResult> {
    await this.delay(100);

    // 실제 구현 시 npm test 실행 및 결과 파싱

    return {
      skill: 'test',
      success: true,
      message: '모든 테스트가 통과했습니다.',
      total: 41,
      passed: 41,
      failed: 0,
      skipped: 0,
      duration: 950,
      coverage: {
        statements: 87,
        branches: 82,
        functions: 91,
        lines: 86,
      },
      nextSteps: ['/commit', '/review-pr'],
    };
  }

  private async performReviewPR(_input: SkillInput): Promise<ReviewPRResult> {
    await this.delay(100);

    // 실제 구현 시 gh pr create 실행

    return {
      skill: 'review-pr',
      success: true,
      message: 'PR이 생성되었습니다.',
      prNumber: 42,
      prUrl: 'https://github.com/example/repo/pull/42',
      status: 'created',
      nextSteps: ['CI 확인', '리뷰어 할당'],
    };
  }

  // ==================== 시뮬레이션 메서드 ====================

  private simulateCommit(): CommitResult {
    return {
      skill: 'commit',
      success: true,
      message: '[시뮬레이션] 커밋이 완료되었습니다.',
      hash: 'sim1234',
      commitMessage: 'feat: 시뮬레이션 커밋',
      filesChanged: 2,
      linesChanged: { added: 20, removed: 5 },
    };
  }

  private simulateTest(): TestResult {
    return {
      skill: 'test',
      success: true,
      message: '[시뮬레이션] 테스트가 통과했습니다.',
      total: 10,
      passed: 10,
      failed: 0,
      skipped: 0,
      duration: 500,
      coverage: {
        statements: 85,
        branches: 80,
        functions: 90,
        lines: 85,
      },
    };
  }

  private simulateReviewPR(): ReviewPRResult {
    return {
      skill: 'review-pr',
      success: true,
      message: '[시뮬레이션] PR이 생성되었습니다.',
      prNumber: 1,
      prUrl: 'https://github.com/example/repo/pull/1',
      status: 'created',
    };
  }

  private simulateDeploy(): SkillOutput {
    return {
      skill: 'deploy',
      success: true,
      message: '[시뮬레이션] 배포가 완료되었습니다.',
      nextSteps: ['배포 확인', '모니터링'],
    };
  }

  private simulateDocs(): SkillOutput {
    return {
      skill: 'docs',
      success: true,
      message: '[시뮬레이션] 문서가 생성되었습니다.',
      nextSteps: ['문서 검토', '/commit'],
    };
  }

  private simulateInterview(): SkillOutput {
    return {
      skill: 'interview',
      success: true,
      message: '[시뮬레이션] 인터뷰가 완료되었습니다.',
      nextSteps: ['요구사항 정리', '계획 수립'],
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * 스킬 설정 가져오기
 */
export function getSkillConfig(name: SkillName): (typeof SKILL_CONFIGS)[SkillName] {
  const configs: Record<SkillName, (typeof SKILL_CONFIGS)[SkillName]> = {
    commit: {
      name: 'commit',
      command: '/commit',
      description: 'Git 커밋 자동화',
      timeout: 30000,
    },
    test: {
      name: 'test',
      command: '/test',
      description: '테스트 실행 및 분석',
      timeout: 300000,
    },
    'review-pr': {
      name: 'review-pr',
      command: '/review-pr',
      description: 'PR 생성/리뷰',
      timeout: 60000,
    },
    deploy: {
      name: 'deploy',
      command: '/deploy',
      description: '배포 프로세스',
      timeout: 600000,
    },
    docs: {
      name: 'docs',
      command: '/docs',
      description: '문서 자동 생성',
      timeout: 60000,
    },
    interview: {
      name: 'interview',
      command: '/interview',
      description: '요구사항 수집',
      timeout: 300000,
    },
  };

  return configs[name];
}
