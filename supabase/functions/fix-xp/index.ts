import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
        const supabase = createClient(supabaseUrl, supabaseKey);

        const { data: users, error: fetchError } = await supabase
            .from("user_stats")
            .select("profile_id, watch_time_seconds, xp_score, level, streak, streak_dates");

        if (fetchError) throw fetchError;

        let xpFixedCount = 0;
        let streakFixedCount = 0;
        
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        for (const user of users || []) {
            const watchTime = user.watch_time_seconds || 0;
            const currentXp = user.xp_score || 0;
            const streak = user.streak || 0;
            const streakDates = user.streak_dates || [];
            
            let updatePayload: any = {};
            
            // 1. Fix XP
            const baselineXp = Math.floor(watchTime * 0.02);
            
            // Only update if their current XP is strictly lower than baseline (due to truncation bug)
            if (currentXp < baselineXp) {
                updatePayload.xp_score = baselineXp;
                updatePayload.level = Math.floor(baselineXp / 100) + 1;
                xpFixedCount++;
            }
            
            // 2. Fix Streak (Reset broken streaks in DB)
            if (streak > 0 && streakDates.length > 0) {
                const lastDate = streakDates[streakDates.length - 1];
                if (lastDate !== todayStr && lastDate !== yesterdayStr) {
                    updatePayload.streak = 0;
                    streakFixedCount++;
                }
            }
            
            if (Object.keys(updatePayload).length > 0) {
                await supabase
                    .from("user_stats")
                    .update(updatePayload)
                    .eq("profile_id", user.profile_id);
            }
        }

        return new Response(JSON.stringify({ 
            status: "success", 
            message: `Fixed ${xpFixedCount} users' XP scores and reset ${streakFixedCount} broken streaks.` 
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { 
            status: 500, 
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }
});
