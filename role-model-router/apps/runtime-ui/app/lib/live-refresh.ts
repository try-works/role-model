export interface DeferredLiveRefreshOptions {
  readonly load: (background: boolean) => Promise<void>;
  readonly subscribe: (onEvent: () => void) => () => void;
}

export function startDeferredLiveRefresh(options: DeferredLiveRefreshOptions): () => void {
  let disposed = false;
  let unsubscribe: (() => void) | null = null;

  const connect = () => {
    if (disposed || unsubscribe) {
      return;
    }

    unsubscribe = options.subscribe(() => {
      if (disposed) {
        return;
      }
      void options.load(true);
    });
  };

  void options.load(false).finally(connect);

  return () => {
    disposed = true;
    unsubscribe?.();
    unsubscribe = null;
  };
}
