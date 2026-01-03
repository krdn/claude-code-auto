/**
 * File System Types
 *
 * 파일 시스템 작업 관련 타입 정의
 */

/**
 * 파일 작업 타입
 */
export type FileOperation = 'read' | 'write' | 'modify' | 'delete' | 'create';

/**
 * 파일 정보
 */
export interface FileInfo {
  /** 파일 경로 (절대 경로) */
  path: string;
  /** 파일명 */
  name: string;
  /** 파일 확장자 */
  extension: string;
  /** 파일 크기 (bytes) */
  size: number;
  /** 생성 시간 */
  createdAt: Date;
  /** 수정 시간 */
  modifiedAt: Date;
  /** 디렉토리 여부 */
  isDirectory: boolean;
  /** 파일 여부 */
  isFile: boolean;
}

/**
 * 파일 읽기 옵션
 */
export interface ReadFileOptions {
  /** 인코딩 (기본: 'utf-8') */
  encoding?: BufferEncoding;
  /** 특정 라인만 읽기 (예: { start: 10, end: 20 }) */
  lines?: {
    start: number;
    end?: number;
  };
}

/**
 * 파일 쓰기 옵션
 */
export interface WriteFileOptions {
  /** 인코딩 (기본: 'utf-8') */
  encoding?: BufferEncoding;
  /** 파일이 존재할 때 덮어쓰기 여부 (기본: true) */
  overwrite?: boolean;
  /** 디렉토리가 없을 때 자동 생성 여부 (기본: true) */
  createDir?: boolean;
}

/**
 * 파일 수정 옵션
 */
export interface ModifyFileOptions {
  /** 백업 생성 여부 (기본: false) */
  backup?: boolean;
  /** 백업 파일 경로 (기본: {원본}.backup) */
  backupPath?: string;
}

/**
 * 파일 수정 작업
 */
export interface FileModification {
  /** 작업 타입 */
  type: 'replace' | 'insert' | 'delete' | 'append' | 'prepend';
  /** 대상 (라인 번호 또는 패턴) */
  target?: {
    line?: number;
    pattern?: string | RegExp;
  };
  /** 새 내용 */
  content?: string;
}

/**
 * 파일 검색 옵션
 */
export interface SearchFilesOptions {
  /** 파일 패턴 (glob) */
  pattern?: string;
  /** 제외할 패턴 */
  exclude?: string[];
  /** 최대 깊이 */
  maxDepth?: number;
  /** 파일만 검색 */
  filesOnly?: boolean;
  /** 디렉토리만 검색 */
  directoriesOnly?: boolean;
}

/**
 * 파일 작업 결과
 */
export interface FileOperationResult {
  /** 성공 여부 */
  success: boolean;
  /** 파일 경로 */
  path: string;
  /** 작업 타입 */
  operation: FileOperation;
  /** 에러 메시지 (실패 시) */
  error?: string;
  /** 추가 데이터 */
  data?: {
    /** 읽은 내용 (read 작업) */
    content?: string;
    /** 쓴 바이트 수 (write 작업) */
    bytesWritten?: number;
    /** 백업 경로 (modify with backup) */
    backupPath?: string;
  };
}

/**
 * 디렉토리 탐색 결과
 */
export interface DirectoryTreeNode {
  /** 파일/디렉토리 이름 */
  name: string;
  /** 전체 경로 */
  path: string;
  /** 디렉토리 여부 */
  isDirectory: boolean;
  /** 자식 노드 (디렉토리인 경우) */
  children?: DirectoryTreeNode[];
  /** 파일 크기 (파일인 경우) */
  size?: number;
}
