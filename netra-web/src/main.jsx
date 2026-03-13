import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/react'
import './index.css'
import App from './App.jsx'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY || PUBLISHABLE_KEY.includes('REPLACE_WITH')) {
  throw new Error(
    '[N.E.T.R.A.] Missing VITE_CLERK_PUBLISHABLE_KEY — open netra-web/.env.local and paste your key from https://dashboard.clerk.com'
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ClerkProvider
      publishableKey={PUBLISHABLE_KEY}
      localization={{
        signIn: {
          start: {
            title: 'N.E.T.R.A. Access',
            subtitle: 'Sign in to the command dashboard',
          },
        },
        signUp: {
          start: {
            title: 'Create N.E.T.R.A. Account',
            subtitle: 'Join the road intelligence network',
          },
        },
      }}
      appearance={{
        variables: {
          colorPrimary: '#1e3a8a',
          colorBackground: '#ffffff',
          colorText: '#1e293b',
          colorInputBackground: '#faf8f5',
          colorInputText: '#1e293b',
          colorDanger: '#dc2626',
          borderRadius: '0.75rem',
          fontFamily: '"Inter", system-ui, sans-serif',
        },
        elements: {
          card: {
            background: 'rgba(255,255,255,0.72)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.5)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
            borderRadius: '1rem',
          },
          headerTitle: {
            color: '#1e3a8a',
            fontFamily: '"Inter", system-ui, sans-serif',
            fontWeight: '700',
            fontSize: '1.4rem',
          },
          headerSubtitle: { color: '#64748b' },
          formButtonPrimary: {
            background: '#1e3a8a',
            color: '#ffffff',
            fontWeight: '700',
            boxShadow: '0 2px 8px rgba(109,40,217,0.25)',
          },
          socialButtonsBlockButton: {
            border: '1px solid #e2e8f0',
            background: 'transparent',
            color: '#1e293b',
          },
          socialButtonsBlockButtonText: { color: '#1e293b', fontWeight: '500' },
          formFieldInput: {
            background: '#faf8f5',
            border: '1px solid rgba(255,255,255,0.5)',
            color: '#1e293b',
          },
          formFieldLabel: { color: '#475569' },
          footerActionLink: { color: '#1e3a8a', fontWeight: '600' },
          dividerLine: { background: '#e2e8f0' },
          dividerText: { color: '#64748b' },
          identityPreviewText: { color: '#1e293b' },
          formResendCodeLink: { color: '#1e3a8a' },
        },
      }}
    >
      <App />
    </ClerkProvider>
  </StrictMode>,
)
