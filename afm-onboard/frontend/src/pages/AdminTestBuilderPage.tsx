import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../lib/api';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
// import Select from '../components/ui/Select';
// TextArea removed from questions UI
import { useToast } from '../components/Toaster';
import TestEditor from '../test-templates/TestEditor';
import type { TestStructure } from '../test-templates/types';
import { useAuthStore } from '../store/auth';

export default function AdminTestBuilderPage() {
  const { id } = useParams(); // chapterId
  const [config, setConfig] = useState<{ timeLimitSec?: number | null; questionCount?: number | null; shuffleQuestions?: boolean; shuffleAnswers?: boolean }>({ shuffleQuestions: true, shuffleAnswers: true });
  const [isPublished, setIsPublished] = useState<boolean>(false);
  const [editorData, setEditorData] = useState<TestStructure | null>(null);
  const [moduleTitle, setModuleTitle] = useState<string>('');
  const [passScore, setPassScore] = useState<number | null>(null);
  const [settingsOpen, setSettingsOpen] = useState<boolean>(true);
  const [settingsDirty, setSettingsDirty] = useState<boolean>(false);
  const [editorDirty, setEditorDirty] = useState<boolean>(false);
  const dirty = settingsDirty || editorDirty;
  const [isLatestCourse, setIsLatestCourse] = useState<boolean>(true);
  const { push } = useToast();

  function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
    return (
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 ${checked ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-white/20'}`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${checked ? 'translate-x-5' : 'translate-x-1'}`}
        />
      </button>
    );
  }

  const load = async () => {
    // meta главы
    let moduleTitleLocal = 'Модуль';
    try {
      const ch = await api.get(`/chapters/${id}`).then((r) => r.data);
      moduleTitleLocal = ch?.title || 'Модуль';
      setModuleTitle(moduleTitleLocal);
      setPassScore(typeof ch?.passScore === 'number' ? ch.passScore : null);
      if (ch?.courseId) {
        try {
          const course = await api.get(`/courses/admin/by-id/${ch.courseId}`).then((r) => r.data);
          setIsLatestCourse(!!course?.isLatest);
        } catch {}
      }
    } catch {}
    let data: any = null;
    try {
      data = await api.get(`/chapters/${id}/test`).then((r) => r.data);
    } catch {}
    if (data) {
      setConfig({ timeLimitSec: data.timeLimitSec, questionCount: data.questionCount, shuffleQuestions: data.shuffleQuestions, shuffleAnswers: data.shuffleAnswers });
      setIsPublished(!!data.isPublished);
      if (data.id) {
        const qs = await api.get(`/tests/${data.id}/questions`).then((r) => r.data);
        const blocks = [
          {
            id: `b-${Date.now()}`,
            title: 'Блок 1',
            type: 'single_choice',
            questions: (qs || []).map((q: any) => ({
              id: q.id,
              text: q.text,
              type: q.type === 'MULTI' ? 'multiple_choice' : 'single_choice',
              points: q.points || 1,
              options: (q.answers || []).map((a: any) => ({ id: a.id, text: a.text, isCorrect: a.isCorrect })),
            })),
          },
        ];
        setEditorData({ metadata: { title: moduleTitleLocal || 'Тест модуля', totalPoints: 0, language: 'rus', duration: '45 минут' }, blocks, evaluation: { criteria: [], gradingScale: [] } } as any);
      } else {
        setEditorData({ metadata: { title: moduleTitleLocal || 'Тест модуля', totalPoints: 0, language: 'rus', duration: '45 минут' }, blocks: [], evaluation: { criteria: [], gradingScale: [] } } as any);
      }
    } else {
      // Нет теста — показать пустой редактор и дефолтные настройки
      setConfig({ shuffleQuestions: true, shuffleAnswers: true, timeLimitSec: null, questionCount: null });
      setIsPublished(false);
      setEditorData({ metadata: { title: moduleTitle || 'Тест модуля', totalPoints: 0, language: 'rus', duration: '45 минут' }, blocks: [], evaluation: { criteria: [], gradingScale: [] } } as any);
    }
  };

  useEffect(() => { load(); }, [id]);

  const saveConfig = async () => {
    const { user, accessToken, refreshToken } = useAuthStore.getState();
    if (!user || user.role !== 'ADMIN' || !accessToken) {
      push({ type: 'error', title: 'Нет доступа', description: 'Авторизуйтесь как администратор, чтобы сохранить тест.' });
      return;
    }
    // Сохраняем настройки и passScore главы одной кнопкой
    try {
      if (passScore != null && isLatestCourse) {
        await api.patch(`/chapters/${id}`, { passScore });
      }
    } catch (e: any) {
      // Если не авторизованы/нет прав — не продолжаем
      if (e?.response?.status === 401 || e?.response?.status === 403) {
        push({ type: 'error', title: 'Доступ запрещён', description: 'Сессия истекла или нет прав. Войдите заново как администратор.' });
        return;
      }
      // Иные ошибки — остановить сохранение
      push({ type: 'error', title: 'Не удалось обновить модуль', description: e?.response?.data?.error?.message || String(e) });
      return;
    }

    let saved: any = null;
    try {
      saved = await api.post(`/chapters/${id}/test`, { ...config, isPublished }).then((r) => r.data);
    } catch (e: any) {
      const msg = e?.response?.data?.error?.message || e?.response?.data?.message || 'Ошибка сохранения теста';
      push({ type: 'error', title: 'Не удалось сохранить тест', description: msg });
      return;
    }

    try {
      // Если есть редактор и вопросы — синхронизируем
      if (editorData && saved?.id) {
        try {
          const prev = await api.post(`/tests/${saved.id}/preview`).then((r) => r.data);
          const existingIds: string[] = (prev?.items || []).map((it: any) => it.questionId).filter(Boolean);
          if (existingIds.length) {
            await Promise.all(existingIds.map((qid) => api.delete(`/questions/${qid}`, { headers: { 'X-Silent-Error': '1' } })));
          }
        } catch {}
        const flat = (editorData.blocks?.[0]?.questions || []).map((q: any) => ({
          type: q.type === 'multiple_choice' ? 'MULTI' : 'SINGLE',
          text: q.text,
          points: q.points || 1,
          answers: (q.options || []).map((o: any) => ({ text: o.text, isCorrect: !!o.isCorrect })),
        }));
        await api.post(`/tests/${saved.id}/questions`, { questions: flat });
      }
    } catch (e: any) {
      push({ type: 'error', title: 'Не удалось сохранить вопросы', description: e?.response?.data?.error?.message || String(e) });
      return;
    }

    push({ type: 'success', title: 'Тест сохранён' });
    setSettingsDirty(false);
    setEditorDirty(false);
  };

  // legacy sections API — не используется в текущем UI

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 p-4 sm:p-5 text-white">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="text-xl sm:text-2xl font-semibold leading-snug truncate">Тест модуля {moduleTitle ? `«${moduleTitle}»` : ''}</div>
            <div className="text-white/90 text-sm sm:text-base">Настройте тест и добавьте вопросы</div>
          </div>
          <div className="flex items-center gap-2 sm:self-start">
            <Button variant="secondary" onClick={async () => {
              let testId: string | null = null;
              try {
                const found = await api.get(`/chapters/${id}/test`).then((r) => r.data).catch(() => null);
                if (found?.id) {
                  testId = found.id;
                } else {
                  const created = await api.post(`/chapters/${id}/test`, { ...config, isPublished }).then((r) => r.data);
                  testId = created?.id || null;
                }
              } catch {}
              if (testId) window.open(`/preview/tests/${testId}?chapterId=${id}`, '_blank');
            }}>Предпросмотр</Button>
            <Button onClick={saveConfig} disabled={!dirty} title={!dirty ? 'Нет несохранённых изменений' : undefined}>Сохранить</Button>
          </div>
        </div>
      </div>

      <Card
        title={<div className="flex items-center gap-3 min-w-0 truncate">Настройки теста модуля {settingsDirty && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">Есть несохранённые данные</span>}</div>}
        actions={
          <button
            onClick={() => setSettingsOpen((v) => !v)}
            className="rounded px-2 py-1 text-sm text-white/90 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/30"
            aria-expanded={settingsOpen}
          >
            {settingsOpen ? 'Свернуть' : 'Развернуть'}
          </button>
        }
      >
        {settingsOpen && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2">
            <div className="text-sm text-gray-700 dark:text-gray-200">Проходной процентный балл</div>
            <div className="sm:justify-self-end">
              <div className="relative">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={passScore ?? 70}
                  onChange={(e) => {
                    const raw = e.target.value === '' ? '' : Number(e.target.value);
                    const val = raw === '' ? 0 : Math.max(0, Math.min(100, Number(raw)));
                    setPassScore(val as any);
                    setSettingsDirty(true);
                  }}
                  className="w-20 pr-8 text-right"
                  disabled={!isLatestCourse}
                />
                <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-sm text-gray-500 dark:text-white/60">%</span>
              </div>
            </div>
          </div>
          {!isLatestCourse && (
            <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-800 dark:text-amber-300">
              Редактирование проходного балла недоступно: курс не в последней версии серии.
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2">
            <div className="text-sm text-gray-700 dark:text-gray-200">Лимит времени (мин)</div>
            <div className="sm:justify-self-end">
              <div className="relative">
                <Input
                  type="number"
                  min={1}
                  max={99}
                  value={Math.round((config.timeLimitSec ?? 1200) / 60)}
                  onChange={(e) => {
                    const raw = e.target.value === '' ? '' : Number(e.target.value);
                    const minutes = raw === '' ? 1 : Math.max(1, Math.min(99, Number(raw)));
                    setConfig({ ...config, timeLimitSec: (minutes as number) * 60 });
                    setSettingsDirty(true);
                  }}
                  className="w-24 pr-8 text-right"
                />
                <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-sm text-gray-500 dark:text-white/60">мин</span>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2">
            <div className="text-sm text-gray-700 dark:text-gray-200">Перемешивать вопросы</div>
            <div className="sm:justify-self-end">
              <Toggle checked={!!(config.shuffleQuestions ?? true)} onChange={(v) => { setConfig({ ...config, shuffleQuestions: v }); setSettingsDirty(true); }} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2">
            <div className="text-sm text-gray-700 dark:text-gray-200">Перемешивать ответы</div>
            <div className="sm:justify-self-end">
              <Toggle checked={!!(config.shuffleAnswers ?? true)} onChange={(v) => { setConfig({ ...config, shuffleAnswers: v }); setSettingsDirty(true); }} />
            </div>
          </div>
        </div>
        )}
      </Card>

      {editorData && (
        <Card title={<div className="flex items-center gap-3 min-w-0 truncate">Конструктор теста {editorDirty && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">Есть несохранённые данные</span>}</div>}>
          <TestEditor
            initialData={editorData}
            onChange={(payload, isDirty) => {
              setEditorData(payload);
              setEditorDirty(!!isDirty);
            }}
            onSave={async (payload) => {
              const saved = await api.post(`/chapters/${id}/test`, { ...config, isPublished }).then((r) => r.data);
              const testId = saved.id;
              // Replace all questions to avoid duplicates (тихий режим)
              try {
                const prev = await api.post(`/tests/${testId}/preview`).then((r) => r.data);
                const existingIds: string[] = (prev?.items || []).map((it: any) => it.questionId).filter(Boolean);
                if (existingIds.length) {
                  await Promise.all(existingIds.map((qid) => api.delete(`/questions/${qid}`, { headers: { 'X-Silent-Error': '1' } })));
                }
              } catch {}
              const flat = (payload.blocks?.[0]?.questions || []).map((q: any) => ({
                type: q.type === 'multiple_choice' ? 'MULTI' : 'SINGLE',
                text: q.text,
                points: q.type === 'multiple_choice' ? Math.max(2, q.points || 2) : (q.points || 1),
                answers: (q.options || []).map((o: any) => ({ text: o.text, isCorrect: !!o.isCorrect })),
              }));
              await api.post(`/tests/${testId}/questions`, { questions: flat });
              setEditorData(payload as any);
              push({ type: 'success', title: 'Тест сохранён' });
              setEditorDirty(false);
            }}
          />
        </Card>
      )}

      {/* Разделы скрыты в текущем дизайне */}
    </div>
  );
}


