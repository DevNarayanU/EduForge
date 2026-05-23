import { supabase } from './supabaseClient';

/**
 * Fetches data from YouTube API by proxying through Supabase Edge Function.
 * @param {string} endpoint - The API endpoint (e.g., 'search', 'videos').
 * @param {Object} params - Query parameters.
 * @returns {Promise<Object>} The API response data.
 */
export const fetchYoutube = async (endpoint, params = {}) => {
    // 1. Check local cache first (6-hour TTL)
    const currentUser = localStorage.getItem("user") || "anonymous";
    const cacheKey = `yt_cache_${currentUser}_${endpoint}_${JSON.stringify(params)}`;
    try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            const parsed = JSON.parse(cached);
            if (Date.now() - parsed.timestamp < 6 * 60 * 60 * 1000) {
                return parsed.data;
            }
        }
    } catch (e) {
        console.warn("Failed to read YouTube cache", e);
    }

    try {
        const { data, error } = await supabase.functions.invoke('youtube-proxy', {
            body: { endpoint, params }
        });

        if (error || (data && data.error)) {
            console.error(`[YouTube Proxy API] invocation failed:`, error || data?.error);
            throw new Error(error?.message || (data && data.error) || 'YouTube API error');
        }

        // 2. Save successful response to cache
        if (data) {
            try {
                localStorage.setItem(cacheKey, JSON.stringify({
                    data,
                    timestamp: Date.now()
                }));
            } catch (e) {
                console.warn("Failed to write YouTube cache (might be full)", e);
            }
        }

        return data;
    } catch (err) {
        console.warn(`[YouTube API] Failed to fetch. Falling back to expired local cache...`, err);
        try {
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
                const parsed = JSON.parse(cached);
                console.log(`[YouTube API] Fallback successful! Returning cached data for: ${cacheKey}`);
                return parsed.data;
            }
        } catch (e) {
            console.error("Failed to read fallback cache", e);
        }
        throw err;
    }
};

