import {
  createContext,
  ReactNode,
  useContext,
  useEffect, useMemo,
  useState,
} from 'react'

const GlobalContext = createContext<{
  token: string | null
  setToken: (token: string | null) => void
}>({
  token: null,
  setToken: (_) => {},
})

export function GlobalContextProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    setToken(JSON.parse(localStorage.getItem('token') ?? JSON.stringify(null)))
  }, [])

  const sharedState = useMemo(() => ({
    token,
    setToken,
  }), [token, setToken])

  return (
    <GlobalContext.Provider value={sharedState}>
      {children}
    </GlobalContext.Provider>
  )
}

export function useGlobalContext() {
  return useContext(GlobalContext)
}