import { create } from 'zustand'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastItem {
  id: number
  type: ToastType
  title: string
  description?: string
}

interface ToastState {
  toasts: ToastItem[]
  push: (type: ToastType, title: string, description?: string) => void
  remove: (id: number) => void
}

let nextId = 1

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (type, title, description) => {
    const id = nextId++
    set((state) => ({ toasts: [...state.toasts.slice(-4), { id, type, title, description }] }))
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((item) => item.id !== id) }))
    }, 4500)
  },
  remove: (id) => set((state) => ({ toasts: state.toasts.filter((item) => item.id !== id) })),
}))

export const toast = {
  success: (title: string, description?: string) => useToastStore.getState().push('success', title, description),
  error: (title: string, description?: string) => useToastStore.getState().push('error', title, description),
  warning: (title: string, description?: string) => useToastStore.getState().push('warning', title, description),
  info: (title: string, description?: string) => useToastStore.getState().push('info', title, description),
}
