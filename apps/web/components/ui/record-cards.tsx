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
}: RecordCardsProps<T>) {
  return (
    <div
      className={cn('grid gap-4 p-4 md:grid-cols-2 md:gap-5 md:p-5 xl:hidden', listClassName)}
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
              'min-w-0 overflow-hidden rounded-2xl border bg-card shadow-sm transition-all duration-200 hover:shadow-md',
              typeof cardClassName === 'function' ? cardClassName(item) : cardClassName,
            )}
            key={getKey(item)}
            role="listitem"
          >
            <div
              className={cn(
                'min-w-0 border-b bg-secondary/40 px-4 py-4 sm:px-5',
                typeof headerClassName === 'function' ? headerClassName(item) : headerClassName,
              )}
            >
              <h3 className="break-words text-base font-semibold leading-snug text-foreground sm:text-lg">
                {title(item)}
              </h3>
              {subtitle ? (
                <p className="mt-1 break-words [overflow-wrap:anywhere] text-sm text-muted-foreground">
                  {subtitle(item)}
                </p>
              ) : null}
            </div>
            {fields.length > 0 ? (
              <dl className="grid min-w-0 grid-cols-1 gap-x-5 px-4 py-2 sm:px-5 lg:grid-cols-2">
                {fields.map((field) => (
                  <div
                    className="min-w-0 border-b border-border/60 py-3 last:border-b-0"
                    key={field.label}
                  >
                    <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {field.label}
                    </dt>
                    <dd className="mt-1 break-words text-sm text-foreground">
                      {field.render(item)}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}
            {actions ? (
              <div className="record-card-actions flex flex-wrap items-center justify-start gap-2 border-t bg-secondary/30 px-4 py-3 sm:justify-end sm:px-5">
                {actions(item)}
              </div>
            ) : null}
          </article>
        ))
      )}
    </div>
  );
}
