import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Temporary diagnostic overlay for the post-login freeze investigation — always
// mounted at the very top of the app (outside AuthProvider/StoreProvider/navigation),
// so it stays visible through every screen and every loading gate, including a full
// freeze. Polls the pvLog() ring buffer and shows the last checkpoints reached, so
// the exact stuck point is visible directly on the device. Remove once the bug is
// confirmed fixed.
export default function DebugOverlay() {
    const [lines, setLines] = useState([]);

    useEffect(() => {
        const id = setInterval(() => {
            setLines([...(global.__pvDebugLog || [])]);
        }, 300);
        return () => clearInterval(id);
    }, []);

    if (!lines.length) return null;

    return (
        <View style={styles.overlay} pointerEvents="none">
            {lines.map((line, i) => (
                <Text key={i} style={styles.text} numberOfLines={1}>{line}</Text>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    overlay: {
        position: 'absolute',
        top: 50,
        left: 6,
        right: 6,
        backgroundColor: 'rgba(0,0,0,0.8)',
        borderRadius: 8,
        padding: 6,
        zIndex: 99999,
        elevation: 99999,
    },
    text: {
        color: '#4ade80',
        fontSize: 9,
        fontFamily: 'monospace',
    },
});
