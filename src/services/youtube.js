/**
 * YouTube API Service with failover support for multiple API keys.
 */

// Vite requires static access to import.meta.env variables for production builds.
// We'll list a reasonable number of potential keys and filter them.
const YOUTUBE_KEYS = [
    import.meta.env.VITE_YOUTUBE_API_KEY_1,
    import.meta.env.VITE_YOUTUBE_API_KEY_2,
    import.meta.env.VITE_YOUTUBE_API_KEY_3,
    import.meta.env.VITE_YOUTUBE_API_KEY_4,
    import.meta.env.VITE_YOUTUBE_API_KEY_5,
    import.meta.env.VITE_YOUTUBE_API_KEY_6,
    import.meta.env.VITE_YOUTUBE_API_KEY_7,
    import.meta.env.VITE_YOUTUBE_API_KEY_8,
    import.meta.env.VITE_YOUTUBE_API_KEY_9,
    import.meta.env.VITE_YOUTUBE_API_KEY_10,
].filter(Boolean);

// Limit the keys based on the VITE_YOUTUBE_API_KEY_COUNT variable if provided
const KEY_COUNT = parseInt(import.meta.env.VITE_YOUTUBE_API_KEY_COUNT) || YOUTUBE_KEYS.length;
const activeKeys = YOUTUBE_KEYS.slice(0, KEY_COUNT);

// Fallback to the original key if no numbered keys are found
if (activeKeys.length === 0 && import.meta.env.VITE_YOUTUBE_API_KEY) {
    activeKeys.push(import.meta.env.VITE_YOUTUBE_API_KEY);
}

const finalKeys = activeKeys.length > 0 ? activeKeys : [];

let currentKeyIndex = 0;

/**
 * Fetches data from YouTube API with automatic key failover.
 * @param {string} endpoint - The API endpoint (e.g., 'search', 'videos').
 * @param {Object} params - Query parameters.
 * @returns {Promise<Object>} The API response data.
 */
export const fetchYoutube = async (endpoint, params = {}) => {
    if (finalKeys.length === 0) {
        throw new Error("No YouTube API keys provided.");
    }

    const maxAttempts = finalKeys.length;
    let attempts = 0;

    while (attempts < maxAttempts) {
        const keyIndex = (currentKeyIndex + attempts) % finalKeys.length;
        const currentKey = finalKeys[keyIndex];
        
        const urlParams = new URLSearchParams({
            ...params,
            key: currentKey
        });

        const url = `https://www.googleapis.com/youtube/v3/${endpoint}?${urlParams.toString()}`;
        
        try {
            const response = await fetch(url);
            const data = await response.json();

            if (response.ok) {
                // On success, stick with this key for future requests
                currentKeyIndex = keyIndex;
                return data;
            }

            // Detect quota/rate limit errors
            const errorObj = data.error?.errors?.[0] || {};
            const isQuotaError = response.status === 403 && (
                errorObj.reason === 'quotaExceeded' || 
                errorObj.reason === 'rateLimitExceeded' || 
                errorObj.reason === 'dailyLimitExceeded' ||
                errorObj.domain === 'usageLimits'
            );

            if (isQuotaError) {
                console.warn(`[YouTube API] Key #${keyIndex + 1} quota EXCEEDED. Reason: ${errorObj.reason}. Attempting failover...`);
                attempts++;
                continue;
            }

            // If it's another error (like invalid key), log it clearly
            console.error(`[YouTube API] Key #${keyIndex + 1} failed with status ${response.status}: ${data.error?.message || 'Unknown error'}`);
            throw new Error(data.error?.message || `YouTube API error: ${response.status}`);

        } catch (err) {
            if (err.name === 'TypeError' && err.message === 'Failed to fetch') {
                 console.warn(`[YouTube API] Key #${keyIndex + 1} network failure. Checking next key...`);
                 attempts++;
                 if (attempts < maxAttempts) continue;
            }
            throw err;
        }
    }

    throw new Error("All YouTube API keys have reached their quota or failed.");
};
