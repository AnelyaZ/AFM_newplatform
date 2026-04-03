import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../lib/api';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import TestEditor from '../test-templates/TestEditor';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { useToast } from '../components/Toaster';

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
import type { TestStructure } from '../test-templates/types';

export default function AdminCourseTestBuilderPage() {
  const { courseId } = useParams();
  const [config, setConfig] = useState<{ passScore?: number | null; timeLimitSec?: number | null; shuffleQuestions?: boolean; shuffleAnswers?: boolean }>({ shuffleQuestions: true, shuffleAnswers: true, passScore: 70, timeLimitSec: 1200 });
  const [loading, setLoading] = useState(true);
  const [editorData, setEditorData] = useState<TestStructure | null>(null);
  const [courseTitle, setCourseTitle] = useState<string>('');
  const [settingsOpen, setSettingsOpen] = useState<boolean>(true);
  const [settingsDirty, setSettingsDirty] = useState<boolean>(false);
  const [editorDirty, setEditorDirty] = useState<boolean>(false);
  const dirty = settingsDirty || editorDirty;
  const [leaveConfirm, setLeaveConfirm] = useState<{ open: boolean; nextHref?: string | null }>({ open: false, nextHref: null });
  const { push } = useToast();

  const load = async () => {
    if (!courseId) return;
    setLoading(true);
    try {
      // Загружаем курс для корректного заголовка
      const courseReq = api.get(`/courses/${courseId}`);
      const { data } = await api.get(`/courses/${courseId}/test`);
      const course = await courseReq.then((r) => r.data).catch(() => null);
      setCourseTitle(course?.title || '');
      if (data) {
        setConfig({ passScore: data.passScore ?? 70, timeLimitSec: data.timeLimitSec ?? 1200, shuffleQuestions: data.shuffleQuestions, shuffleAnswers: data.shuffleAnswers });
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
          setEditorData({ metadata: { title: course?.title || '', totalPoints: 0, language: 'rus', duration: '45 минут' }, blocks, evaluation: { criteria: [], gradingScale: [] } } as any);
        } else {
          // Теста ещё нет — показываем пустой редактор
          setEditorData({ metadata: { title: course?.title || '', totalPoints: 0, language: 'rus', duration: '45 минут' }, blocks: [], evaluation: { criteria: [], gradingScale: [] } } as any);
        }
      } else {
        // Теста по курсу ещё нет — всё равно показываем пустой конструктор
        setEditorData({ metadata: { title: course?.title || '', totalPoints: 0, language: 'rus', duration: '45 минут' }, blocks: [], evaluation: { criteria: [], gradingScale: [] } } as any);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [courseId]);

  const saveConfig = async () => {
    if (!courseId) return;
    try {
      const saved = await api.post(`/courses/${courseId}/test`, config).then((r) => r.data);
      if (editorData && saved?.id) {
        try {
          const prev = await api.post(`/tests/${saved.id}/preview`).then((r) => r.data);
          const ids: string[] = (prev?.items || []).map((it: any) => it.questionId).filter(Boolean);
          if (ids.length) await Promise.all(ids.map((qid) => api.delete(`/questions/${qid}`, { headers: { 'X-Silent-Error': '1' } })));
        } catch {}
        const flat = (editorData.blocks?.[0]?.questions || []).map((q: any) => ({
          type: q.type === 'multiple_choice' ? 'MULTI' : 'SINGLE',
          text: q.text,
          points: q.points || 1,
          answers: (q.options || []).map((o: any) => ({ text: o.text, isCorrect: !!o.isCorrect })),
        }));
        await api.post(`/tests/${saved.id}/questions`, { questions: flat });
        // В этом сценарии мы тоже сохраняем редактор — снимем флаг грязности конструктора
        setEditorDirty(false);
      }
      push({ type: 'success', title: 'Тест по курсу сохранён' });
      // После сохранения конфигурации сбрасываем только настройки,
      // dirty редактора сбрасываем при успешном onSave конструктора
      setSettingsDirty(false);
    } catch (e: any) {
      push({ type: 'error', title: 'Не удалось сохранить тест по курсу', description: e?.response?.data?.error?.message || String(e) });
    }
  };

  const handlePreview = async () => {
    if (!courseId) return;
    if (dirty) {
      setLeaveConfirm({ open: true, nextHref: 'preview' });
      return;
    }
    // гарантируем наличие теста и получаем его id
    let testId: string | null = null;
    try {
      const found = await api.get(`/courses/${courseId}/test`).then((r) => r.data).catch(() => null);
      if (found?.id) {
        testId = found.id;
      } else {
        const created = await api.post(`/courses/${courseId}/test`, config).then((r) => r.data);
        testId = created?.id || null;
      }
    } catch {
      testId = null;
    }
    if (!testId) return;
    // открываем страницу реального прохождения в режиме предпросмотра
    window.open(`/preview/tests/${testId}?courseId=${courseId}`, '_blank');
  };

  // beforeunload guard
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  // legacy sections API — не используется в текущем UI

  // Старый редактор вопросов отключён в пользу нового конструктора

  if (loading) return <div>Загрузка…</div>;

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 p-4 sm:p-5 text-white">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="text-xl sm:text-2xl font-semibold leading-snug line-clamp-2">Тест по курсу {courseTitle ? `«${courseTitle}»` : ''}</div>
            <div className="text-white/90 text-sm sm:text-base">Настройте тест и добавьте вопросы</div>
          </div>
          <div className="flex items-center gap-2 sm:self-start">
            <Button variant="secondary" onClick={handlePreview}>Предпросмотр</Button>
            <Button onClick={saveConfig} disabled={!dirty} title={!dirty ? 'Нет несохранённых изменений' : undefined}>Сохранить</Button>
          </div>
        </div>
      </div>

      <Card
        title={<div className="flex items-center gap-3">Настройки теста {settingsDirty && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">Есть несохранённые данные</span>}</div>}
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
          <div className="grid grid-cols-2 items-center">
            <div className="text-sm text-gray-700 dark:text-gray-200">Проходной процентный балл</div>
            <div className="justify-self-end">
              <div className="relative">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={config.passScore ?? 70}
                  onChange={(e) => {
                    const raw = e.target.value === '' ? '' : Number(e.target.value);
                    const val = raw === '' ? 0 : Math.max(0, Math.min(100, Number(raw)));
                  setConfig({ ...config, passScore: val });
                  setSettingsDirty(true);
                  }}
                  className="w-14 pr-8 text-right"
                />
                <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-sm text-gray-500 dark:text-white/60">%</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 items-center">
            <div className="text-sm text-gray-700 dark:text-gray-200">Лимит времени (мин)</div>
            <div className="justify-self-end">
              <div className="relative">
                <Input
                  type="number"
                  min={1}
                  max={99}
                  value={Math.round((config.timeLimitSec ?? 1200) / 60)}
                  onChange={(e) => {
                    const raw = e.target.value === '' ? '' : Number(e.target.value);
                    const minutes = raw === '' ? 1 : Math.max(1, Math.min(99, Number(raw)));
                    setConfig({ ...config, timeLimitSec: minutes * 60 });
                    setSettingsDirty(true);
                  }}
                  className="w-14 pr-8 text-right"
                />
                <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-sm text-gray-500 dark:text-white/60">мин</span>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 items-center">
            <div className="text-sm text-gray-700 dark:text-gray-200">Перемешивать вопросы</div>
            <div className="justify-self-end">
              <Toggle checked={!!(config.shuffleQuestions ?? true)} onChange={(v) => setConfig({ ...config, shuffleQuestions: v })} />
            </div>
          </div>
          <div className="grid grid-cols-2 items-center">
            <div className="text-sm text-gray-700 dark:text-gray-200">Перемешивать ответы</div>
            <div className="justify-self-end">
              <Toggle checked={!!(config.shuffleAnswers ?? true)} onChange={(v) => setConfig({ ...config, shuffleAnswers: v })} />
            </div>
          </div>
        </div>
        )}
      </Card>

      {editorData && (
        <Card title={<div className="flex items-center gap-3">Конструктор теста {editorDirty && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">Есть несохранённые данные</span>}</div>}>
          <TestEditor
            initialData={editorData}
            onChange={(payload, isDirty) => { setEditorData(payload as any); setEditorDirty(!!isDirty); }}
            onSave={async (payload) => {
              if (!courseId) return;
              try {
                const saved = await api.post(`/courses/${courseId}/test`, config).then((r) => r.data);
                const testId = saved.id;
                const flat = (payload.blocks?.[0]?.questions || []).map((q: any) => ({
                  type: q.type === 'multiple_choice' ? 'MULTI' : q.type === 'true_false' ? 'BOOLEAN' : 'SINGLE',
                  text: q.text,
                  points: q.type === 'multiple_choice' ? Math.max(2, q.points || 2) : (q.points || 1),
                  answers: (q.options || []).map((o: any) => ({ text: o.text, isCorrect: !!o.isCorrect })),
                }));
                await api.post(`/tests/${testId}/questions`, { questions: flat });
                setEditorData(payload as any);
                push({ type: 'success', title: 'Тест по курсу сохранён' });
                setEditorDirty(false);
              } catch (e: any) {
                push({ type: 'error', title: 'Ошибка сохранения', description: e?.response?.data?.error?.message || String(e) });
              }
            }}
          />
        </Card>
      )}

      {/* Разделы скрыты в текущем дизайне */}
      <ConfirmDialog
        open={leaveConfirm.open}
        title="Есть несохранённые данные"
        description="Сохранить изменения перед выходом?"
        confirmText="Сохранить"
        cancelText="Не сохранять"
        onClose={() => setLeaveConfirm({ open: false, nextHref: null })}
        onConfirm={async () => {
          await saveConfig();
          setLeaveConfirm({ open: false, nextHref: null });
          if (leaveConfirm.nextHref === 'preview') await handlePreview();
        }}
      />
    </div>
  );
}


