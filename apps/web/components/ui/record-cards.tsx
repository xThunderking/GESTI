import type { Key, ReactNode } from 'react';
import { cn } from '@/lib/utils';

type RecordField<T> = {
  label: string;
  render: (item: T) => ReactNode;
};

type RecordCardsProps<T> = {
  items: T[];
  getKey: (item: T) => Key;
  title: (item: T) => ReactNode;
  subtitle?: (item: T) => ReactNode;
  fields: RecordField<T>[];
  actions?: (item: T) => ReactNode;
  emptyMessage: string;
  cardClassName?: string | ((item: T) => string);
  headerClassName?: string | ((item: T) => string);
  listClassName?: string;
  compact?: boolean;
};

/** Mobile and tablet counterpart to a desktop data table. */
export function RecordCards<T>({
  items,
  getKey,
  title,
  subtitle,
  fields,
  actions,
  emptyMessage,
  cardClassName,
  headerClassName,
  listClassName,
  compact = false,
}: RecordCardsProps<T>) {
  return (
    <div
      className={cn(compact ? 'grid gap-2 p-2 sm:gap-3 sm:p-3 md:grid-cols-2 xl:hidden' : 'grid gap-4 p-4 md:grid-cols-2 md:gap-5 md:p-5 xl:hidden', listClassName)}
      role="list"
    >
      {items.length === 0 ? (
        <p className="rounded-2xl border border-dashed bg-background px-4 py-12 text-center text-sm text-muted-foreground md:col-span-2">
          {emptyMessage}
        </p>
      ) : (
        items.map((item) => (
          <article
            className={cn(
              compact ? 'min-w-0 overflow-hidden rounded-xl border bg-card shadow-sm' : 'min-w-0 overflow-hidden rounded-2xl border bg-card shadow-sm transition-all duration-200 hover:shadow-md',
              typeof cardClassName === 'function' ? cardClassName(item) : cardClassName,
            )}
            key={getKey(item)}
            role="listitem"
          >
            <div
              className={cn(
                compact ? 'flex min-w-0 items-center justify-between gap-2 border-b bg-secondary/40 px-3 py-2.5' : 'min-w-0 border-b bg-secondary/40 px-4 py-4 sm:px-5',
                typeof headerClassName === 'function' ? headerClassName(item) : headerClassName,
              )}
            >
              <h3 className={cn('min-w-0 break-words font-semibold leading-snug text-foreground', compact ? 'text-sm' : 'text-base sm:text-lg')}>
                {title(item)}
              </h3>
              {subtitle ? (
                <p className={cn('break-words [overflow-wrap:anywhere] text-muted-foreground', compact ? 'shrink-0 rounded-full bg-white/80 px-2 py-1 text-xs font-semibold' : 'mt-1 text-sm')}>
                  {subtitle(item)}
                </p>
              ) : null}
            </div>
            {fields.length > 0 ? (
              <dl className={cn('grid min-w-0 gap-x-5', compact ? 'grid-cols-2 px-3 py-1' : 'grid-cols-1 px-4 py-2 sm:px-5 lg:grid-cols-2')}>
                {fields.map((field) => (
                  <div
                    className={cn('min-w-0 border-b border-border/60', compact ? 'py-2' : 'py-3 last:border-b-0')}
                    key={field.label}
                  >
                    <dt className={cn('font-semibold uppercase tracking-wide text-muted-foreground', compact ? 'text-[10px]' : 'text-xs')}>
                      {field.label}
                    </dt>
                    <dd className={cn('break-words text-foreground', compact ? 'mt-0.5 text-xs' : 'mt-1 text-sm')}>
                      {field.render(item)}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}
            {actions ? (
              <div className={cn('record-card-actions flex flex-wrap items-center justify-start border-t bg-secondary/30', compact ? 'gap-1.5 px-3 py-2' : 'gap-2 px-4 py-3 sm:justify-end sm:px-5')}>
                {actions(item)}
              </div>
            ) : null}
          </article>
        ))
      )}
    </div>
  );
}
