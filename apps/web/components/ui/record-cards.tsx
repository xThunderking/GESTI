import type { Key, ReactNode } from 'react';

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
}: RecordCardsProps<T>) {
  return (
    <div className="grid gap-3 p-3 md:grid-cols-2 xl:hidden" role="list">
      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed bg-background px-4 py-10 text-center text-sm text-muted-foreground md:col-span-2">
          {emptyMessage}
        </p>
      ) : (
        items.map((item) => (
          <article
            className="min-w-0 overflow-hidden rounded-xl border bg-card shadow-sm"
            key={getKey(item)}
            role="listitem"
          >
            <div className="min-w-0 border-b bg-secondary/40 px-4 py-3">
              <h3 className="break-words text-base font-semibold leading-snug text-foreground">
                {title(item)}
              </h3>
              {subtitle ? (
                <p className="mt-1 break-words [overflow-wrap:anywhere] text-sm text-muted-foreground">
                  {subtitle(item)}
                </p>
              ) : null}
            </div>
            <dl className="grid min-w-0 grid-cols-1 gap-x-4 px-4 py-2 lg:grid-cols-2">
              {fields.map((field) => (
                <div
                  className="min-w-0 border-b border-border/60 py-2.5 last:border-b-0"
                  key={field.label}
                >
                  <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {field.label}
                  </dt>
                  <dd className="mt-1 break-words text-sm text-foreground">{field.render(item)}</dd>
                </div>
              ))}
            </dl>
            {actions ? (
              <div className="record-card-actions flex flex-wrap items-center justify-end gap-2 border-t bg-secondary/30 px-4 py-3">
                {actions(item)}
              </div>
            ) : null}
          </article>
        ))
      )}
    </div>
  );
}
