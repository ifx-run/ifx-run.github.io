import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { copy, getStoredLang, setStoredLang, type Copy, type Lang } from '../lib/i18n'
import { getStoredRpcUrl, setStoredRpcUrl } from '../lib/solana/rpc'

type AppContextValue = {
  lang: Lang
  t: Copy
  setLang: (lang: Lang) => void
  toggleLang: () => void
  rpcUrl: string
  setRpcUrl: (url: string) => void
  resetRpcUrl: () => void
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => getStoredLang())
  const [rpcUrl, setRpcUrlState] = useState(() => getStoredRpcUrl())

  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    setStoredLang(l)
  }, [])

  const toggleLang = useCallback(() => {
    setLang(lang === 'en' ? 'zh' : 'en')
  }, [lang, setLang])

  const setRpcUrl = useCallback((url: string) => {
    setStoredRpcUrl(url)
    setRpcUrlState(getStoredRpcUrl())
  }, [])

  const resetRpcUrl = useCallback(() => {
    setStoredRpcUrl('')
    setRpcUrlState(getStoredRpcUrl())
  }, [])

  const value = useMemo(
    () => ({
      lang,
      t: copy[lang],
      setLang,
      toggleLang,
      rpcUrl,
      setRpcUrl,
      resetRpcUrl,
    }),
    [lang, setLang, toggleLang, rpcUrl, setRpcUrl, resetRpcUrl],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp outside provider')
  return ctx
}
