import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { SearchIcon } from '@/components/ui/icons'

export function SearchBar() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [value, setValue] = useState(searchParams.get('q') ?? '')

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (value.trim().length === 0) return
    navigate(`/search?q=${encodeURIComponent(value.trim())}`)
  }

  return (
    <form onSubmit={onSubmit} className="w-full max-w-md">
      <div className="flex items-center gap-2 rounded-full border border-slate-300 bg-slate-50 px-4 py-2 focus-within:border-brand-500 focus-within:bg-white dark:border-slate-600 dark:bg-slate-800 dark:focus-within:bg-slate-800">
        <SearchIcon size={16} className="shrink-0 text-slate-400 dark:text-slate-500" />
        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="드라이브에서 검색"
          className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
        />
      </div>
    </form>
  )
}
