import { useState, type FormEvent } from 'react';
import { ArrowRight, Check, LoaderCircle, Sparkles, Users } from 'lucide-react';
import Modal from './Modal';
import { DIFFICULTIES, type GameMode, type GamePreferences } from '../types';
import { savePreferences } from '../api';

interface Props {
  mode: GameMode;
  preferences: GamePreferences;
  onClose: () => void;
  onSave: (preferences: GamePreferences) => void;
}

export default function SetupDialog({ mode, preferences, onClose, onSave }: Props) {
  const [draft, setDraft] = useState<GamePreferences>({ ...preferences, mode });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const single = mode === 'single';

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError('');
    try {
      const result = await savePreferences({
        ...draft,
        playerOne: draft.playerOne.trim(),
        playerTwo: draft.playerTwo.trim(),
      });
      onSave(result);
    } catch {
      setError('暂时无法保存设置，请确认应用服务已启动后重试。');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={single ? '一个人的棋力修行' : '好朋友，好对手'}
      subtitle={
        single ? '找到适合你的节奏，每一次落子都是进步。' : '共享一块棋盘，让思考在你我之间流动。'
      }
      onClose={() => {
        if (!saving) onClose();
      }}
    >
      <form onSubmit={submit}>
        <div className={`setup-mode ${single ? '' : 'setup-local'}`}>
          {single ? <Sparkles size={21} /> : <Users size={21} />}
          <span>{single ? '单人模式 · 人机对弈' : '双人模式 · 本地对弈'}</span>
          <span className="mini-badge">15 × 15</span>
        </div>
        {single ? (
          <>
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
          </>
        ) : (
          <fieldset>
            <legend>认识一下两位棋手</legend>
            <div className="player-fields">
              <label>
                <span>
                  <i className="tiny-stone stone-black" />
                  黑棋 · 先行
                </span>
                <input
                  name="playerOne"
                  aria-label="黑棋棋手昵称"
                  value={draft.playerOne}
                  maxLength={16}
                  required
                  pattern=".*\S.*"
                  onChange={(event) => setDraft({ ...draft, playerOne: event.target.value })}
                  placeholder="棋手一"
                  autoComplete="off"
                />
              </label>
              <span className="versus">VS</span>
              <label>
                <span>
                  <i className="tiny-stone stone-white" />
                  白棋 · 后行
                </span>
                <input
                  name="playerTwo"
                  aria-label="白棋棋手昵称"
                  value={draft.playerTwo}
                  maxLength={16}
                  required
                  pattern=".*\S.*"
                  onChange={(event) => setDraft({ ...draft, playerTwo: event.target.value })}
                  placeholder="棋手二"
                  autoComplete="off"
                />
              </label>
            </div>
            <p className="field-hint">两位玩家在同一设备轮流落子，无需联网。</p>
          </fieldset>
        )}
        <div className="setup-rule">
          <span className="status-dot" />
          自由五子棋<span>黑棋先行 · 五子相连获胜 · 无禁手</span>
        </div>
        <p className="scope-note">当前可选择模式并保存偏好，棋盘对弈将在后续版本开放。</p>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="primary-button save-button" type="submit" disabled={saving}>
          {saving ? (
            <>
              <LoaderCircle className="spin" size={18} />
              正在保存
            </>
          ) : (
            <>
              确认对局设置
              <ArrowRight size={18} />
            </>
          )}
        </button>
      </form>
    </Modal>
  );
}
