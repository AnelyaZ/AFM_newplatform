import api from './api';

export async function uploadFileWithProgress(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  const { data } = await api.post('/uploads/file', form, {
    onUploadProgress: (e) => {
      if (e.total && onProgress) {
        onProgress(Math.round((e.loaded * 100) / e.total));
      }
    },
  });
  return data.key as string;
}
