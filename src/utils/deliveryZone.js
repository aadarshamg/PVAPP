import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { isPointInPolygon } from 'geolib';
import { supabase } from '../lib/supabase';
import { withTimeout } from './withTimeout';

const CACHE_KEY = '@zone_check_cache';
const INSIDE_TTL_MS = 24 * 60 * 60 * 1000;
const STORAGE_TIMEOUT_MS = 5000;
const PERMISSION_TIMEOUT_MS = 60000; // a native OS dialog needs human reaction time
const FETCH_TIMEOUT_MS = 10000;
const GPS_TIMEOUT_MS = 12000;

// Resolves to 'inside', 'outside' or 'unknown' and never throws. 'unknown' covers every
// case where the check could not be completed (permission denied, no zone drawn, GPS
// timeout, offline); callers let the customer through on it.
export async function checkDeliveryZone(storeId) {
    try {
        if (!storeId) return 'unknown';

        // Only "inside" is ever remembered. An "outside" result is rechecked every time,
        // so a customer who moves into the zone is never kept out by a stale answer.
        const cached = await withTimeout(AsyncStorage.getItem(CACHE_KEY), STORAGE_TIMEOUT_MS, 'zone_cache_get_timeout');
        if (cached) {
            const entry = JSON.parse(cached);
            if (entry.result === 'inside' && entry.storeId === storeId && Date.now() - entry.ts < INSIDE_TTL_MS) {
                return 'inside';
            }
        }

        // The OS permission dialog only appears the first time; later calls resolve at once.
        const { status } = await withTimeout(
            Location.requestForegroundPermissionsAsync(),
            PERMISSION_TIMEOUT_MS,
            'location_permission_timeout'
        );
        if (status !== 'granted') return 'unknown';

        const { data } = await withTimeout(
            supabase.from('stores').select('delivery_zone').eq('id', storeId).single(),
            FETCH_TIMEOUT_MS,
            'delivery_zone_fetch_timeout'
        );
        if (!data?.delivery_zone) return 'unknown';

        const zone = data.delivery_zone.map(([lat, lng]) => ({ latitude: lat, longitude: lng }));
        if (zone.length < 3) return 'unknown';

        // A fresh fix, not last-known, which can be hours old.
        const pos = await withTimeout(
            Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
            GPS_TIMEOUT_MS,
            'gps_timeout'
        );
        const coord = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        if (!isPointInPolygon(coord, zone)) return 'outside';

        await withTimeout(
            AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ result: 'inside', storeId, ts: Date.now() })),
            STORAGE_TIMEOUT_MS,
            'zone_cache_set_timeout'
        );
        return 'inside';
    } catch {
        return 'unknown';
    }
}
