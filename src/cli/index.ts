#!/usr/bin/env node
/**
 * AI Orchestrator CLI
 *
 * 워크플로우와 스킬을 명령줄에서 실행할 수 있는 인터페이스입니다.
 *
 * Usage:
 *   npx ai-orchestrator run "사용자 요청"
 *   npx ai-orchestrator skill commit
 *   npx ai-orchestrator status
 */

import { WorkflowOrchestrator, createWorkflowConfig } from '../engine/workflow-orchestrator.js';
import { SkillExecutor } from '../engine/skill-executor.js';
import type { WorkflowEvent, WorkflowSummary } from '../types/workflow.js';
import type { SkillName } from '../types/skill.js';
import { formatDuration, colorize, symbols } from './utils.js';

/** CLI 명령어 */
type Command = 'run' | 'skill' | 'status' | 'help' | 'version';

/** CLI 옵션 */
interface CLIOptions {
  debug: boolean;
  autoApprove: boolean;
  autoCommit: boolean;
  simulate: boolean;
}

/**
 * CLI 메인 클래스
 */
export class CLI {
  private orchestrator: WorkflowOrchestrator | null = null;
  private skillExecutor: SkillExecutor;
  private options: CLIOptions;

  constructor(options: Partial<CLIOptions> = {}) {
    this.options = {
      debug: options.debug ?? false,
      autoApprove: options.autoApprove ?? false,
      autoCommit: options.autoCommit ?? false,
      simulate: options.simulate ?? true,
    };
    this.skillExecutor = new SkillExecutor({
      debug: this.options.debug,
      simulate: this.options.simulate,
    });
  }

  /**
   * CLI 실행
   */
  async run(args: string[]): Promise<void> {
    const { command, commandArgs, options } = this.parseArgs(args);

    // 옵션 적용
    Object.assign(this.options, options);

    try {
      switch (command) {
        case 'run':
          await this.runWorkflow(commandArgs.join(' '));
          break;
        case 'skill':
          await this.runSkill(commandArgs[0] as SkillName, commandArgs.slice(1));
          break;
        case 'status':
          this.showStatus();
          break;
        case 'version':
          this.showVersion();
          break;
        case 'help':
        default:
          this.showHelp();
          break;
      }
    } catch (error) {
      this.printError(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    }
  }

  /**
   * 워크플로우 실행
   */
  private async runWorkflow(request: string): Promise<void> {
    if (!request.trim()) {
      throw new Error(
        '요청 내용을 입력해주세요. 예: npx ai-orchestrator run "사용자 인증 기능 추가"'
      );
    }

    this.printHeader('AI Orchestrator 워크플로우');
    this.printInfo(`요청: ${request}`);
    this.printSeparator();

    // 오케스트레이터 생성
    this.orchestrator = new WorkflowOrchestrator(
      createWorkflowConfig({
        debug: this.options.debug,
        autoApprove: this.options.autoApprove,
        autoCommit: this.options.autoCommit,
      })
    );

    // 이벤트 리스너 등록
    this.orchestrator.on(event => {
      this.handleWorkflowEvent(event);
    });

    // 워크플로우 실행
    const summary = await this.orchestrator.start(request);

    // 결과 출력
    this.printWorkflowSummary(summary);
  }

  /**
   * 스킬 실행
   */
  private async runSkill(skillName: string, args: string[]): Promise<void> {
    const validSkills: SkillName[] = ['commit', 'test', 'review-pr', 'deploy', 'docs', 'interview'];

    if (!skillName || !validSkills.includes(skillName as SkillName)) {
      throw new Error(
        `유효한 스킬을 선택해주세요: ${validSkills.join(', ')}\n예: npx ai-orchestrator skill commit`
      );
    }

    this.printHeader(`스킬 실행: ${skillName}`);

    const input = this.parseSkillArgs(skillName as SkillName, args);
    const result = await this.skillExecutor.execute(skillName as SkillName, input);

    if (result.success) {
      this.printSuccess(`${symbols.success} ${skillName} 스킬이 성공적으로 완료되었습니다.`);
      if (this.options.debug) {
        console.log(JSON.stringify(result, null, 2));
      }
    } else {
      this.printError(`${symbols.error} ${skillName} 스킬 실행 실패: ${result.error}`);
    }
  }

  /**
   * 상태 표시
   */
  private showStatus(): void {
    this.printHeader('AI Orchestrator 상태');

    if (!this.orchestrator) {
      this.printInfo('실행 중인 워크플로우가 없습니다.');
      return;
    }

    const context = this.orchestrator.getContext();
    if (!context) {
      this.printInfo('워크플로우 컨텍스트가 없습니다.');
      return;
    }

    console.log(`  ID: ${context.id}`);
    console.log(`  상태: ${context.status}`);
    console.log(`  현재 단계: ${context.currentStep}`);
    console.log(`  시작 시간: ${context.startedAt.toLocaleString()}`);
  }

  /**
   * 버전 표시
   */
  private showVersion(): void {
    console.log('ai-orchestrator v0.1.0');
  }

  /**
   * 도움말 표시
   */
  private showHelp(): void {
    console.log(`
${colorize('AI Orchestrator CLI', 'cyan')}

${colorize('사용법:', 'yellow')}
  npx ai-orchestrator <command> [options] [args]

${colorize('명령어:', 'yellow')}
  run <request>       워크플로우 실행 (Planner → Coder → Reviewer)
  skill <name>        개별 스킬 실행 (commit, test, review-pr, deploy, docs, interview)
  status              현재 상태 확인
  help                도움말 표시
  version             버전 표시

${colorize('옵션:', 'yellow')}
  --debug             디버그 모드 활성화
  --auto-approve      자동 승인 활성화
  --auto-commit       자동 커밋 활성화
  --no-simulate       실제 실행 모드 (기본: 시뮬레이션)

${colorize('예시:', 'yellow')}
  npx ai-orchestrator run "사용자 인증 기능 추가"
  npx ai-orchestrator run "버그 수정: 로그인 실패" --auto-approve
  npx ai-orchestrator skill commit
  npx ai-orchestrator skill test --debug

${colorize('스킬 목록:', 'yellow')}
  commit              Git 커밋 자동화
  test                테스트 실행 및 분석
  review-pr           PR 생성 및 리뷰
  deploy              배포 프로세스
  docs                문서 자동 생성
  interview           기획 인터뷰 및 요구사항 수집
`);
  }

  // ==================== 내부 유틸리티 메서드 ====================

  private parseArgs(args: string[]): {
    command: Command;
    commandArgs: string[];
    options: Partial<CLIOptions>;
  } {
    const options: Partial<CLIOptions> = {};
    const filteredArgs: string[] = [];

    for (const arg of args) {
      if (arg === '--debug') {
        options.debug = true;
      } else if (arg === '--auto-approve') {
        options.autoApprove = true;
      } else if (arg === '--auto-commit') {
        options.autoCommit = true;
      } else if (arg === '--no-simulate') {
        options.simulate = false;
      } else if (!arg.startsWith('--')) {
        filteredArgs.push(arg);
      }
    }

    const command = (filteredArgs[0] || 'help') as Command;
    const commandArgs = filteredArgs.slice(1);

    return { command, commandArgs, options };
  }

  private parseSkillArgs(_skill: SkillName, args: string[]): Record<string, unknown> {
    const input: Record<string, unknown> = {};

    for (let i = 0; i < args.length; i++) {
      if (args[i].startsWith('--') && i + 1 < args.length) {
        const key = args[i].substring(2);
        input[key] = args[i + 1];
        i++;
      }
    }

    return input;
  }

  private handleWorkflowEvent(event: WorkflowEvent): void {
    const timestamp = event.timestamp.toLocaleTimeString();
    const agent = String(event.data?.agent ?? '');
    const skill = String(event.data?.skill ?? '');
    const error = String(event.data?.error ?? '');

    switch (event.type) {
      case 'workflow:started':
        this.printInfo(`[${timestamp}] ${symbols.start} 워크플로우 시작`);
        break;
      case 'agent:started':
        this.printInfo(`[${timestamp}] ${symbols.running} ${agent} 에이전트 실행 중...`);
        break;
      case 'agent:completed':
        this.printSuccess(`[${timestamp}] ${symbols.success} ${agent} 에이전트 완료`);
        break;
      case 'agent:failed':
        this.printError(`[${timestamp}] ${symbols.error} ${agent} 에이전트 실패: ${error}`);
        break;
      case 'approval:requested':
        this.printWarning(`[${timestamp}] ${symbols.waiting} 승인 대기 중...`);
        break;
      case 'approval:received':
        this.printInfo(`[${timestamp}] ${symbols.success} 승인 완료`);
        break;
      case 'skill:started':
        this.printInfo(`[${timestamp}] ${symbols.running} ${skill} 스킬 실행 중...`);
        break;
      case 'skill:completed':
        this.printSuccess(`[${timestamp}] ${symbols.success} ${skill} 스킬 완료`);
        break;
      case 'workflow:completed':
        this.printSuccess(`[${timestamp}] ${symbols.success} 워크플로우 완료`);
        break;
      case 'workflow:failed':
        this.printError(`[${timestamp}] ${symbols.error} 워크플로우 실패`);
        break;
      case 'workflow:cancelled':
        this.printWarning(`[${timestamp}] ${symbols.warning} 워크플로우 취소됨`);
        break;
      default:
        if (this.options.debug) {
          // eslint-disable-next-line no-console
          console.log(`[${timestamp}] ${event.type}`);
        }
    }
  }

  private printWorkflowSummary(summary: WorkflowSummary): void {
    this.printSeparator();
    this.printHeader('워크플로우 결과');

    const statusIcon =
      summary.status === 'completed'
        ? colorize(symbols.success, 'green')
        : summary.status === 'cancelled'
          ? colorize(symbols.warning, 'yellow')
          : colorize(symbols.error, 'red');

    console.log(`  상태: ${statusIcon} ${summary.status}`);
    console.log(`  ID: ${summary.id}`);
    console.log(`  소요 시간: ${formatDuration(summary.duration)}`);
    console.log('');
    console.log('  단계별 결과:');
    console.log(`    Plan:      ${this.formatStepStatus(summary.steps.plan)}`);
    console.log(`    Implement: ${this.formatStepStatus(summary.steps.implement)}`);
    console.log(`    Review:    ${this.formatStepStatus(summary.steps.review)}`);
    console.log(`    Commit:    ${this.formatStepStatus(summary.steps.commit)}`);

    if (summary.error) {
      console.log('');
      this.printError(`  오류: ${summary.error}`);
    }
  }

  private formatStepStatus(status: string): string {
    switch (status) {
      case 'completed':
        return colorize(`${symbols.success} 완료`, 'green');
      case 'failed':
        return colorize(`${symbols.error} 실패`, 'red');
      case 'skipped':
        return colorize(`${symbols.skip} 건너뜀`, 'gray');
      default:
        return colorize(`${symbols.pending} 대기`, 'yellow');
    }
  }

  private printHeader(text: string): void {
    console.log('');
    console.log(colorize(`═══ ${text} ═══`, 'cyan'));
    console.log('');
  }

  private printSeparator(): void {
    console.log(colorize('─'.repeat(50), 'gray'));
  }

  private printInfo(text: string): void {
    console.log(`  ${text}`);
  }

  private printSuccess(text: string): void {
    console.log(`  ${colorize(text, 'green')}`);
  }

  private printWarning(text: string): void {
    console.log(`  ${colorize(text, 'yellow')}`);
  }

  private printError(text: string): void {
    console.error(`  ${colorize(text, 'red')}`);
  }
}

/**
 * CLI 실행
 */
export async function runCLI(): Promise<void> {
  const cli = new CLI();
  await cli.run(process.argv.slice(2));
}

// 직접 실행 시 (심볼릭 링크 지원)
import { fileURLToPath } from 'node:url';
import { realpathSync } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const argv1Real = process.argv[1] ? realpathSync(process.argv[1]) : '';

if (__filename === argv1Real || process.argv[1]?.endsWith('cli/index.js')) {
  runCLI().catch(error => {
    console.error('CLI 실행 오류:', error);
    process.exit(1);
  });
}
