// Bounds any promise that could hang forever (a cold-start native bridge call, a
// deep-link redirect that never fires, an AsyncStorage op that never settles). If
// `promise` hasn't settled within `ms`, rejects with a clear error; `promise` itself
// keeps running (some SDK calls have no cancel API) but its eventual settlement is
// swallowed so it can't fire an unhandled-rejection warning after we've already moved on.
export const withTimeout = (promise, ms, message) => {
    let timer;
    const timeoutPromise = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), ms);
    });
    return Promise.race([promise, timeoutPromise]).finally(() => {
        clearTimeout(timer);
        promise.catch(() => {});
    });
};
