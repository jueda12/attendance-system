import type { PropsWithChildren } from 'react'

export function Field({ children }: PropsWithChildren) {
  return <div className="space-y-2">{children}</div>
}

export function FieldLabel({ htmlFor, children }: PropsWithChildren<{ htmlFor: string }>) {
  return (
    <label className="text-sm font-medium text-slate-700" htmlFor={htmlFor}>
      {children}
    </label>
  )
}

export function FieldError({ children }: PropsWithChildren) {
  if (!children) return null
  return <p className="text-sm text-red-600">{children}</p>
}
