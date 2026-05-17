import { API_BASE_URL } from '../config';

export const fetchApi = async (action, data = {}, method = 'GET') => {
    let url = API_BASE_URL;
    let options = {};

    if (method === 'GET') {
        const params = new URLSearchParams({ action });
        for (const key in data) {
            if (data[key] !== undefined && data[key] !== null) {
                params.append(key, data[key]);
            }
        }
        url = `${API_BASE_URL}?${params.toString()}`;
        options = { method: 'GET' };
    } else {
        options = {
            method: 'POST',
            body: JSON.stringify({ action, ...data }),
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            },
        };
    }

    try {
        const response = await fetch(url, options);
        // Sometimes Google Apps Script redirects or returns HTML on error.
        // We ensure it parses as JSON.
        const result = await response.json();
        
        const ok = result.status === 'success' || !result.error; 
        
        return {
            ok,
            json: async () => result,
            status: ok ? 200 : 400
        };
    } catch (error) {
        return {
            ok: false,
            json: async () => ({ error: "Server connection failed" }),
            status: 500
        };
    }
};
