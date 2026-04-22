import type { PropsWithChildren } from 'react'

export function Dialog({ children, open }: PropsWithChildren<{ open: boolean }>) {
  if (!open) return null
  return <div className="fixed inset-0 flex items-center justify-center bg-black/40 p-4">{children}</div>
}

export function DialogContent({ children }: PropsWithChildren) {
  return <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">{children}</div>
}
