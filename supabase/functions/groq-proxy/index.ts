// groq-proxy/index.ts
// Supabase Edge Function to securely proxy Groq API requests using server-side GROQ_API_KEY

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { messages, model, temperature, max_tokens, response_format } = await req.json();

    const groqApiKey = Deno.env.get('GROQ_API_KEY');
    if (!groqApiKey) {
      return new Response(JSON.stringify({ error: "Groq API key not configured on server" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${groqApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messages,
        model: model || "llama-3.3-70b-versatile",
        temperature: temperature !== undefined ? temperature : 0.1,
        max_tokens: max_tokens || 2000,
        response_format: response_format || undefined
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(JSON.stringify({ error: `Groq API Error: ${errorText}` }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
