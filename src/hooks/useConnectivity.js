import { useState, useEffect } from 'react';

export function useConnectivity() {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [backendStatus, setBackendStatus] = useState('loading'); // loading, online, offline

    useEffect(() => {
        // More robust connectivity check
        const checkConnectivity = async () => {
            try {
                // Try to fetch a tiny resource to verify actual internet access
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000);
                
                const response = await fetch("https://connectivitycheck.gstatic.com/generate_204", {
                    mode: 'no-cors',
                    cache: 'no-store',
                    signal: controller.signal
                });
                clearTimeout(timeoutId);
                setIsOnline(true);
            } catch (err) {
                setIsOnline(false);
            }
        };

        const handleOnline = () => checkConnectivity();
        const handleOffline = () => setIsOnline(false);
        
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Periodic check to catch silent disconnects
        checkConnectivity();
        const connInterval = setInterval(checkConnectivity, 10000);

        // Check backend status
        const checkBackend = async () => {
            try {
                const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}?action=ping`);
                if (res.ok) setBackendStatus('online');
                else setBackendStatus('offline');
            } catch {
                setBackendStatus('offline');
            }
        };

        checkBackend();
        const backendInterval = setInterval(checkBackend, 30000);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            clearInterval(connInterval);
            clearInterval(backendInterval);
        };
    }, []);

    return { isOnline, backendStatus };
}
