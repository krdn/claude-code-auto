/**
 * Claude CLI Client
 *
 * 로컬 Claude CLI를 프록시로 사용하여 Max Plan 구독으로 LLM 호출
 * API 키 대신 로컬 인증 세션 활용
 */

import { execa } from 'execa';
import type { ClaudeModel, CompleteParams } from './anthropic-client.js';

/**
 * Claude CLI 응답 인터페이스
 */
interface ClaudeCliResponse {
  content: string;
  error?: string;
}

/**
 * Claude CLI Client 클래스
 *
 * 로컬에 설치된 `claude` CLI 도구를 사용하여 LLM 요청 수행
 * Max Plan 구독을 활용하여 API 키 없이 사용 가능
 */
export class ClaudeCliClient {
  private readonly cliPath: string;
  private readonly maxRetries: number = 3;
  private readonly retryDelay: number = 1000;

  /**
   * ClaudeCliClient 생성자
   * @param cliPath - claude CLI 실행 파일 경로 (기본값: 'claude')
   */
  constructor(cliPath: string = 'claude') {
    this.cliPath = cliPath;
  }

  /**
   * Claude CLI 사용 가능 여부 확인
   */
  async isAvailable(): Promise<boolean> {
    try {
      const { stdout, stderr } = await execa(this.cliPath, ['--version']);
      const output = (stdout + stderr).toLowerCase();
      return output.includes('claude');
    } catch {
      return false;
    }
  }

  /**
   * LLM 완성 요청
   *
   * @param params - 완성 요청 파라미터
   * @returns LLM 응답 텍스트
   */
  async complete(params: CompleteParams): Promise<string> {
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const response = await this.executeClaudeCommand(params);

        if (response.error) {
          throw new Error(response.error);
        }

        return response.content;
      } catch (error) {
        if (attempt < this.maxRetries - 1) {
          await this.delay(this.retryDelay * (attempt + 1));
          continue;
        }
        throw error;
      }
    }

    throw new Error('Failed to complete after maximum retries');
  }

  /**
   * 스트리밍 완성 요청
   *
   * @param params - 완성 요청 파라미터
   * @param onChunk - 청크 수신 시 콜백
   */
  async *completeStream(
    params: CompleteParams
  ): AsyncGenerator<string, void, unknown> {
    // Claude CLI는 현재 스트리밍을 직접 지원하지 않음
    // 전체 응답을 한 번에 반환
    const response = await this.complete(params);
    yield response;
  }

  /**
   * Claude CLI 명령 실행 (Claude Code CLI 사용)
   */
  private async executeClaudeCommand(params: CompleteParams): Promise<ClaudeCliResponse> {
    try {
      // 프롬프트 구성
      const prompt = this.buildPrompt(params);

      // Claude Code CLI 실행
      // echo "prompt" | claude --print --model haiku --output-format text
      const { stdout, stderr } = await execa(this.cliPath, [
        '--print', // 비대화형 모드
        '--model',
        this.mapModelToCli(params.model),
        '--output-format',
        'text', // 텍스트 출력
        '--no-session-persistence', // 세션 저장 안 함
      ], {
        input: prompt,
        timeout: 300000, // 5분 타임아웃
      });

      // Claude Code는 stderr에 경고를 출력할 수 있으므로 stdout이 있으면 성공
      if (stdout && stdout.trim()) {
        return {
          content: stdout.trim(),
        };
      }

      if (stderr) {
        return {
          content: '',
          error: stderr,
        };
      }

      return {
        content: '',
        error: 'No output from Claude CLI',
      };
    } catch (error) {
      return {
        content: '',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 프롬프트 빌드
   */
  private buildPrompt(params: CompleteParams): string {
    let prompt = '';

    // 시스템 프롬프트 추가
    if (params.system) {
      prompt += `System: ${params.system}\n\n`;
    }

    // 메시지 추가
    for (const message of params.messages) {
      const role = message.role === 'user' ? 'User' : 'Assistant';
      const content = typeof message.content === 'string'
        ? message.content
        : message.content.map(c => 'text' in c ? c.text : '').join('\n');

      prompt += `${role}: ${content}\n\n`;
    }

    // Temperature 힌트 (CLI가 지원한다면)
    if (params.temperature !== undefined) {
      prompt = `[Temperature: ${params.temperature}]\n\n${prompt}`;
    }

    return prompt;
  }

  /**
   * 모델명을 Claude Code CLI 형식으로 변환
   * Claude Code는 축약형 모델명 사용 (opus, sonnet, haiku)
   */
  private mapModelToCli(model: ClaudeModel): string {
    const modelMap: Record<ClaudeModel, string> = {
      'claude-opus-4': 'opus',
      'claude-sonnet-4': 'sonnet',
      'claude-haiku-4': 'haiku',
      'claude-opus-4-20250514': 'opus',
      'claude-sonnet-4-20250514': 'sonnet',
      'claude-haiku-4-20250611': 'haiku',
    };

    return modelMap[model] || 'sonnet';
  }

  /**
   * 지연 함수
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Claude CLI 사용 가능 여부 확인 헬퍼
 */
export async function checkClaudeCliAvailable(): Promise<boolean> {
  const client = new ClaudeCliClient();
  return await client.isAvailable();
}
