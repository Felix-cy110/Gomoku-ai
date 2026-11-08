import { AnalysisError } from '../../shared/analysis';

// IPC 错误码与渲染侧校验错误保持结构化，由展示层负责翻译。
export const AnalysisIssue = {
  ...AnalysisError,
  CONNECTION: 'connection',
  INVALID_MOVE: 'invalidMove',
  MISMATCHED_REPLY: 'mismatchedReply',
  SEARCH_FAILED: 'searchFailed',
} as const;
export type AnalysisIssue = (typeof AnalysisIssue)[keyof typeof AnalysisIssue];
