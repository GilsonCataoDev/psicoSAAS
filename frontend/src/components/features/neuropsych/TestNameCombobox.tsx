import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { NEUROPSYCH_TEST_CATALOG } from '@/lib/neuropsychTestCatalog'

interface TestNameComboboxProps {
  id?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export default function TestNameCombobox({ id, value, onChange, placeholder }: TestNameComboboxProps) {
  const [open, setOpen] = useState(false)
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function updateRect() {
    const bounds = inputRef.current?.getBoundingClientRect()
    if (bounds) setRect({ top: bounds.bottom, left: bounds.left, width: bounds.width })
  }

  useEffect(() => {
    if (!open) return
    updateRect()
    const handleReposition = () => updateRect()
    window.addEventListener('scroll', handleReposition, true)
    window.addEventListener('resize', handleReposition)
    return () => {
      window.removeEventListener('scroll', handleReposition, true)
      window.removeEventListener('resize', handleReposition)
    }
  }, [open])

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node
      if (containerRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [])

  const query = value.trim().toLowerCase()
  const suggestions = query
    ? NEUROPSYCH_TEST_CATALOG.filter(testName => testName.toLowerCase().includes(query))
    : NEUROPSYCH_TEST_CATALOG
  const showSuggestions = open && rect && suggestions.length > 0

  return (
    <div ref={containerRef} className="relative">
      <input
        id={id}
        ref={inputRef}
        value={value}
        onChange={event => onChange(event.target.value)}
        onFocus={() => setOpen(true)}
        className="input-field"
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={Boolean(showSuggestions)}
        aria-autocomplete="list"
      />
      {showSuggestions && rect && createPortal(
        <ul
          style={{ position: 'fixed', top: rect.top + 4, left: rect.left, width: rect.width }}
          className="z-[100] max-h-64 overflow-y-auto rounded-xl border border-neutral-200 bg-white py-1 shadow-card dark:border-white/10 dark:bg-cognia-panel"
        >
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
        </ul>,
        document.body,
      )}
    </div>
  )
}
