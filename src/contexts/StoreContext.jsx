import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

const StoreContext = createContext({});
const STORAGE_KEY = '@pizza_store';

export const StoreProvider = ({ children }) => {
    const [stores, setStores] = useState([]);
    const [selectedStore, setSelectedStoreState] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);
    const hydrated = useRef(false);

    const loadStores = useCallback(async () => {
        setLoading(true);
        setLoadError(null);
        try {
            // Hard timeout: if this call ever hangs (a cold-start race with the auth
            // client, a dead connection, anything), don't let the store picker spin
            // forever — same Promise.race pattern DeliveryZoneCheckScreen already uses
            // for its own GPS call. Without this, a single stuck request meant the
            // screen never recovered short of force-quitting the app.
            const FETCH_TIMEOUT = 10000;
            const fetchPromise = supabase
                .from('stores')
                .select('*')
                .eq('is_active', true)
                .order('display_order', { ascending: true });
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('stores_fetch_timeout')), FETCH_TIMEOUT)
            );
            const { data } = await Promise.race([fetchPromise, timeoutPromise]);

            const list = data || [];
            setStores(list);

            const saved = await AsyncStorage.getItem(STORAGE_KEY);
            if (saved) {
                const { id } = JSON.parse(saved);
                const match = list.find(s => s.id === id);
                if (match) setSelectedStoreState(match);
            }
        } catch (err) {
            // Timed out, offline, or a real Supabase error — surface the actual message
            // (rather than swallowing it) so the empty state can show what really went
            // wrong instead of just "something's wrong, retry" with no information.
            setLoadError(err?.message || String(err));
        } finally {
            // Always resolves, even on timeout — the screen must never spin forever.
            setLoading(false);
        }
    }, []);

    // Runs exactly once on app boot: loads the active store list, then restores
    // whichever store the customer picked last time (if it's still active).
    useEffect(() => {
        if (hydrated.current) return;
        hydrated.current = true;
        loadStores();
    }, [loadStores]);

    const setSelectedStore = useCallback(async (store) => {
        setSelectedStoreState(store);
        try {
            if (store) await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ id: store.id }));
            else await AsyncStorage.removeItem(STORAGE_KEY);
        } catch {
            // Non-fatal — the pick still works for this session even if it can't persist.
        }
    }, []);

    return (
        <StoreContext.Provider value={{ stores, selectedStore, setSelectedStore, loading, loadError, refetchStores: loadStores }}>
            {children}
        </StoreContext.Provider>
    );
};

export const useStore = () => useContext(StoreContext);
