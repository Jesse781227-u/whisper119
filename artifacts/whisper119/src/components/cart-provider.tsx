import * as React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { Book } from "@workspace/api-client-react"

export type CartItem = {
  id: string
  title: string
  author: string
  price: number
  currency: string
  format: string
  coverUrl: string | null
}

type CartContextType = {
  items: CartItem[]
  addItem: (book: Book) => void
  removeItem: (id: string) => void
  clearCart: () => void
  total: number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem("whisper119-cart")
      return saved ? JSON.parse(saved) : []
    } catch (e) {
      return []
    }
  })

  useEffect(() => {
    localStorage.setItem("whisper119-cart", JSON.stringify(items))
  }, [items])

  const addItem = (book: Book) => {
    setItems((current) => {
      if (current.find((item) => item.id === book.id)) {
        return current
      }
      return [
        ...current,
        {
          id: book.id,
          title: book.title,
          author: book.author,
          price: book.price,
          currency: book.currency,
          format: book.format,
          coverUrl: book.coverUrl,
        },
      ]
    })
  }

  const removeItem = (id: string) => {
    setItems((current) => current.filter((item) => item.id !== id))
  }

  const clearCart = () => {
    setItems([])
  }

  const total = items.reduce((sum, item) => sum + item.price, 0)

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, clearCart, total }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider")
  }
  return context
}
