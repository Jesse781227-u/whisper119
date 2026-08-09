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
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth"
import { firebaseAuth, firebaseConfigured, firebaseDb, googleProvider } from "@/lib/firebase"
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore"

type AuthContextValue = {
  user: User | null
  loading: boolean
  configured: boolean
  isAdmin: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  refreshUser: () => Promise<void>
  signOutUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(firebaseConfigured)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    if (!firebaseAuth) {
      setLoading(false)
      return
    }

    return onAuthStateChanged(firebaseAuth, async (nextUser) => {
      setUser(nextUser)
      setLoading(false)

      if (!nextUser || !firebaseDb) {
        setIsAdmin(false)
        return
      }

      const userRef = doc(firebaseDb, "users", nextUser.uid)
      const adminEmail = nextUser.email
      const adminByEmailRef = adminEmail ? doc(firebaseDb, "admins", adminEmail) : null

      try {
        const [userSnapshot, adminByEmailSnapshot] = await Promise.all([
          getDoc(userRef),
          adminByEmailRef ? getDoc(adminByEmailRef) : Promise.resolve(null),
        ])

        const userData = userSnapshot.data()
        const isAdminByEmail = adminByEmailSnapshot?.exists() ?? false
        const isAdminByFlag = Boolean(userData?.isAdmin)

        setIsAdmin(isAdminByEmail || isAdminByFlag)
      } catch (error) {
        console.error("Could not resolve admin status", error)
        setIsAdmin(false)
      }

      try {
        await setDoc(userRef, {
          email: nextUser.email,
          displayName: nextUser.displayName,
          photoURL: nextUser.photoURL,
          createdAt: serverTimestamp(),
          lastSeenAt: serverTimestamp(),
        }, { merge: true })
      } catch (error) {
        console.error("Could not update user profile", error)
      }
    })
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    configured: firebaseConfigured,
    isAdmin,
    signIn: async (email, password) => {
      if (!firebaseAuth) throw new Error("Firebase authentication is not configured yet.")
      await signInWithEmailAndPassword(firebaseAuth, email, password)
    },
    signUp: async (email, password) => {
      if (!firebaseAuth) throw new Error("Firebase authentication is not configured yet.")
      const credential = await createUserWithEmailAndPassword(firebaseAuth, email, password)
      await sendEmailVerification(credential.user)
    },
    signInWithGoogle: async () => {
      if (!firebaseAuth || !googleProvider) throw new Error("Firebase authentication is not configured yet.")
      await signInWithPopup(firebaseAuth, googleProvider)
    },
    resetPassword: async (email) => {
      if (!firebaseAuth) throw new Error("Firebase authentication is not configured.")
      await sendPasswordResetEmail(firebaseAuth, email)
    },
    refreshUser: async () => {
      if (firebaseAuth?.currentUser) await reload(firebaseAuth.currentUser)
      setUser(firebaseAuth?.currentUser ?? null)
    },
    signOutUser: async () => {
      if (firebaseAuth) await signOut(firebaseAuth)
      setIsAdmin(false)
    },
  }), [loading, user, isAdmin])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used within AuthProvider")
  return context
}