import { useEffect } from 'react'
import "./styles/design-system.css";
import "./styles/auth-form.css";
import './App.css'
import AppRouter from './router/AppRouter'
import { AuthProvider } from './context/AuthContext'
import { AlertProvider } from './context/AlertContext'
import { initializeTokenManager, cleanupTokenManager } from './utils/tokenManager'
import { useLanguageDirection } from './i18n/useLanguageDirection'
import { useTheme } from './hooks/useTheme'


function App() {
  useLanguageDirection();
  // Apply the saved light/dark theme on every page — the Hub and Platform
  // layouts don't render TopNavigation, whose ThemeToggle used to do this.
  useTheme();
  
  useEffect(() => {
    // Initialize token manager when app loads
    initializeTokenManager();

    // Cleanup on unmount
    return () => {
      cleanupTokenManager();
    };
  }, []);

  return (
    <AlertProvider>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </AlertProvider>
  );
}

export default App
