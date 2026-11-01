import { useEffect, useState } from 'react';
import {
  AnalysisError,
  EngineState,
  type EngineStatus,
  type PositionAnalysis,
} from '../../shared/analysis';
import { retainAnalysisHistory, terminalAnalysis, type AnalysisPoint } from '../game/analysis';
import type { GameState } from '../game/gomoku';

const CONNECTION_ERROR: EngineStatus = {
  state: EngineState.ERROR,
  message: '无法连接本地分析引擎，请重试。',
};

export function usePositionAnalysis(game: GameState) {
  const bridge = window.desktop?.analysis;
  const [status, setStatus] = useState<EngineStatus>({
    state: EngineState.STARTING,
    message: '正在初始化本地分析引擎…',
  });
  const [snapshot, setSnapshot] = useState<{
    game: GameState;
    result?: PositionAnalysis;
    error?: string;
  }>();
  const [history, setHistory] = useState<AnalysisPoint[]>([]);
  const points = retainAnalysisHistory(history, game.moveHistory);

  useEffect(() => {
    setHistory((current) => retainAnalysisHistory(current, game.moveHistory));
  }, [game]);

  useEffect(() => {
    if (!bridge) return;
    let disposed = false;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const next = await bridge!.getStatus();
        if (!disposed)
          setStatus((current) =>
            current.state === next.state && current.message === next.message ? current : next,
          );
      } catch {
        if (!disposed) setStatus(CONNECTION_ERROR);
      }
      if (!disposed) timer = setTimeout(() => void poll(), 1000);
    }
    void poll();
    return () => {
      disposed = true;
      clearTimeout(timer);
    };
  }, [bridge]);

  useEffect(() => {
    if (!bridge || game.result || status.state !== EngineState.READY) return;
    let disposed = false;
    const id = crypto.randomUUID();
    const timer = setTimeout(() => {
      void bridge
        .analyze({ id, moveHistory: game.moveHistory })
        .then((reply) => {
          if (disposed) return;
          if (reply.ok && reply.id === id) {
            setSnapshot({ game, result: reply.analysis });
            setHistory((current) => [
              ...retainAnalysisHistory(current, game.moveHistory).filter(
                (point) => point.moveHistory.length !== game.moves,
              ),
              { moveHistory: game.moveHistory, analysis: reply.analysis },
            ]);
          } else if (!reply.ok && reply.code !== AnalysisError.CANCELLED)
            setSnapshot({ game, error: reply.message });
        })
        .catch(() => {
          if (!disposed) setSnapshot({ game, error: CONNECTION_ERROR.message });
        });
    }, 120);
    return () => {
      disposed = true;
      clearTimeout(timer);
      void bridge.cancel(id).catch((error: unknown) => console.warn('取消分析失败', error));
    };
  }, [bridge, game, status.state]);

  async function retry() {
    if (!bridge) return;
    setSnapshot(undefined);
    setStatus({ state: EngineState.STARTING, message: '正在重新初始化…' });
    try {
      setStatus(await bridge.restart());
    } catch {
      setStatus(CONNECTION_ERROR);
    }
  }

  const terminal = terminalAnalysis(game);
  const current =
    snapshot?.game === game && status.state === EngineState.READY ? snapshot : undefined;
  return {
    points: terminal ? [...points, { moveHistory: game.moveHistory, analysis: terminal }] : points,
    result: terminal ?? current?.result,
    message: terminal
      ? '本局已结束'
      : !bridge
        ? '请在桌面客户端使用本地分析'
        : status.state !== EngineState.READY
          ? status.message
          : (current?.error ?? '正在分析当前局面…'),
    canRetry:
      Boolean(bridge) &&
      !terminal &&
      (status.state === EngineState.ERROR || Boolean(current?.error)),
    retry,
  };
}
