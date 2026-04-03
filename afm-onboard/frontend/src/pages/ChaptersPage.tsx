import { useEffect, useState } from 'react';
import api from '../lib/api';
import CourseCard from '../components/CourseCard';

type Course = { id: string; title: string; description?: string | null; version?: number | null; isPublic?: boolean | null; progressPercent?: number | null; avgScore?: number | null };

export default function ChaptersPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const r = await api.get('/courses');
        setCourses(r.data);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <div>Загрузка...</div>;

  return (
    <div className="space-y-4">
      {/* Приветственный видеоблок удалён по требованию */}
      <div>
        <h2 className="text-2xl font-semibold">Обучение</h2>
        <div className="text-sm text-gray-600 dark:text-white/70">Выберите курс, затем изучайте модули и проходите тесты.</div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {courses.map((course) => (
          <CourseCard
            key={course.id}
            course={{ id: course.id, title: course.title, description: course.description ?? '', version: course.version ?? null, isPublic: course.isPublic ?? null, progressPercent: course.progressPercent ?? null, avgScore: course.avgScore ?? null }}
            onOpen={(id) => (window.location.href = `/kursy/${id}`)}
            publicLabel="по умолчанию"
          />
        ))}
      </div>
    </div>
  );
}


