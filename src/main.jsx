import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { createTheme, StyledEngineProvider, ThemeProvider } from '@mui/material/styles'
import './index.css'
import App from './App.jsx'
import store from './toolkit/store.js'

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#171412', contrastText: '#faf7f2' },
    secondary: { main: '#8c6b38', contrastText: '#ffffff' },
    background: { default: '#faf7f2', paper: '#ffffff' },
    text: { primary: '#171412', secondary: '#6f665d' },
    divider: '#e7e0d5',
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
          backgroundColor: '#ffffff',
          '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e2d9cc' },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#b9ad9c' },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#171412', borderWidth: 1 },
        },
        input: { paddingTop: 15, paddingBottom: 15 },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: { color: '#8a8178', '&.Mui-focused': { color: '#171412' } },
      },
    },
    MuiRating: { styleOverrides: { root: { color: '#8c6b38' } } },
    MuiAlert: { styleOverrides: { root: { borderRadius: 2 } } },
    MuiBadge: { styleOverrides: { badge: { fontSize: 10, fontWeight: 700 } } },
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <StyledEngineProvider injectFirst>
        <ThemeProvider theme={theme}>
          <App />
        </ThemeProvider>
      </StyledEngineProvider>
    </Provider>
  </StrictMode>,
)
