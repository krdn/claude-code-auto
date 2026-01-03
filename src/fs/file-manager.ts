/**
 * File Manager
 *
 * 파일 시스템 작업을 담당하는 클래스
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { glob } from 'glob';
import type {
  FileInfo,
  FileOperationResult,
  ReadFileOptions,
  WriteFileOptions,
  ModifyFileOptions,
  FileModification,
  SearchFilesOptions,
  DirectoryTreeNode,
} from '../types/file.js';

/**
 * FileManager 설정
 */
export interface FileManagerConfig {
  /** 작업 디렉토리 (기본: process.cwd()) */
  workingDir: string;
  /** 디버그 모드 */
  debug: boolean;
}

/**
 * FileManager 클래스
 *
 * 파일 읽기, 쓰기, 수정, 검색 등의 작업 수행
 */
export class FileManager {
  private config: FileManagerConfig;

  constructor(config: Partial<FileManagerConfig> = {}) {
    this.config = {
      workingDir: config.workingDir || process.cwd(),
      debug: config.debug || false,
    };
  }

  /**
   * 파일 읽기
   */
  async readFile(
    filePath: string,
    options: ReadFileOptions = {}
  ): Promise<FileOperationResult> {
    try {
      const absolutePath = this.resolvePath(filePath);
      const encoding = options.encoding || 'utf-8';

      // 파일 존재 확인
      await fs.access(absolutePath);

      // 파일 읽기
      let content = await fs.readFile(absolutePath, encoding);

      // 특정 라인만 읽기
      if (options.lines) {
        const lines = content.split('\n');
        const start = Math.max(0, options.lines.start - 1);
        const end = options.lines.end ? options.lines.end : lines.length;
        content = lines.slice(start, end).join('\n');
      }

      return {
        success: true,
        path: absolutePath,
        operation: 'read',
        data: { content },
      };
    } catch (error) {
      return {
        success: false,
        path: filePath,
        operation: 'read',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 파일 쓰기
   */
  async writeFile(
    filePath: string,
    content: string,
    options: WriteFileOptions = {}
  ): Promise<FileOperationResult> {
    try {
      const absolutePath = this.resolvePath(filePath);
      const encoding = options.encoding || 'utf-8';
      const overwrite = options.overwrite !== false;
      const createDir = options.createDir !== false;

      // 파일 존재 확인
      const exists = await this.fileExists(absolutePath);
      if (exists && !overwrite) {
        return {
          success: false,
          path: absolutePath,
          operation: 'write',
          error: 'File already exists and overwrite is false',
        };
      }

      // 디렉토리 생성
      if (createDir) {
        const dir = path.dirname(absolutePath);
        await fs.mkdir(dir, { recursive: true });
      }

      // 파일 쓰기
      await fs.writeFile(absolutePath, content, encoding);

      const stats = await fs.stat(absolutePath);

      return {
        success: true,
        path: absolutePath,
        operation: 'write',
        data: { bytesWritten: stats.size },
      };
    } catch (error) {
      return {
        success: false,
        path: filePath,
        operation: 'write',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 파일 수정
   */
  async modifyFile(
    filePath: string,
    modifications: FileModification[],
    options: ModifyFileOptions = {}
  ): Promise<FileOperationResult> {
    try {
      const absolutePath = this.resolvePath(filePath);

      // 파일 읽기
      const readResult = await this.readFile(absolutePath);
      if (!readResult.success || !readResult.data?.content) {
        return {
          success: false,
          path: absolutePath,
          operation: 'modify',
          error: 'Failed to read file',
        };
      }

      let content = readResult.data.content;

      // 백업 생성
      let backupPath: string | undefined;
      if (options.backup) {
        backupPath = options.backupPath || `${absolutePath}.backup`;
        await fs.copyFile(absolutePath, backupPath);
      }

      // 수정 작업 적용
      for (const mod of modifications) {
        content = this.applyModification(content, mod);
      }

      // 파일 쓰기
      const writeResult = await this.writeFile(absolutePath, content, {
        overwrite: true,
      });

      if (!writeResult.success) {
        return writeResult;
      }

      return {
        success: true,
        path: absolutePath,
        operation: 'modify',
        data: {
          bytesWritten: writeResult.data?.bytesWritten,
          backupPath,
        },
      };
    } catch (error) {
      return {
        success: false,
        path: filePath,
        operation: 'modify',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 파일 삭제
   */
  async deleteFile(filePath: string): Promise<FileOperationResult> {
    try {
      const absolutePath = this.resolvePath(filePath);
      await fs.unlink(absolutePath);

      return {
        success: true,
        path: absolutePath,
        operation: 'delete',
      };
    } catch (error) {
      return {
        success: false,
        path: filePath,
        operation: 'delete',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 파일 정보 가져오기
   */
  async getFileInfo(filePath: string): Promise<FileInfo | null> {
    try {
      const absolutePath = this.resolvePath(filePath);
      const stats = await fs.stat(absolutePath);

      return {
        path: absolutePath,
        name: path.basename(absolutePath),
        extension: path.extname(absolutePath),
        size: stats.size,
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime,
        isDirectory: stats.isDirectory(),
        isFile: stats.isFile(),
      };
    } catch {
      return null;
    }
  }

  /**
   * 파일 존재 확인
   */
  async fileExists(filePath: string): Promise<boolean> {
    try {
      const absolutePath = this.resolvePath(filePath);
      await fs.access(absolutePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 파일 검색
   */
  async searchFiles(
    basePath: string,
    options: SearchFilesOptions = {}
  ): Promise<string[]> {
    try {
      const absoluteBasePath = this.resolvePath(basePath);
      const pattern = options.pattern || '**/*';

      // glob은 절대 경로보다 상대 경로 패턴을 선호
      const files = await glob(pattern, {
        cwd: absoluteBasePath,
        ignore: options.exclude || ['**/node_modules/**', '**/.git/**'],
        absolute: true, // 절대 경로로 반환
        nodir: options.filesOnly,
      });

      // 디렉토리만 필터링
      if (options.directoriesOnly) {
        const dirs: string[] = [];
        for (const file of files) {
          const stats = await fs.stat(file);
          if (stats.isDirectory()) {
            dirs.push(file);
          }
        }
        return dirs;
      }

      return files;
    } catch (error) {
      if (this.config.debug) {
        console.error('[FileManager] Search error:', error);
      }
      return [];
    }
  }

  /**
   * 디렉토리 트리 생성
   */
  async getDirectoryTree(
    dirPath: string,
    maxDepth: number = 3
  ): Promise<DirectoryTreeNode | null> {
    try {
      const absolutePath = this.resolvePath(dirPath);
      return await this.buildTreeNode(absolutePath, 0, maxDepth);
    } catch (error) {
      if (this.config.debug) {
        console.error('[FileManager] Directory tree error:', error);
      }
      return null;
    }
  }

  // ==================== Private Methods ====================

  /**
   * 상대 경로를 절대 경로로 변환
   */
  private resolvePath(filePath: string): string {
    return path.isAbsolute(filePath)
      ? filePath
      : path.resolve(this.config.workingDir, filePath);
  }

  /**
   * 수정 작업 적용
   */
  private applyModification(content: string, mod: FileModification): string {
    const lines = content.split('\n');

    switch (mod.type) {
      case 'replace':
        if (mod.target?.line !== undefined) {
          // 특정 라인 교체
          const lineIndex = mod.target.line - 1;
          if (lineIndex >= 0 && lineIndex < lines.length) {
            lines[lineIndex] = mod.content || '';
          }
        } else if (mod.target?.pattern) {
          // 패턴 매칭 교체
          const pattern =
            typeof mod.target.pattern === 'string'
              ? new RegExp(mod.target.pattern, 'g')
              : mod.target.pattern;
          return content.replace(pattern, mod.content || '');
        }
        break;

      case 'insert':
        if (mod.target?.line !== undefined) {
          // 특정 라인에 삽입
          const lineIndex = mod.target.line - 1;
          lines.splice(lineIndex, 0, mod.content || '');
        }
        break;

      case 'delete':
        if (mod.target?.line !== undefined) {
          // 특정 라인 삭제
          const lineIndex = mod.target.line - 1;
          if (lineIndex >= 0 && lineIndex < lines.length) {
            lines.splice(lineIndex, 1);
          }
        }
        break;

      case 'append':
        // 파일 끝에 추가
        lines.push(mod.content || '');
        break;

      case 'prepend':
        // 파일 앞에 추가
        lines.unshift(mod.content || '');
        break;
    }

    return lines.join('\n');
  }

  /**
   * 디렉토리 트리 노드 생성 (재귀)
   */
  private async buildTreeNode(
    nodePath: string,
    depth: number,
    maxDepth: number
  ): Promise<DirectoryTreeNode | null> {
    try {
      const stats = await fs.stat(nodePath);
      const name = path.basename(nodePath);

      const node: DirectoryTreeNode = {
        name,
        path: nodePath,
        isDirectory: stats.isDirectory(),
      };

      if (stats.isFile()) {
        node.size = stats.size;
        return node;
      }

      // 디렉토리인 경우, 자식 노드 탐색
      if (depth < maxDepth) {
        const entries = await fs.readdir(nodePath);
        const children: DirectoryTreeNode[] = [];

        for (const entry of entries) {
          const childPath = path.join(nodePath, entry);
          const childNode = await this.buildTreeNode(childPath, depth + 1, maxDepth);
          if (childNode) {
            children.push(childNode);
          }
        }

        node.children = children;
      }

      return node;
    } catch {
      return null;
    }
  }
}

/**
 * FileManager 인스턴스 생성 헬퍼
 */
export function createFileManager(config?: Partial<FileManagerConfig>): FileManager {
  return new FileManager(config);
}
