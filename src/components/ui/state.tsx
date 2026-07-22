export function LoadingState({ label = '불러오는 중...' }: { label?: string }) {
  return <div className="py-12 text-center text-sm text-slate-500">{label}</div>
}

export function EmptyState({ label }: { label: string }) {
  return <div className="py-12 text-center text-sm text-slate-500">{label}</div>
}

export function ErrorState({ message }: { message: string }) {
  return <div className="py-12 text-center text-sm text-red-600">{message}</div>
}
