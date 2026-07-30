import { useEffect, useRef, useState } from 'react'
import { NEUROPSYCH_TEST_CATALOG } from '@/lib/neuropsychTestCatalog'

interface TestNameComboboxProps {
  id?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export default function TestNameCombobox({ id, value, onChange, placeholder }: TestNameComboboxProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const query = value.trim().toLowerCase()
  const suggestions = query
    ? NEUROPSYCH_TEST_CATALOG.filter(testName => testName.toLowerCase().includes(query))
    : NEUROPSYCH_TEST_CATALOG
  const showSuggestions = open && suggestions.length > 0

  return (
    <div ref={containerRef} className="relative">
      <input
        id={id}
        value={value}
        onChange={event => onChange(event.target.value)}
        onFocus={() => setOpen(true)}
        className="input-field"
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={showSuggestions}
        aria-autocomplete="list"
      />
      {showSuggestions && (
        <ul className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-neutral-200 bg-white py-1 shadow-card dark:border-white/10 dark:bg-cognia-panel">
          {suggestions.map(testName => (
            <li key={testName}>
              <button
                type="button"
                onClick={() => { onChange(testName); setOpen(false) }}
                className="block w-full px-3 py-2 text-left text-sm text-neutral-700 hover:bg-sage-50 hover:text-sage-900 dark:text-neutral-200 dark:hover:bg-sage-950/40 dark:hover:text-sage-100"
              >
                {testName}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
