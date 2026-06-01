import React, { useState, useEffect, useRef, useCallback } from "react";
import "./video.css";
import { FiLock, FiUnlock } from "react-icons/fi";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Custom_player from "../customplayer/Custom_player";
import { fetchApi } from "../../services/api";
import { fetchYoutube } from "../../services/youtube";

function formatTime(totalSeconds) {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = Math.floor(totalSeconds % 60);

    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
}

export default function Video({
    video,
    setisplaying,
    data,
    setcurrentVideo,
    user
}) {
    const [notes, setNotes] = useState("");
    const [isPrivate, setIsPrivate] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [watchTime, setWatchTime] = useState(0);
    const [showRelated, setShowRelated] = useState(false);
    const [showFullDescription, setShowFullDescription] = useState(false);
    const [fullDescription, setFullDescription] = useState("");

    const playerRef = useRef(null);
    
    // Obsidian-style line-by-line editor state and refs
    const [activeLineIndex, setActiveLineIndex] = useState(null);
    const [pendingCaretPos, setPendingCaretPos] = useState(null);
    const lineRefs = useRef([]);

    const lines = notes ? notes.split('\n') : [''];

    useEffect(() => {
        if (activeLineIndex !== null && lineRefs.current[activeLineIndex]) {
            const textarea = lineRefs.current[activeLineIndex];
            textarea.focus();
            
            // Adjust auto height
            textarea.style.height = 'auto';
            textarea.style.height = textarea.scrollHeight + 'px';

            if (pendingCaretPos && pendingCaretPos.index === activeLineIndex) {
                textarea.setSelectionRange(pendingCaretPos.pos, pendingCaretPos.pos);
                setPendingCaretPos(null);
            } else {
                const len = textarea.value.length;
                textarea.setSelectionRange(len, len);
            }
        }
    }, [activeLineIndex, pendingCaretPos]);

    const handleLineChange = (e, index) => {
        e.target.style.height = 'auto';
        e.target.style.height = e.target.scrollHeight + 'px';

        const newLines = [...lines];
        newLines[index] = e.target.value;
        setNotes(newLines.join('\n'));
    };

    const handleLineClick = (e, index) => {
        e.stopPropagation();
        if (e.target.tagName === 'A' || e.target.closest('a')) {
            return;
        }
        setActiveLineIndex(index);
    };

    const handleContainerClick = (e) => {
        if (e.target === e.currentTarget) {
            setActiveLineIndex(lines.length - 1);
        }
    };

    const handleKeyDown = (e, index) => {
        const value = e.target.value;
        const selectionStart = e.target.selectionStart;

        if (e.key === 'Enter') {
            e.preventDefault();
            const before = value.substring(0, selectionStart);
            const after = value.substring(selectionStart);

            const newLines = [...lines];
            newLines[index] = before;
            newLines.splice(index + 1, 0, after);
            setNotes(newLines.join('\n'));
            setActiveLineIndex(index + 1);
        } else if (e.key === 'Backspace' && selectionStart === 0) {
            if (index > 0) {
                e.preventDefault();
                const prevLineVal = lines[index - 1];
                const newLines = [...lines];
                newLines[index - 1] = prevLineVal + value;
                newLines.splice(index, 1);
                setNotes(newLines.join('\n'));
                setActiveLineIndex(index - 1);
                setPendingCaretPos({ index: index - 1, pos: prevLineVal.length });
            }
        } else if (e.key === 'ArrowUp') {
            const isSingleLine = e.target.scrollHeight <= 35;
            if (isSingleLine || selectionStart === 0) {
                if (index > 0) {
                    e.preventDefault();
                    setActiveLineIndex(index - 1);
                    const targetPos = Math.min(selectionStart, lines[index - 1].length);
                    setPendingCaretPos({ index: index - 1, pos: targetPos });
                }
            }
        } else if (e.key === 'ArrowDown') {
            const isSingleLine = e.target.scrollHeight <= 35;
            if (isSingleLine || selectionStart === value.length) {
                if (index < lines.length - 1) {
                    e.preventDefault();
                    setActiveLineIndex(index + 1);
                    const targetPos = Math.min(selectionStart, lines[index + 1].length);
                    setPendingCaretPos({ index: index + 1, pos: targetPos });
                }
            }
        }
    };
    const watchTimeRef = useRef(0);
    const syncedWatchTimeRef = useRef(0);

    const videoId = video?.id?.videoId;

    useEffect(() => {
        watchTimeRef.current = watchTime;
    }, [watchTime]);

    const syncWatchSession = useCallback(async () => {
        if (!user || !video) return;

        // Force a flush from the player child
        const flushed = playerRef.current?.flushWatchTime?.() || 0;
        
        // Calculate what's not yet synced to backend using refs
        const totalMeasured = watchTimeRef.current + flushed;
        const toSync = Math.floor(totalMeasured - syncedWatchTimeRef.current);

        if (toSync <= 0) return;

        // Mark as synced immediately to prevent race conditions
        const previousSynced = syncedWatchTimeRef.current;
        syncedWatchTimeRef.current = totalMeasured;
        
        // Also update watchTimeRef so it stays consistent if component stays mounted
        watchTimeRef.current = totalMeasured;

        try {
            // Queue XP update in background - doesn't block UI
            fetchApi('updateProfileXp', {
                username: user,
                watch_time_seconds: toSync,
                video_id: video.id.videoId,
                title: video.snippet.title,
                channel_title: video.snippet.channelTitle
            }, 'POST', { queue: true });
        } catch (err) {
            console.error("Error syncing XP:", err);
            // Rollback on failure if we want to retry next time
            syncedWatchTimeRef.current = previousSynced;
        }
    }, [user, video]);

    // Fetch full video description
    useEffect(() => {
        if (videoId) {
            watchTimeRef.current = 0;
            syncedWatchTimeRef.current = 0;
            const fetchVideoDetails = async () => {
                try {
                    const resData = await fetchYoutube('videos', {
                        part: "snippet",
                        id: videoId
                    });
                    if (resData.items && resData.items.length > 0) {
                        setFullDescription(resData.items[0].snippet.description);
                    } else {
                        setFullDescription(video?.snippet?.description || "");
                    }
                } catch (err) {
                    console.error("Error fetching full description:", err);
                    setFullDescription(video?.snippet?.description || "");
                }
            };
            fetchVideoDetails();
        }
    }, [videoId, video?.snippet?.description]);

    useEffect(() => {
        const handleBeforeUnload = () => {
            syncWatchSession();
        };

        window.addEventListener("beforeunload", handleBeforeUnload);

        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
            syncWatchSession();
        };
    }, [syncWatchSession]);

    // Filter current video out of related videos
    const relatedVideos = (video && data)
        ? data.filter((item) => item.id.videoId !== video.id.videoId)
        : [];

    // Fetch notes
    useEffect(() => {
        if (user && videoId) {
            setNotes("");
            setIsPrivate(false);

            fetchApi('getNote', { username: user, videoId: videoId }, 'GET')
                .then((res) => res.json())
                .then((dataRes) => {
                    const fetchedContent = dataRes.content || "";
                    setNotes(fetchedContent);
                    setIsPrivate(dataRes.is_private || false);
                })
                .catch((err) =>
                    console.error("Error fetching notes:", err)
                );
        }
    }, [user, videoId]);

    if (!video) return null;

    const handleSaveNotes = async () => {
        // Optimistic UI: Feedback is instant
        setIsSaving(true);
        setTimeout(() => setIsSaving(false), 1000); 

        try {
            await fetchApi('saveNotes', {
                username: user,
                video_id: video.id.videoId,
                content: notes,
                title: video.snippet.title,
                is_private: isPrivate
            }, 'POST', { 
                queue: false 
            });
        } catch (err) {
            console.error("Error saving notes:", err);
        }
    };

    return (
        <div className="video-page-container">
            <div className="video-header-nav">
                <button
                    className="back-button"
                    onClick={async () => {
                        await syncWatchSession();
                        setisplaying(false);
                    }}
                >
                    &larr; Back to results
                </button>

                <div className="video-actions">
                    <button 
                        className="related-toggle-btn"
                        onClick={() => setShowRelated(!showRelated)}
                    >
                        {showRelated ? "Hide Related Skills" : "Show Related Skills"}
                    </button>
                    
                    <div className="watch-time-display">
                        <span className="watch-time-icon">⏱</span>
                        <span>Watch Time: {formatTime(watchTime)}</span>
                    </div>
                </div>
            </div>

            {showRelated && (
                <div className="related-videos-dropdown">
                    <h3 className="dropdown-title">Related Skills</h3>
                    <div className="related-videos-grid">
                        {relatedVideos.map((item) => (
                            <div
                                key={item.id.videoId}
                                className="related-video-card"
                                onClick={() => {
                                    syncWatchSession();
                                    setcurrentVideo(item);
                                    setShowRelated(false);
                                    window.scrollTo(0, 0);
                                }}
                            >
                                <img
                                    src={item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.high?.url || ''}
                                    alt={item.snippet.title}
                                    className="related-card-thumb"
                                />
                                <div className="related-card-info">
                                    <h4 className="related-card-title">{item.snippet.title}</h4>
                                    <p className="related-card-channel">{item.snippet.channelTitle}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="video-layout">
                {/* Main Content */}
                <div className="video-main-column">
                    {/* Video Player */}
                    <div className="video-player-section">
                        <Custom_player 
                            ref={playerRef}
                            videoId={video.id.videoId} 
                            onWatchTimeUpdate={setWatchTime}
                            onUnmount={(finalPlayed) => {
                                // Add to refs so syncWatchSession picks it up
                                watchTimeRef.current += finalPlayed;
                                setWatchTime(prev => prev + finalPlayed);
                                syncWatchSession();
                            }}
                        />
                    </div>

                    {/* Video Info */}
                    <div className="video-info-section">
                        <h1 className="video-title">{video.snippet.title}</h1>

                        <div className="channel-info">
                            <span className="channel-name">
                                {video.snippet.channelTitle}
                            </span>
                        </div>

                        {/* Description */}
                        <div 
                            className={`video-description-container ${showFullDescription ? 'expanded' : 'collapsed'}`}
                            onClick={() => setShowFullDescription(!showFullDescription)}
                        >
                            <p className="video-description">
                                {showFullDescription ? fullDescription : (fullDescription || video.snippet.description)}
                            </p>
                            {!showFullDescription && <div className="description-overlay">Click to read full description</div>}
                        </div>
                    </div>
                </div>

                {/* Sidebar - Now containing Notes */}
                <div className="video-sidebar">
                    <div className="notes-section">
                        <div className="notes-header">
                            <h3>Notes</h3>
                            <div className="notes-actions-group">
                                <div className="privacy-toggle-wrapper">
                                    <span className="privacy-toggle-label">{isPrivate ? "Private" : "Public"}</span>
                                    <button
                                        type="button"
                                        className={`privacy-toggle-switch ${isPrivate ? 'is-private' : 'is-public'}`}
                                        onClick={() => setIsPrivate(!isPrivate)}
                                        title={isPrivate ? "Private Note (Visible only to you)" : "Public Note (Visible to everyone)"}
                                        aria-label={isPrivate ? "Make Note Public" : "Make Note Private"}
                                    >
                                        <div className="privacy-toggle-thumb">
                                            {isPrivate ? <FiLock size={12} className="lock-icon" /> : <FiUnlock size={12} className="unlock-icon" />}
                                        </div>
                                    </button>
                                </div>
                                <button
                                    className="save-notes-btn"
                                    onClick={handleSaveNotes}
                                    disabled={isSaving}
                                >
                                    {isSaving ? "Saving..." : "Save Notes"}
                                </button>
                            </div>
                        </div>

                        <div 
                            className="notes-editor-wrapper"
                            onBlur={(e) => {
                                const currentTarget = e.currentTarget;
                                setTimeout(() => {
                                    if (!currentTarget.contains(document.activeElement)) {
                                        setActiveLineIndex(null);
                                    }
                                }, 50);
                            }}
                        >
                            <div className="obsidian-editor-container" onClick={handleContainerClick}>
                                {lines.map((line, idx) => {
                                    const isActive = activeLineIndex === idx;
                                    return (
                                        <div key={idx} className={`obsidian-line-wrapper ${isActive ? 'active' : 'inactive'}`}>
                                            {isActive ? (
                                                <textarea
                                                    ref={(el) => {
                                                        if (el) lineRefs.current[idx] = el;
                                                    }}
                                                    className="obsidian-line-input"
                                                    value={line}
                                                    onChange={(e) => handleLineChange(e, idx)}
                                                    onKeyDown={(e) => handleKeyDown(e, idx)}
                                                    placeholder={idx === 0 ? "Type notes in Markdown here..." : ""}
                                                    rows={1}
                                                />
                                            ) : (
                                                <div 
                                                    className="obsidian-line-preview"
                                                    onClick={(e) => handleLineClick(e, idx)}
                                                >
                                                    {line.trim() ? (
                                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                            {line}
                                                        </ReactMarkdown>
                                                    ) : (
                                                        <div className="obsidian-empty-line-space">&nbsp;</div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
