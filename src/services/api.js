import { API_BASE_URL } from '../config';

// --- Configuration ---
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 2000; // 2 seconds

// Version control for cache invalidation
export const COMPONENT_VERSIONS = {
    app: '1.0.1',
    roadmap: '1.0.0',
    profile: '1.0.0',
    leaderboard: '1.0.0'
};

// --- State Management for Queue and Cache ---
const requestQueue = [];
let isProcessingQueue = false;
const pendingRequests = new Map(); // Prevent duplicate simultaneous requests

/**
 * Standardized API fetcher with Caching, Queuing, and Retry logic.
 */
export const fetchApi = async (action, data = {}, method = 'GET', options = {}) => {
    const { 
        useCache = false, 
        optimistic = false, 
        queue = false,
        debounceKey = null,
        component = 'app'
    } = options;

    const cacheKey = `cache_${action}_${JSON.stringify(data)}`;

    // 1. Return cached data immediately if available (Stale-While-Revalidate)
    if (useCache && method === 'GET') {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            const parsed = JSON.parse(cached);
            const currentVersion = COMPONENT_VERSIONS[component] || '1.0.0';
            
            // Check if cache is still valid by TTL and Version
            if (Date.now() - parsed.timestamp < CACHE_TTL && parsed.version === currentVersion) {
                // Background refresh: don't await, just update cache
                performRequest(action, data, method, cacheKey, 1, currentVersion);
                return {
                    ok: true,
                    json: async () => parsed.data,
                    fromCache: true
                };
            }
        }
    }

    // 2. Handle Queuing for write operations (Optimistic UI)
    if (queue && method === 'POST') {
        addToQueue(action, data, debounceKey);
        return {
            ok: true,
            json: async () => ({ status: 'queued', optimistic: true }),
            status: 202
        };
    }

    // 3. Prevent duplicate simultaneous requests
    const pendingKey = `${method}_${action}_${JSON.stringify(data)}`;
    if (pendingRequests.has(pendingKey)) {
        return pendingRequests.get(pendingKey);
    }

    const currentVersion = COMPONENT_VERSIONS[options.component || 'app'] || '1.0.0';
    const requestPromise = performRequest(action, data, method, useCache ? cacheKey : null, 1, currentVersion);
    pendingRequests.set(pendingKey, requestPromise);
    
    try {
        const response = await requestPromise;
        return response;
    } finally {
        pendingRequests.delete(pendingKey);
    }
};

/**
 * The actual fetch implementation with retry logic.
 */
async function performRequest(action, data, method, cacheKey, attempt = 1, version = '1.0.0') {
    let url = API_BASE_URL;
    let fetchOptions = {};

    if (method === 'GET') {
        const params = new URLSearchParams({ action, ...data });
        url = `${API_BASE_URL}?${params.toString()}`;
        fetchOptions = { method: 'GET' };
    } else {
        fetchOptions = {
            method: 'POST',
            body: JSON.stringify({ action, ...data }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        };
    }

    try {
        const response = await fetch(url, fetchOptions);
        const result = await response.json();
        const ok = result.status === 'success' || !result.error || Array.isArray(result);

        if (ok) {
            if (cacheKey) {
                localStorage.setItem(cacheKey, JSON.stringify({
                    data: result,
                    timestamp: Date.now(),
                    version: version
                }));
            }
            return { ok: true, json: async () => result, status: 200 };
        } else {
            throw new Error(result.error || 'Request failed');
        }
    } catch (error) {
        if (attempt < RETRY_ATTEMPTS && method === 'POST') {
            console.warn(`Retrying ${action} (Attempt ${attempt + 1})...`);
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
            return performRequest(action, data, method, cacheKey, attempt + 1);
        }
        return { ok: false, json: async () => ({ error: error.message }), status: 500 };
    }
}

/**
 * Background Queue Management
 */
const debounceTimers = new Map();

function addToQueue(action, data, debounceKey) {
    if (debounceKey) {
        if (debounceTimers.has(debounceKey)) {
            clearTimeout(debounceTimers.get(debounceKey));
        }
        debounceTimers.set(debounceKey, setTimeout(() => {
            requestQueue.push({ action, data });
            processQueue();
        }, 2000)); // 2 second debounce for autosaves
    } else {
        requestQueue.push({ action, data });
        processQueue();
    }
}

async function processQueue() {
    if (isProcessingQueue || requestQueue.length === 0) return;
    isProcessingQueue = true;

    while (requestQueue.length > 0) {
        const req = requestQueue.shift();
        try {
            await performRequest(req.action, req.data, 'POST', null);
        } catch (e) {
            console.error("Queue processing error:", e);
            // Re-queue on fatal error? Or just log. For now, we rely on performRequest's retries.
        }
    }

    isProcessingQueue = false;
}

// Clear specific cache if needed (e.g., after logout)
export const clearApiCache = () => {
    Object.keys(localStorage).forEach(key => {
        if (key.startsWith('cache_')) localStorage.removeItem(key);
    });
};
