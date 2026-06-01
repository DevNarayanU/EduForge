import React, { useState, useEffect } from "react";
import Background from "../components/background/Background";
import Top_panel from "../components/top-panel/Top_panel";
import Homecard from "../components/cards/Homecard";
import Video from "../components/video/Video";
import { useLocation, useNavigate } from "react-router-dom";
import "./Home.css";
import { fetchYoutube } from "../services/youtube";
import { ALLOWED_CHANNELS_SET } from "../constants";
import { FiGithub, FiCpu } from "react-icons/fi";
import { filterVideosWithGroq, checkQuerySafety } from "../services/groq";
import { getCooldownTimeLeft, registerViolation, getViolationCount } from "../services/moderation";
import { checkQuerySafetyLocal } from "../services/localSafety";




function HomecardSkeleton() {
    return (
        <div className="card-wrapper">
            {[...Array(6)].map((_, i) => (
                <div className="card" key={i} style={{ pointerEvents: 'none', background: 'rgba(255,255,255,0.01)' }}>
                    <div className="image-properties skeleton" style={{ borderRadius: '0' }} />
                    <div className="skeleton" style={{ height: '16px', margin: '16px 12px 6px', width: '80%', borderRadius: '4px' }} />
                    <div className="skeleton" style={{ height: '12px', margin: '0 12px 16px', width: '50%', borderRadius: '4px' }} />
                </div>
            ))}
        </div>
    );
}

const isShortVideo = (item) => {
    if (!item || !item.snippet) return false;
    const title = (item.snippet.title || "").toLowerCase();
    const description = (item.snippet.description || "").toLowerCase();
    return (
        title.includes("#shorts") || 
        description.includes("#shorts") || 
        title.includes("#short") || 
        description.includes("#short") ||
        title.includes("youtube short") ||
        description.includes("youtube short")
    );
};

const parseISO8601Duration = (durationStr) => {
    if (!durationStr) return 0;
    const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
    const matches = durationStr.match(regex);
    if (!matches) return 0;
    const hours = parseInt(matches[1] || '0', 10);
    const minutes = parseInt(matches[2] || '0', 10);
    const seconds = parseInt(matches[3] || '0', 10);
    return hours * 3600 + minutes * 60 + seconds;
};

const getCachedAiFilteredIds = (query) => {
    try {
        const normalizedQuery = query.trim().toLowerCase();
        const currentUser = localStorage.getItem("user") || "anonymous";
        const cacheKey = `eduforge_groq_cache_${currentUser}_${encodeURIComponent(normalizedQuery)}`;
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            const parsed = JSON.parse(cached);
            const TTL = 24 * 60 * 60 * 1000; // 24 hours
            if (Date.now() - parsed.timestamp < TTL) {
                return parsed.approvedIds;
            }
        }
    } catch (e) {
        console.warn("Failed to read AI cache in Home.jsx", e);
    }
    return null;
};

function Home({user, profileImage}){
const [data,setdata] = useState([]);
const [isplaying,setisplaying] = useState(false);
const [currentVideo, setcurrentVideo] = useState(null);
const [isLoadingInitial, setIsLoadingInitial] = useState(false);
const [isLoadingSearch, setIsLoadingSearch] = useState(false);
const [trendingTags, setTrendingTags] = useState(["React", "Python", "JavaScript", "AI", "DevOps", "Cybersecurity"]);
const [hasAttemptedInitial, setHasAttemptedInitial] = useState(false);

const [showAi, setShowAi] = useState(false);
const [rawYoutubeData, setRawYoutubeData] = useState([]);
const [isAiLoading, setIsAiLoading] = useState(false);
const [aiError, setAiError] = useState(null);
const [aiFilteredData, setAiFilteredData] = useState([]);

const [cooldownTimeLeft, setCooldownTimeLeft] = useState(0);
const [violationCount, setViolationCount] = useState(0);
const [safetyWarning, setSafetyWarning] = useState(null);

useEffect(() => {
    setCooldownTimeLeft(getCooldownTimeLeft());
    setViolationCount(getViolationCount());
}, []);

useEffect(() => {
    if (cooldownTimeLeft <= 0) return;
    const timer = setTimeout(() => {
        const timeLeft = getCooldownTimeLeft();
        setCooldownTimeLeft(timeLeft);
        if (timeLeft <= 0) {
            setViolationCount(getViolationCount());
        }
    }, 1000);
    return () => clearTimeout(timer);
}, [cooldownTimeLeft]);


    const location = useLocation();
    const navigate = useNavigate();
    const queryParams = new URLSearchParams(location.search);
    const urlQuery = queryParams.get("query") || "";
    const autoPlayId = queryParams.get("video");

    const handleTagClick = (tag) => {
        const timeLeft = getCooldownTimeLeft();
        if (timeLeft > 0) return;
        navigate(`/home?query=${encodeURIComponent(tag)}`);
    };

    const [hasAttemptedAutoplay, setHasAttemptedAutoplay] = useState(false);

    useEffect(() => {
        if (autoPlayId && !hasAttemptedAutoplay && (!currentVideo || currentVideo.id.videoId !== autoPlayId)) {
            const fetchVideoDetails = async () => {
                setHasAttemptedAutoplay(true);
                try {
                    const json = await fetchYoutube('videos', {
                        part: "snippet,id",
                        id: autoPlayId
                    });

                    if (json.items && json.items.length > 0) {
                        const item = json.items[0];
                        // Convert to the format expected by Video component
                        const videoData = {
                            id: { videoId: item.id },
                            snippet: item.snippet
                        };
                        setcurrentVideo(videoData);
                        setisplaying(true);
                    }
                } catch (err) {
                    console.error("Error fetching autoplay video:", err);
                }
            };
            fetchVideoDetails();
        }
    }, [autoPlayId, currentVideo, hasAttemptedAutoplay]);

    const applyAiFiltering = async (query, rawData) => {
        if (!query || !rawData || rawData.length === 0) {
            setAiFilteredData([]);
            return;
        }

        // Filter the input rawData to make sure no shorts are passed to AI or cached
        const nonShortsRawData = rawData.filter(video => !isShortVideo(video));

        // Check cache first synchronously to prevent loading states
        const cachedIds = getCachedAiFilteredIds(query);
        if (cachedIds) {
            console.log("Serving AI filtered IDs synchronously from cache");
            const filtered = nonShortsRawData.filter(video => {
                const videoId = video.id?.videoId || (typeof video.id === 'string' ? video.id : '');
                return cachedIds.includes(videoId);
            });
            setAiFilteredData(filtered);
            setIsAiLoading(false);
            setAiError(null);
            return;
        }

        setIsAiLoading(true);
        setAiError(null);
        try {
            const approvedIds = await filterVideosWithGroq(query, nonShortsRawData);
            const filtered = nonShortsRawData.filter(video => {
                const videoId = video.id?.videoId || (typeof video.id === 'string' ? video.id : '');
                return approvedIds.includes(videoId);
            });
            setAiFilteredData(filtered);
        } catch (err) {
            console.error("Failed to apply AI filtering:", err);
            setAiError("AI suggestions failed to load. Please try again.");
        } finally {
            setIsAiLoading(false);
        }
    };

    const handleToggleAi = async () => {
        const nextShowAi = !showAi;
        setShowAi(nextShowAi);
        
        if (nextShowAi && aiFilteredData.length === 0 && !isAiLoading) {
            await applyAiFiltering(urlQuery || "recommended skills", rawYoutubeData);
        }
    };

    // Clear search data and reset initial attempt state when query is cleared
    useEffect(() => {
        if (!urlQuery) {
            setdata([]);
            setRawYoutubeData([]);
            setAiFilteredData([]);
            setAiError(null);
            setShowAi(false);
            setHasAttemptedInitial(false);
        }
    }, [urlQuery]);

    // Fetch search query results
    useEffect(() => {
        if (!urlQuery) return;

        const fetchSearch = async () => {
            setIsLoadingSearch(true);
            setisplaying(false); // Stop playback on new search
            setAiFilteredData([]); // Clear previous AI results
            setAiError(null);
            setSafetyWarning(null);

            // 1. Run local safety validation
            const localSafetyResult = checkQuerySafetyLocal(urlQuery);
            if (!localSafetyResult.allow) {
                const { duration, count } = registerViolation();
                setCooldownTimeLeft(duration);
                setViolationCount(count);
                setSafetyWarning({
                    query: urlQuery,
                    reason: localSafetyResult.reason,
                    category: localSafetyResult.category,
                    count
                });

                setdata([]);
                setRawYoutubeData([]);
                setIsLoadingSearch(false);
                return;
            }

            // 2. If a cooldown is active, block search execution immediately without calling YouTube or safety API
            const timeLeft = getCooldownTimeLeft();
            if (timeLeft > 0) {
                setCooldownTimeLeft(timeLeft);
                setdata([]);
                setRawYoutubeData([]);
                setIsLoadingSearch(false);
                return;
            }

            // 3. Check query safety using Secure Moderation AI
            try {
                const safetyResult = await checkQuerySafety(urlQuery);
                if (!safetyResult.allow) {
                    const { duration, count } = registerViolation();
                    setCooldownTimeLeft(duration);
                    setViolationCount(count);
                    setSafetyWarning({
                        query: urlQuery,
                        reason: safetyResult.reason,
                        category: safetyResult.category,
                        count
                    });

                    setdata([]);
                    setRawYoutubeData([]);
                    setIsLoadingSearch(false);
                    return;
                }
            } catch (err) {
                console.warn("Safety check failed, proceeding with search:", err);
            }

            try {
                const json = await fetchYoutube('search', {
                    part: "snippet",
                    q: urlQuery,
                    type: "video",
                    maxResults: 50,
                    fields: "items(id/videoId,snippet(title,channelTitle,description,thumbnails/medium/url))"
                });

                const tempRawItems = (json.items || []).filter(item => !isShortVideo(item));
                
                // Fetch durations for these items to filter out videos under 2 minutes
                const videoIds = tempRawItems.map(item => item.id?.videoId).filter(Boolean);
                const durationMap = {};
                if (videoIds.length > 0) {
                    try {
                        const detailsJson = await fetchYoutube('videos', {
                            part: "contentDetails",
                            id: videoIds.join(','),
                            fields: "items(id,contentDetails/duration)"
                        });
                        (detailsJson.items || []).forEach(detail => {
                            durationMap[detail.id] = detail.contentDetails?.duration || "";
                        });
                    } catch (e) {
                        console.error("Error fetching video durations in search:", e);
                    }
                }

                const rawItems = tempRawItems.filter(item => {
                    const durationStr = durationMap[item.id?.videoId];
                    if (!durationStr) return true; // Keep if details call fails
                    return parseISO8601Duration(durationStr) >= 120;
                });

                console.log("Raw YouTube search data (non-shorts, >=2m):", rawItems);
                setRawYoutubeData(rawItems);

                const filtered = rawItems.filter(item =>
                    item.snippet && ALLOWED_CHANNELS_SET.has(
                        item.snippet.channelTitle.trim().toLowerCase()
                    )
                );

                console.log("Filtered search data count:", filtered.length);
                setdata(filtered);

                // If AI toggle is already enabled, fetch suggestions for new search immediately
                if (showAi) {
                    await applyAiFiltering(urlQuery, rawItems);
                }
            } catch (err) {
                console.error("YouTube search error in Home.jsx:", err);
            } finally {
                setIsLoadingSearch(false);
            }
        };

        fetchSearch();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [urlQuery]);


    // Fetch latest skills from multiple APIs if no query is present
    useEffect(() => {
        const fetchInitialSkills = async () => {
            // Only fetch if no search query, no data yet, not already loading, and haven't attempted yet
            if (urlQuery || data.length > 0 || isLoadingInitial || hasAttemptedInitial) return;
            
            setIsLoadingInitial(true);
            setHasAttemptedInitial(true);
            try {
                // API 1: Fetch trending tags from StackOverflow to identify "latest skills"
                const soRes = await fetch("https://api.stackexchange.com/2.3/tags?order=desc&sort=popular&site=stackoverflow&pagesize=2");
                const soData = await soRes.json();
                const tags = soData.items ? soData.items.map(t => t.name) : ["reactjs", "python"];

                // API 2: Fetch trending tech repos from GitHub
                const ghRes = await fetch("https://api.github.com/search/repositories?q=stars:>50000+topic:tutorial&sort=updated&per_page=1");
                const ghData = await ghRes.json();
                const ghSkills = ghData.items ? ghData.items.map(repo => repo.name.replace(/-/g, ' ')) : [];

                const combinedTopics = [...new Set([...tags, ...ghSkills])].slice(0, 2); // Reduced from 4 to 2 to save quota
                
                // Update trending tags state with newly discovered topics
                setTrendingTags(prev => [...new Set([...prev, ...combinedTopics.map(t => t.charAt(0).toUpperCase() + t.slice(1))])]);

                // API 3: Use YouTube to fetch high-quality tutorials for these identified skills
                const allVideos = [];
                for (const topic of combinedTopics) {
                    try {
                        const json = await fetchYoutube('search', {
                            part: "snippet",
                            q: `latest ${topic} full course`,
                            type: "video",
                            maxResults: 5,
                            fields: "items(id/videoId,snippet(title,channelTitle,description,thumbnails/medium/url))"
                        });
                        if (json.items) {
                            const nonShorts = json.items.filter(item => !isShortVideo(item));
                            allVideos.push(...nonShorts);
                        }
                    } catch (e) {
                        console.error(`Error fetching YouTube data for ${topic}:`, e);
                    }
                }

                // Fetch durations for initial skills to filter out videos under 2 minutes
                const videoIds = allVideos.map(item => item.id?.videoId).filter(Boolean);
                const durationMap = {};
                if (videoIds.length > 0) {
                    try {
                        const detailsJson = await fetchYoutube('videos', {
                            part: "contentDetails",
                            id: videoIds.join(','),
                            fields: "items(id,contentDetails/duration)"
                        });
                        (detailsJson.items || []).forEach(detail => {
                            durationMap[detail.id] = detail.contentDetails?.duration || "";
                        });
                    } catch (e) {
                        console.error("Error fetching initial video durations:", e);
                    }
                }

                const longAllVideos = allVideos.filter(item => {
                    const durationStr = durationMap[item.id?.videoId];
                    if (!durationStr) return true; // Keep if details call fails
                    return parseISO8601Duration(durationStr) >= 120;
                });

                if (longAllVideos.length > 0) {
                    setRawYoutubeData(longAllVideos);
                }

                // Filter by the established high-quality channels
                const filtered = longAllVideos.filter(item =>
                    item.snippet && ALLOWED_CHANNELS_SET.has(
                        item.snippet.channelTitle.trim().toLowerCase()
                    )
                );

                if (filtered.length > 0) {
                    setdata(filtered.sort(() => Math.random() - 0.5));
                }
            } catch (err) {
                console.error("Failed to populate latest skills:", err);
            } finally {
                setIsLoadingInitial(false);
            }
        };

        fetchInitialSkills();
    }, [urlQuery, data.length, isLoadingInitial, hasAttemptedInitial]);

return(
<div className="home-container">

<Top_panel initialQuery={urlQuery} profileImage={profileImage}/>
<Background />

{isplaying=== false && (
    <>
        <div className="trending-container">
            <span className="trending-title">Trending Skills</span>
            <div className="trending-tags">
                {trendingTags.map(tag => (
                    <button key={tag} onClick={() => handleTagClick(tag)} className="tag-chip" disabled={cooldownTimeLeft > 0}>
                        {tag}
                    </button>
                ))}
            </div>
        </div>
        
        {(rawYoutubeData.length > 0 || (urlQuery && !isLoadingSearch && (!aiError || !aiError.startsWith("Search Blocked:")))) && (
            <div className="ai-toggle-container-wrapper">
                <div className="ai-toggle-container">
                    <button 
                        className={`ai-toggle-btn ${showAi ? 'active' : ''}`}
                        onClick={handleToggleAi}
                        disabled={isLoadingInitial || isLoadingSearch}
                    >
                        <FiCpu className={`ai-icon ${isAiLoading ? 'spinning' : ''}`} size={16} />
                        <span>
                            {isAiLoading 
                                ? 'AI Suggestions Loading...' 
                                : showAi 
                                    ? 'AI Suggestions Active' 
                                    : 'Show AI Suggestions'}
                        </span>
                    </button>
                </div>
                {isAiLoading && (
                    <div className="ai-loading-status">
                        <div className="ai-loading-bar-container">
                            <div className="ai-loading-bar-progress"></div>
                        </div>
                        <span className="ai-loading-text">EduForge AI is analyzing search results...</span>
                    </div>
                )}
            </div>
        )}
        
        {safetyWarning || cooldownTimeLeft > 0 ? (
            <div className="safety-warning-container">
                <div className="safety-warning-card">
                    <h3 className={`safety-warning-title ${violationCount >= 3 ? 'repeat-warning' : ''}`}>
                        ⚠️ This search was blocked.
                    </h3>
                    
                    <p className="safety-warning-description">
                        EduForge only supports educational and skill-development content.<br />
                        Unsafe, vulgar, dangerous, manipulative, or distracting searches are not allowed.
                    </p>

                    {safetyWarning && (
                        <div className="safety-warning-details">
                            <div className="detail-item"><span className="details-label">Blocked Query:</span> <code className="details-query">"{safetyWarning.query}"</code></div>
                            <div className="detail-item"><span className="details-label">Reason:</span> <span className="details-reason">{safetyWarning.reason}</span></div>
                            {safetyWarning.category && (
                                <div className="detail-item"><span className="details-label">Category:</span> <span className="details-category">{safetyWarning.category}</span></div>
                            )}
                        </div>
                    )}

                    {cooldownTimeLeft > 0 && (
                        <div className="safety-cooldown-timer">
                            <span className="cooldown-text">Search temporarily paused ({cooldownTimeLeft}s)</span>
                        </div>
                    )}
                </div>
            </div>
        ) : isLoadingInitial || isLoadingSearch ? (
            <HomecardSkeleton />
        ) : showAi ? (
            aiFilteredData.length > 0 ? (
                <Homecard data={aiFilteredData} setisplaying={setisplaying} setcurrentVideo={setcurrentVideo} />
            ) : isAiLoading ? (
                // Sustain default results while AI is loading
                data.length > 0 ? (
                    <Homecard data={data} setisplaying={setisplaying} setcurrentVideo={setcurrentVideo} />
                ) : (
                    <div className="ai-loading-container">
                        <div className="ai-loader"></div>
                        <p>AI is analyzing and filtering search results...</p>
                    </div>
                )
            ) : aiError ? (
                // Graceful fallback to default channel-filtered results on error
                data.length > 0 ? (
                    <div className="ai-fallback-container">
                        <div className="ai-fallback-banner warning">
                            <span>⚠️ {aiError} Showing default trusted tutorials.</span>
                        </div>
                        <Homecard data={data} setisplaying={setisplaying} setcurrentVideo={setcurrentVideo} />
                    </div>
                ) : (
                    <div className="no-results">
                        <p style={{ color: '#ef4444' }}>{aiError}</p>
                    </div>
                )
            ) : (
                // Graceful fallback to default channel-filtered results if AI filtered out everything
                data.length > 0 ? (
                    <div className="ai-fallback-container">
                        <div className="ai-fallback-banner info">
                            <span>🤖 AI filtered all results. Showing default trusted tutorials.</span>
                        </div>
                        <Homecard data={data} setisplaying={setisplaying} setcurrentVideo={setcurrentVideo} />
                    </div>
                ) : (
                    <div className="no-results">
                        <p>No AI-verified suggestions found for "{urlQuery || 'recommendations'}". Try a broader topic.</p>
                    </div>
                )
            )
        ) : data.length > 0 ? (
            <Homecard data={data} setisplaying={setisplaying} setcurrentVideo={setcurrentVideo} />
        ) : (
            <div className="no-results">
                {urlQuery ? (
                    <p>No trusted tutorials found for "{urlQuery}". Try a broader topic.</p>
                ) : (
                    <p>Searching for high-quality tutorials...</p>
                )}
            </div>
        )}
        
        <a 
            href="https://github.com/saharshbaiju/EduForge" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="home-github-link"
        >
            <FiGithub size={14} /> GitHub
        </a>
    </>
)}
{isplaying === true && <Video video={currentVideo} setisplaying={setisplaying} data={(showAi && aiFilteredData.length > 0) ? aiFilteredData : data} setcurrentVideo={setcurrentVideo} user={user} /> }
</div>
);

}
export default Home;
