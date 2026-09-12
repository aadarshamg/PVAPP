import React, { createContext, useContext, useState } from 'react';
import { Alert } from 'react-native';

const CartContext = createContext({});

export const CartProvider = ({ children }) => {
    const [cartItems, setCartItems] = useState([]);
    const [couponRule, setCouponRule] = useState(null); // { type: 'percentage'|'flat', value, minOrder }
    const [activeCoupon, setActiveCoupon] = useState(null);

    // Add To Cart
    const addToCart = (product, sizeObj, crustObj, toppingsList, quantity, totalItemPrice, cheese = null, dips = [], instructions = '', addons = [], base = null) => {
        const configId = `${product.id}-${sizeObj.key}-${crustObj?.id || 'base'}-${toppingsList.map(t => t.id).sort().join(',')}-${cheese?.id || ''}-${dips.map(d => d.id).sort().join(',')}-${addons.map(a => a.id).sort().join(',')}-${base?.id || ''}`;

        setCartItems(prev => {
            const existingIndex = prev.findIndex(item => item.configId === configId);

            if (existingIndex >= 0) {
                const newItems = [...prev];
                newItems[existingIndex].qty += quantity;
                return newItems;
            } else {
                return [...prev, {
                    cartItemId: Math.random().toString(36).substr(2, 9),
                    configId,
                    product,
                    size: sizeObj,
                    crust: crustObj,
                    toppings: toppingsList,
                    cheese,
                    dips,
                    addons,
                    base,
                    instructions,
                    qty: quantity,
                    unitPrice: totalItemPrice / quantity,
                }];
            }
        });
    };

    // Add a standalone Feast combo as its own cart line item
    const addFeastCombo = (combo) => {
        setCartItems(prev => {
            const configId = `feast-${combo.id}`;
            const existingIndex = prev.findIndex(item => item.configId === configId);

            if (existingIndex >= 0) {
                const newItems = [...prev];
                newItems[existingIndex].qty += 1;
                return newItems;
            } else {
                return [...prev, {
                    cartItemId: Math.random().toString(36).substr(2, 9),
                    configId,
                    isFeastCombo: true,
                    name: combo.name,
                    unitPrice: Number(combo.discounted_price),
                    qty: 1,
                }];
            }
        });
    };

    // Add pre-built items directly (used for Reorder) — bypasses configId merging
    const addRawItems = (items) => {
        setCartItems(prev => [
            ...prev,
            ...items.map(item => ({
                cartItemId: Math.random().toString(36).substr(2, 9),
                ...item,
            })),
        ]);
    };

    // Update Quantity
    const updateQuantity = (cartItemId, delta) => {
        setCartItems(prev => {
            return prev.map(item => {
                if (item.cartItemId === cartItemId) {
                    const newQty = item.qty + delta;
                    return newQty > 0 ? { ...item, qty: newQty } : item;
                }
                return item;
            });
        });
    };

    // Remove from Cart
    const removeFromCart = (cartItemId) => {
        setCartItems(prev => prev.filter(item => item.cartItemId !== cartItemId));
    };

    // Apply Coupon — call this after external validation.
    // Stores the coupon's rule (not a precomputed amount) so the discount
    // is always recalculated against the current subtotal, even if items
    // are added/removed from the cart after the coupon is applied.
    const applyCoupon = (code, rule) => {
        setActiveCoupon(code.toUpperCase());
        setCouponRule(rule);
    };

    const removeCoupon = () => {
        setActiveCoupon(null);
        setCouponRule(null);
    };

    const clearCart = () => {
        setCartItems([]);
        setActiveCoupon(null);
        setCouponRule(null);
    };

    // Derived State Computations
    const cartCount = cartItems.reduce((acc, item) => acc + item.qty, 0);
    const subtotal = cartItems.reduce((acc, item) => acc + (item.unitPrice * item.qty), 0);

    // Discount is derived live from the current subtotal — never frozen at
    // whatever the cart totaled when the coupon was applied. If the cart
    // has since dropped below the coupon's minimum order amount, the
    // discount drops to 0 rather than staying stuck at a stale value.
    let actualDiscount = 0;
    if (couponRule && (!couponRule.minOrder || subtotal >= couponRule.minOrder)) {
        const rawDiscount = couponRule.type === 'percentage'
            ? Math.round(subtotal * couponRule.value / 100)
            : couponRule.value;
        actualDiscount = Math.min(rawDiscount, subtotal);
    }
    
    const gst = Math.round((subtotal - actualDiscount) * 0.05); // 5% GST on discounted amount
    const total = subtotal - actualDiscount + gst;

    return (
        <CartContext.Provider value={{
            cartItems,
            cartCount,
            subtotal,
            gst,
            discount: actualDiscount,
            total,
            activeCoupon,
            addToCart,
            addFeastCombo,
            addRawItems,
            updateQuantity,
            removeFromCart,
            applyCoupon,
            removeCoupon,
            clearCart
        }}>
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => useContext(CartContext);
