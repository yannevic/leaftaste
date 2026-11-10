import { initializeApp } from 'firebase/app'
import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
} from 'firebase/app-check'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

// import.meta.env lê as variáveis do .env.local
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

// Liga o app ao nosso projeto no Firebase
export const app = initializeApp(firebaseConfig)

// App Check: a "prova" de que o pedido vem do Leaftaste de verdade.
// Precisa ser iniciado ANTES de usar qualquer outro serviço do Firebase.
if (import.meta.env.DEV) {
  // No seu PC o reCAPTCHA não vale (localhost). O Firebase imprime um
  // token de depuração no Console (F12), que você cadastra uma vez.
  const janela = self as unknown as {
    FIREBASE_APPCHECK_DEBUG_TOKEN?: boolean | string
  }
  janela.FIREBASE_APPCHECK_DEBUG_TOKEN = true
}

export const appCheck = initializeAppCheck(app, {
  provider: new ReCaptchaEnterpriseProvider(
    import.meta.env.VITE_RECAPTCHA_SITE_KEY,
  ),
  isTokenAutoRefreshEnabled: true, // renova a prova sozinho
})

// Login (Authentication) e banco de dados (Firestore)
export const auth = getAuth(app)
export const db = getFirestore(app)
