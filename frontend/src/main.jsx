import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { StyledEngineProvider } from '@mui/material/styles'
import './index.css'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import ThemedApp from './ThemedApp.jsx'
import store from './toolkit/store.js'
import { installGlobalErrorHandlers } from './utils/monitoring.js'

installGlobalErrorHandlers()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <Provider store={store}>
        <StyledEngineProvider injectFirst>
          <ThemedApp />
        </StyledEngineProvider>
      </Provider>
    </ErrorBoundary>
  </StrictMode>,
)
