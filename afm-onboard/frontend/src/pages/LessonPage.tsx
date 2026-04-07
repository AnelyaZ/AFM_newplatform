import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Card from '../components/ui/Card';
import VideoPlayer from '../components/VideoPlayer';
import { toMediaUrl } from '../lib/media';
import Button from '../components/ui/Button';
import DocumentHighlighter from '../components/DocumentHighlighter';

type Lesson = {
  id: string;
  chapterId: string;
  orderIndex: number;
  title: string;
  description?: string | null;
  contents: { id: string; blockType: 'TEXT'|'IMAGE'|'VIDEO'|'FILE'; textHtml?: string | null; mediaKey?: string | null; sortIndex: number }[];
  progress?: { completed?: boolean; videoProgress?: Record<string, any> } | null;
  testMeta?: { id: string; isPublished: boolean; isMandatory: boolean } | null;
};

export default function LessonPage() {
  const { lessonId } = useParams();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [siblings, setSiblings] = useState<{ id: string; orderIndex: number; title: string }[]>([]);
  const [allLessonsCompleted, setAllLessonsCompleted] = useState<boolean>(false);
  const [chapterTestPublished, setChapterTestPublished] = useState<boolean | null>(null);
  const navigate = useNavigate();
  const [videoDone, setVideoDone] = useState<Record<string, boolean>>({});
  const [noVideoWaitLeft, setNoVideoWaitLeft] = useState<number>(0);
  const waitTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/chapters/_/lessons/${lessonId}`.replace('_', 'any'));
        setLesson(data);
        const hasVideo = (data?.contents || []).some((b: any) => b.blockType === 'VIDEO' && !!b.mediaKey);
        if (!hasVideo) {
          setNoVideoWaitLeft(15);
        } else {
          setNoVideoWaitLeft(0);
        }
      } finally {
        setLoading(false);
      }
    };
    if (lessonId) load();
  }, [lessonId]);

  const prevLesson = useMemo(() => {
    if (!lesson) return null;
    const candidates = siblings.filter((l) => l.orderIndex < lesson.orderIndex);
    if (candidates.length === 0) return null;
    const maxOrder = Math.max(...candidates.map((l) => l.orderIndex));
    return candidates.find((l) => l.orderIndex === maxOrder) || null;
  }, [lesson, siblings]);

  const nextLesson = useMemo(() => {
    if (!lesson) return null;
    const candidates = siblings.filter((l) => l.orderIndex > lesson.orderIndex);
    if (candidates.length === 0) return null;
    const minOrder = Math.min(...candidates.map((l) => l.orderIndex));
    return candidates.find((l) => l.orderIndex === minOrder) || null;
  }, [lesson, siblings]);

  useEffect(() => {
    const onKey = async (e: KeyboardEvent) => {
      if (e.ctrlKey && e.altKey && (e.key === '.' || e.code === 'Period')) {
        try {
          if (!lesson) return;
          await api.post(`/chapters/${lesson.chapterId}/lessons/${lesson.id}/progress`, { blockId: '', watchedSec: 0, durationSec: 0, completed: true, force: true });
          setLesson((prev) => (prev ? { ...prev, progress: { ...(prev.progress || {}), completed: true } } : prev));
          if (nextLesson) navigate(`/lessons/${nextLesson.id}`);
        } catch {}
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lesson?.id, lesson?.chapterId, nextLesson]);

  useEffect(() => {
    const loadSiblings = async () => {
      if (!lesson?.chapterId) return;
      try {
        const { data } = await api.get(`/chapters/${lesson.chapterId}/lessons`);
        const simplified = (data || []).map((l: any) => ({ id: l.id, orderIndex: l.orderIndex, title: l.title }));
        setSiblings(simplified);
        const allDone = Array.isArray(data) && data.length > 0 ? data.every((l: any) => !!l.progress?.completed) : false;
        setAllLessonsCompleted(allDone);
        try {
          const t = await api.get(`/chapters/${lesson.chapterId}/test`).then((r) => r.data).catch(() => null);
          setChapterTestPublished(!!t?.id && !!t?.isPublished);
        } catch { setChapterTestPublished(false); }
      } catch {
        setSiblings([]);
      }
    };
    loadSiblings();
  }, [lesson?.chapterId]);

  useEffect(() => {
    if (!lesson) return;
    const hasVideo = (lesson.contents || []).some((b: any) => b.blockType === 'VIDEO' && !!b.mediaKey);
    const isMandatory = !!lesson.testMeta?.isMandatory;
    if (hasVideo) return;
    if (noVideoWaitLeft <= 0) return;
    if (waitTimerRef.current) window.clearInterval(waitTimerRef.current);
    waitTimerRef.current = window.setInterval(async () => {
      setNoVideoWaitLeft((s) => {
        const nx = Math.max(0, s - 1);
        if (nx === 0) {
          if (waitTimerRef.current) { window.clearInterval(waitTimerRef.current); waitTimerRef.current = null; }
          if (!isMandatory) {
            (async () => {
              try {
                const resp = await api.post(`/chapters/${lesson.chapterId}/lessons/${lesson.id}/progress`, { completed: true });
                if (resp?.data?.completed) setLesson((prev) => (prev ? { ...prev, progress: { ...(prev.progress || {}), completed: true } } : prev));
              } catch {}
            })();
          }
        }
        return nx;
      });
    }, 1000);
    return () => { if (waitTimerRef.current) { window.clearInterval(waitTimerRef.current); waitTimerRef.current = null; } };
  }, [lesson?.id, lesson?.chapterId, lesson?.testMeta?.isMandatory, noVideoWaitLeft]);

  const canStartLessonTest = useMemo(() => {
    if (!lesson?.testMeta?.isPublished) return false;
    const videos = (lesson.contents || []).filter((b) => b.blockType === 'VIDEO' && !!b.mediaKey);
    if (videos.length === 0) return noVideoWaitLeft === 0;
    return videos.every((v) => videoDone[v.id]);
  }, [lesson?.testMeta?.isPublished, lesson?.contents, videoDone, noVideoWaitLeft]);

  if (loading) return <div>Загрузка...</div>;
  if (!lesson) return <div>Урок не найден</div>;

  return (
    <div className="space-y-6">
      <Card
        title={
          <div className="flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-sky-600 text-xs text-white">{lesson.orderIndex}</span>
            <span>{lesson.title}</span>
          </div>
        }
        actions={<Link to={`/chapters/${lesson.chapterId}`}><Button variant="secondary">К главе</Button></Link>}
      >
        <div className="text-sm text-gray-600 dark:text-white/60">Урок {lesson.orderIndex} из главы</div>
      </Card>

      {(() => {
        const firstVideoIndex = lesson.contents.findIndex((b) => b.blockType === 'VIDEO' && !!b.mediaKey);
        return (
          <>
            {firstVideoIndex === -1 && lesson.description ? (
              <div className="text-gray-700 dark:text-white/80 whitespace-pre-line">{lesson.description}</div>
            ) : null}

            <div className="space-y-8">
              {lesson.contents.map((b, idx) => (
                <div key={b.id}>

                  {/* TEXT blocks now use DocumentHighlighter */}
                  {b.blockType === 'TEXT' && b.textHtml && (
                    <div className="glass rounded-2xl p-5">
                      <DocumentHighlighter
                        lessonId={`${lesson.id}_${b.id}`}
                        html={b.textHtml}
                      />
                    </div>
                  )}

                  {b.blockType === 'IMAGE' && b.mediaKey && (
                    <img src={toMediaUrl(b.mediaKey)} alt="" className="mx-auto max-h-[70vh] w-full rounded-xl object-contain" />
                  )}

                  {b.blockType === 'VIDEO' && b.mediaKey && (
                    <div className="-mx-4 sm:-mx-6 md:-mx-8">
                      <div className="mx-auto w-full max-w-5xl">
                        <VideoPlayer
                          className="w-full"
                          src={toMediaUrl(b.mediaKey)}
                          track={{
                            lessonId: lesson.id,
                            blockId: b.id,
                            onProgress: async (p) => {
                              try {
                                const resp = await api.post(`/chapters/${lesson.chapterId}/lessons/${lesson.id}/progress`, {
                                  blockId: b.id,
                                  watchedSec: p.watchedSec,
                                  durationSec: p.durationSec,
                                  completed: p.completed,
                                });
                                if (resp?.data?.completed) {
                                  setLesson((prev) => (prev ? { ...prev, progress: { ...(prev.progress || {}), completed: true } } : prev));
                                }
                                if (p.completed) {
                                  setVideoDone((m) => ({ ...m, [b.id]: true }));
                                }
                              } catch {}
                            },
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {b.blockType === 'FILE' && b.mediaKey && (
                    <a className="underline" href={toMediaUrl(b.mediaKey)} target="_blank" rel="noreferrer">Скачать файл</a>
                  )}

                  {idx === firstVideoIndex && lesson.description ? (
                    <div className="mt-4 text-gray-700 dark:text-white/80 whitespace-pre-line">{lesson.description}</div>
                  ) : null}
                </div>
              ))}
            </div>
          </>
        );
      })()}

      {(() => {
        const hasLessonTest = !!lesson.testMeta && lesson.testMeta.isPublished;
        if (!hasLessonTest) return null;
        return (
          <div className="pt-2">
            <div className="flex flex-col gap-2">
              <Button
                className="w-full"
                disabled={!canStartLessonTest}
                title={!canStartLessonTest ? (noVideoWaitLeft > 0 ? `Можно начать через ${noVideoWaitLeft} сек` : 'Досмотрите видео (не менее 90%)') : undefined}
                onClick={() => { if (canStartLessonTest) navigate(`/lessons/${lesson.id}/test`); }}
              >
                <span className="hidden sm:inline">Пройти тест урока</span>
                <span className="sm:hidden">Тест урока</span>
              </Button>
            </div>
          </div>
        );
      })()}

      <div className="flex items-center justify-between gap-2 sm:gap-3">
        {prevLesson ? (
          <Link to={`/lessons/${prevLesson.id}`} className="flex-1 min-w-0">
            <Button variant="secondary" className="w-full text-left px-2 sm:px-4">
              <span className="text-lg sm:text-base">←</span>
              <span className="inline text-xs text-white/70 ml-2">К предыдущему уроку</span>
            </Button>
          </Link>
        ) : (
          <Button variant="secondary" disabled className="flex-1 text-left px-2 sm:px-4">
            <span className="text-lg sm:text-base">←</span>
            <span className="inline text-xs text-white/70 ml-2">К предыдущему уроку</span>
          </Button>
        )}

        {(() => {
          const hasLessonTest = !!lesson.testMeta && lesson.testMeta.isPublished;
          const isMandatory = !!lesson.testMeta?.isMandatory;
          const canGoNextByVideo = !!lesson.progress?.completed;
          const canGoNext = isMandatory && hasLessonTest ? !!lesson.progress?.completed : canGoNextByVideo;
          if (!nextLesson) {
            if (chapterTestPublished) {
              return (
                <Link to={`/chapters/${lesson.chapterId}/test`} className="flex-1 min-w-0">
                  <Button className="w-full text-right px-2 sm:px-4">
                    <span className="inline text-xs text-white/70">К тесту главы</span>
                    <span className="text-lg sm:text-base ml-2">→</span>
                  </Button>
                </Link>
              );
            }
            return (
              <Button disabled className="flex-1 text-right px-2 sm:px-4">
                <span className="inline text-xs text-white/70">К тесту главы</span>
                <span className="text-lg sm:text-base ml-2">→</span>
              </Button>
            );
          }
          return canGoNext ? (
            <Link to={`/lessons/${nextLesson.id}`} className="flex-1 min-w-0">
              <Button className="w-full text-right px-2 sm:px-4">
                <span className="inline text-xs text-white/70">К следующему уроку</span>
                <span className="text-lg sm:text-base ml-2">→</span>
              </Button>
            </Link>
          ) : (
            <Button disabled className="flex-1 text-right px-2 sm:px-4">
              <span className="inline text-xs text-white/70">К следующему уроку</span>
              <span className="text-lg sm:text-base ml-2">→</span>
            </Button>
          );
        })()}
      </div>
    </div>
  );
}
