import { useTranslation } from 'react-i18next';
import { useState, type KeyboardEvent, type PointerEvent } from 'react';
import { AnalysisSource, type PositionAnalysis, type Probabilities } from '../../shared/analysis';
import type { AnalysisPoint } from '../game/analysis';
import { coordinate } from '../game/gomoku';

const SERIES = [
  { key: 'blackWin', label: 'chart.blackWin', className: 'black' },
  { key: 'whiteWin', label: 'chart.whiteWin', className: 'white' },
  { key: 'draw', label: 'chart.draw', className: 'draw' },
] as const;
const PLOT = { width: 280, height: 232, left: 38, right: 266, top: 16, bottom: 198 };
const PERCENT_TICKS = [0, 25, 50, 75, 100];

interface Props {
  points: readonly AnalysisPoint[];
  moveHistory: readonly number[];
  result?: PositionAnalysis;
}

export default function WinRateChart({ points, moveHistory, result }: Props) {
  const { t } = useTranslation();
  const [selectedMove, setSelectedMove] = useState<number | null>(null);
  const moves = moveHistory.length;
  const inspectedMove = selectedMove ?? moves;
  const inspected =
    selectedMove === null
      ? result
      : points.find((point) => point.moveHistory.length === selectedMove)?.analysis;
  const maxMove = Math.max(10, Math.ceil(moves / 10) * 10);
  const moveTicks = Array.from({ length: 6 }, (_, index) => (maxMove * index) / 5);
  const x = (move: number) => PLOT.left + (move / maxMove) * (PLOT.right - PLOT.left);
  const y = (probability: number) => PLOT.bottom - probability * (PLOT.bottom - PLOT.top);
  const summary = inspected
    ? SERIES.map(
        (series) => `${t(series.label)} ${(inspected[series.key] * 100).toFixed(1)}%`,
      ).join(t('chart.separator'))
    : t('chart.empty');

  function pathFor(key: keyof Probabilities) {
    return points
      .map((point, index) => {
        const move = point.moveHistory.length;
        // 未完成分析的手数保留断点，避免把插值显示为模型预测。
        const command = index > 0 && points[index - 1].moveHistory.length === move - 1 ? 'L' : 'M';
        return `${command}${x(move)},${y(point.analysis[key])}`;
      })
      .join(' ');
  }

  function inspectPointer(event: PointerEvent<SVGSVGElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const position = ((event.clientX - bounds.left) / bounds.width) * PLOT.width;
    const move = Math.round(((position - PLOT.left) / (PLOT.right - PLOT.left)) * maxMove);
    setSelectedMove(Math.max(0, Math.min(moves, move)));
  }

  function inspectKey(event: KeyboardEvent<HTMLDivElement>) {
    let next = inspectedMove;
    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowDown':
        next -= 1;
        break;
      case 'ArrowRight':
      case 'ArrowUp':
        next += 1;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = moves;
        break;
      default:
        return;
    }
    event.preventDefault();
    setSelectedMove(Math.max(0, Math.min(moves, next)));
  }

  return (
    <>
      <div className="analysis-position">
        <span>{selectedMove === null ? t('chart.current') : t('chart.history')}</span>
        <strong data-testid="analysis-move">
          {t('chart.move', {
            count: inspectedMove,
            coordinate:
              inspectedMove === 0 ? t('chart.opening') : coordinate(moveHistory[inspectedMove - 1]),
          })}
        </strong>
      </div>
      <div className="analysis-values grid grid-cols-3 gap-2" aria-live="polite" aria-atomic="true">
        {SERIES.map((series) => (
          <div key={series.key}>
            <span>
              <i className={`chart-key chart-${series.className}`} />
              {t(series.label)}
            </span>
            <strong data-testid={inspected ? `probability-${series.className}` : undefined}>
              {inspected ? `${(inspected[series.key] * 100).toFixed(1)}%` : '—'}
            </strong>
          </div>
        ))}
      </div>
      <div
        className="win-rate-chart"
        role="slider"
        tabIndex={0}
        aria-label={t('chart.label')}
        aria-valuemin={0}
        aria-valuemax={moves}
        aria-valuenow={inspectedMove}
        aria-valuetext={t('chart.value', { count: inspectedMove, summary })}
        onKeyDown={inspectKey}
        onBlur={() => setSelectedMove(null)}
        onPointerLeave={(event) => {
          if (event.pointerType !== 'touch') setSelectedMove(null);
        }}
      >
        <svg
          viewBox={`0 0 ${PLOT.width} ${PLOT.height}`}
          aria-hidden="true"
          onPointerMove={inspectPointer}
          onPointerDown={inspectPointer}
        >
          {PERCENT_TICKS.map((tick) => (
            <g key={tick} className="chart-grid">
              <line x1={PLOT.left} x2={PLOT.right} y1={y(tick / 100)} y2={y(tick / 100)} />
              <text x={PLOT.left - 9} y={y(tick / 100) + 3} textAnchor="end">
                {tick}%
              </text>
            </g>
          ))}
          {moveTicks.map((move) => (
            <text
              key={move}
              className="chart-axis"
              x={x(move)}
              y={PLOT.bottom + 18}
              textAnchor="middle"
            >
              {move}
            </text>
          ))}
          <text className="chart-axis" x={PLOT.right} y={PLOT.height - 1} textAnchor="end">
            {t('chart.moves')}
          </text>
          {SERIES.map((series) => (
            <g key={series.key} className={`chart-series chart-${series.className}`}>
              <path data-testid={`chart-line-${series.className}`} d={pathFor(series.key)} />
              {points.map((point) => (
                <circle
                  key={point.moveHistory.length}
                  data-testid={`chart-point-${series.className}`}
                  data-move={point.moveHistory.length}
                  cx={x(point.moveHistory.length)}
                  cy={y(point.analysis[series.key])}
                  r={point.moveHistory.length === inspectedMove ? 3.5 : 2}
                />
              ))}
            </g>
          ))}
          {selectedMove !== null && (
            <line
              className="chart-cursor"
              x1={x(inspectedMove)}
              x2={x(inspectedMove)}
              y1={PLOT.top}
              y2={PLOT.bottom}
            />
          )}
          {points.length === 0 && (
            <text
              className="chart-empty"
              x={(PLOT.left + PLOT.right) / 2}
              y={105}
              textAnchor="middle"
            >
              {t('chart.waiting')}
            </text>
          )}
        </svg>
      </div>
      <p className="chart-inspection-note">
        {selectedMove !== null && !inspected
          ? t('chart.missing')
          : inspected?.source === AnalysisSource.TERMINAL
            ? t('chart.terminal')
            : t('chart.inspect')}
      </p>
    </>
  );
}
