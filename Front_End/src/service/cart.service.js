const CART_KEY = "bs_cart_v1";

export const getCart = () => {
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : { items: [] };
  } catch (err) {
    console.error("Error reading cart:", err);
    return { items: [] };
  }
};

export const saveCart = (cart) => {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    // Dispatch CustomEvent khi giỏ hàng thay đổi
    window.dispatchEvent(new CustomEvent("cartUpdated", { detail: cart }));
  } catch (err) {
    console.error("Error saving cart:", err);
  }
};

export const addItem = (product, qty = 1) => {
  const cart = getCart();
  const existing = cart.items.find((i) => i._id === product._id);
  if (existing) {
    existing.qty += qty;
  } else {
    cart.items.push({ ...product, qty });
  }
  saveCart(cart);
  // Không cần dispatch ở đây vì saveCart đã dispatch
  return cart;
};

export const clearCart = () => {
  saveCart({ items: [] });
  // Không cần dispatch ở đây vì saveCart đã dispatch
};

export default {
  getCart,
  saveCart,
  addItem,
  clearCart,
};
