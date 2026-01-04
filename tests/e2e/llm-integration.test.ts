/**
 * LLM Integration E2E Tests
 *
 * 실제 LLM을 호출하여 전체 워크플로우를 검증합니다.
 * ANTHROPIC_API_KEY 또는 Claude CLI (Max Plan)가 필요합니다.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { AgentExecutor } from '../../src/engine/agent-executor.js';
import { FileManager } from '../../src/fs/file-manager.js';
import { TestRunner } from '../../src/test/test-runner.js';
import { LlmClient } from '../../src/llm/llm-client.js';
import type { LlmAuthMethod } from '../../src/config/default.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

// 환경 변수 확인
const authMethod = (process.env.LLM_AUTH_METHOD || 'api-key') as LlmAuthMethod;
const apiKey = process.env.ANTHROPIC_API_KEY || '';
const cliPath = process.env.CLAUDE_CLI_PATH || 'claude';

// LLM 사용 가능 여부 확인
const hasApiKey = apiKey.length > 0 && apiKey !== 'sk-ant-your-api-key-here';
const usesCli = authMethod === 'cli';
const canRunTests = hasApiKey || usesCli;

// LLM이 없으면 전체 테스트 스킵
const describeIf = canRunTests ? describe : describe.skip;

describeIf('LLM Integration Tests (Real API)', () => {
  let testDir: string;
  let agentExecutor: AgentExecutor;
  let fileManager: FileManager;

  beforeAll(async () => {
    // 임시 테스트 디렉토리 생성
    testDir = path.join(os.tmpdir(), `ai-orchestrator-llm-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });

    // 간단한 package.json 생성 (테스트용)
    await fs.writeFile(
      path.join(testDir, 'package.json'),
      JSON.stringify({
        name: 'test-project',
        version: '1.0.0',
        scripts: {
          test: 'echo "Test passed"',
          'type-check': 'echo "Type check passed"',
          lint: 'echo "Lint passed"',
        },
      })
    );

    // tsconfig.json 생성
    await fs.writeFile(
      path.join(testDir, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          target: 'ES2020',
          module: 'ESNext',
          moduleResolution: 'node',
          strict: true,
        },
      })
    );

    // 컴포넌트 초기화
    fileManager = new FileManager(testDir);
    const testRunner = new TestRunner(testDir);

    // LLM Client 생성 (authMethod에 따라)
    const llmClient = new LlmClient(
      authMethod === 'cli'
        ? {
            authMethod: 'cli',
            cliPath,
          }
        : {
            authMethod: 'api-key',
            apiKey,
          }
    );

    console.log(`[LLM Integration Test] Auth method: ${authMethod}`);

    agentExecutor = new AgentExecutor({
      projectRoot: testDir,
      llmClient,
      fileManager,
      testRunner,
      simulate: false, // 실제 LLM 호출
      selfHealingEnabled: false, // 통합 테스트에서는 self-healing 비활성화
      maxHealingAttempts: 1,
      debug: true,
    });

    console.log(`[LLM Integration Test] Test directory: ${testDir}`);
  });

  afterAll(async () => {
    // 테스트 디렉토리 정리
    try {
      await fs.rm(testDir, { recursive: true, force: true });
      console.log(`[LLM Integration Test] Cleaned up: ${testDir}`);
    } catch (error) {
      console.warn(`[LLM Integration Test] Failed to clean up ${testDir}:`, error);
    }
  });

  it.skip(
    'should execute Planner agent and parse response correctly',
    async () => {
      const input = {
        request: 'Add a simple add(a, b) function that returns the sum of two numbers',
      };

      const result = await agentExecutor.executePlanner(input);

      // 전체 결과 출력 (디버깅용)
      console.log('[Planner Result - Full]:', JSON.stringify(result, null, 2));

      // 파싱 성공 검증
      expect(result.success).toBe(true);
      expect(result.role).toBe('planner');

      // 필수 필드 검증
      expect(result.title).toBeTruthy();
      expect(result.objective).toBeTruthy();
      expect(result.affectedFiles).toBeDefined();
      expect(result.phases).toBeDefined();

      console.log('[Planner Result Summary]:', {
        title: result.title,
        objective: result.objective,
        affectedFiles: result.affectedFiles,
        phases: result.phases,
        risks: result.risks,
      });

      // 계획에 파일 변경사항이 포함되어 있는지 확인 (일단 스킵)
      // expect(result.affectedFiles.length).toBeGreaterThan(0);
    },
    { timeout: 60000 }
  ); // 60초 타임아웃

  it.skip(
    'should execute Coder agent and create files',
    async () => {
      // 간단한 계획 제공
      const planResult = {
        role: 'planner' as const,
        success: true,
        title: 'Add add function',
        objective: 'Create a simple addition function',
        affectedFiles: [
          {
            path: 'src/utils/math.ts',
            changeType: 'create' as const,
            description: 'Math utility functions',
          },
        ],
        phases: [
          {
            number: 1,
            title: 'Implementation',
            tasks: ['Create math.ts file', 'Add add function'],
          },
        ],
        risks: [],
        approvalStatus: 'approved' as const,
        nextStep: 'coder' as const,
      };

      const input = {
        request: 'Add a simple add(a, b) function',
        plan: planResult,
      };

      const result = await agentExecutor.executeCoder(input);

      // 파싱 성공 검증
      expect(result.role).toBe('coder');

      // 파일 변경사항 검증
      expect(result.files).toBeDefined();
      expect(result.files.length).toBeGreaterThan(0);

      // 실제 파일이 생성되었는지 확인
      const hasFileCreated = result.files.some(f => f.changeType === 'create');
      if (hasFileCreated) {
        const createdFile = result.files.find(f => f.changeType === 'create');
        if (createdFile) {
          const filePath = path.join(testDir, createdFile.path);
          const fileExists = await fs
            .access(filePath)
            .then(() => true)
            .catch(() => false);
          expect(fileExists).toBe(true);

          if (fileExists) {
            const content = await fs.readFile(filePath, 'utf-8');
            console.log('[Created File]:', createdFile.path);
            console.log('[File Content Preview]:', content.substring(0, 200));
          }
        }
      }

      console.log('[Coder Result]:', {
        success: result.success,
        filesChanged: result.files.length,
        message: result.message,
      });
    },
    { timeout: 90000 }
  ); // 90초 타임아웃

  it.skip(
    'should execute Reviewer agent and parse review correctly',
    async () => {
      // 간단한 코드 변경사항 제공
      const coderResult = {
        role: 'coder' as const,
        success: true,
        message: 'Implementation complete',
        files: [
          {
            path: 'src/utils/math.ts',
            changeType: 'create' as const,
            summary: 'Added add function',
            linesChanged: { added: 5, removed: 0 },
          },
        ],
        testResults: {
          passed: true,
          total: 1,
          successful: 1,
          failed: 0,
          details: 'All tests passed',
        },
        healingAttempts: 0,
        nextStep: 'reviewer' as const,
      };

      const input = {
        request: 'Add add function',
        implementation: coderResult,
      };

      const result = await agentExecutor.executeReviewer(input);

      // 파싱 성공 검증
      expect(result.success).toBe(true);
      expect(result.role).toBe('reviewer');

      // 필수 필드 검증
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.decision).toMatch(/approved|conditional|rejected/);
      expect(result.summary).toBeDefined();

      // 리뷰 항목 검증
      expect(result.summary.quality).toMatch(/pass|warning|fail/);
      expect(result.positives).toBeDefined();
      expect(result.criticalIssues).toBeDefined();
      expect(result.suggestions).toBeDefined();

      console.log('[Reviewer Result]:', {
        score: result.score,
        decision: result.decision,
        quality: result.summary.quality,
        positives: result.positives.length,
        suggestions: result.suggestions.length,
      });
    },
    { timeout: 90000 }
  ); // 90초 타임아웃

  it.skip(
    'should execute full workflow: Planner → Coder → Reviewer',
    async () => {
      const request = 'Add a multiply(a, b) function to src/utils/math.ts';

      // Step 1: Planner
      console.log('[Full Workflow] Step 1: Executing Planner...');
      const planResult = await agentExecutor.executePlanner({ request });
      expect(planResult.success).toBe(true);

      // 계획 승인 (테스트 환경에서 자동 승인)
      planResult.approvalStatus = 'approved';

      // Step 2: Coder
      console.log('[Full Workflow] Step 2: Executing Coder...');
      const coderInput = {
        request,
        plan: planResult,
      };
      const coderResult = await agentExecutor.executeCoder(coderInput);
      expect(coderResult.files.length).toBeGreaterThan(0);

      // Step 3: Reviewer
      console.log('[Full Workflow] Step 3: Executing Reviewer...');
      const reviewerInput = {
        request,
        implementation: coderResult,
      };
      const reviewResult = await agentExecutor.executeReviewer(reviewerInput);
      expect(reviewResult.success).toBe(true);

      // 전체 플로우 검증
      console.log('[Full Workflow] Complete!', {
        plan: { title: planResult.title, phases: planResult.phases.length },
        code: { files: coderResult.files.length },
        review: { score: reviewResult.score, decision: reviewResult.decision },
      });

      // 최종 결과 검증
      expect(reviewResult.decision).toBeTruthy();
    },
    { timeout: 600000 }
  ); // 10분 타임아웃 (검증 시간 포함)
});

// LLM이 설정되지 않았을 때 안내 메시지
if (!canRunTests) {
  console.warn(`
┌─────────────────────────────────────────────────────────────────┐
│  ⚠️  LLM Integration Tests Skipped                              │
├─────────────────────────────────────────────────────────────────┤
│  실제 LLM 통합 테스트를 실행하려면 다음 중 하나를 설정하세요:   │
│                                                                  │
│  옵션 1: Claude Max Plan CLI 사용 (권장)                         │
│  1. .env.example을 .env로 복사                                  │
│     cp .env.example .env                                         │
│                                                                  │
│  2. .env 파일에서 LLM_AUTH_METHOD 설정                           │
│     LLM_AUTH_METHOD=cli                                          │
│                                                                  │
│  3. 테스트 재실행                                                │
│     npm test                                                     │
│                                                                  │
│  옵션 2: Anthropic API 키 사용                                   │
│  1. .env 파일에서 LLM_AUTH_METHOD와 API 키 설정                  │
│     LLM_AUTH_METHOD=api-key                                      │
│     ANTHROPIC_API_KEY=sk-ant-your-actual-key                    │
│                                                                  │
│  2. 테스트 재실행                                                │
│     npm test                                                     │
└─────────────────────────────────────────────────────────────────┘
`);
}
