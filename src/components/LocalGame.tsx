import { useTranslation } from 'react-i18next';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { ArrowLeft, ArrowUpRight, BookOpen, RotateCcw, Undo2 } from 'lucide-react';
import { BOARD_SIZE, coordinate, createGame, playMove, undoMove } from '../game/gomoku';
import WinningLine from './WinningLine';
import AnalysisPanel from './AnalysisPanel';
import { usePositionAnalysis } from '../hooks/usePositionAnalysis';
import { undoPlayerTurn } from '../game/single-player';
import { type GamePreferences } from '../types';
import '../game.css';

interface Props {
  onExit: () => void;
  onRules: () => void;
  onStone: () => void;
  soundEnabled: boolean;
  opponent?: GamePreferences;
}

const STAR_POINTS = [48, 56, 112, 168, 176];
const CENTER = 112;

export default function LocalGame({ onExit, onRules, onStone, soundEnabled, opponent }: Props) {
  const { t } = useTranslation();
  const [game, setGame] = useState(createGame);
  const [analysisSession, setAnalysisSession] = useState(0);
  const [focusIndex, setFocusIndex] = useState(CENTER);
  const boardRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const finished = game.result !== null;
  const computerTurn = Boolean(opponent && game.turn !== opponent.color && !finished);
  const analysis = usePositionAnalysis(
    game,
    analysisSession,
    computerTurn ? opponent?.difficulty : undefined,
  );
  const blocked = finished || computerTurn || Boolean(opponent && !window.desktop?.analysis);
  const canUndo = opponent ? undoPlayerTurn(game, opponent.color) !== game : game.moves > 0;
  const stoneSoundRef = useRef(onStone);
  stoneSoundRef.current = onStone;
  const winningStart = game.winningLine[0];
  const winningEnd = game.winningLine[game.winningLine.length - 1];
  const status =
    game.result === 'draw'
      ? t('game.draw')
      : game.result
        ? t('game.win', { color: t(`common.${game.result}`) })
        : t('game.turn', { color: t(`common.${game.turn}`) });

  useEffect(() => {
    if (!computerTurn || analysis.computerMove === undefined) return;
    const next = playMove(game, analysis.computerMove);
    if (next === game) return;
    setGame((current) => (current === game ? next : current));
    stoneSoundRef.current();
  }, [game, computerTurn, analysis.computerMove]);

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, []);

  function placeStone(index: number) {
    if (blocked || game.board[index]) return;
    setGame((current) => playMove(current, index));
    onStone();
  }

  function focusCell(index: number) {
    setFocusIndex(index);
    boardRef.current?.querySelector<HTMLButtonElement>(`[data-index="${index}"]`)?.focus();
  }

  function navigate(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const row = Math.floor(index / BOARD_SIZE);
    const col = index % BOARD_SIZE;
    let next = index;
    switch (event.key) {
      case 'ArrowUp':
        next = Math.max(0, row - 1) * BOARD_SIZE + col;
        break;
      case 'ArrowDown':
        next = Math.min(BOARD_SIZE - 1, row + 1) * BOARD_SIZE + col;
        break;
      case 'ArrowLeft':
        next = row * BOARD_SIZE + Math.max(0, col - 1);
        break;
      case 'ArrowRight':
        next = row * BOARD_SIZE + Math.min(BOARD_SIZE - 1, col + 1);
        break;
      case 'Home':
        next = row * BOARD_SIZE;
        break;
      case 'End':
        next = row * BOARD_SIZE + BOARD_SIZE - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    focusCell(next);
  }

  function restart() {
    setAnalysisSession((current) => current + 1);
    setGame(createGame());
    focusCell(CENTER);
  }

  function undo() {
    if (!canUndo || game.lastMove === null) return;
    setGame((current) => (opponent ? undoPlayerTurn(current, opponent.color) : undoMove(current)));
    focusCell(game.lastMove);
  }

  return (
    <section className="local-game" aria-labelledby="game-heading">
      <div className="game-heading-row">
        <div>
          <button className="game-back" onClick={onExit}>
            <ArrowLeft size={15} />
            {t('game.back')}
          </button>
          <span className="eyebrow">A LITTLE FRIENDLY COMPETITION</span>
          <h1 id="game-heading" ref={headingRef} tabIndex={-1}>
            {opponent ? t('game.singleTitle') : t('game.localTitle')}
          </h1>
          <p>
            {opponent ? t(`game.singleDescription_${opponent.color}`) : t('game.localDescription')}
          </p>
        </div>
        <span className="game-mode-tag">
          <span className="status-dot" />
          {opponent
            ? t('game.summary', {
                difficulty: t(`difficulty.${opponent.difficulty}.label`),
                side: t(opponent.color === 'black' ? 'game.blackSide' : 'game.whiteSide'),
              })
            : t('game.localTag')}
        </span>
      </div>

      <div className="game-layout grid grid-cols-[minmax(0,1fr)_280px] items-start gap-[38px]">
        <div className="board-section">
          <div className="board-topline">
            <h2 aria-live="polite" aria-atomic="true">
              {status}
            </h2>
            <span className="board-move-summary">
              {t('game.movesPrefix')}
              <span data-testid="move-count">{t('game.moves', { count: game.moves })}</span>
              {t('game.lastMove')}
              <span data-testid="last-move">
                {game.lastMove === null ? '—' : coordinate(game.lastMove)}
              </span>
            </span>
          </div>
          <div className="play-board">
            <div className="board-column-labels" aria-hidden="true">
              {Array.from({ length: BOARD_SIZE }, (_, i) => (
                <span key={i}>{String.fromCharCode(65 + i)}</span>
              ))}
            </div>
            <div className="board-row-labels" aria-hidden="true">
              {Array.from({ length: BOARD_SIZE }, (_, i) => (
                <span key={i}>{i + 1}</span>
              ))}
            </div>
            <div
              ref={boardRef}
              className={`board-grid turn-${game.turn} ${finished ? 'game-finished' : ''}`}
              role="group"
              aria-label={t('game.board')}
              aria-describedby="board-help"
            >
              {game.board.map((stone, index) => {
                const row = Math.floor(index / BOARD_SIZE);
                const col = index % BOARD_SIZE;
                const winning = game.winningLine.includes(index);
                return (
                  <button
                    key={index}
                    type="button"
                    data-index={index}
                    data-stone={stone ?? 'empty'}
                    className={`board-cell ${row === 0 ? 'edge-top' : ''} ${row === 14 ? 'edge-bottom' : ''} ${col === 0 ? 'edge-left' : ''} ${col === 14 ? 'edge-right' : ''}`}
                    aria-label={t('game.cell', {
                      coordinate: coordinate(index),
                      stone: t(stone ? `common.${stone}` : 'common.empty'),
                      winning: winning ? t('game.winningCell') : '',
                    })}
                    aria-disabled={Boolean(stone) || blocked}
                    tabIndex={index === focusIndex ? 0 : -1}
                    onFocus={() => setFocusIndex(index)}
                    onKeyDown={(event) => navigate(event, index)}
                    onClick={() => placeStone(index)}
                  >
                    {STAR_POINTS.includes(index) && <i className="board-star" aria-hidden="true" />}
                    {stone ? (
                      <span
                        className={`game-stone stone-${stone} ${winning ? 'winning-stone' : ''}`}
                        aria-hidden="true"
                      >
                        {game.lastMove === index && <i className="last-move-mark" />}
                      </span>
                    ) : (
                      <span className={`ghost-stone stone-${game.turn}`} aria-hidden="true" />
                    )}
                  </button>
                );
              })}
              {game.winningLine.length > 0 && (
                <WinningLine start={winningStart} end={winningEnd} soundEnabled={soundEnabled} />
              )}
            </div>
          </div>
          <p className="board-help" id="board-help">
            {opponent && !window.desktop?.analysis
              ? t('game.desktopOnly')
              : computerTurn
                ? analysis.canRetry
                  ? t('game.moveUnavailable')
                  : t('game.thinking')
                : t('game.place')}
            <span>{t('game.keyboard')}</span>
          </p>
        </div>

        <aside className="game-info" aria-label={t('game.info')}>
          <AnalysisPanel game={game} analysis={analysis} />
          <div className="game-players grid gap-[9px]">
            {(['black', 'white'] as const).map((color) => (
              <div
                key={color}
                className={`game-player ${!finished && game.turn === color ? 'current-player' : ''}`}
              >
                <span className={`small-stone stone-${color}`} />
                <strong>
                  {color === 'black' ? t('common.black') : t('common.white')}
                  {opponent ? ` · ${opponent.color === color ? t('game.you') : 'Rapfi'}` : ''}
                </strong>
                <span>
                  {game.result === color
                    ? t('game.winner')
                    : !finished && game.turn === color
                      ? t('game.playerThinking')
                      : color === 'black'
                        ? t('game.first')
                        : t('game.second')}
                </span>
              </div>
            ))}
          </div>
          <div className="game-actions grid gap-[10px]">
            <button
              className="undo-button"
              onClick={undo}
              disabled={!canUndo}
              title={opponent ? t('game.undoTurn') : t('game.undoMove')}
            >
              <Undo2 size={16} aria-hidden="true" />
              {t('game.undo')}
            </button>
            <button className="primary-button new-game-button" onClick={restart}>
              <RotateCcw size={16} />
              {finished ? t('game.again') : t('game.restart')}
            </button>
          </div>
          <button className="game-rules-button" onClick={onRules}>
            <BookOpen size={15} />
            {t('game.rules')}
            <ArrowUpRight size={15} />
          </button>
          <p className="game-small-note">
            {t('game.note1')}
            <br />
            {t('game.note2')}
          </p>
        </aside>
      </div>
    </section>
  );
}
