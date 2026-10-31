import { useEffect, useRef, type AnimationEvent } from 'react';
import { playPencilSound } from '../audio/pencilSound';
import { BOARD_SIZE } from '../game/gomoku';

interface Props {
  start: number;
  end: number;
  soundEnabled: boolean;
}

export default function WinningLine({ start, end, soundEnabled }: Props) {
  const lineRef = useRef<SVGLineElement>(null);
  const stopSoundRef = useRef<(() => void) | null>(null);

  function stopSound() {
    stopSoundRef.current?.();
    stopSoundRef.current = null;
  }

  useEffect(() => {
    const line = lineRef.current;
    if (!soundEnabled) stopSound();
    line?.addEventListener('animationcancel', stopSound);
    return () => {
      line?.removeEventListener('animationcancel', stopSound);
      stopSound();
    };
  }, [soundEnabled]);

  function startSound(event: AnimationEvent<SVGLineElement>) {
    stopSound();
    if (!soundEnabled) return;
    // 使用实际动画时长；减少动态效果时没有绘制动画，也不会触发划线声。
    const duration = Number.parseFloat(getComputedStyle(event.currentTarget).animationDuration);
    const remaining = duration - event.elapsedTime;
    if (Number.isFinite(remaining) && remaining > 0) {
      stopSoundRef.current = playPencilSound(remaining);
    }
  }

  return (
    <svg
      className="winning-line-overlay"
      viewBox={`0 0 ${BOARD_SIZE} ${BOARD_SIZE}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <line
        ref={lineRef}
        className="winning-line"
        x1={(start % BOARD_SIZE) + 0.5}
        y1={Math.floor(start / BOARD_SIZE) + 0.5}
        x2={(end % BOARD_SIZE) + 0.5}
        y2={Math.floor(end / BOARD_SIZE) + 0.5}
        pathLength="1"
        onAnimationStart={startSound}
        onAnimationEnd={stopSound}
      />
    </svg>
  );
}
