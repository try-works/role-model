import {
  type DependencyList,
  type ReactNode,
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export interface ShellHeaderOverride {
  readonly title?: string;
  readonly description?: string;
}

interface ShellHeaderContextValue {
  readonly actions: ReactNode | null;
  readonly override: ShellHeaderOverride | null;
  readonly setActions: (actions: ReactNode | null) => void;
  readonly setOverride: (override: ShellHeaderOverride | null) => void;
}

const ShellHeaderContext = createContext<ShellHeaderContextValue | null>(null);

export function ShellHeaderProvider({ children }: { children: ReactNode }) {
  const [actions, setActions] = useState<ReactNode | null>(null);
  const [override, setOverride] = useState<ShellHeaderOverride | null>(null);
  const value = useMemo(
    () => ({
      actions,
      override,
      setActions,
      setOverride,
    }),
    [actions, override],
  );

  return <ShellHeaderContext.Provider value={value}>{children}</ShellHeaderContext.Provider>;
}

function useShellHeaderContext(): ShellHeaderContextValue {
  const context = useContext(ShellHeaderContext);
  if (!context) {
    throw new Error("Shell header hooks must be used within ShellHeaderProvider.");
  }
  return context;
}

export function useShellHeaderState(): Pick<ShellHeaderContextValue, "actions" | "override"> {
  const { actions, override } = useShellHeaderContext();
  return { actions, override };
}

export function usePageActions(actions: ReactNode, deps: DependencyList = []): void {
  const { setActions } = useShellHeaderContext();
  const actionsRef = useRef(actions);
  actionsRef.current = actions;

  useLayoutEffect(() => {
    setActions(actionsRef.current);
    return () => {
      setActions(null);
    };
  }, [setActions, ...deps]);
}

export function useShellHeaderOverride(
  override: ShellHeaderOverride,
  deps: DependencyList = [],
): void {
  const { setOverride } = useShellHeaderContext();
  const overrideRef = useRef(override);
  overrideRef.current = override;

  useLayoutEffect(() => {
    setOverride(overrideRef.current);
    return () => {
      setOverride(null);
    };
  }, [setOverride, ...deps]);
}
