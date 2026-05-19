import React, { useState, useEffect } from "react";
import Background from "../components/background/Background";
import Top_panel from "../components/top-panel/Top_panel";
import Homecard from "../components/cards/Homecard";
import Video from "../components/video/Video";
import { useLocation, useNavigate } from "react-router-dom";
import "./Home.css";
import { fetchYoutube } from "../services/youtube";
import { ALLOWED_CHANNELS } from "../constants";


function Home({user, profileImage}){
const [data,setdata] = useState([]);
const [isplaying,setisplaying] = useState(false);
const [currentVideo, setcurrentVideo] = useState(null);
const [isLoadingInitial, setIsLoadingInitial] = useState(false);
const [trendingTags, setTrendingTags] = useState(["React", "Python", "JavaScript", "AI", "DevOps", "Cybersecurity"]);

    const location = useLocation();
    const navigate = useNavigate();
    const queryParams = new URLSearchParams(location.search);
    const urlQuery = queryParams.get("query") || "";
    const autoPlayId = queryParams.get("video");

    const handleTagClick = (tag) => {
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

    // Fetch latest skills from multiple APIs if no query is present
    const [hasAttemptedInitial, setHasAttemptedInitial] = useState(false);

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
                            maxResults: 5 // Reduced from 8 to 5
                        });
                        if (json.items) {
                            allVideos.push(...json.items);
                        }
                    } catch (e) {
                        console.error(`Error fetching YouTube data for ${topic}:`, e);
                    }
                }

                // Filter by the established high-quality channels
                const filtered = allVideos.filter(item =>
                    item.snippet && ALLOWED_CHANNELS.some(ch =>
                        item.snippet.channelTitle.trim().toLowerCase() === ch.trim().toLowerCase()
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

<Top_panel data={data} setdata={setdata} setisplaying={setisplaying} initialQuery={urlQuery} user={user} profileImage={profileImage}/>
<Background />

{isplaying=== false && (
    <>
        <div className="trending-container">
            <span className="trending-title">Trending Skills</span>
            <div className="trending-tags">
                {trendingTags.map(tag => (
                    <button key={tag} onClick={() => handleTagClick(tag)} className="tag-chip">
                        {tag}
                    </button>
                ))}
            </div>
        </div>
        
        {data.length > 0 ? (
            <Homecard data={data} setisplaying={setisplaying} setcurrentVideo={setcurrentVideo} />
        ) : (
            <div className="no-results">
                {urlQuery ? (
                    <p>No trusted tutorials found for "{urlQuery}". Try a broader topic.</p>
                ) : (
                    !isLoadingInitial && <p>Searching for high-quality tutorials...</p>
                )}
            </div>
        )}
    </>
)}
{isplaying === true && <Video video={currentVideo} setisplaying={setisplaying} data={data} setcurrentVideo={setcurrentVideo} user={user} /> }
</div>
);

}
export default Home;
