// youtube-proxy/index.ts
// Supabase Edge Function to proxy and secure YouTube API requests

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY') || '';
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Retrieve potential keys from Environment Variables
const getActiveKeys = () => {
  const keys: string[] = [];
  for (let i = 1; i <= 10; i++) {
    let key = Deno.env.get(`YOUTUBE_API_KEY_${i}`);
    if (!key) {
      key = Deno.env.get(`VITE_YOUTUBE_API_KEY_${i}`);
    }
    if (key) {
      keys.push(key);
    }
  }
  
  // Fallback to generic key
  const defaultKey = Deno.env.get("YOUTUBE_API_KEY") || Deno.env.get("VITE_YOUTUBE_API_KEY");
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

    const cacheKey = `${endpoint}_${JSON.stringify(params)}`;
    let cachedData: any = null;

    // 1. Check Server-Side Cache
    if (supabase) {
      try {
        const { data: cached } = await supabase
          .from('youtube_cache')
          .select('response_data, created_at')
          .eq('query_key', cacheKey)
          .maybeSingle();

        if (cached && cached.response_data) {
          cachedData = cached.response_data;
          const ageHours = (new Date().getTime() - new Date(cached.created_at).getTime()) / (1000 * 60 * 60);
          if (ageHours < 24) { // 24 hour TTL for server shared cache
            console.log(`[YouTube Proxy] Serving from DB Cache: ${endpoint}`);
            return new Response(JSON.stringify(cached.response_data), {
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
          }
        }
      } catch (e: any) {
        console.warn("[YouTube Proxy] Cache read failed (table might not exist yet):", e.message);
      }
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
          
          // 2. Write to Server-Side Cache (Fire and forget)
          if (supabase) {
            supabase.from('youtube_cache').upsert({
              query_key: cacheKey,
              response_data: data,
              created_at: new Date().toISOString()
            }, { onConflict: 'query_key' }).then(({ error }) => {
                if (error) console.warn("[YouTube Proxy] Cache write failed:", error.message);
            });
          }

          return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        const errorObj = data.error?.errors?.[0] || {};
        const errorMessage = data.error?.message || "";
        const isKeyError = response.status === 403 || 
                           response.status === 429 || 
                           (response.status === 400 && (
                             errorObj.reason === 'keyInvalid' || 
                             errorMessage.toLowerCase().includes('key')
                           )) ||
                           response.status >= 500;

        if (isKeyError) {
          console.warn(`[YouTube Proxy] Key #${keyIndex + 1} failed (Status: ${response.status}, Reason: ${errorObj.reason || 'None'}). Rotating...`);
          attempts++;
          continue;
        }

        // For other API errors (e.g. bad request parameters) return them directly
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

    // Server-Side Quota Exhaustion Fallback
    if (cachedData) {
      console.log(`[YouTube Proxy] All API keys failed or quota exceeded. Serving expired DB Cache as fallback: ${endpoint}`);
      return new Response(JSON.stringify(cachedData), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
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
