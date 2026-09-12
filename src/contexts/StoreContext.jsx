import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

const StoreContext = createContext({});
const STORAGE_KEY = '@pizza_store';

export const StoreProvider = ({ children }) => {
    const [stores, setStores] = useState([]);
    const [selectedStore, setSelectedStoreState] = useState(null);
    const [loading, setLoading] = useState(true);
    const hydrated = useRef(false);

    // Runs exactly once on app boot: loads the active store list, then restores
    // whichever store the customer picked last time (if it's still active).
    useEffect(() => {
        if (hydrated.current) return;
        hydrated.current = true;
        (async () => {
            try {
                const { data } = await supabase
                    .from('stores')
                    .select('*')
                    .eq('is_active', true)
                    .order('display_order', { ascending: true });
                const list = data || [];
                setStores(list);

                const saved = await AsyncStorage.getItem(STORAGE_KEY);
                if (saved) {
                    const { id } = JSON.parse(saved);
                    const match = list.find(s => s.id === id);
                    if (match) setSelectedStoreState(match);
                }
            } catch {
                // Stay empty/null — StoreSelectScreen shows an empty state and lets the user retry.
            }
            setLoading(false);
        })();
    }, []);

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
        <StoreContext.Provider value={{ stores, selectedStore, setSelectedStore, loading }}>
            {children}
        </StoreContext.Provider>
    );
};

export const useStore = () => useContext(StoreContext);
