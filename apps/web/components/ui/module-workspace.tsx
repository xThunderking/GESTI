'use client';

import { useId, useState } from 'react';
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
  formLabel,
}: {
  pane: Pane;
  onShowList: () => void;
  onShowForm: () => void;
  formLabel: string;
}) {
  return (
    <div
      className="mt-5 grid grid-cols-2 rounded-lg border bg-card p-1 xl:hidden"
      role="group"
      aria-label="Vista del módulo"
    >
      <button
        aria-pressed={pane === 'list'}
        className={cn(
          'min-h-11 rounded-md px-3 text-sm font-semibold',
          pane === 'list' ? 'bg-[#061b38] text-white' : 'text-muted-foreground',
        )}
        onClick={onShowList}
        type="button"
      >
        Registros
      </button>
      <button
        aria-pressed={pane === 'form'}
        className={cn(
          'min-h-11 rounded-md px-3 text-sm font-semibold',
          pane === 'form' ? 'bg-[#061b38] text-white' : 'text-muted-foreground',
        )}
        onClick={onShowForm}
        type="button"
      >
        {formLabel}
      </button>
    </div>
  );
}
