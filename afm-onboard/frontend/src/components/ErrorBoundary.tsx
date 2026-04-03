import React from 'react';

type Props = { children: React.ReactNode };
type State = { hasError: boolean; error?: any };

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    // eslint-disable-next-line no-console
    console.error('UI ErrorBoundary caught:', error, errorInfo);
    try {
      (window as any).__app_toast?.({ type: 'error', title: 'Ошибка интерфейса', description: String(error?.message || error) });
    } catch {}
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6">
          <div className="rounded-md border border-rose-500/30 bg-rose-500/10 p-4 text-rose-200">
            <div className="font-semibold">Произошла ошибка интерфейса</div>
            <div className="mt-1 text-sm opacity-80">Попробуйте обновить страницу. Если ошибка повторяется — сообщите администратору.</div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}


