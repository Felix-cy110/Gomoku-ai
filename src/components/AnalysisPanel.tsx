import { AnalysisSource } from '../../shared/analysis';
import type { GameState } from '../game/gomoku';
import { usePositionAnalysis } from '../hooks/usePositionAnalysis';
import WinRateChart from './WinRateChart';
import '../analysis.css';

export default function AnalysisPanel({ game }: { game: GameState }) {
  const { points, result, message, canRetry, retry } = usePositionAnalysis(game);
  const hasGaps = points.some((point, index) => point.moveHistory.length !== index);
  return (
    <section className="analysis-panel" aria-label="局面分析">
      <div className="analysis-title">
        <h2>胜率走势</h2>
        <span>本机分析</span>
      </div>
      <WinRateChart
        key={game.moveHistory.join(',')}
        points={points}
        moveHistory={game.moveHistory}
        result={result}
      />
      <div className="analysis-footer">
        <p aria-live="polite">
          {result
            ? result.source === AnalysisSource.TERMINAL
              ? '本局已结束'
              : 'Rapfi 模型预测，仅供参考'
            : message}
        </p>
        {hasGaps && <p>缺失分析的手数以断点保留</p>}
        {canRetry && (
          <button className="analysis-retry" onClick={() => void retry()}>
            重试分析
          </button>
        )}
      </div>
    </section>
  );
}
