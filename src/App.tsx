import { useEffect, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  CircleHelp,
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
import BoardArt from './components/BoardArt';
import Modal from './components/Modal';
import SetupDialog from './components/SetupDialog';
import LocalGame from './components/LocalGame';
import { DEFAULT_PREFERENCES, DIFFICULTIES, type GameMode, type GamePreferences } from './types';

type Panel = 'rules' | 'history' | 'settings' | null;

function playStoneSound() {
  const context = new AudioContext();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(680, context.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(220, context.currentTime + 0.06);
  gain.gain.setValueAtTime(0.1, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.09);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.1);
  oscillator.onended = () => {
    void context.close();
  };
}

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
  const [panel, setPanel] = useState<Panel>(null);
  const [setupMode, setSetupMode] = useState<GameMode | null>(null);
  const [localGame, setLocalGame] = useState(false);
  const [preferences, setPreferences] = useState<GamePreferences>(DEFAULT_PREFERENCES);
  const [hasConfigured, setHasConfigured] = useState(false);
  const [sound, setSound] = useState(true);
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 4500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function toggleSound() {
    const next = !sound;
    setSound(next);
    if (next) {
      try {
        playStoneSound();
      } catch {
        /* Audio may be unavailable on a headless device. */
      }
    }
    setToast(next ? '落子音效已开启' : '落子音效已关闭');
  }

  function stoneSound() {
    if (sound) {
      try {
        playStoneSound();
      } catch {
        /* Audio is optional. */
      }
    }
  }

  function chooseMode(mode: GameMode) {
    setToast('');
    if (mode === 'local') {
      setPanel(null);
      setLocalGame(true);
    } else {
      stoneSound();
      setSetupMode('single');
    }
  }

  function goHome() {
    setLocalGame(false);
    setPanel(null);
  }

  function onConfirm(next: GamePreferences) {
    setPreferences(next);
    setHasConfigured(true);
    setSetupMode(null);
    setToast('单人对局设置已应用，仅在本次打开期间有效');
  }

  const difficulty = DIFFICULTIES.find((item) => item.value === preferences.difficulty)?.label;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          aria-label="弈间首页"
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
            <strong>弈间</strong>
            <span>GOMOKU CLUB</span>
          </span>
        </a>
        <div className="sidebar-content">
          <div className="nav-label">一 方 棋 室</div>
          <nav className="main-nav" aria-label="主导航">
            <button
              className={`nav-item ${panel !== 'history' ? 'active' : ''}`}
              aria-label="对弈大厅"
              onClick={goHome}
              aria-current={panel !== 'history' ? 'page' : undefined}
            >
              <Grid2X2 size={19} />
              <span>对弈大厅</span>
              <span className="nav-dot" />
            </button>
            <button
              className={`nav-item ${panel === 'history' ? 'active' : ''}`}
              aria-label="对局记录"
              onClick={() => setPanel('history')}
            >
              <Clock3 size={19} />
              <span>对局记录</span>
            </button>
            <button className="nav-item" aria-label="玩法指南" onClick={() => setPanel('rules')}>
              <BookOpen size={19} />
              <span>玩法指南</span>
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
              棋不止于胜负，
              <br />
              也在于落子时的从容。
            </p>
            <span>TAKE YOUR TIME.</span>
          </div>
          <div className="sidebar-bottom">
            <button className="nav-item" onClick={() => setPanel('settings')}>
              <Settings2 size={18} />
              <span>偏好设置</span>
            </button>
            <div className="version">
              <span className="status-dot" />
              弈间 <span>v0.1.0</span>
            </div>
          </div>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <span>棋室</span>
            <ChevronRight size={13} />
            <strong>{localGame ? '双人对弈' : '对弈大厅'}</strong>
          </div>
          <div className="topbar-actions">
            <span className="welcome">好久不见，来下一局。</span>
            <button
              className={`icon-button sound-button ${sound ? '' : 'muted'}`}
              onClick={toggleSound}
              aria-label={sound ? '关闭落子音效' : '开启落子音效'}
              aria-pressed={sound}
              title={sound ? '关闭落子音效' : '开启落子音效'}
            >
              {sound ? <Volume2 size={19} /> : <VolumeX size={19} />}
            </button>
            <span className="topbar-divider" />
            <div className="avatar" aria-label="本地棋手">
              弈<span />
            </div>
          </div>
        </header>

        <main>
          {localGame ? (
            <LocalGame onExit={goHome} onRules={() => setPanel('rules')} onStone={stoneSound} />
          ) : (
            <>
              <section className="hero" aria-labelledby="hero-heading">
                <div className="hero-content">
                  <div className="hero-eyebrow">
                    <span />
                    HELLO, GOMOKU.
                  </div>
                  <h1 id="hero-heading">
                    方寸之间，
                    <br />
                    <span>落子有趣。</span>
                    <span className="title-period" />
                  </h1>
                  <p className="hero-description">
                    与 AI 切磋，或邀好友同坐。
                    <br />
                    从一颗棋子开始，享受纯粹的思考时光。
                  </p>
                  <div className="hero-tags">
                    <span>
                      <Grid2X2 size={14} />
                      经典五子棋
                    </span>
                    <i />
                    <span>
                      <Leaf size={14} />
                      简单，却不止简单
                    </span>
                  </div>
                </div>
                <BoardArt />
                <span className="hero-vertical">黑 白 之 间 · 自 有 天 地</span>
              </section>

              <section className="mode-section" aria-labelledby="mode-heading">
                <div className="section-heading">
                  <div>
                    <span className="eyebrow">LET’S PLAY</span>
                    <h2 id="mode-heading">
                      今天，和谁过招<span>？</span>
                    </h2>
                  </div>
                  <p>选一种方式，开启你的棋间时光</p>
                </div>
                <div className="mode-grid">
                  <article
                    className={`mode-card single-card ${hasConfigured && preferences.mode === 'single' ? 'chosen' : ''}`}
                  >
                    <div className="card-topline">
                      <span className="mode-label">
                        <span className="status-dot" />
                        单人模式
                      </span>
                      <span className="card-index">01</span>
                    </div>
                    <div className="mode-card-body">
                      <div className="mode-copy">
                        <h3>
                          人机对弈
                          <ArrowRight className="heading-arrow" size={20} />
                        </h3>
                        <p>
                          与 AI 棋逢对手，
                          <br />
                          在每一步中，发现更好的自己。
                        </p>
                      </div>
                      <ModeIllustration mode="single" />
                    </div>
                    <div className="feature-tags">
                      <span>
                        <Sparkles size={13} />
                        三档难度
                      </span>
                      <span>
                        <ShieldCheck size={13} />
                        自在练习
                      </span>
                    </div>
                    <button
                      className="mode-button single-button"
                      onClick={() => chooseMode('single')}
                    >
                      {hasConfigured && preferences.mode === 'single' ? (
                        <>
                          <Check size={17} />
                          已选择单人 · 调整设置
                        </>
                      ) : (
                        <>
                          选择单人模式
                          <ArrowRight size={17} />
                        </>
                      )}
                    </button>
                  </article>
                  <article className="mode-card local-card">
                    <div className="card-topline">
                      <span className="mode-label">
                        <span className="status-dot" />
                        双人模式
                      </span>
                      <span className="card-index">02</span>
                    </div>
                    <div className="mode-card-body">
                      <div className="mode-copy">
                        <h3>
                          好友对弈
                          <ArrowRight className="heading-arrow" size={20} />
                        </h3>
                        <p>
                          一方棋盘，两位好友。
                          <br />
                          面对面，来一场有来有回的较量。
                        </p>
                      </div>
                      <ModeIllustration mode="local" />
                    </div>
                    <div className="feature-tags">
                      <span>
                        <Monitor size={13} />
                        本地双人
                      </span>
                      <span>
                        <Coffee size={13} />
                        同享乐趣
                      </span>
                    </div>
                    <button
                      className="mode-button local-button"
                      onClick={() => chooseMode('local')}
                    >
                      开始双人对弈
                      <ArrowRight size={17} />
                    </button>
                  </article>
                </div>
                {hasConfigured && (
                  <div className="selection-summary" aria-live="polite">
                    <span>
                      <Check size={15} />
                      本次设置
                    </span>
                    <p>
                      {`人机对弈 · ${difficulty} · ${preferences.color === 'black' ? '执黑先行' : '执白后行'}`}
                    </p>
                    <button onClick={() => chooseMode(preferences.mode)}>
                      修改
                      <ChevronRight size={14} />
                    </button>
                  </div>
                )}
              </section>

              <section className="rules-strip" aria-label="五子棋入门">
                <div className="rules-symbol">
                  <BookOpen size={21} strokeWidth={1.5} />
                </div>
                <div className="rules-copy">
                  <h3>初次见面？三十秒认识五子棋。</h3>
                  <p>黑棋先行，轮流落子。横、竖、斜，率先连成五子即获胜。</p>
                </div>
                <button className="text-button" onClick={() => setPanel('rules')}>
                  了解规则
                  <ArrowRight size={16} />
                </button>
              </section>
              <footer className="footer">
                <span>一局一会，乐在其中。</span>
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
      {panel === 'rules' && (
        <Modal
          title="五子相连，就这么简单。"
          subtitle="只需记住三个小规则，就能开始你的第一局。"
          onClose={() => setPanel(null)}
          wide
        >
          <div className="rule-steps">
            <div>
              <span className="rule-number">01</span>
              <h3>黑先白后</h3>
              <p>在 15 × 15 的棋盘交叉点落子。黑棋先行，双方交替，每回合落一子。</p>
            </div>
            <div>
              <span className="rule-number">02</span>
              <h3>落子生根</h3>
              <p>棋子只能落在空交叉点。落下后不能移动，也不能叠在已有棋子上。</p>
            </div>
            <div>
              <span className="rule-number">03</span>
              <h3>五子成线</h3>
              <p>横向、纵向或斜向，先连成五颗同色棋子的一方获胜。长连同样有效。</p>
            </div>
          </div>
          <div className="winning-example" aria-label="黑棋横向五子连线获胜示意">
            {[0, 1, 2, 3, 4].map((i) => (
              <span key={i} className="small-stone stone-black" />
            ))}
            <span>
              <Check size={15} />
              五子连珠
            </span>
          </div>
          <div className="rule-notice">
            <CircleHelp size={18} />
            <p>弈间采用自由五子棋规则，不设三三、四四等禁手。棋盘下满而无人获胜时，双方和棋。</p>
          </div>
          <button className="primary-button save-button" onClick={() => setPanel(null)}>
            {localGame ? '明白了，继续对弈' : '明白了，返回大厅'}
            <ArrowRight size={17} />
          </button>
        </Modal>
      )}
      {panel === 'history' && (
        <Modal
          title="每一局，都值得回味。"
          subtitle="你的棋间故事，将从第一颗棋子开始。"
          onClose={() => setPanel(null)}
        >
          <div className="empty-state">
            <div className="empty-board" aria-hidden="true">
              <span className="small-stone stone-black" />
              <span className="small-stone stone-white" />
            </div>
            <h3>还没有对局记录</h3>
            <p>
              对局记录功能尚未开放。
              <br />
              当前双人棋局仅在本次对弈中保留。
            </p>
          </div>
          <button className="primary-button save-button" onClick={goHome}>
            回到对弈大厅
            <ArrowRight size={17} />
          </button>
        </Modal>
      )}
      {panel === 'settings' && (
        <Modal
          title="让棋室，更合你意。"
          subtitle="一点小调整，找到最舒服的对弈状态。"
          onClose={() => setPanel(null)}
        >
          <div className="setting-row">
            <div>
              <h3>落子音效</h3>
              <p>落下棋子时，听见清脆的一声落子。</p>
            </div>
            <button
              className={`toggle-switch ${sound ? 'on' : ''}`}
              role="switch"
              aria-checked={sound}
              aria-label="落子音效"
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
              <strong>弈间 · GOMOKU CLUB</strong>
              <p>v0.1.0 · 本地双人对弈</p>
            </div>
          </div>
          <p className="settings-footnote">
            设置仅在本次打开期间有效，刷新或重启后恢复默认。界面动效跟随系统的减少动态效果偏好。
          </p>
        </Modal>
      )}
      {toast && (
        <div className="toast" role="status">
          <span>
            <Check size={15} />
          </span>
          {toast}
          <button onClick={() => setToast('')} aria-label="关闭提示">
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
