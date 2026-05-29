import { createContext, useContext, useState } from 'react';

const CartContext = createContext(null);

function persist(items) {
  localStorage.setItem('cart', JSON.stringify(items));
}

function load() {
  try {
    return JSON.parse(localStorage.getItem('cart')) || [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState(load);

  function addToCart(product) {
    setCartItems((prev) => {
      const existing = prev.find((i) => i._id === product._id);
      let next;
      if (existing) {
        next = prev.map((i) =>
          i._id === product._id ? { ...i, quantity: i.quantity + 1 } : i
        );
      } else {
        next = [...prev, { ...product, quantity: 1 }];
      }
      persist(next);
      return next;
    });
  }

  function removeFromCart(productId) {
    setCartItems((prev) => {
      const next = prev.filter((i) => i._id !== productId);
      persist(next);
      return next;
    });
  }

  function updateQuantity(productId, qty) {
    if (qty < 1) return;
    setCartItems((prev) => {
      const next = prev.map((i) => (i._id === productId ? { ...i, quantity: qty } : i));
      persist(next);
      return next;
    });
  }

  function clearCart() {
    setCartItems([]);
    localStorage.removeItem('cart');
  }

  const cartCount = cartItems.reduce((s, i) => s + i.quantity, 0);
  const cartSubtotal = parseFloat(
    cartItems.reduce((s, i) => s + i.currentPrice * i.quantity, 0).toFixed(2)
  );

  return (
    <CartContext.Provider
      value={{ cartItems, addToCart, removeFromCart, updateQuantity, clearCart, cartCount, cartSubtotal }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
