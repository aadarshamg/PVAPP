import React, { createContext, useContext, useState } from 'react';
import { Alert } from 'react-native';

const CartContext = createContext({});

export const CartProvider = ({ children }) => {
    const [cartItems, setCartItems] = useState([]);
    const [couponDiscount, setCouponDiscount] = useState(0);
    const [activeCoupon, setActiveCoupon] = useState(null);

    // Add To Cart
    const addToCart = (product, sizeObj, crustObj, toppingsList, quantity, totalItemPrice) => {
        // Generate a unique ID for this specific configuration so we can group identical items
        const configId = `${product.id}-${sizeObj.key}-${crustObj?.id || 'base'}-${toppingsList.map(t => t.id).sort().join(',')}`;
        
        setCartItems(prev => {
            const existingIndex = prev.findIndex(item => item.configId === configId);
            
            if (existingIndex >= 0) {
                // Item exists, just update quantity
                const newItems = [...prev];
                newItems[existingIndex].qty += quantity;
                return newItems;
            } else {
                // Add new configured item
                return [...prev, {
                    cartItemId: Math.random().toString(36).substr(2, 9), // Unique ID for UI lists
                    configId,
                    product,
                    size: sizeObj,
                    crust: crustObj,
                    toppings: toppingsList,
                    qty: quantity,
                    unitPrice: totalItemPrice / quantity, // Base price for a single unit of this config
                }];
            }
        });
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

    // Apply Coupon — call this after external validation
    const applyCoupon = (code, discountAmount) => {
        setActiveCoupon(code.toUpperCase());
        setCouponDiscount(discountAmount);
    };

    const removeCoupon = () => {
        setActiveCoupon(null);
        setCouponDiscount(0);
    };

    const clearCart = () => {
        setCartItems([]);
        setActiveCoupon(null);
        setCouponDiscount(0);
    };

    // Derived State Computations
    const cartCount = cartItems.reduce((acc, item) => acc + item.qty, 0);
    const subtotal = cartItems.reduce((acc, item) => acc + (item.unitPrice * item.qty), 0);
    
    // Ensure discount isn't larger than subtotal
    const actualDiscount = Math.min(couponDiscount, subtotal);
    
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
