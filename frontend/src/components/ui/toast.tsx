import { createContext, useContext, useState, type PropsWithChildren } from 'react'

type ToastContextValue = {
  message: string | null
  show: (message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: PropsWithChildren) {
  const [message, setMessage] = useState<string | null>(null)

  const show = (value: string) => {
    setMessage(value)
    window.setTimeout(() => setMessage(null), 2500)
  }

  return (
    <ToastContext.Provider value={{ message, show }}>
      {children}
      {message ? <div className="fixed bottom-4 right-4 rounded-md bg-slate-900 px-4 py-2 text-white">{message}</div> : null}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used inside ToastProvider')
  }
  return context
}
