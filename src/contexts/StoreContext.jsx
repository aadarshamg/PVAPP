import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { withTimeout } from '../utils/withTimeout';

const StoreContext = createContext({});
const STORAGE_KEY = '@pizza_store';
const STORAGE_TIMEOUT_MS = 5000; // plain device storage — should be near-instant

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

            // Reading the remembered store is best-effort and separate from the fetch
            // above: a hang or failure here shouldn't turn a successful store-list load
            // into an error state — it just means falling through to the picker/auto-skip.
            try {
                const saved = await withTimeout(
                    AsyncStorage.getItem(STORAGE_KEY),
                    STORAGE_TIMEOUT_MS,
                    'storage_get_timeout'
                );
                if (saved) {
                    const { id } = JSON.parse(saved);
                    const match = list.find(s => s.id === id);
                    if (match) setSelectedStoreState(match);
                }
            } catch {
                // Non-fatal — proceed without a remembered store.
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
            if (store) {
                await withTimeout(
                    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ id: store.id })),
                    STORAGE_TIMEOUT_MS,
                    'storage_set_timeout'
                );
            } else {
                await withTimeout(
                    AsyncStorage.removeItem(STORAGE_KEY),
                    STORAGE_TIMEOUT_MS,
                    'storage_remove_timeout'
                );
            }
        } catch {
            // Non-fatal — the pick still works for this session even if it can't persist.
            // Critically, this function must always resolve: StoreSelectScreen's
            // auto-skip effect does setSelectedStore(stores[0]).then(() => navigate(...)),
            // so an unbounded AsyncStorage hang here previously froze that navigation
            // forever with no error and no way to recover short of a force-quit.
        }
    }, []);

    return (
        <StoreContext.Provider value={{ stores, selectedStore, setSelectedStore, loading, loadError, refetchStores: loadStores }}>
            {children}
        </StoreContext.Provider>
    );
};

export const useStore = () => useContext(StoreContext);
