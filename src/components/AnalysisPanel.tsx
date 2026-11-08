import { useTranslation } from 'react-i18next';
import { AnalysisSource, EngineState } from '../../shared/analysis';
import type { GameState } from '../game/gomoku';
import { usePositionAnalysis } from '../hooks/usePositionAnalysis';
import WinRateChart from './WinRateChart';
import '../analysis.css';

const ENGINE_MESSAGES = {
  [EngineState.STARTING]: 'analysis.starting',
  [EngineState.READY]: 'analysis.pending',
  [EngineState.ERROR]: 'analysis.engineError',
  [EngineState.STOPPING]: 'analysis.stopping',
  [EngineState.STOPPED]: 'analysis.stopped',
} as const;

export default function AnalysisPanel({
  game,
  analysis,
}: {
  game: GameState;
  analysis: ReturnType<typeof usePositionAnalysis>;
}) {
  const { t } = useTranslation();
  const { points, result, state, available, canRetry, retry, error } = analysis;
  const hasGaps = points.some((point, index) => point.moveHistory.length !== index);
  return (
    <section className="analysis-panel" aria-label={t('analysis.label')}>
      <div className="analysis-title flex flex-wrap items-center justify-between gap-2">
        <h2>{t('analysis.title')}</h2>
        <span>{t('analysis.local')}</span>
      </div>
      <WinRateChart
        key={game.moveHistory.join(',')}
        points={points}
        moveHistory={game.moveHistory}
        result={result}
      />
      <div className="analysis-footer">
        <p aria-live="polite">
          {error
            ? t(`analysis.errors.${error}`)
            : result
              ? t(
                  result.source === AnalysisSource.TERMINAL
                    ? 'analysis.ended'
                    : 'analysis.disclaimer',
                )
              : t(available ? ENGINE_MESSAGES[state] : 'analysis.desktop')}
        </p>
        {hasGaps && <p>{t('analysis.gaps')}</p>}
        {canRetry && (
          <button className="analysis-retry" onClick={() => void retry()}>
            {t('analysis.retry')}
          </button>
        )}
      </div>
    </section>
  );
}
