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
                
                await fetch("https://connectivitycheck.gstatic.com/generate_204", {
                    mode: 'no-cors',
                    cache: 'no-store',
                    signal: controller.signal
                });
                clearTimeout(timeoutId);
                setIsOnline(true);
            } catch {
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

        // Check backend status (Supabase)
        const checkBackend = async () => {
            try {
                const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
                const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
                if (!supabaseUrl) {
                    setBackendStatus('offline');
                    return;
                }
                const res = await fetch(`${supabaseUrl}/rest/v1/`, {
                    headers: {
                        apikey: supabaseKey,
                        Authorization: `Bearer ${supabaseKey}`
                    }
                });
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
