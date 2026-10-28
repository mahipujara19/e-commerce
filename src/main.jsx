import { StrictMode, useEffect, useMemo } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider, useSelector } from 'react-redux'
import { createTheme, StyledEngineProvider, ThemeProvider } from '@mui/material/styles'
import './index.css'
import App from './App.jsx'
import store from './toolkit/store.js'

const PALETTES = {
  light: {
    ink: '#171412',
    ivory: '#faf7f2',
    paper: '#ffffff',
    stone: '#6f665d',
    line: '#e7e0d5',
    inputBorder: '#e2d9cc',
    inputHover: '#b9ad9c',
    label: '#8a8178',
    gold: '#8c6b38',
  },
  dark: {
    ink: '#f0eae0',
    ivory: '#12100e',
    paper: '#1a1714',
    stone: '#a69c90',
    line: '#342f29',
    inputBorder: '#3a342d',
    inputHover: '#5a5147',
    label: '#8f857a',
    gold: '#c9a96e',
  },
}

const buildTheme = (mode) => {
  const c = PALETTES[mode]
  return createTheme({
    palette: {
      mode,
      primary: { main: c.ink, contrastText: c.ivory },
      secondary: { main: c.gold, contrastText: c.ivory },
      background: { default: c.ivory, paper: c.paper },
      text: { primary: c.ink, secondary: c.stone },
      divider: c.line,
    },
    typography: {
      fontFamily: '"DM Sans", system-ui, sans-serif',
      button: { textTransform: 'none', fontWeight: 600 },
    },
    shape: { borderRadius: 2 },
    components: {
      MuiButton: { defaultProps: { disableElevation: true } },
      MuiTextField: { defaultProps: { fullWidth: true } },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            backgroundColor: c.paper,
            '& .MuiOutlinedInput-notchedOutline': { borderColor: c.inputBorder },
            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: c.inputHover },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: c.ink, borderWidth: 1 },
          },
          input: { paddingTop: 15, paddingBottom: 15 },
        },
      },
      MuiInputLabel: {
        styleOverrides: {
          root: { color: c.label, '&.Mui-focused': { color: c.ink } },
        },
      },
      MuiRating: { styleOverrides: { root: { color: c.gold } } },
      MuiAlert: { styleOverrides: { root: { borderRadius: 2 } } },
      MuiBadge: { styleOverrides: { badge: { fontSize: 10, fontWeight: 700 } } },
    },
  })
}

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

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <StyledEngineProvider injectFirst>
        <ThemedApp />
      </StyledEngineProvider>
    </Provider>
  </StrictMode>,
)
