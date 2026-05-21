import { supabase } from './supabaseClient';

/**
 * Fetches data from YouTube API by proxying through Supabase Edge Function.
 * @param {string} endpoint - The API endpoint (e.g., 'search', 'videos').
 * @param {Object} params - Query parameters.
 * @returns {Promise<Object>} The API response data.
 */
export const fetchYoutube = async (endpoint, params = {}) => {
    const { data, error } = await supabase.functions.invoke('youtube-proxy', {
        body: { endpoint, params }
    });

    if (error) {
        console.error(`[YouTube Proxy API] invocation failed:`, error);
        throw new Error(error.message || 'YouTube API error');
    }

    return data;
};

