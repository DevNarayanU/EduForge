// generate-roadmap/index.ts
// Supabase Edge Function to generate AI Roadmaps using Groq API (Llama 3.3)

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
    const { skill } = await req.json();

    if (!skill || typeof skill !== 'string') {
      return new Response(JSON.stringify({ error: "Missing or invalid skill parameter" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const groqApiKey = Deno.env.get('GROQ_API_KEY');
    if (!groqApiKey) {
      return new Response(JSON.stringify({ error: "Groq API key not configured on server" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const prompt = `Create a professional, highly detailed learning roadmap for '${skill}' in JSON format.
For each node, provide exactly 2 high-quality resources:
1. One 'video' resource: Search for a verified, highly-rated YouTube video and return its full URL. Ensure the video title is accurate.
2. One 'article' resource: Provide a link to official documentation (e.g., MDN, Python.org) or a top-tier tutorial site (e.g., freeCodeCamp).
Constraint: Max 8 nodes. Output ONLY the JSON object.
Format: { "nodes": [{"id": "1", "label": "Topic", "resources": [{"type": "video", "title": "...", "url": "..."}, {"type": "article", "title": "...", "url": "..."}]}], "edges": [{"id": "e1-2", "source": "1", "target": "2"}] }.`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${groqApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: "You are an expert educator. Return only valid JSON." },
          { role: "user", content: prompt }
        ],
        model: "llama-3.3-70b-versatile",
        temperature: 0.3,
        max_tokens: 3000,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(JSON.stringify({ error: `Groq API Error: ${errorText}` }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const result = await response.json();
    const rawContent = result.choices[0].message.content;
    const roadmapData = JSON.parse(rawContent);

    // Apply layout node coordinates mapping
    roadmapData.nodes = (roadmapData.nodes || []).map((n: any, idx: number) => {
      const row = Math.floor(idx / 3);
      const col = idx % 3;
      let xPos = 0;
      
      if (row % 2 === 0) {
        xPos = col * 350; // Left to Right
      } else {
        xPos = (2 - col) * 350; // Right to Left
      }
      const yPos = row * 250;

      return {
        ...n,
        position: { x: xPos, y: yPos },
        type: 'default',
        data: { label: n.label, resources: n.resources || [] }
      };
    });

    return new Response(JSON.stringify({ status: "success", roadmap: roadmapData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
