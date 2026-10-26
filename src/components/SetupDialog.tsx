import { useState, type FormEvent } from 'react';
import { ArrowRight, Check, Sparkles } from 'lucide-react';
import Modal from './Modal';
import { DIFFICULTIES, type GamePreferences } from '../types';

interface Props {
  preferences: GamePreferences;
  onClose: () => void;
  onConfirm: (preferences: GamePreferences) => void;
}

export default function SetupDialog({ preferences, onClose, onConfirm }: Props) {
  const [draft, setDraft] = useState<GamePreferences>({ ...preferences, mode: 'single' });

  function submit(event: FormEvent) {
    event.preventDefault();
    onConfirm(draft);
  }

  return (
    <Modal
      title="一个人的棋力修行"
      subtitle="找到适合你的节奏，每一次落子都是进步。"
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <div className="setup-mode">
          <Sparkles size={21} />
          <span>单人模式 · 人机对弈</span>
          <span className="mini-badge">15 × 15</span>
        </div>
        <fieldset>
          <legend>选择棋力</legend>
          <div className="difficulty-options">
            {DIFFICULTIES.map((option) => (
              <label
                key={option.value}
                className={`difficulty-option ${draft.difficulty === option.value ? 'is-selected' : ''}`}
              >
                <input
                  type="radio"
                  name="difficulty"
                  value={option.value}
                  checked={draft.difficulty === option.value}
                  onChange={() => setDraft({ ...draft, difficulty: option.value })}
                />
                <span className="difficulty-level" aria-hidden="true">
                  {[1, 2, 3].map((level) => (
                    <i
                      key={level}
                      className={level <= DIFFICULTIES.indexOf(option) + 1 ? 'filled' : ''}
                    />
                  ))}
                </span>
                <strong>{option.label}</strong>
                <span className="radio-indicator">
                  {draft.difficulty === option.value && <Check size={11} />}
                </span>
              </label>
            ))}
          </div>
          <p className="field-hint">
            {DIFFICULTIES.find((option) => option.value === draft.difficulty)?.description}
          </p>
        </fieldset>
        <fieldset>
          <legend>你的执子</legend>
          <div className="color-options">
            {(['black', 'white'] as const).map((color) => (
              <label
                key={color}
                className={`color-option ${draft.color === color ? 'is-selected' : ''}`}
              >
                <input
                  type="radio"
                  name="color"
                  value={color}
                  checked={draft.color === color}
                  onChange={() => setDraft({ ...draft, color })}
                />
                <span className={`small-stone stone-${color}`} />
                <span>{color === 'black' ? '执黑 · 先行' : '执白 · 后行'}</span>
                {draft.color === color && <Check size={16} />}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="setup-rule">
          <span className="status-dot" />
          自由五子棋<span>黑棋先行 · 五子相连获胜 · 无禁手</span>
        </div>
        <p className="scope-note">
          设置仅本次有效，刷新或重启后恢复默认。AI 对弈将在后续版本开放。
        </p>
        <button className="primary-button save-button" type="submit">
          确认对局设置
          <ArrowRight size={18} />
        </button>
      </form>
    </Modal>
  );
}
