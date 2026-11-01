import { AnalysisSource } from '../../shared/analysis';
import type { GameState } from '../game/gomoku';
import { usePositionAnalysis } from '../hooks/usePositionAnalysis';
import '../analysis.css';

export default function AnalysisPanel({ game }: { game: GameState }) {
  const { result, message, canRetry, retry } = usePositionAnalysis(game);
  const items = result
    ? [
        { label: '黑胜', className: 'black', value: result.blackWin },
        { label: '和棋', className: 'draw', value: result.draw },
        { label: '白胜', className: 'white', value: result.whiteWin },
      ]
    : [];
  return (
    <section className="analysis-panel" aria-label="局面分析">
      <div className="analysis-title">
        <h3>{result?.source === AnalysisSource.TERMINAL ? '本局结果' : 'AI 局面预测'}</h3>
        <span>本机分析</span>
      </div>
      <div aria-live="polite" aria-atomic="true">
        {result ? (
          <>
            <div className="analysis-bar" aria-hidden="true">
              {items.map((item) => (
                <span
                  key={item.className}
                  className={`analysis-${item.className}`}
                  style={{ width: `${item.value * 100}%` }}
                />
              ))}
            </div>
            <div className="analysis-values">
              {items.map((item) => (
                <div key={item.className}>
                  <span>{item.label}</span>
                  <strong data-testid={`probability-${item.className}`}>
                    {(item.value * 100).toFixed(1)}%
                  </strong>
                </div>
              ))}
            </div>
            <p>
              {result.source === AnalysisSource.TERMINAL
                ? '根据本局规则确定'
                : 'Rapfi 模型预测，仅供参考'}
            </p>
          </>
        ) : (
          <p className="analysis-message">{message}</p>
        )}
      </div>
      {canRetry && (
        <button className="analysis-retry" onClick={() => void retry()}>
          重试分析
        </button>
      )}
    </section>
  );
}
