import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { copy, getStoredLang, setStoredLang, type Copy, type Lang } from '../lib/i18n'

type AppContextValue = {
  lang: Lang
  t: Copy
  setLang: (lang: Lang) => void
  toggleLang: () => void
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => getStoredLang())

  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    setStoredLang(l)
  }, [])

  const toggleLang = useCallback(() => {
    setLang(lang === 'en' ? 'zh' : 'en')
  }, [lang, setLang])

  const value = useMemo(
    () => ({
      lang,
      t: copy[lang],
      setLang,
      toggleLang,
    }),
    [lang, setLang, toggleLang],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp outside provider')
  return ctx
}
