"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

// The cart lives in this browser (localStorage). Prices here are for display
// only — the server re-reads every price and stock level when ordering.

export interface CartItem {
  id: string;        // product id
  slug: string;
  name: string;
  code: string;
  price: number;
  image: string | null;
  stock: number;     // max quantity at the time it was added
  qty: number;
}

interface Cart {
  items: CartItem[];
  count: number;
  subtotal: number;
  ready: boolean;    // false until localStorage has been read
  add: (item: Omit<CartItem, "qty">, qty: number) => void;
  setQty: (id: string, qty: number) => void;
  remove: (id: string) => void;
  clear: () => void;
  open: () => void;
  close: () => void;
  isOpen: boolean;
}

const KEY = "oboyob:cart";
const MAX_QTY = 20;
const CartContext = createContext<Cart | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);
  const [isOpen, setOpen] = useState(false);

  useEffect(() => {
    try { setItems(JSON.parse(localStorage.getItem(KEY) ?? "[]")); } catch {}
    setReady(true);
    // Another tab changed the cart.
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) try { setItems(JSON.parse(e.newValue ?? "[]")); } catch {}
    };
    addEventListener("storage", onStorage);
    return () => removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (ready) try { localStorage.setItem(KEY, JSON.stringify(items)); } catch {}
  }, [items, ready]);

  const cap = (qty: number, stock: number) => Math.max(1, Math.min(MAX_QTY, stock, Math.floor(qty) || 1));

  const add = useCallback((item: Omit<CartItem, "qty">, qty: number) => {
    setItems((list) => {
      const found = list.find((i) => i.id === item.id);
      if (found) return list.map((i) => (i.id === item.id ? { ...i, ...item, qty: cap(i.qty + qty, item.stock) } : i));
      return [...list, { ...item, qty: cap(qty, item.stock) }];
    });
  }, []);
  const setQty = useCallback((id: string, qty: number) =>
    setItems((list) => list.map((i) => (i.id === id ? { ...i, qty: cap(qty, i.stock) } : i))), []);
  const remove = useCallback((id: string) => setItems((list) => list.filter((i) => i.id !== id)), []);
  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<Cart>(() => ({
    items, ready, isOpen, add, setQty, remove, clear,
    count: items.reduce((n, i) => n + i.qty, 0),
    subtotal: items.reduce((n, i) => n + i.price * i.qty, 0),
    open: () => setOpen(true),
    close: () => setOpen(false),
  }), [items, ready, isOpen, add, setQty, remove, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): Cart {
  const c = useContext(CartContext);
  if (!c) throw new Error("useCart must be used inside <CartProvider>");
  return c;
}
