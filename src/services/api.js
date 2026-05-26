// src/services/api.js
// Refactored API client using Supabase client SDK with caching, queueing, and retry logic

import { supabase } from './supabaseClient';

// --- Configuration ---
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache
export const COMPONENT_VERSIONS = {
    app: '2.0.0',
    roadmap: '2.0.0',
    profile: '2.0.0',
    leaderboard: '2.0.0'
};

const requestQueue = [];
let isProcessingQueue = false;
const pendingRequests = new Map(); // Prevent duplicate simultaneous requests
const usernameToIdMap = new Map(); // Cache username to UUID mappings

/**
 * Resolves a username to its corresponding Supabase Profile UUID
 */
async function getProfileId(username) {
    if (!username) return null;
    const lowerName = username.toLowerCase();
    if (usernameToIdMap.has(lowerName)) {
        return usernameToIdMap.get(lowerName);
    }
    const { data } = await supabase
        .from('profiles')
        .select('id')
        .ilike('username', username)
        .maybeSingle();
    
    if (data?.id) {
        usernameToIdMap.set(lowerName, data.id);
        return data.id;
    }
    return null;
}

/**
 * Calculates current streak dynamically, resetting to 0 if continuity is broken.
 */
function calculateCurrentStreak(streak, streakDates) {
    if (!streakDates || streakDates.length === 0) return 0;
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const lastDate = streakDates[streakDates.length - 1];
    if (lastDate === todayStr || lastDate === yesterdayStr) {
        return streak || 0;
    }
    return 0; // Continuity broken
}

/**
 * Standardized API fetcher with Caching, Queuing, and Supabase client logic.
 */
export const fetchApi = async (action, data = {}, method = 'GET', options = {}) => {
    const { 
        useCache = false, 
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
                performSupabaseRequest(action, data, cacheKey, currentVersion);
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
    const requestPromise = performSupabaseRequest(action, data, method === 'GET' ? cacheKey : null, currentVersion);
    pendingRequests.set(pendingKey, requestPromise);
    
    try {
        const response = await requestPromise;
        return response;
    } finally {
        pendingRequests.delete(pendingKey);
    }
};

/**
 * Executes queries against Supabase client SDK and maps responses to standard formats.
 */
async function performSupabaseRequest(action, data, cacheKey, version = '1.0.0') {
    try {
        let result;
        let responseStatus = 200;

        switch (action) {
            case 'login': {
                const email = `${data.username.toLowerCase()}@eduforge.com`;
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password: data.password
                });
                if (error) throw new Error(error.message);
                
                // Clear cached maps and API cache on fresh login
                usernameToIdMap.clear();
                clearApiCache();

                result = { status: 'success', message: 'Logged in' };
                break;
            }

            case 'signup': {
                const usernameVal = (data.username || '').trim();
                if (!usernameVal) {
                    throw new Error("Username is required");
                }
                const usernameRegex = /^[a-z0-9_]+$/;
                if (!usernameRegex.test(usernameVal)) {
                    throw new Error("Username can only contain lowercase letters, numbers, and underscores (no spaces or capitals).");
                }
                if (usernameVal.length < 3 || usernameVal.length > 20) {
                    throw new Error("Username must be between 3 and 20 characters");
                }
                if (!data.password || data.password.length < 6) {
                    throw new Error("Password must be at least 6 characters");
                }

                const lowerUsername = usernameVal.toLowerCase();
                const { data: existingUser } = await supabase
                    .from('profiles')
                    .select('id')
                    .ilike('username', lowerUsername)
                    .maybeSingle();

                if (existingUser) {
                    throw new Error("Username is already taken");
                }

                const email = `${lowerUsername}@eduforge.com`;
                const { error } = await supabase.auth.signUp({
                    email,
                    password: data.password,
                    options: {
                        data: { username: lowerUsername }
                    }
                });
                if (error) throw new Error(error.message);
                result = { status: 'success', message: 'User created' };
                break;
            }

            case 'getProfile': {
                const { data: profile, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .ilike('username', data.username)
                    .maybeSingle();
                
                if (error || !profile) throw new Error(error?.message || 'User not found');
                
                result = {
                    status: 'success',
                    username: data.username,
                    profile: {
                        username: profile.username,
                        display_name: profile.display_name,
                        bio: profile.bio,
                        role_title: profile.role_title,
                        profile_image_url: profile.profile_image_url,
                        location: profile.location,
                        timezone: profile.timezone,
                        website: profile.website,
                        verified: profile.verified,
                        skills: profile.skills || []
                    },
                    socials: profile.socials || {}
                };
                break;
            }

            case 'getProfileStats': {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('id')
                    .ilike('username', data.username)
                    .maybeSingle();
                
                if (!profile) throw new Error('User not found');
                
                // Concurrent fetches for faster loading speeds
                const [statsRes, activityRes, notesRes, roadmapsRes] = await Promise.all([
                    supabase.from('user_stats').select('*').eq('profile_id', profile.id).maybeSingle(),
                    supabase.from('activity').select('*').eq('profile_id', profile.id).order('created_at', { ascending: false }).limit(10),
                    supabase.from('notes').select('*').eq('profile_id', profile.id).order('updated_at', { ascending: false }).limit(5),
                    supabase.from('roadmaps').select('*').eq('profile_id', profile.id).order('updated_at', { ascending: false })
                ]);

                const stats = statsRes.data;
                const activity = activityRes.data || [];
                const notes = notesRes.data || [];
                const roadmaps = roadmapsRes.data || [];

                const xpScore = stats?.xp_score || 0;
                const level = stats?.level || 1;
                
                result = {
                    status: 'success',
                    xp: {
                        score: xpScore,
                        level,
                        progress: xpScore % 100,
                        level_threshold: 100,
                        next_level_at: level * 100,
                        watch_time_seconds: stats?.watch_time_seconds || 0
                    },
                    streak: calculateCurrentStreak(stats?.streak, stats?.streak_dates),
                    panels: {
                        recently_watched: activity.map(a => ({
                            id: a.id,
                            reference_id: a.video_id,
                            title: a.title,
                            subtitle: a.channel_title || "YouTube",
                            status: a.status
                        })),
                        recent_notes: notes.map(n => ({
                            id: n.video_id,
                            reference_id: n.video_id,
                            title: n.title,
                            subtitle: 'Note',
                            status: 'Saved'
                        })),
                        roadmaps: roadmaps.map(r => ({
                            id: r.id,
                            title: r.title,
                            skill: r.skill,
                            nodes: r.nodes,
                            edges: r.edges,
                            updated_at: r.updated_at
                        }))
                    }
                };
                break;
            }

            case 'getNotes': {
                const profileId = await getProfileId(data.username);
                if (!profileId) throw new Error('User not found');
                const { data: notes } = await supabase
                    .from('notes')
                    .select('*')
                    .eq('profile_id', profileId)
                    .order('updated_at', { ascending: false });
                result = notes || [];
                break;
            }

            case 'getNote': {
                const profileId = await getProfileId(data.username);
                if (!profileId) throw new Error('User not found');
                const { data: note, error } = await supabase
                    .from('notes')
                    .select('*')
                    .eq('profile_id', profileId)
                    .eq('video_id', data.videoId)
                    .maybeSingle();
                
                if (error || !note) throw new Error('Note not found');
                result = { ...note, status: 'success' };
                break;
            }

            case 'getStreak': {
                const profileId = await getProfileId(data.username);
                if (!profileId) throw new Error('User not found');
                const { data: stats } = await supabase
                    .from('user_stats')
                    .select('streak_dates')
                    .eq('profile_id', profileId)
                    .maybeSingle();
                result = { dates: stats?.streak_dates || [], status: 'success' };
                break;
            }

            case 'getRoadmap': {
                const profileId = await getProfileId(data.username);
                if (!profileId) throw new Error('User not found');
                const { data: roadmaps } = await supabase
                    .from('roadmaps')
                    .select('*')
                    .eq('profile_id', profileId)
                    .order('updated_at', { ascending: false });
                result = { status: 'success', roadmap: roadmaps || [] };
                break;
            }

            case 'getLeaderboard': {
                const { data: leaderboard, error } = await supabase
                    .from('user_stats')
                    .select('xp_score, watch_time_seconds, level, profiles(username, display_name, profile_image_url, role_title)')
                    .order('xp_score', { ascending: false })
                    .order('watch_time_seconds', { ascending: false });
                
                if (error) throw new Error(error.message);
                result = leaderboard.map(item => ({
                    username: item.profiles?.username || "unknown",
                    display_name: item.profiles?.display_name || item.profiles?.username || "Learner",
                    profile_image_url: item.profiles?.profile_image_url || "",
                    role_title: item.profiles?.role_title || "Learner",
                    xp_score: item.xp_score,
                    level: item.level
                }));
                break;
            }

            case 'updateProfile': {
                const profileId = await getProfileId(data.username);
                if (!profileId) throw new Error('User not found');
                const { error } = await supabase
                    .from('profiles')
                    .update({
                        display_name: data.display_name,
                        bio: data.bio,
                        role_title: data.role_title,
                        profile_image_url: data.profile_image_url,
                        location: data.location,
                        timezone: data.timezone,
                        website: data.website,
                        skills: data.skills
                    })
                    .eq('id', profileId);
                
                if (error) throw new Error(error.message);
                clearApiCache();
                result = { status: 'success', profile: data };
                break;
            }

            case 'updateSocials': {
                const profileId = await getProfileId(data.username);
                if (!profileId) throw new Error('User not found');
                const { error } = await supabase
                    .from('profiles')
                    .update({ socials: data.socials })
                    .eq('id', profileId);
                
                if (error) throw new Error(error.message);
                clearApiCache();
                result = { status: 'success' };
                break;
            }

            case 'updateProfileXp': {
                const profileId = await getProfileId(data.username);
                if (!profileId) throw new Error('User not found');
                
                const { data: stats } = await supabase
                    .from('user_stats')
                    .select('*')
                    .eq('profile_id', profileId)
                    .maybeSingle();
                
                const w = data.watch_time_seconds || 0;
                const currentScore = stats?.xp_score || 0;
                
                const streakDates = stats?.streak_dates || [];
                const currentValidStreak = calculateCurrentStreak(stats?.streak, streakDates);
                const streakCount = currentValidStreak === 0 ? 1 : currentValidStreak;
                const x1 = Math.floor(Math.random() * 60);
                
                let multiplier = (Math.min(streakCount - 1, 16) * 1.05);
                if (multiplier < 1) multiplier = 1;
                
                const currentLevel = Math.floor(currentScore / 100) + 1;
                // Soft cap: XP gain decays by 2% per level, but never goes below 10%
                const decayFactor = Math.max(0.1, 1 - (currentLevel * 0.02));
                const bonusTerm = (Math.floor(w / 1800) >= 1 ? 1 : 0) * x1;
                
                // Probabilistic rounding to perfectly preserve fractional XP across small increments
                const fractionalXp = (w * 0.02) * multiplier * decayFactor + bonusTerm;
                const xpGain = Math.floor(fractionalXp) + (Math.random() < (fractionalXp % 1) ? 1 : 0);
                
                const nextScore = currentScore + xpGain;
                const nextLevel = Math.floor(nextScore / 100) + 1;
                
                const todayStr = new Date().toISOString().split('T')[0];
                let newStreak = currentValidStreak;
                let newDates = streakDates;
                
                if (w > 0 && !streakDates.includes(todayStr)) {
                    newDates = [...streakDates, todayStr];
                    newStreak += 1;
                }
                
                await Promise.all([
                    supabase
                        .from('user_stats')
                        .upsert({
                            profile_id: profileId,
                            xp_score: nextScore,
                            watch_time_seconds: (stats?.watch_time_seconds || 0) + w,
                            level: nextLevel,
                            streak: newStreak,
                            streak_dates: newDates
                        }, { onConflict: 'profile_id' }),
                    supabase
                        .from('activity')
                        .insert({
                            profile_id: profileId,
                            video_id: data.video_id,
                            title: data.title || "Video",
                            channel_title: data.channel_title || "Channel",
                            status: "Watched"
                        })
                ]);

                clearApiCache();
                result = { status: 'success', xp_earned: xpGain };
                break;
            }

            case 'saveNotes': {
                const profileId = await getProfileId(data.username);
                if (!profileId) throw new Error('User not found');
                const payload = {
                    profile_id: profileId,
                    video_id: data.video_id,
                    title: data.title || 'Untitled Note',
                    content: data.content,
                    updated_at: new Date().toISOString()
                };
                if (data.is_private !== undefined) {
                    payload.is_private = data.is_private;
                }
                const { error } = await supabase
                    .from('notes')
                    .upsert(payload, { onConflict: 'profile_id,video_id' });

                if (error) throw new Error(error.message);
                clearApiCache();
                result = { status: 'success' };
                break;
            }

            case 'saveRoadmap': {
                const profileId = await getProfileId(data.username);
                if (!profileId) throw new Error('User not found');
                
                const roadmapPayload = {
                    profile_id: profileId,
                    title: data.title || data.skill || "Untitled Roadmap",
                    skill: data.skill || "",
                    nodes: data.roadmap.nodes || [],
                    edges: data.roadmap.edges || [],
                    updated_at: new Date().toISOString()
                };
                
                let query;
                if (data.roadmap.id && data.roadmap.id.length > 10) { // Valid UUID format
                    query = supabase
                        .from('roadmaps')
                        .update(roadmapPayload)
                        .eq('id', data.roadmap.id);
                } else {
                    query = supabase
                        .from('roadmaps')
                        .insert(roadmapPayload);
                }
                
                const { error } = await query;
                if (error) throw new Error(error.message);
                
                clearApiCache();
                
                const { data: allRoadmaps } = await supabase
                    .from('roadmaps')
                    .select('*')
                    .eq('profile_id', profileId)
                    .order('updated_at', { ascending: false });
                    
                result = { status: 'success', roadmaps: allRoadmaps };
                break;
            }

            case 'generateRoadmap': {
                try {
                    const { data: functionData, error } = await supabase.functions.invoke('generate-roadmap', {
                        body: { skill: data.skill }
                    });
                    
                    if (error) throw new Error(error.message);
                    if (functionData?.error) throw new Error(functionData.error);
                    result = functionData;
                } catch (apiError) {
                    console.warn("[API Service] generate-roadmap failed. Checking local cache & DB fallback...", apiError);
                    
                    // Fallback 1: LocalStorage cache check (even if expired)
                    const fallbackCacheKey = `cache_generateRoadmap_${JSON.stringify(data)}`;
                    try {
                        const localCached = localStorage.getItem(fallbackCacheKey);
                        if (localCached) {
                            const parsed = JSON.parse(localCached);
                            console.log(`[API Service] Fallback successful! Serving generateRoadmap from local cache.`);
                            result = parsed.data;
                            break;
                        }
                    } catch (e) {
                        console.warn("[API Service] Failed to read generateRoadmap local cache", e);
                    }

                    // Fallback 2: Check if ANY roadmap for this skill exists in Supabase
                    try {
                        const { data: dbRoadmap, error: dbError } = await supabase
                            .from('roadmaps')
                            .select('nodes, edges, title, skill')
                            .ilike('skill', data.skill)
                            .limit(1)
                            .maybeSingle();

                        if (!dbError && dbRoadmap) {
                            console.log(`[API Service] Fallback successful! Serving generateRoadmap from existing DB Roadmap for skill: "${data.skill}"`);
                            result = {
                                status: "success",
                                roadmap: {
                                    nodes: dbRoadmap.nodes,
                                    edges: dbRoadmap.edges
                                }
                            };
                            break;
                        }
                    } catch (dbEx) {
                        console.warn("[API Service] Failed to query existing roadmaps as fallback", dbEx);
                    }

                    // If all fallbacks fail, rethrow the original error
                    throw apiError;
                }
                break;
            }

            case 'deleteData': {
                const { data: functionData, error } = await supabase.functions.invoke('reset-data');
                
                if (error) throw new Error(error.message);
                if (functionData?.error) throw new Error(functionData.error);
                
                clearApiCache();
                result = { status: 'success' };
                break;
            }

            case 'deleteAccount': {
                const { data: functionData, error } = await supabase.functions.invoke('delete-account');
                
                if (error) throw new Error(error.message);
                if (functionData?.error) throw new Error(functionData.error);
                
                await supabase.auth.signOut();
                clearApiCache();
                
                result = { status: 'success' };
                break;
            }

            default:
                throw new Error(`Unknown action: ${action}`);
        }

        if (cacheKey) {
            localStorage.setItem(cacheKey, JSON.stringify({
                data: result,
                timestamp: Date.now(),
                version: version
            }));

            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('api-cache-updated', {
                    detail: { cacheKey, action, data: result }
                }));
            }
        } else {
            // For mutation actions, dispatch an event so UI can re-fetch
            const mutationActions = ['updateProfile', 'updateSocials', 'updateProfileXp', 'saveNotes', 'saveRoadmap'];
            if (mutationActions.includes(action)) {
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('api-data-mutated'));
                }
            }
        }

        return { ok: true, json: async () => result, status: responseStatus };
    } catch (error) {
        console.error(`[api.js] action ${action} failed:`, error);
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
            await performSupabaseRequest(req.action, req.data, null);
        } catch (e) {
            console.error("Queue processing error:", e);
        }
    }

    isProcessingQueue = false;
}

// Clear specific cache if needed (e.g., after logout)
export const clearApiCache = () => {
    Object.keys(localStorage).forEach(key => {
        if (key.startsWith('cache_')) localStorage.removeItem(key);
    });
    usernameToIdMap.clear();
};
