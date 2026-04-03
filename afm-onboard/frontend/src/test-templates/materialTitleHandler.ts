export function extractMaterialTitle(inputData: any, kind: string, _subject?: string, _grade?: string) {
  const title = inputData?.metadata?.title || inputData?.title || inputData?.name || `${kind}`;
  return { title };
}

export function createUnifiedMetadata(inputData: any, kind: string, subject?: string, grade?: string) {
  return {
    title: inputData?.metadata?.title || inputData?.title || inputData?.name || `${kind}`,
    subject: subject || inputData?.metadata?.subject || inputData?.subject || '',
    grade: grade || inputData?.metadata?.grade || inputData?.grade || '',
    language: inputData?.metadata?.language || 'rus',
    duration: inputData?.metadata?.duration || '45 минут',
    totalPoints: inputData?.metadata?.totalPoints || 0,
    instructions: inputData?.metadata?.instructions || '',
  };
}

export function syncMaterialTitle(data: any, title: string) {
  return {
    ...data,
    metadata: { ...(data?.metadata || {}), title },
  };
}


