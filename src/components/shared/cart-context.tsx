"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { CartItem } from "@/types";

interface CartContextValue {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity"> & { quantity?: number }) => void;
  removeItem: (inventoryId: string) => void;
  updateQuantity: (inventoryId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = useCallback(
    (item: Omit<CartItem, "quantity"> & { quantity?: number }) => {
      setItems((prev) => {
        const existing = prev.find((i) => i.inventoryId === item.inventoryId);
        if (existing) {
          const newQty = Math.min(
            existing.quantity + (item.quantity ?? 1),
            item.maxQuantity
          );
          return prev.map((i) =>
            i.inventoryId === item.inventoryId ? { ...i, quantity: newQty } : i
          );
        }
        return [
          ...prev,
          { ...item, quantity: Math.min(item.quantity ?? 1, item.maxQuantity) },
        ];
      });
    },
    []
  );

  const removeItem = useCallback((inventoryId: string) => {
    setItems((prev) => prev.filter((i) => i.inventoryId !== inventoryId));
  }, []);

  const updateQuantity = useCallback((inventoryId: string, quantity: number) => {
    setItems((prev) =>
      prev.map((i) =>
        i.inventoryId === inventoryId
          ? { ...i, quantity: Math.max(1, Math.min(quantity, i.maxQuantity)) }
          : i
      )
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateQuantity, clearCart, totalItems }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
