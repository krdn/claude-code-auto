import { simpleGit, SimpleGit, StatusResult } from 'simple-git';

/**
 * Git 파일 상태
 */
export interface GitFileStatus {
  /** 파일 경로 */
  path: string;
  /** 변경 유형 (M: Modified, A: Added, D: Deleted, R: Renamed) */
  status: 'M' | 'A' | 'D' | 'R' | '??' | string;
  /** Staged 여부 */
  staged: boolean;
}

/**
 * Git 커밋 결과
 */
export interface GitCommitResult {
  /** 성공 여부 */
  success: boolean;
  /** 커밋 해시 */
  hash: string;
  /** 에러 메시지 (실패 시) */
  error?: string;
}

/**
 * Git 클라이언트
 *
 * simple-git을 사용하여 Git 명령어를 수행합니다.
 *
 * @example
 * ```typescript
 * const git = new GitClient(workingDir);
 * const status = await git.status();
 * console.log(`Changed files: ${status.files.length}`);
 * ```
 */
export class GitClient {
  private git: SimpleGit;

  /**
   * GitClient 생성자
   * @param workingDir - Git 저장소 경로
   */
  constructor(workingDir: string) {
    this.git = simpleGit(workingDir);
  }

  /**
   * Git 상태 조회
   *
   * @returns Git 상태 정보
   *
   * @example
   * ```typescript
   * const status = await git.status();
   * console.log(`Modified: ${status.modified.length}`);
   * console.log(`Created: ${status.created.length}`);
   * ```
   */
  async status(): Promise<StatusResult> {
    try {
      return await this.git.status();
    } catch (error) {
      throw new Error(
        `Failed to get git status: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 변경된 파일 목록 조회 (구조화된 형식)
   *
   * @returns 파일 상태 배열
   */
  async getChangedFiles(): Promise<GitFileStatus[]> {
    const status = await this.status();
    const files: GitFileStatus[] = [];

    // Modified files
    status.modified.forEach(path => {
      files.push({ path, status: 'M', staged: false });
    });

    // Created files
    status.created.forEach(path => {
      files.push({ path, status: 'A', staged: false });
    });

    // Deleted files
    status.deleted.forEach(path => {
      files.push({ path, status: 'D', staged: false });
    });

    // Renamed files
    status.renamed.forEach(file => {
      files.push({ path: file.to, status: 'R', staged: false });
    });

    // Not added files
    status.not_added.forEach(path => {
      files.push({ path, status: '??', staged: false });
    });

    // Staged files
    status.staged.forEach(path => {
      const existing = files.find(f => f.path === path);
      if (existing) {
        existing.staged = true;
      } else {
        files.push({ path, status: 'M', staged: true });
      }
    });

    return files;
  }

  /**
   * Git diff 조회
   *
   * @param options - diff 옵션
   * @returns diff 결과
   *
   * @example
   * ```typescript
   * // Unstaged changes
   * const diff = await git.diff();
   *
   * // Staged changes
   * const stagedDiff = await git.diff({ staged: true });
   *
   * // Specific file
   * const fileDiff = await git.diff({ file: 'src/index.ts' });
   * ```
   */
  async diff(options?: { staged?: boolean; file?: string }): Promise<string> {
    try {
      const args: string[] = [];

      if (options?.staged) {
        args.push('--cached');
      }

      if (options?.file) {
        args.push('--', options.file);
      }

      return await this.git.diff(args);
    } catch (error) {
      throw new Error(
        `Failed to get git diff: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 파일 스테이징 (git add)
   *
   * @param files - 스테이징할 파일 경로 배열
   *
   * @example
   * ```typescript
   * await git.add(['src/index.ts', 'tests/index.test.ts']);
   * // 또는 모든 파일
   * await git.add(['.']);
   * ```
   */
  async add(files: string[]): Promise<void> {
    try {
      await this.git.add(files);
    } catch (error) {
      throw new Error(
        `Failed to stage files: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Git 커밋
   *
   * @param message - 커밋 메시지
   * @returns 커밋 결과
   *
   * @example
   * ```typescript
   * const result = await git.commit('feat(llm): Add Anthropic client');
   * if (result.success) {
   *   console.log(`Committed: ${result.hash}`);
   * }
   * ```
   */
  async commit(message: string): Promise<GitCommitResult> {
    try {
      const result = await this.git.commit(message);

      return {
        success: true,
        hash: result.commit,
      };
    } catch (error) {
      return {
        success: false,
        hash: '',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Git push
   *
   * @param remote - 리모트 이름 (기본값: origin)
   * @param branch - 브랜치 이름 (기본값: 현재 브랜치)
   *
   * @example
   * ```typescript
   * await git.push();
   * // 특정 브랜치로 푸시
   * await git.push('origin', 'feature/llm-integration');
   * ```
   */
  async push(remote: string = 'origin', branch?: string): Promise<void> {
    try {
      if (branch) {
        await this.git.push(remote, branch);
      } else {
        await this.git.push();
      }
    } catch (error) {
      throw new Error(`Failed to push: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Git pull
   *
   * @param remote - 리모트 이름 (기본값: origin)
   * @param branch - 브랜치 이름 (기본값: 현재 브랜치)
   */
  async pull(remote: string = 'origin', branch?: string): Promise<void> {
    try {
      if (branch) {
        await this.git.pull(remote, branch);
      } else {
        await this.git.pull();
      }
    } catch (error) {
      throw new Error(`Failed to pull: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 현재 브랜치 이름 조회
   *
   * @returns 브랜치 이름
   */
  async getCurrentBranch(): Promise<string> {
    try {
      const status = await this.status();
      return status.current || 'unknown';
    } catch (error) {
      throw new Error(
        `Failed to get current branch: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 변경사항이 있는지 확인
   *
   * @returns true if there are changes, false otherwise
   */
  async hasChanges(): Promise<boolean> {
    const status = await this.status();
    return status.files.length > 0;
  }

  /**
   * 커밋 이력 조회
   *
   * @param maxCount - 최대 커밋 수 (기본값: 10)
   * @returns 커밋 이력
   */
  async log(maxCount: number = 10): Promise<string> {
    try {
      const log = await this.git.log({ maxCount });
      return log.all.map(commit => `${commit.hash.substring(0, 7)} ${commit.message}`).join('\n');
    } catch (error) {
      throw new Error(
        `Failed to get log: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
