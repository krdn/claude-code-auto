/**
 * FileManager 테스트
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { FileManager } from '../../src/fs/file-manager.js';
import type { FileModification } from '../../src/types/file.js';

describe('FileManager', () => {
  let fileManager: FileManager;
  let tempDir: string;

  beforeEach(async () => {
    // 임시 테스트 디렉토리 생성
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'file-manager-test-'));
    fileManager = new FileManager({ workingDir: tempDir, debug: false });
  });

  afterEach(async () => {
    // 임시 디렉토리 삭제
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // 무시
    }
  });

  describe('readFile', () => {
    it('should read file content', async () => {
      const testFile = path.join(tempDir, 'test.txt');
      const content = 'Hello World';
      await fs.writeFile(testFile, content);

      const result = await fileManager.readFile('test.txt');

      expect(result.success).toBe(true);
      expect(result.data?.content).toBe(content);
      expect(result.operation).toBe('read');
    });

    it('should read specific lines', async () => {
      const testFile = path.join(tempDir, 'lines.txt');
      const content = 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5';
      await fs.writeFile(testFile, content);

      const result = await fileManager.readFile('lines.txt', {
        lines: { start: 2, end: 4 },
      });

      expect(result.success).toBe(true);
      expect(result.data?.content).toBe('Line 2\nLine 3\nLine 4');
    });

    it('should fail when file does not exist', async () => {
      const result = await fileManager.readFile('nonexistent.txt');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('writeFile', () => {
    it('should write content to file', async () => {
      const content = 'Test content';
      const result = await fileManager.writeFile('new.txt', content);

      expect(result.success).toBe(true);
      expect(result.operation).toBe('write');

      const written = await fs.readFile(path.join(tempDir, 'new.txt'), 'utf-8');
      expect(written).toBe(content);
    });

    it('should create directory if not exists', async () => {
      const content = 'Nested content';
      const result = await fileManager.writeFile('nested/dir/file.txt', content, {
        createDir: true,
      });

      expect(result.success).toBe(true);

      const written = await fs.readFile(
        path.join(tempDir, 'nested/dir/file.txt'),
        'utf-8'
      );
      expect(written).toBe(content);
    });

    it('should not overwrite if overwrite is false', async () => {
      const testFile = path.join(tempDir, 'existing.txt');
      await fs.writeFile(testFile, 'Original');

      const result = await fileManager.writeFile('existing.txt', 'New', {
        overwrite: false,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('already exists');

      const content = await fs.readFile(testFile, 'utf-8');
      expect(content).toBe('Original');
    });
  });

  describe('modifyFile', () => {
    beforeEach(async () => {
      const testFile = path.join(tempDir, 'modify.txt');
      await fs.writeFile(testFile, 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5');
    });

    it('should replace specific line', async () => {
      const modifications: FileModification[] = [
        {
          type: 'replace',
          target: { line: 3 },
          content: 'REPLACED LINE 3',
        },
      ];

      const result = await fileManager.modifyFile('modify.txt', modifications);

      expect(result.success).toBe(true);

      const content = await fs.readFile(path.join(tempDir, 'modify.txt'), 'utf-8');
      expect(content).toContain('REPLACED LINE 3');
      expect(content).not.toContain('Line 3');
    });

    it('should insert line', async () => {
      const modifications: FileModification[] = [
        {
          type: 'insert',
          target: { line: 2 },
          content: 'INSERTED LINE',
        },
      ];

      const result = await fileManager.modifyFile('modify.txt', modifications);

      expect(result.success).toBe(true);

      const content = await fs.readFile(path.join(tempDir, 'modify.txt'), 'utf-8');
      const lines = content.split('\n');
      expect(lines[1]).toBe('INSERTED LINE');
    });

    it('should delete line', async () => {
      const modifications: FileModification[] = [
        {
          type: 'delete',
          target: { line: 3 },
        },
      ];

      const result = await fileManager.modifyFile('modify.txt', modifications);

      expect(result.success).toBe(true);

      const content = await fs.readFile(path.join(tempDir, 'modify.txt'), 'utf-8');
      expect(content).not.toContain('Line 3');
    });

    it('should append content', async () => {
      const modifications: FileModification[] = [
        {
          type: 'append',
          content: 'APPENDED LINE',
        },
      ];

      const result = await fileManager.modifyFile('modify.txt', modifications);

      expect(result.success).toBe(true);

      const content = await fs.readFile(path.join(tempDir, 'modify.txt'), 'utf-8');
      expect(content.endsWith('APPENDED LINE')).toBe(true);
    });

    it('should prepend content', async () => {
      const modifications: FileModification[] = [
        {
          type: 'prepend',
          content: 'PREPENDED LINE',
        },
      ];

      const result = await fileManager.modifyFile('modify.txt', modifications);

      expect(result.success).toBe(true);

      const content = await fs.readFile(path.join(tempDir, 'modify.txt'), 'utf-8');
      expect(content.startsWith('PREPENDED LINE')).toBe(true);
    });

    it('should create backup when requested', async () => {
      const modifications: FileModification[] = [
        {
          type: 'replace',
          target: { line: 1 },
          content: 'MODIFIED',
        },
      ];

      const result = await fileManager.modifyFile('modify.txt', modifications, {
        backup: true,
      });

      expect(result.success).toBe(true);
      expect(result.data?.backupPath).toBeDefined();

      const backupContent = await fs.readFile(
        result.data!.backupPath!,
        'utf-8'
      );
      expect(backupContent).toContain('Line 1');
    });

    it('should replace with pattern', async () => {
      const modifications: FileModification[] = [
        {
          type: 'replace',
          target: { pattern: /Line \d+/g },
          content: 'REPLACED',
        },
      ];

      const result = await fileManager.modifyFile('modify.txt', modifications);

      expect(result.success).toBe(true);

      const content = await fs.readFile(path.join(tempDir, 'modify.txt'), 'utf-8');
      expect(content).toBe('REPLACED\nREPLACED\nREPLACED\nREPLACED\nREPLACED');
    });
  });

  describe('deleteFile', () => {
    it('should delete file', async () => {
      const testFile = path.join(tempDir, 'delete.txt');
      await fs.writeFile(testFile, 'To be deleted');

      const result = await fileManager.deleteFile('delete.txt');

      expect(result.success).toBe(true);
      expect(result.operation).toBe('delete');

      const exists = await fileManager.fileExists('delete.txt');
      expect(exists).toBe(false);
    });

    it('should fail when file does not exist', async () => {
      const result = await fileManager.deleteFile('nonexistent.txt');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('getFileInfo', () => {
    it('should return file information', async () => {
      const testFile = path.join(tempDir, 'info.txt');
      await fs.writeFile(testFile, 'File info test');

      const info = await fileManager.getFileInfo('info.txt');

      expect(info).not.toBeNull();
      expect(info?.name).toBe('info.txt');
      expect(info?.extension).toBe('.txt');
      expect(info?.isFile).toBe(true);
      expect(info?.isDirectory).toBe(false);
      expect(info?.size).toBeGreaterThan(0);
    });

    it('should return null for nonexistent file', async () => {
      const info = await fileManager.getFileInfo('nonexistent.txt');

      expect(info).toBeNull();
    });
  });

  describe('fileExists', () => {
    it('should return true for existing file', async () => {
      const testFile = path.join(tempDir, 'exists.txt');
      await fs.writeFile(testFile, 'Exists');

      const exists = await fileManager.fileExists('exists.txt');

      expect(exists).toBe(true);
    });

    it('should return false for nonexistent file', async () => {
      const exists = await fileManager.fileExists('nonexistent.txt');

      expect(exists).toBe(false);
    });
  });

  describe('searchFiles', () => {
    beforeEach(async () => {
      // 테스트 파일 구조 생성
      await fs.mkdir(path.join(tempDir, 'src'), { recursive: true });
      await fs.mkdir(path.join(tempDir, 'tests'), { recursive: true });
      await fs.writeFile(path.join(tempDir, 'src/index.ts'), '');
      await fs.writeFile(path.join(tempDir, 'src/utils.ts'), '');
      await fs.writeFile(path.join(tempDir, 'tests/test.ts'), '');
      await fs.writeFile(path.join(tempDir, 'README.md'), '');
    });

    it('should find all TypeScript files', async () => {
      const files = await fileManager.searchFiles('.', {
        pattern: '**/*.ts',
        filesOnly: true,
      });

      expect(Array.isArray(files)).toBe(true);
      expect(files.length).toBe(3);
      expect(files.some((f) => f.endsWith('index.ts'))).toBe(true);
      expect(files.some((f) => f.endsWith('utils.ts'))).toBe(true);
      expect(files.some((f) => f.endsWith('test.ts'))).toBe(true);
    });

    it('should exclude patterns', async () => {
      const files = await fileManager.searchFiles('.', {
        pattern: '**/*.ts',
        exclude: ['**/tests/**'],
        filesOnly: true,
      });

      expect(files.length).toBe(2);
      expect(files.some((f) => f.endsWith('test.ts'))).toBe(false);
    });
  });

  describe('getDirectoryTree', () => {
    beforeEach(async () => {
      // 테스트 디렉토리 구조 생성
      await fs.mkdir(path.join(tempDir, 'src/utils'), { recursive: true });
      await fs.writeFile(path.join(tempDir, 'src/index.ts'), 'root file');
      await fs.writeFile(path.join(tempDir, 'src/utils/helper.ts'), 'helper file');
    });

    it('should return directory tree', async () => {
      const tree = await fileManager.getDirectoryTree('.');

      expect(tree).not.toBeNull();
      expect(tree?.name).toBe(path.basename(tempDir));
      expect(tree?.isDirectory).toBe(true);
      expect(tree?.children).toBeDefined();
      expect(tree!.children!.length).toBeGreaterThan(0);
    });

    it('should respect maxDepth', async () => {
      const tree = await fileManager.getDirectoryTree('.', 2);

      expect(tree).not.toBeNull();
      expect(tree?.children).toBeDefined();

      // maxDepth=2이므로 src 디렉토리는 자식을 가져야 함
      const srcNode = tree!.children!.find((c) => c.name === 'src');
      expect(srcNode).toBeDefined();
      expect(srcNode?.children).toBeDefined();

      // utils는 depth=2이므로 자식이 없어야 함 (maxDepth=2)
      const utilsNode = srcNode!.children!.find((c) => c.name === 'utils');
      if (utilsNode) {
        // utils는 있지만 자식은 없어야 함 (depth=2에서 멈춤)
        expect(utilsNode.children).toBeUndefined();
      }
    });
  });
});
