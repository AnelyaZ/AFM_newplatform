import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

type VideoSource = { label: string; src: string };
type VideoPlayerProps = {
  src?: string;
  sources?: VideoSource[]; // для качества: несколько источников
  poster?: string;
  className?: string;
  track?: {
    lessonId: string;
    blockId: string;
    onProgress?: (payload: { watchedSec: number; durationSec: number; completed: boolean }) => void;
  };
};

// SVG icons — минималистичные линейные
const IconPlay = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="8 5 19 12 8 19 8 5" />
  </svg>
);
const IconPause = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="10" y1="5" x2="10" y2="19" />
    <line x1="14" y1="5" x2="14" y2="19" />
  </svg>
);
const IconVolume = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="5 9 9 9 13 5 13 19 9 15 5 15 5 9" />
    <path d="M16 9a3 3 0 0 1 0 6" />
    <path d="M18.5 7a6 6 0 0 1 0 10" />
  </svg>
);
const IconVolumeMute = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="5 9 9 9 13 5 13 19 9 15 5 15 5 9" />
    <line x1="16" y1="10" x2="20" y2="14" />
    <line x1="20" y1="10" x2="16" y2="14" />
  </svg>
);
const IconSettings = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="4" y1="21" x2="4" y2="14" />
    <line x1="4" y1="10" x2="4" y2="3" />
    <line x1="12" y1="21" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12" y2="3" />
    <line x1="20" y1="21" x2="20" y2="16" />
    <line x1="20" y1="12" x2="20" y2="3" />
    <line x1="1" y1="14" x2="7" y2="14" />
    <line x1="9" y1="8" x2="15" y2="8" />
    <line x1="17" y1="16" x2="23" y2="16" />
  </svg>
);
const IconFullscreenEnter = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 3H5a2 2 0 0 0-2 2v3" />
    <path d="M16 3h3a2 2 0 0 1 2 2v3" />
    <path d="M8 21H5a2 2 0 0 1-2-2v-3" />
    <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
  </svg>
);
const IconFullscreenExit = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 3v3a2 2 0 0 1-2 2H3" />
    <path d="M21 8h-3a2 2 0 0 1-2-2V3" />
    <path d="M3 16h3a2 2 0 0 1 2 2v3" />
    <path d="M16 21v-3a2 2 0 0 1 2-2h3" />
  </svg>
);

export default function VideoPlayer({ src, sources, poster, className, track }: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [buffered, setBuffered] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsBtnRef = useRef<HTMLButtonElement | null>(null);
  const [settingsAnchor, setSettingsAnchor] = useState<{ top: number; right: number } | null>(null);
  const [activeSource, setActiveSource] = useState<VideoSource | null>(
    sources?.[0] ? sources[0] : src ? { label: 'Оригинал', src } : null,
  );
  const hideTimer = useRef<number | null>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onLoaded = () => setDuration(v.duration || 0);
    const onTime = () => setCurrentTime(v.currentTime || 0);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onProgress = () => {
      try {
        if (v.buffered.length) {
          const end = v.buffered.end(v.buffered.length - 1);
          setBuffered(end);
        }
      } catch {}
    };
    v.addEventListener('loadedmetadata', onLoaded);
    v.addEventListener('timeupdate', onTime);
    v.addEventListener('play', onPlay);
    v.addEventListener('pause', onPause);
    v.addEventListener('progress', onProgress);
    setMuted(v.muted);
    setVolume(v.volume);
    return () => {
      v.removeEventListener('loadedmetadata', onLoaded);
      v.removeEventListener('timeupdate', onTime);
      v.removeEventListener('play', onPlay);
      v.removeEventListener('pause', onPause);
      v.removeEventListener('progress', onProgress);
    };
  }, []);

  // Позиционирование выпадающего меню настроек (над кнопкой, вне плеера)
  useEffect(() => {
    if (!settingsOpen) return;
    const update = () => {
      const el = settingsBtnRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setSettingsAnchor({ top: r.top, right: window.innerWidth - r.right });
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [settingsOpen]);

  // Трекинг прогресса: отправляем каждые ~5 сек и по завершению
  useEffect(() => {
    if (!track) return;
    const v = videoRef.current;
    if (!v) return;
    let lastSent = 0;
    const send = () => {
      const watchedSec = Math.floor(v.currentTime || 0);
      const durationSec = Math.floor(v.duration || 0);
      if (!durationSec) return;
      const completed = watchedSec / durationSec >= 0.9;
      if (completed || watchedSec - lastSent >= 5) {
        lastSent = watchedSec;
        track.onProgress?.({ watchedSec, durationSec, completed });
      }
    };
    const onEnded = () => {
      const durationSec = Math.floor(v.duration || 0);
      if (durationSec > 0) track.onProgress?.({ watchedSec: durationSec, durationSec, completed: true });
    };
    v.addEventListener('timeupdate', send);
    v.addEventListener('ended', onEnded);
    return () => {
      v.removeEventListener('timeupdate', send);
      v.removeEventListener('ended', onEnded);
    };
  }, [track?.lessonId, track?.blockId]);

  // Track fullscreen state
  useEffect(() => {
    const onFs = () => setIsFullscreen(document.fullscreenElement === containerRef.current);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  // Auto-hide controls
  const scheduleHide = () => {
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setShowControls(false), 2000);
  };
  const onMouseMove = () => {
    setShowControls(true);
    if (!videoRef.current?.paused) scheduleHide();
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play();
    else v.pause();
  };

  const formatTime = (sec: number) => {
    if (!isFinite(sec)) return '0:00';
    const minutes = Math.floor(sec / 60);
    const seconds = Math.floor(sec % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // removed unused onSeek handler to satisfy TS build

  const onVolumeChange = (val: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.volume = val;
    v.muted = val === 0 ? true : v.muted && false;
    setVolume(val);
    setMuted(v.muted);
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  const changeRate = (rate: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = rate;
    setPlaybackRate(rate);
    setSettingsOpen(false);
  };

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen();
  };

  // Change quality/source
  const changeSource = async (s: VideoSource) => {
    const v = videoRef.current;
    if (!v) return;
    const wasPlaying = !v.paused;
    const t = v.currentTime || 0;
    setActiveSource(s);
    v.src = s.src;
    await v.load();
    try { v.currentTime = t; } catch {}
    v.playbackRate = playbackRate;
    if (wasPlaying) v.play();
    setSettingsOpen(false);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const v = videoRef.current;
      if (!v) return;
      if (['Space', 'KeyK'].includes(e.code)) { e.preventDefault(); togglePlay(); }
      else if (e.code === 'KeyM') toggleMute();
      else if (e.code === 'KeyF') toggleFullscreen();
      else if (e.code === 'ArrowRight') v.currentTime = Math.min((v.currentTime || 0) + 5, v.duration || 0);
      else if (e.code === 'ArrowLeft') v.currentTime = Math.max((v.currentTime || 0) - 5, 0);
      else if (e.code === 'ArrowUp') onVolumeChange(Math.min(volume + 0.05, 1));
      else if (e.code === 'ArrowDown') onVolumeChange(Math.max(volume - 0.05, 0));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [volume]);

  const playedRatio = duration ? currentTime / duration : 0;
  const bufferedRatio = duration ? Math.min(buffered / duration, 1) : 0;

  return (
    <div className={className}>
      <div
        ref={containerRef}
        className={`relative w-full overflow-hidden bg-black ${isFullscreen ? 'h-screen' : ''}`}
        onMouseMove={onMouseMove}
        onMouseLeave={() => setShowControls(false)}
      >
        {/* Видео занимает естественную высоту без фиксированного соотношения сторон */}
        <video
          ref={videoRef}
          poster={poster}
          className={`block w-full ${isFullscreen ? 'h-full object-contain' : 'h-auto max-h-[80vh]'}`}
          src={activeSource?.src || ''}
          preload="metadata"
          onClick={togglePlay}
        />

        {/* Оверлей с контролами */}
        <div className={`pointer-events-none absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/60 via-black/0 to-black/0 transition-opacity ${showControls ? 'opacity-100' : 'opacity-0'}`}>
          <div className="pointer-events-auto px-3 pb-3 sm:px-4 sm:pb-4 md:px-6 md:pb-6">
            {/* Прогресс */}
            <div className="relative mb-3 h-[6px] w-full cursor-pointer rounded bg-white/20" onClick={(e) => {
              const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
              const ratio = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
              const v = videoRef.current; if (!v) return;
              v.currentTime = ratio * (v.duration || 0);
            }}>
              <div className="absolute left-0 top-0 h-[6px] rounded bg-white/30" style={{ width: `${bufferedRatio * 100}%` }} />
              <div className="absolute left-0 top-0 h-[6px] rounded bg-sky-500" style={{ width: `${playedRatio * 100}%` }} />
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3">
              {/* Play/Pause */}
              <button onClick={togglePlay} aria-label={isPlaying ? 'Пауза' : 'Воспроизвести'} className="rounded bg-white/10 p-2.5 text-white hover:bg-white/20 md:p-3">
                {isPlaying ? <IconPause /> : <IconPlay />}
              </button>

              {/* Time */}
              <div className="text-xs text-white/80 md:text-sm">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>

              {/* Volume */}
              <button onClick={toggleMute} aria-label={(muted || volume === 0) ? 'Включить звук' : 'Отключить звук'} className="ml-2 rounded bg-white/10 p-2 text-white hover:bg-white/20 sm:p-2.5 md:p-3">
                {muted || volume === 0 ? <IconVolumeMute /> : <IconVolume />}
              </button>
              <input
                className="h-1 w-20 cursor-pointer accent-sky-500 sm:w-28 md:w-36"
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={muted ? 0 : volume}
                onChange={(e) => onVolumeChange(Number(e.target.value))}
              />

              {/* Spacer */}
              <div className="flex-1" />

              {/* Settings */}
              <div className="relative">
                <button ref={settingsBtnRef} onClick={() => setSettingsOpen((v) => !v)} aria-label="Настройки видео" className="rounded bg-white/10 p-2 text-white hover:bg-white/20 sm:p-2.5 md:p-3">
                  <IconSettings />
                </button>
                {settingsOpen && settingsAnchor && createPortal(
                  (
                    <div
                      style={{ position: 'fixed', top: settingsAnchor.top, right: settingsAnchor.right, transform: 'translateY(-8px) translateY(-100%)' }}
                      className="z-[9999] w-60 overflow-visible rounded border border-white/10 bg-black/90 p-2 text-sm text-white shadow-xl"
                    >
                      <div className="mb-1 px-2 text-xs uppercase text-white/60">Скорость</div>
                      <div className="grid grid-cols-4 gap-1 px-2 pb-2">
                        {[0.5, 0.75, 1, 1.25, 1.5, 2].map((r) => (
                          <button key={r} className={`rounded px-2 py-1 hover:bg-white/10 ${playbackRate === r ? 'bg-white/10' : ''}`} onClick={() => changeRate(r)}>
                            {r}x
                          </button>
                        ))}
                      </div>

                      <div className="mb-1 px-2 text-xs uppercase text-white/60">Качество</div>
                      <div className="flex flex-col px-2">
                        {(sources && sources.length > 0 ? sources : activeSource ? [activeSource] : []).map((s) => (
                          <button key={s.label + s.src} className={`flex items-center justify-between rounded px-2 py-1 text-left hover:bg-white/10 ${activeSource?.src === s.src ? 'bg-white/10' : ''}`} onClick={() => changeSource(s)}>
                            <span>{s.label}</span>
                            {activeSource?.src === s.src && <span className="text-xs text-sky-300">выбрано</span>}
                          </button>
                        ))}
                        {!sources?.length && !activeSource && (
                          <div className="rounded px-2 py-1 text-white/60">Источник не задан</div>
                        )}
                      </div>
                    </div>
                  ),
                  document.body,
                )}
              </div>

              {/* Fullscreen */}
              <button onClick={toggleFullscreen} aria-label={isFullscreen ? 'Выйти из полноэкранного режима' : 'На весь экран'} className="rounded bg-white/10 p-2 text-white hover:bg-white/20 sm:p-2.5 md:p-3">
                {isFullscreen ? <IconFullscreenExit /> : <IconFullscreenEnter />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


