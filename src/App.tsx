import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  Clock3,
  Coffee,
  Grid2X2,
  Leaf,
  Monitor,
  Settings2,
  ShieldCheck,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import LocaleSelect from './components/LocaleSelect';
import BoardArt from './components/BoardArt';
import AppPanels from './components/AppPanels';
import SetupDialog from './components/SetupDialog';
import LocalGame from './components/LocalGame';
import { playStoneSound } from './audio/stoneSound';
import { DEFAULT_PREFERENCES, type GameMode, type GamePreferences, Panel } from './types';

function ModeIllustration({ mode }: { mode: GameMode }) {
  return (
    <div className={`mode-illustration illustration-${mode}`} aria-hidden="true">
      <span className="illustration-grid" />
      <span className="illustration-orbit" />
      <span className="mode-stone stone-black" />
      <span className="mode-stone stone-white" />
      {mode === 'single' ? (
        <span className="stone-spark">
          <Sparkles size={19} strokeWidth={1.5} />
        </span>
      ) : (
        <span className="stone-spark">
          <span className="local-spark">+</span>
        </span>
      )}
    </div>
  );
}

export default function App() {
  const { t } = useTranslation();
  const [panel, setPanel] = useState<Panel | null>(null);
  const [setupMode, setSetupMode] = useState<GameMode | null>(null);
  const [activeMode, setActiveMode] = useState<GameMode | null>(null);
  const [preferences, setPreferences] = useState<GamePreferences>(DEFAULT_PREFERENCES);
  const [hasConfigured, setHasConfigured] = useState(false);
  const [sound, setSound] = useState(true);
  const [toast, setToast] = useState<'common.soundEnabled' | 'common.soundDisabled' | ''>('');

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 4500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function toggleSound() {
    const next = !sound;
    setSound(next);
    if (next) {
      void playStoneSound();
    }
    setToast(next ? 'common.soundEnabled' : 'common.soundDisabled');
  }

  function stoneSound() {
    if (sound) {
      void playStoneSound();
    }
  }

  function chooseMode(mode: GameMode) {
    setToast('');
    if (mode === 'local') {
      setPanel(null);
      setActiveMode('local');
    } else {
      stoneSound();
      setSetupMode('single');
    }
  }

  function goHome() {
    setActiveMode(null);
    setPanel(null);
  }

  function onConfirm(next: GamePreferences) {
    setPreferences(next);
    setHasConfigured(true);
    setSetupMode(null);
    setPanel(null);
    setActiveMode('single');
  }

  const difficulty = t(`difficulty.${preferences.difficulty}.label`);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          aria-label={t('common.home')}
          onClick={(event) => {
            event.preventDefault();
            goHome();
          }}
        >
          <span className="brand-mark">
            <i />
            <i />
            <i />
            <i />
          </span>
          <span className="brand-type">
            <strong>{t('common.brand')}</strong>
            <span>GOMOKU CLUB</span>
          </span>
        </a>
        <div className="sidebar-content">
          <div className="nav-label">{t('nav.label')}</div>
          <nav className="main-nav" aria-label={t('nav.main')}>
            <button
              className={`nav-item ${panel !== Panel.HISTORY ? 'active' : ''}`}
              aria-label={t('nav.lobby')}
              onClick={goHome}
              aria-current={panel !== Panel.HISTORY ? 'page' : undefined}
            >
              <Grid2X2 size={19} />
              <span>{t('nav.lobby')}</span>
              <span className="nav-dot" />
            </button>
            <button
              className={`nav-item ${panel === Panel.HISTORY ? 'active' : ''}`}
              aria-label={t('nav.history')}
              onClick={() => setPanel(Panel.HISTORY)}
            >
              <Clock3 size={19} />
              <span>{t('nav.history')}</span>
            </button>
            <button
              className="nav-item"
              aria-label={t('nav.rules')}
              onClick={() => setPanel(Panel.RULES)}
            >
              <BookOpen size={19} />
              <span>{t('nav.rules')}</span>
              <ArrowDownLeft className="nav-arrow" size={15} />
            </button>
          </nav>
          <div className="sidebar-note">
            <div className="note-art" aria-hidden="true">
              <span />
              <span />
              <i />
              <i />
              <i />
            </div>
            <p>
              {t('nav.note1')}
              <br />
              {t('nav.note2')}
            </p>
            <span>TAKE YOUR TIME.</span>
          </div>
          <div className="sidebar-bottom">
            <button className="nav-item" onClick={() => setPanel(Panel.SETTINGS)}>
              <Settings2 size={18} />
              <span>{t('nav.settings')}</span>
            </button>
            <div className="version">
              <span className="status-dot" />
              {t('common.brand')} <span>v0.1.0</span>
            </div>
          </div>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <span>{t('nav.room')}</span>
            <ChevronRight size={13} />
            <strong>
              {activeMode === 'single'
                ? t('nav.single')
                : activeMode === 'local'
                  ? t('nav.local')
                  : t('nav.lobby')}
            </strong>
          </div>
          <div className="topbar-actions flex items-center gap-[19px]">
            <LocaleSelect />
            <span className="welcome">{t('nav.welcome')}</span>
            <button
              className={`icon-button sound-button ${sound ? '' : 'muted'}`}
              onClick={toggleSound}
              aria-label={sound ? t('common.soundOff') : t('common.soundOn')}
              aria-pressed={sound}
              title={sound ? t('common.soundOff') : t('common.soundOn')}
            >
              {sound ? <Volume2 size={19} /> : <VolumeX size={19} />}
            </button>
            <span className="topbar-divider" />
            <div className="avatar" aria-label={t('nav.player')}>
              {t('nav.avatar')}
              <span />
            </div>
          </div>
        </header>

        <main>
          {activeMode ? (
            <LocalGame
              opponent={activeMode === 'single' ? preferences : undefined}
              onExit={goHome}
              onRules={() => setPanel(Panel.RULES)}
              onStone={stoneSound}
              soundEnabled={sound}
            />
          ) : (
            <>
              <section className="hero" aria-labelledby="hero-heading">
                <div className="hero-content">
                  <div className="hero-eyebrow">
                    <span />
                    HELLO, GOMOKU.
                  </div>
                  <h1 id="hero-heading">
                    {t('home.headline1')}
                    <br />
                    <span>{t('home.headline2')}</span>
                    <span className="title-period" />
                  </h1>
                  <p className="hero-description">
                    {t('home.description1')}
                    <br />
                    {t('home.description2')}
                  </p>
                  <div className="hero-tags flex items-center gap-[15px]">
                    <span>
                      <Grid2X2 size={14} />
                      {t('home.classic')}
                    </span>
                    <i />
                    <span>
                      <Leaf size={14} />
                      {t('home.simple')}
                    </span>
                  </div>
                </div>
                <BoardArt />
                <span className="hero-vertical">{t('home.vertical')}</span>
              </section>

              <section className="mode-section" aria-labelledby="mode-heading">
                <div className="section-heading flex items-end justify-between">
                  <div>
                    <span className="eyebrow">LET’S PLAY</span>
                    <h2 id="mode-heading">
                      {t('home.choose')}
                      <span>{t('home.questionMark')}</span>
                    </h2>
                  </div>
                  <p>{t('home.chooseHint')}</p>
                </div>
                <div className="mode-grid grid grid-cols-2 gap-[22px]">
                  <article
                    className={`mode-card single-card ${hasConfigured && preferences.mode === 'single' ? 'chosen' : ''}`}
                  >
                    <div className="card-topline flex items-center justify-between">
                      <span className="mode-label">
                        <span className="status-dot" />
                        {t('home.singleMode')}
                      </span>
                      <span className="card-index">01</span>
                    </div>
                    <div className="mode-card-body">
                      <div className="mode-copy">
                        <h3>
                          {t('nav.single')}
                          <ArrowRight className="heading-arrow" size={20} />
                        </h3>
                        <p>
                          {t('home.singleDescription1')}
                          <br />
                          {t('home.singleDescription2')}
                        </p>
                      </div>
                      <ModeIllustration mode="single" />
                    </div>
                    <div className="feature-tags flex gap-[15px]">
                      <span>
                        <Sparkles size={13} />
                        {t('home.difficulties')}
                      </span>
                      <span>
                        <ShieldCheck size={13} />
                        {t('home.practice')}
                      </span>
                    </div>
                    <button
                      className="mode-button single-button"
                      onClick={() => chooseMode('single')}
                    >
                      {hasConfigured && preferences.mode === 'single' ? (
                        <>
                          <Check size={17} />
                          {t('home.playAgain')}
                        </>
                      ) : (
                        <>
                          {t('home.chooseSingle')}
                          <ArrowRight size={17} />
                        </>
                      )}
                    </button>
                  </article>
                  <article className="mode-card local-card">
                    <div className="card-topline flex items-center justify-between">
                      <span className="mode-label">
                        <span className="status-dot" />
                        {t('home.localMode')}
                      </span>
                      <span className="card-index">02</span>
                    </div>
                    <div className="mode-card-body">
                      <div className="mode-copy">
                        <h3>
                          {t('home.friends')}
                          <ArrowRight className="heading-arrow" size={20} />
                        </h3>
                        <p>
                          {t('home.localDescription1')}
                          <br />
                          {t('home.localDescription2')}
                        </p>
                      </div>
                      <ModeIllustration mode="local" />
                    </div>
                    <div className="feature-tags flex gap-[15px]">
                      <span>
                        <Monitor size={13} />
                        {t('home.localFeature')}
                      </span>
                      <span>
                        <Coffee size={13} />
                        {t('home.fun')}
                      </span>
                    </div>
                    <button
                      className="mode-button local-button"
                      onClick={() => chooseMode('local')}
                    >
                      {t('home.startLocal')}
                      <ArrowRight size={17} />
                    </button>
                  </article>
                </div>
                {hasConfigured && (
                  <div className="selection-summary" aria-live="polite">
                    <span>
                      <Check size={15} />
                      {t('home.selection')}
                    </span>
                    <p>
                      {t('game.summary', {
                        difficulty,
                        side: t(
                          preferences.color === 'black' ? 'game.blackSide' : 'game.whiteSide',
                        ),
                      })}
                    </p>
                    <button onClick={() => chooseMode(preferences.mode)}>
                      {t('common.edit')}
                      <ChevronRight size={14} />
                    </button>
                  </div>
                )}
              </section>

              <section className="rules-strip" aria-label={t('home.introLabel')}>
                <div className="rules-symbol">
                  <BookOpen size={21} strokeWidth={1.5} />
                </div>
                <div className="rules-copy">
                  <h3>{t('home.introTitle')}</h3>
                  <p>{t('home.introText')}</p>
                </div>
                <button className="text-button" onClick={() => setPanel(Panel.RULES)}>
                  {t('home.readRules')}
                  <ArrowRight size={16} />
                </button>
              </section>
              <footer className="footer">
                <span>{t('home.footer')}</span>
                <span>
                  MADE FOR THE LOVE OF THE GAME<span className="footer-flower">✳</span>
                </span>
              </footer>
            </>
          )}
        </main>
      </div>

      {setupMode && (
        <SetupDialog
          preferences={preferences}
          onClose={() => setSetupMode(null)}
          onConfirm={onConfirm}
        />
      )}
      <AppPanels
        panel={panel}
        playing={activeMode !== null}
        sound={sound}
        toggleSound={toggleSound}
        onClose={() => setPanel(null)}
        onHome={goHome}
      />
      {toast && (
        <div className="toast" role="status">
          <span>
            <Check size={15} />
          </span>
          {t(toast)}
          <button onClick={() => setToast('')} aria-label={t('common.closeToast')}>
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
