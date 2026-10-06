'use client';

import { useId, useState } from 'react';
import { History } from 'lucide-react';
import { cn } from '@/lib/utils';

type Pane = 'list' | 'form';

export function useModuleWorkspace() {
  const [pane, setPane] = useState<Pane>('list');
  const anchorId = useId();

  function show(nextPane: Pane) {
    setPane(nextPane);
    if (window.matchMedia('(max-width: 1279px)').matches) {
      requestAnimationFrame(() => {
        const anchor = document.getElementById(anchorId);
        const status = anchor?.previousElementSibling;
        (['status', 'alert'].includes(status?.getAttribute('role') ?? '')
          ? status
          : anchor
        )?.scrollIntoView({ block: 'start' });
      });
    }
  }

  return { pane, anchorId, showForm: () => show('form'), showList: () => show('list') };
}

export function ModuleWorkspaceTabs({
  pane,
  onShowList,
  onShowForm,
  onShowHistory,
  historyActive = false,
  formLabel,
  showOnDesktop = false,
  className,
  activeTabClassName,
  inactiveTabClassName,
}: {
  pane: Pane;
  onShowList: () => void;
  onShowForm: () => void;
  onShowHistory?: () => void;
  historyActive?: boolean;
  formLabel: string;
  showOnDesktop?: boolean;
  className?: string;
  activeTabClassName?: string;
  inactiveTabClassName?: string;
}) {
  return (
    <div
      className={cn(
        cn('mt-5 grid gap-1 rounded-xl border bg-card p-1.5 shadow-sm', onShowHistory ? 'grid-cols-3' : 'grid-cols-2'),
        showOnDesktop ? 'xl:grid' : 'xl:hidden',
        className,
      )}
      role="group"
      aria-label="Vista del módulo"
    >
      <button
        aria-pressed={pane === 'list' && !historyActive}
        className={cn(
          'min-h-11 rounded-lg px-3 text-sm font-semibold transition-colors',
          pane === 'list' && !historyActive
            ? cn('bg-[#061b38] text-white shadow-sm', activeTabClassName)
            : cn('text-muted-foreground hover:bg-secondary', inactiveTabClassName),
        )}
        onClick={onShowList}
        type="button"
      >
        Registros
      </button>
      <button
        aria-pressed={historyActive}
        className={cn(
          'flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-2 text-sm font-semibold transition-colors sm:gap-2 sm:px-3',
          historyActive
            ? cn('bg-[#061b38] text-white shadow-sm', activeTabClassName)
            : cn('text-muted-foreground hover:bg-secondary', inactiveTabClassName),
        )}
        onClick={onShowHistory}
        type="button"
        hidden={!onShowHistory}
      >
        <History className="size-4 shrink-0" />
        Historial
      </button>
      <button
        aria-pressed={pane === 'form'}
        className={cn(
          'min-h-11 rounded-lg px-3 text-sm font-semibold transition-colors',
          pane === 'form' && !historyActive
            ? cn('bg-[#061b38] text-white shadow-sm', activeTabClassName)
            : cn('text-muted-foreground hover:bg-secondary', inactiveTabClassName),
        )}
        onClick={onShowForm}
        type="button"
      >
        {formLabel}
      </button>
    </div>
  );
}
