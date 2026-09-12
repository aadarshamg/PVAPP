// Derives a short branded code from a store's slug (e.g. 'law-gate' -> 'LG',
// 'deep-nagar' -> 'DN') and formats it with an order's display_id into the
// per-store receipt number shown to customers (e.g. 'LG-1042').
// Display-only — never touches the underlying `display_id` sequence.
export const getStoreCode = (slug) => {
    if (!slug) return '';
    return slug
        .split('-')
        .filter(Boolean)
        .map(word => word[0].toUpperCase())
        .join('');
};

export const formatOrderNumber = (slug, displayId) => {
    const code = getStoreCode(slug);
    return code ? `${code}-${displayId}` : `${displayId}`;
};
