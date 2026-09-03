import type { ReactNode } from 'react'

/** Standard top-left screen header: a title (string → styled `<h1>`, or a node like a breadcrumb)
 * and an optional right-side control. `min-h-11` fixes the row height so the title sits in the
 * exact same spot whether or not a control is present — every screen's top-left text lines up. */
export function PageHeader({ title, children }: { title: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-4 flex min-h-11 shrink-0 items-center justify-between gap-4">
      {typeof title === 'string' ? (
        <h1 className="text-lg font-medium text-slate-900 dark:text-slate-100">{title}</h1>
      ) : (
        title
      )}
      {children}
    </div>
  )
}
