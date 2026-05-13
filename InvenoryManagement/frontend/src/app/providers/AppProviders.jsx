import { AuthProvider } from './AuthProvider.jsx'

export function AppProviders({ children }) {
  return <AuthProvider>{children}</AuthProvider>
}