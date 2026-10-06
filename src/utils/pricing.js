// Mirrors customer-website/src/utils/pricing.js's getSizes/getLowestPrice so the Menu
// screen can show "Customisable"/"onwards" correctly for every product_type (pizza,
// simple, half_full, patty, ice_cream) — ProductDetailScreen.jsx has its own equivalent
// inline logic already; this is only extracted here for MenuScreen's own use.

const hasPrice = (price) => price !== null && price !== undefined;

// Size/choice count for a product, based on its product_type. Only the length matters
// for "is this customisable", so labels are omitted here (ProductDetailScreen already
// builds the full labeled list for its own picker UI).
export function getSizes(product) {
    const type = product.product_type || 'pizza';

    if (type === 'simple') {
        return hasPrice(product.base_price_small) ? [{ key: 'small' }] : [];
    }

    if (type === 'half_full' || type === 'patty' || type === 'ice_cream') {
        return [
            hasPrice(product.base_price_small) && { key: 'small' },
            hasPrice(product.base_price_medium) && { key: 'medium' },
        ].filter(Boolean);
    }

    return [
        hasPrice(product.base_price_small) && { key: 'small' },
        hasPrice(product.base_price_medium) && { key: 'medium' },
        hasPrice(product.base_price_large) && { key: 'large' },
        hasPrice(product.base_price_xlarge) && { key: 'xlarge' },
    ].filter(Boolean);
}

// "Starting from" price shown on menu rows.
export const getLowestPrice = (item) => Math.min(
    item.base_price_small || Infinity,
    item.base_price_medium || Infinity,
    item.base_price_large || Infinity,
    item.base_price_xlarge || Infinity,
);
