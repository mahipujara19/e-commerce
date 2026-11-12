import { useEffect, useMemo } from 'react'
import { useSelector } from 'react-redux'
import { ThemeProvider } from '@mui/material/styles'
import App from './App.jsx'
import { buildTheme } from './theme.js'

function ThemedApp() {
  const mode = useSelector((state) => state.ui.theme)
  const theme = useMemo(() => buildTheme(mode), [mode])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', mode === 'dark')
  }, [mode])

  return (
    <ThemeProvider theme={theme}>
      <App />
    </ThemeProvider>
  )
}

export default ThemedApp
