import { useTranslation } from 'react-i18next';
import { ArrowRight, Check, CircleHelp } from 'lucide-react';
import Modal from './Modal';
import { Panel } from '../types';

interface Props {
  panel: Panel | null;
  playing: boolean;
  sound: boolean;
  toggleSound: () => void;
  onClose: () => void;
  onHome: () => void;
}

export default function AppPanels({ panel, playing, sound, toggleSound, onClose, onHome }: Props) {
  const { t } = useTranslation();
  return (
    <>
      {panel === Panel.RULES && (
        <Modal title={t('rules.title')} subtitle={t('rules.subtitle')} onClose={onClose} wide>
          <div className="rule-steps grid grid-cols-3 gap-[21px]">
            <div>
              <span className="rule-number">01</span>
              <h3>{t('rules.firstTitle')}</h3>
              <p>{t('rules.firstText')}</p>
            </div>
            <div>
              <span className="rule-number">02</span>
              <h3>{t('rules.placeTitle')}</h3>
              <p>{t('rules.placeText')}</p>
            </div>
            <div>
              <span className="rule-number">03</span>
              <h3>{t('rules.winTitle')}</h3>
              <p>{t('rules.winText')}</p>
            </div>
          </div>
          <div className="winning-example" aria-label={t('rules.example')}>
            {[0, 1, 2, 3, 4].map((i) => (
              <span key={i} className="small-stone stone-black" />
            ))}
            <span>
              <Check size={15} />
              {t('rules.five')}
            </span>
          </div>
          <div className="rule-notice">
            <CircleHelp size={18} />
            <p>{t('rules.notice')}</p>
          </div>
          <button className="primary-button save-button" onClick={onClose}>
            {playing ? t('rules.continue') : t('rules.home')}
            <ArrowRight size={17} />
          </button>
        </Modal>
      )}
      {panel === Panel.HISTORY && (
        <Modal title={t('history.title')} subtitle={t('history.subtitle')} onClose={onClose}>
          <div className="empty-state">
            <div className="empty-board" aria-hidden="true">
              <span className="small-stone stone-black" />
              <span className="small-stone stone-white" />
            </div>
            <h3>{t('history.empty')}</h3>
            <p>
              {t('history.unavailable')}
              <br />
              {t('history.memory')}
            </p>
          </div>
          <button className="primary-button save-button" onClick={onHome}>
            {t('history.home')}
            <ArrowRight size={17} />
          </button>
        </Modal>
      )}
      {panel === Panel.SETTINGS && (
        <Modal title={t('settings.title')} subtitle={t('settings.subtitle')} onClose={onClose}>
          <div className="setting-row flex items-center justify-between gap-4">
            <div>
              <h3>{t('settings.sound')}</h3>
              <p>{t('settings.soundHint')}</p>
            </div>
            <button
              className={`toggle-switch ${sound ? 'on' : ''}`}
              role="switch"
              aria-checked={sound}
              aria-label={t('settings.sound')}
              onClick={toggleSound}
            >
              <span />
            </button>
          </div>
          <div className="settings-about">
            <span className="brand-mark">
              <i />
              <i />
              <i />
              <i />
            </span>
            <div>
              <strong>{t('common.brandFull')}</strong>
              <p>{t('settings.version')}</p>
            </div>
          </div>
          <p className="settings-footnote">{t('settings.footnote')}</p>
        </Modal>
      )}
    </>
  );
}
