import { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';

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
                const { error } = await supabase.from('profiles').select('id').limit(1);
                if (error) {
                    console.warn("[connectivity] Supabase check returned error:", error);
                    // Network errors or 5xx server errors mean backend is offline/unreachable.
                    // Auth errors (401/403) or database constraints mean the server is alive and responding.
                    const isNetworkError = error.message?.includes('fetch') || !error.status || error.status >= 500;
                    if (isNetworkError) {
                        setBackendStatus('offline');
                    } else {
                        setBackendStatus('online');
                    }
                } else {
                    setBackendStatus('online');
                }
            } catch (err) {
                console.error("[connectivity] Supabase check failed:", err);
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
