// Determines whether the store is currently accepting orders based on the
// admin's manual open/closed toggle and configured business hours.
export function isStoreOpen(storeOpen, openingTime, closingTime) {
    if (storeOpen === 'false') return false;
    if (!openingTime || !closingTime) return true;
    const now = new Date();
    const [openH, openM] = openingTime.split(':').map(Number);
    const [closeH, closeM] = closingTime.split(':').map(Number);
    const nowMins = now.getHours() * 60 + now.getMinutes();
    const openMins = openH * 60 + openM;
    const closeMins = closeH * 60 + closeM;
    if (closeMins <= openMins) {
        // Overnight range (e.g. opens 18:00, closes 11:00 the next day)
        return nowMins >= openMins || nowMins < closeMins;
    }
    return nowMins >= openMins && nowMins < closeMins;
}
