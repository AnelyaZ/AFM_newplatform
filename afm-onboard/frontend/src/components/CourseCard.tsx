import React from 'react';
import Card from './ui/Card';
import Button from './ui/Button';

export type CourseCardData = {
  id: string;
  title: string;
  description?: string | null;
  version?: number | null;
  isPublic?: boolean | null;
  isArchived?: boolean | null;
  progressPercent?: number | null;
  avgScore?: number | null;
};

type CourseCardProps = {
  course: CourseCardData;
  onOpen: (id: string) => void;
  actionsRight?: React.ReactNode;
  actionsBottomLeft?: React.ReactNode;
  className?: string;
  publicLabel?: string;
  onPublicClick?: (id: string, next: boolean) => void;
};

export default function CourseCard({ course, onOpen, actionsRight, actionsBottomLeft, className, publicLabel }: CourseCardProps) {
  const { id, title, description, version, isPublic, isArchived, progressPercent, avgScore } = course;
  return (
    <Card
      title={
        <div className="flex items-center gap-2">
          <div className="truncate" title={title || ''}>{title}</div>
        </div>
      }
      actions={
        <div className="flex items-center gap-2">
          {typeof version === 'number' && version > 0 ? (
            <span className="rounded-full bg-black/5 px-2 py-0.5 text-xs text-gray-700 dark:bg-white/10 dark:text-white/80">V{version}</span>
          ) : null}
          {isPublic ? (
            <span className="rounded-full bg-sky-600/90 px-2 py-0.5 text-xs font-medium text-white">{publicLabel || 'общедоступный'}</span>
          ) : null}
          {isArchived ? (
            <span className="rounded-full bg-gray-300 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-white/10 dark:text-white/80">архив</span>
          ) : null}
          {actionsRight}
        </div>
      }
      className={`flex h-full flex-col ${className || ''}`}
    >
      <div className="flex-1">
        {description && description.trim() ? (
          <div className="line-clamp-3 text-sm text-gray-700 dark:text-white/80" title={description || ''}>{description}</div>
        ) : (
          <div className="text-sm text-gray-600 dark:text-white/70">Описание отсутствует</div>
        )}
        {typeof progressPercent === 'number' ? (
          <div className="mt-3">
            <div className="h-2 w-full rounded bg-black/10 dark:bg-white/10">
              <div
                className="h-2 rounded bg-sky-600"
                style={{ width: `${Math.max(0, Math.min(100, Number(progressPercent ?? 0)))}%` }}
              />
            </div>
            <div className="mt-1 text-xs text-gray-600 dark:text-white/70">Прогресс: {Math.max(0, Math.min(100, Number(progressPercent ?? 0)))}%</div>
          </div>
        ) : null}
      </div>
      <div className="mt-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {typeof avgScore === 'number' ? (
            <span className="rounded bg-black/5 px-2 py-0.5 text-xs text-gray-700 dark:bg-white/10 dark:text-white/80">
              Средняя оценка: {Math.max(0, Math.min(100, Number(avgScore ?? 0)))}%
            </span>
          ) : null}
          {actionsBottomLeft}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => onOpen(id)}>Открыть</Button>
        </div>
      </div>
    </Card>
  );
}


