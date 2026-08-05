import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth"
import { firebaseAuth, firebaseConfigured, googleProvider } from "@/lib/firebase"

type AuthContextValue = {
  user: User | null
  loading: boolean
  configured: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signOutUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(firebaseConfigured)

  useEffect(() => {
    if (!firebaseAuth) {
      setLoading(false)
      return
    }
    return onAuthStateChanged(firebaseAuth, (nextUser) => {
      setUser(nextUser)
      setLoading(false)
    })
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    configured: firebaseConfigured,
    signIn: async (email, password) => {
      if (!firebaseAuth) throw new Error("Firebase authentication is not configured yet.")
      await signInWithEmailAndPassword(firebaseAuth, email, password)
    },
    signUp: async (email, password) => {
      if (!firebaseAuth) throw new Error("Firebase authentication is not configured yet.")
      await createUserWithEmailAndPassword(firebaseAuth, email, password)
    },
    signInWithGoogle: async () => {
      if (!firebaseAuth || !googleProvider) throw new Error("Firebase authentication is not configured yet.")
      await signInWithPopup(firebaseAuth, googleProvider)
    },
    signOutUser: async () => {
      if (firebaseAuth) await signOut(firebaseAuth)
    },
  }), [loading, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used within AuthProvider")
  return context
}