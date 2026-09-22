// Temporary diagnostic tool for the post-login freeze: keeps the last N checkpoints
// in a global so an always-mounted on-screen overlay (see DebugOverlay.jsx) can show
// exactly how far execution got before a hang, directly on the device — no Mac/Xcode
// Console/USB cable needed to see it. Also mirrors to console.log as a backup in case
// a Console.app capture is still useful.
global.__pvDebugLog = global.__pvDebugLog || [];

export const pvLog = (msg) => {
    const line = `${new Date().toISOString().slice(11, 23)}  ${msg}`;
    global.__pvDebugLog = [...global.__pvDebugLog.slice(-11), line];
    console.log('[PVDEBUG]', line);
};
