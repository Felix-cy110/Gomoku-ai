import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const [draft, setDraft] = useState<GamePreferences>({ ...preferences, mode: 'single' });

  function submit(event: FormEvent) {
    event.preventDefault();
    onConfirm(draft);
  }

  return (
    <Modal title={t('setup.title')} subtitle={t('setup.subtitle')} onClose={onClose}>
      <form onSubmit={submit}>
        <div className="setup-mode">
          <Sparkles size={21} />
          <span>{t('setup.mode')}</span>
          <span className="mini-badge">15 × 15</span>
        </div>
        <fieldset>
          <legend>{t('setup.difficulty')}</legend>
          <div className="difficulty-options grid grid-cols-3 gap-[9px]">
            {DIFFICULTIES.map((option) => (
              <label
                key={option}
                className={`difficulty-option ${draft.difficulty === option ? 'is-selected' : ''}`}
              >
                <input
                  type="radio"
                  name="difficulty"
                  value={option}
                  checked={draft.difficulty === option}
                  onChange={() => setDraft({ ...draft, difficulty: option })}
                />
                <span className="difficulty-level" aria-hidden="true">
                  {[1, 2, 3].map((level) => (
                    <i
                      key={level}
                      className={level <= DIFFICULTIES.indexOf(option) + 1 ? 'filled' : ''}
                    />
                  ))}
                </span>
                <strong>{t(`difficulty.${option}.label`)}</strong>
                <span className="radio-indicator">
                  {draft.difficulty === option && <Check size={11} />}
                </span>
              </label>
            ))}
          </div>
          <p className="field-hint">{t(`difficulty.${draft.difficulty}.description`)}</p>
        </fieldset>
        <fieldset>
          <legend>{t('setup.color')}</legend>
          <div className="color-options grid grid-cols-2 gap-[10px]">
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
                <span>{color === 'black' ? t('setup.black') : t('setup.white')}</span>
                {draft.color === color && <Check size={16} />}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="setup-rule">
          <span className="status-dot" />
          {t('setup.rules')}
          <span>{t('setup.ruleHint')}</span>
        </div>
        <p className="scope-note">{t('setup.note')}</p>
        <button className="primary-button save-button" type="submit">
          {t('setup.start')}
          <ArrowRight size={18} />
        </button>
      </form>
    </Modal>
  );
}
