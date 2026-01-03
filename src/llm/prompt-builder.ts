import { readFile } from 'fs/promises';
import { join } from 'path';

/**
 * 프롬프트 변수 타입
 */
export type PromptVariables = Record<string, string | object>;

/**
 * 에이전트 타입
 */
export type AgentType = 'planner' | 'coder' | 'reviewer';

/**
 * 스킬 타입
 */
export type SkillType = 'commit' | 'test' | 'review-pr' | 'interview' | 'deploy' | 'docs';

/**
 * 프롬프트 빌더
 *
 * prompts/ 폴더에서 프롬프트 템플릿을 로드하고 변수를 치환합니다.
 *
 * @example
 * ```typescript
 * const builder = new PromptBuilder();
 * const prompt = await builder.buildAgentPrompt('planner', {
 *   userRequest: 'Add a login page',
 *   projectContext: '...'
 * });
 * ```
 */
export class PromptBuilder {
  private readonly promptsDir: string;
  private cache: Map<string, string> = new Map();

  /**
   * PromptBuilder 생성자
   * @param promptsDir - 프롬프트 디렉토리 경로 (기본값: ./prompts)
   */
  constructor(promptsDir: string = join(process.cwd(), 'prompts')) {
    this.promptsDir = promptsDir;
  }

  /**
   * Agent 프롬프트 빌드
   *
   * @param agentType - 에이전트 타입
   * @param variables - 프롬프트 변수
   * @returns 완성된 프롬프트
   *
   * @example
   * ```typescript
   * const prompt = await builder.buildAgentPrompt('planner', {
   *   userRequest: 'Create a REST API',
   *   projectContext: 'Node.js with Express',
   *   codebaseInfo: '...'
   * });
   * ```
   */
  async buildAgentPrompt(
    agentType: AgentType,
    variables: PromptVariables
  ): Promise<string> {
    const templatePath = join(this.promptsDir, 'agents', `${agentType}.md`);
    const template = await this.loadTemplate(templatePath);
    return this.substituteVariables(template, variables);
  }

  /**
   * Skill 프롬프트 빌드
   *
   * @param skillType - 스킬 타입
   * @param variables - 프롬프트 변수
   * @returns 완성된 프롬프트
   *
   * @example
   * ```typescript
   * const prompt = await builder.buildSkillPrompt('commit', {
   *   gitDiff: '...',
   *   changedFiles: ['src/index.ts', 'tests/index.test.ts'],
   *   workContext: 'Add LLM integration'
   * });
   * ```
   */
  async buildSkillPrompt(
    skillType: SkillType,
    variables: PromptVariables
  ): Promise<string> {
    const templatePath = join(this.promptsDir, 'skills', `${skillType}.md`);
    const template = await this.loadTemplate(templatePath);
    return this.substituteVariables(template, variables);
  }

  /**
   * 커스텀 프롬프트 빌드
   *
   * @param templatePath - 템플릿 파일 경로 (prompts/ 기준 상대 경로)
   * @param variables - 프롬프트 변수
   * @returns 완성된 프롬프트
   */
  async buildCustomPrompt(
    templatePath: string,
    variables: PromptVariables
  ): Promise<string> {
    const fullPath = join(this.promptsDir, templatePath);
    const template = await this.loadTemplate(fullPath);
    return this.substituteVariables(template, variables);
  }

  /**
   * 템플릿 로드 (캐싱 지원)
   */
  private async loadTemplate(path: string): Promise<string> {
    // 캐시 확인
    if (this.cache.has(path)) {
      return this.cache.get(path)!;
    }

    try {
      const content = await readFile(path, 'utf-8');
      this.cache.set(path, content);
      return content;
    } catch (error) {
      throw new Error(
        `Failed to load prompt template from ${path}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 변수 치환
   *
   * {{variableName}} 형식의 플레이스홀더를 실제 값으로 치환합니다.
   */
  private substituteVariables(
    template: string,
    variables: PromptVariables
  ): string {
    let result = template;

    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      const replacement = typeof value === 'string' ? value : JSON.stringify(value, null, 2);

      // 모든 플레이스홀더를 치환
      result = result.replace(new RegExp(placeholder, 'g'), replacement);
    }

    return result;
  }

  /**
   * 캐시 초기화
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * 특정 템플릿 캐시 제거
   */
  invalidateCache(templatePath: string): void {
    const fullPath = join(this.promptsDir, templatePath);
    this.cache.delete(fullPath);
  }
}

/**
 * 싱글톤 PromptBuilder 인스턴스
 */
let defaultBuilder: PromptBuilder | null = null;

/**
 * 기본 PromptBuilder 인스턴스 가져오기
 *
 * @returns PromptBuilder 인스턴스
 *
 * @example
 * ```typescript
 * const builder = getPromptBuilder();
 * const prompt = await builder.buildAgentPrompt('planner', {...});
 * ```
 */
export function getPromptBuilder(): PromptBuilder {
  if (!defaultBuilder) {
    defaultBuilder = new PromptBuilder();
  }
  return defaultBuilder;
}
