interface Props {
  percent: number;
  fileName?: string;
}

export default function UploadProgress({ percent, fileName }: Props) {
  const done = percent >= 100;
  return (
    <div className="mt-2 w-full">
      {fileName && (
        <div className="mb-1 truncate text-xs text-white/60">{fileName}</div>
      )}
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full transition-all duration-300 ${done ? 'bg-green-500' : 'bg-blue-500'}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="mt-1 text-xs text-white/60">
        {done ? 'Загружено' : `Загрузка... ${percent}%`}
      </div>
    </div>
  );
}
