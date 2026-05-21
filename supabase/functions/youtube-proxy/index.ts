// youtube-proxy/index.ts
// Supabase Edge Function to proxy and secure YouTube API requests

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Retrieve potential keys from Environment Variables
const getActiveKeys = () => {
  const keys: string[] = [];
  for (let i = 1; i <= 10; i++) {
    const key = Deno.env.get(`YOUTUBE_API_KEY_${i}`);
    if (key) keys.push(key);
  }
  
  // Fallback to generic key
  const defaultKey = Deno.env.get("YOUTUBE_API_KEY");
  if (keys.length === 0 && defaultKey) {
    keys.push(defaultKey);
  }
  
  return keys;
};

let currentKeyIndex = 0;

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { endpoint, params } = await req.json();

    if (!endpoint) {
      return new Response(JSON.stringify({ error: "Missing endpoint parameter" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const activeKeys = getActiveKeys();
    if (activeKeys.length === 0) {
      return new Response(JSON.stringify({ error: "No YouTube API keys configured on server" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const maxAttempts = activeKeys.length;
    let attempts = 0;
    let lastError = "All keys failed";

    while (attempts < maxAttempts) {
      const keyIndex = (currentKeyIndex + attempts) % activeKeys.length;
      const currentKey = activeKeys[keyIndex];

      const urlParams = new URLSearchParams({
        ...params,
        key: currentKey
      });

      const url = `https://www.googleapis.com/youtube/v3/${endpoint}?${urlParams.toString()}`;

      try {
        const response = await fetch(url);
        const data = await response.json();

        if (response.ok) {
          // Success: update key index so future requests use this key first
          currentKeyIndex = keyIndex;
          return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        const errorObj = data.error?.errors?.[0] || {};
        const isQuotaError = response.status === 403 && (
          errorObj.reason === 'quotaExceeded' || 
          errorObj.reason === 'rateLimitExceeded' || 
          errorObj.reason === 'dailyLimitExceeded' ||
          errorObj.domain === 'usageLimits'
        );

        if (isQuotaError) {
          console.warn(`[YouTube Proxy] Key #${keyIndex + 1} quota exceeded. Rotating...`);
          attempts++;
          continue;
        }

        // For other API errors (e.g. bad request, key invalid) return them directly
        return new Response(JSON.stringify(data), {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });

      } catch (err: any) {
        console.error(`[YouTube Proxy] Fetch error using key #${keyIndex + 1}:`, err);
        lastError = err.message || "Network error";
        attempts++;
      }
    }

    return new Response(JSON.stringify({ error: `All YouTube API keys failed or quota exceeded. Last error: ${lastError}` }), {
      status: 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
