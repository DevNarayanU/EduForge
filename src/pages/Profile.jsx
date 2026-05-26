import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";

import Background from "../components/background/Background";
import Heatmap from "../components/Heatmap/Heatmap";
const forgeLogo = "/forge.png";
import { fetchApi, clearApiCache } from "../services/api";
import { supabase } from "../services/supabaseClient";
import StatusDots from "../components/status/StatusDots";
import { FiCopy, FiCheck, FiSearch } from "react-icons/fi";

import "./profile.css";

const EMPTY_PROFILE = {
  username: "",
  display_name: "",
  bio: "",
  role_title: "",
  profile_image_url: "",
  location: "",
  timezone: "",
  website: "",
  verified: true,
  skills: [],
};

const EMPTY_SOCIALS = {
  github: "",
  linkedin: "",
  portfolio: "",
  twitter: "",
  youtube: "",
};

const EMPTY_STATS = {
  metrics: [],
  comparison: [],
  streak: 0,
  xp: {
    score: 0,
    level: 1,
    progress: 0,
    level_threshold: 0,
    next_level_at: 0,
    watch_time_hours: 0,
  },
  panels: {
    recently_watched: [],
    recent_notes: [],
  },
};

const SOCIAL_LABELS = {
  github: "GitHub",
  linkedin: "LinkedIn",
  portfolio: "Portfolio",
  twitter: "Twitter/X",
  youtube: "YouTube",
};

function formatTime(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);

  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function EmptyState({ label }) {
  return <p className="profile-empty-state">{label}</p>;
}

function ProfileSkeleton() {
  return (
    <div className="profile-minimal-shell">
      <section className="profile-card profile-skeleton main-skeleton" />
      <section className="profile-card profile-skeleton side-skeleton" />
      <section className="profile-card profile-skeleton wide-skeleton" />
    </div>
  );
}

export default function Profile({ user, setuser, setGlobalProfileImage }) {
  const { username: urlUsername } = useParams();
  const navigate = useNavigate();
  
  const targetUser = urlUsername || user;
  const isOwnProfile = !urlUsername || urlUsername === user;

  const calculateDynamicStreak = (streak, streakDates) => {
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
    return 0;
  };

  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [socials, setSocials] = useState(EMPTY_SOCIALS);
  const [stats, setStats] = useState(EMPTY_STATS);
  const [form, setForm] = useState({
    display_name: "",
    bio: "",
    role_title: "",
    profile_image_url: "",
    location: "",
    timezone: "",
    website: "",
    skills: [],
  });
  const [formSocials, setFormSocials] = useState(EMPTY_SOCIALS);
  const [skillInput, setSkillInput] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const saving = false;
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState("roadmaps");
  const [showDeleteModal, setShowDeleteModal] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [copied, setCopied] = useState(false);
  const [videoSearchTerm, setVideoSearchTerm] = useState("");

  useEffect(() => {
    setActiveTab(isOwnProfile ? "roadmaps" : "notes");
  }, [isOwnProfile]);

  useEffect(() => {
    if (!targetUser) {
      navigate("/login");
    }
  }, [navigate, targetUser]);

  useEffect(() => {
    if (!targetUser) return undefined;

    let cancelled = false;

    async function loadProfile() {
      // Show cached data if available first
      setLoading(true);
      setError("");
      setMessage("");

      try {
        const [profileResponse, statsResponse] = await Promise.all([
          fetchApi('getProfile', { username: targetUser }, 'GET', { useCache: true }),
          fetchApi('getProfileStats', { username: targetUser }, 'GET', { useCache: true }),
        ]);

        const profilePayload = await profileResponse.json();
        const statsPayload = await statsResponse.json();

        // If we got data from cache, we might still be loading in the background
        if (profileResponse.fromCache) setLoading(false);

        if (!profileResponse.ok) {
          throw new Error(profilePayload.error || "Failed to load profile");
        }

        if (!statsResponse.ok) {
          throw new Error(statsPayload.error || "Failed to load profile stats");
        }

        if (cancelled) return;

        const loadedProfile = profilePayload.profile || EMPTY_PROFILE;
        const loadedSocials = profilePayload.socials || EMPTY_SOCIALS;

        setProfile(loadedProfile);
        setSocials(loadedSocials);
        setStats(statsPayload || EMPTY_STATS);

        if (isOwnProfile) {
          setForm({
            display_name: loadedProfile.display_name || user,
            bio: loadedProfile.bio || "",
            role_title: loadedProfile.role_title || "",
            profile_image_url: loadedProfile.profile_image_url || "",
            location: loadedProfile.location || "",
            timezone: loadedProfile.timezone || "",
            website: loadedProfile.website || "",
            skills: loadedProfile.skills || [],
          });
          setFormSocials(loadedSocials);

          if (loadedProfile.profile_image_url) {
            setGlobalProfileImage?.(loadedProfile.profile_image_url);
          } else {
            setGlobalProfileImage?.(forgeLogo);
          }
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError.message || "Could not load profile.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [targetUser, user, isOwnProfile, setGlobalProfileImage]);

  useEffect(() => {
    if (!targetUser) return;

    const profileCacheKey = `cache_getProfile_${JSON.stringify({ username: targetUser })}`;
    const statsCacheKey = `cache_getProfileStats_${JSON.stringify({ username: targetUser })}`;

    const handleCacheUpdate = (event) => {
      const { cacheKey, data } = event.detail;

      if (cacheKey === profileCacheKey && data) {
        const loadedProfile = data.profile || EMPTY_PROFILE;
        const loadedSocials = data.socials || EMPTY_SOCIALS;

        setProfile(loadedProfile);
        setSocials(loadedSocials);

        if (isOwnProfile && !isEditing) {
          setForm({
            display_name: loadedProfile.display_name || user,
            bio: loadedProfile.bio || "",
            role_title: loadedProfile.role_title || "",
            profile_image_url: loadedProfile.profile_image_url || "",
            location: loadedProfile.location || "",
            timezone: loadedProfile.timezone || "",
            website: loadedProfile.website || "",
            skills: loadedProfile.skills || [],
          });
          setFormSocials(loadedSocials);

          if (loadedProfile.profile_image_url) {
            setGlobalProfileImage?.(loadedProfile.profile_image_url);
          } else {
            setGlobalProfileImage?.(forgeLogo);
          }
        }
      }

      if (cacheKey === statsCacheKey && data) {
        setStats(data || EMPTY_STATS);
      }
    };

    const handleDataMutated = () => {
      // Re-fetch silently without showing skeleton loaders
      fetchApi('getProfileStats', { username: targetUser }, 'GET', { useCache: false })
        .then(res => res.json())
        .then(data => {
            if (!data.error) setStats(data || EMPTY_STATS);
        })
        .catch(console.error);
        
      fetchApi('getProfile', { username: targetUser }, 'GET', { useCache: false })
        .then(res => res.json())
        .then(data => {
            if (!data.error && data.profile) {
                setProfile(data.profile);
                setSocials(data.socials || EMPTY_SOCIALS);
            }
        })
        .catch(console.error);
    };

    window.addEventListener("api-cache-updated", handleCacheUpdate);
    window.addEventListener("api-data-mutated", handleDataMutated);
    return () => {
      window.removeEventListener("api-cache-updated", handleCacheUpdate);
      window.removeEventListener("api-data-mutated", handleDataMutated);
    };
  }, [targetUser, user, isOwnProfile, isEditing, setGlobalProfileImage]);

  const previewProfile = isEditing ? {
    ...profile,
    display_name: form.display_name,
    role_title: form.role_title,
    profile_image_url: form.profile_image_url,
    website: form.website,
    location: form.location,
    timezone: form.timezone,
    bio: form.bio,
    skills: form.skills,
  } : profile;

  const previewSocials = isEditing ? formSocials : socials;

  const socialEntries = useMemo(
    () =>
      Object.entries(previewSocials)
        .filter(([, value]) => value)
        .map(([key, value]) => ({
          key,
          label: SOCIAL_LABELS[key],
          value,
        })),
    [previewSocials]
  );

  const recentVideos = stats.panels?.recently_watched || [];
  const recentNotes = stats.panels?.recent_notes || [];
  const savedRoadmaps = stats.panels?.roadmaps || [];

  const filteredVideos = useMemo(() => {
    return recentVideos.filter((video) => {
      const title = (video.title || "").toLowerCase();
      const subtitle = (video.subtitle || "").toLowerCase();
      const search = videoSearchTerm.toLowerCase();
      return title.includes(search) || subtitle.includes(search);
    });
  }, [recentVideos, videoSearchTerm]);
  const levelThreshold = stats.xp?.level_threshold || 0;
  const xpPercent = levelThreshold > 0 ? Math.min(100, ((stats.xp?.progress || 0) / levelThreshold) * 100) : 0;


  const handleProfileInput = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSocialInput = (event) => {
    const { name, value } = event.target;
    setFormSocials((current) => ({ ...current, [name]: value }));
  };

  const addSkill = () => {
    const nextSkill = skillInput.trim();
    if (!nextSkill) return;

    setForm((current) => {
      if (current.skills.includes(nextSkill)) return current;
      return { ...current, skills: [...current.skills, nextSkill] };
    });
    setSkillInput("");
  };

  const removeSkill = (skill) => {
    setForm((current) => ({
      ...current,
      skills: current.skills.filter((item) => item !== skill),
    }));
  };

  const handleActivityClick = (videoId) => {
    if (!videoId) return;
    navigate(`/home?video=${encodeURIComponent(videoId)}`);
  };

  const saveProfile = async () => {
    if (!user) return;

    // --- Optimistic UI Update ---
    const previousProfile = { ...profile };
    const previousSocials = { ...socials };

    setProfile((current) => ({
      ...current,
      display_name: form.display_name,
      bio: form.bio,
      role_title: form.role_title,
      profile_image_url: form.profile_image_url,
      location: form.location,
      timezone: form.timezone,
      website: form.website,
      skills: form.skills,
    }));
    setSocials(formSocials);
    setIsEditing(false);
    setMessage("Saving in background...");

    try {
      // Queue both updates
      await fetchApi('updateProfile', {
          username: user,
          display_name: form.display_name,
          bio: form.bio,
          role_title: form.role_title,
          profile_image_url: form.profile_image_url,
          location: form.location,
          timezone: form.timezone,
          website: form.website,
          skills: form.skills,
      }, 'POST', { queue: true });

      await fetchApi('updateSocials', {
          username: user,
          socials: formSocials,
      }, 'POST', { queue: true });

      setMessage("Profile updated successfully!");
    } catch (saveError) {
      // Rollback on error
      setProfile(previousProfile);
      setSocials(previousSocials);
      setError(saveError.message || "Could not save profile.");
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error("Error signing out from Supabase:", e);
    }
    clearApiCache();
    localStorage.removeItem("user");
    setuser?.("");
    navigate("/login");
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    setError("");
    setMessage("");
    try {
      await fetchApi('deleteAccount', {}, 'POST');
      navigate("/login");
    } catch (err) {
      setError(err.message || "Failed to delete account.");
      setShowDeleteModal(null);
    } finally {
      setIsDeleting(false);
      setConfirmText("");
    }
  };

  const handleDeleteData = async () => {
    setIsDeleting(true);
    setError("");
    setMessage("");
    try {
      await fetchApi('deleteData', { username: user }, 'POST');
      setMessage("Learning data has been reset successfully.");
      setShowDeleteModal(null);
      setConfirmText("");
      // Force UI refresh via global event
      if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('api-data-mutated'));
      }
    } catch (err) {
      setError(err.message || "Failed to reset learning data.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!user) return null;

  return (
    <>
      <Background />
      <main className="profile-minimal-page">
        <button
          type="button"
          className="profile-back-logo"
          onClick={() => navigate("/home")}
          aria-label="Go to home"
        >
          <img src={forgeLogo} alt="EduForge" />
        </button>

        <header className="profile-topbar">
          <div>
            <p>{isOwnProfile ? "Workspace" : "Learner"}</p>
            <h1>{isOwnProfile ? "My Dashboard" : "Profile"}</h1>
          </div>
          <div className="profile-topbar-actions">
            <StatusDots />
            <button type="button" className="profile-secondary-button" onClick={() => navigate("/home")}>
              <span>←</span> Back
            </button>
            {isOwnProfile && (
              <button type="button" className="profile-primary-button" onClick={() => setIsEditing((value) => !value)}>
                <span>{isEditing ? "👁" : "✎"}</span> {isEditing ? "View profile" : "Edit profile"}
              </button>
            )}
            {isOwnProfile && (
              <button type="button" className="profile-danger-button" onClick={handleLogout}>
                <span>⎋</span> Logout
              </button>
            )}
          </div>
        </header>

        {error && <div className="profile-alert profile-alert-error">{error}</div>}
        {message && <div className="profile-alert profile-alert-success">{message}</div>}

        {loading ? (
          <ProfileSkeleton />
        ) : (
          <div className="profile-dashboard-layout">
            <div className="profile-left-col">
              <section className="profile-card profile-identity-card">
                <div className="profile-identity-row">
                  <img
                    src={previewProfile.profile_image_url || forgeLogo}
                    alt={previewProfile.display_name || user}
                    className="profile-avatar"
                  />
                  <div>
                    <div className="profile-name-row">
                      <h2>{previewProfile.display_name || user}</h2>
                      {previewProfile.verified && <span>Verified</span>}
                    </div>
                    <p>{previewProfile.role_title || "Learner"}</p>
                  </div>
                </div>

                <p className="profile-bio-text">
                  {previewProfile.bio || "No bio added yet."}
                </p>

                <dl className="profile-detail-list">
                  <div>
                    <dt>Username</dt>
                    <dd>{previewProfile.username || user}</dd>
                  </div>
                  <div>
                    <dt>Location</dt>
                    <dd>{previewProfile.location || "Not set"}</dd>
                  </div>
                  <div>
                    <dt>Timezone</dt>
                    <dd>{previewProfile.timezone || "Not set"}</dd>
                  </div>
                  <div>
                    <dt>Website</dt>
                    <dd>
                      {previewProfile.website ? (
                        <a href={previewProfile.website} target="_blank" rel="noreferrer">
                          {previewProfile.website}
                        </a>
                      ) : (
                        "Not set"
                      )}
                    </dd>
                  </div>
                </dl>

                <div className="profile-skill-list">
                  {(previewProfile.skills || []).length > 0 ? (
                    previewProfile.skills.map((skill) => <span key={skill}>{skill}</span>)
                  ) : (
                    <EmptyState label="No skills added yet." />
                  )}
                </div>
              </section>

              <section className="profile-card profile-social-card">
                <div className="profile-section-heading">
                  <h2>Links</h2>
                  <p>Connected profiles and personal pages.</p>
                </div>
                <div className="profile-link-list">
                  {socialEntries.length > 0 ? (
                    socialEntries.map((entry) => (
                      <a key={entry.key} href={entry.value} target="_blank" rel="noreferrer">
                        <span>{entry.label}</span>
                        <small>{entry.value}</small>
                      </a>
                    ))
                  ) : (
                    <EmptyState label="No links added yet." />
                  )}
                </div>
              </section>
            </div>

            <div className="profile-right-col">
              {isOwnProfile && isEditing ? (
                <section className="profile-card profile-edit-card">
                  <div className="profile-section-heading">
                    <h2>Edit details</h2>
                    <p>Update what appears on your profile.</p>
                  </div>

                  <div className="profile-form-grid">
                    <label>
                      Username
                      <input name="display_name" value={form.display_name} onChange={handleProfileInput} />
                    </label>
                    <label>
                      Role
                      <input name="role_title" value={form.role_title} onChange={handleProfileInput} />
                    </label>
                    <label>
                      Profile image URL
                      <input name="profile_image_url" value={form.profile_image_url} onChange={handleProfileInput} />
                    </label>
                    <label>
                      Website
                      <input name="website" value={form.website} onChange={handleProfileInput} />
                    </label>
                    <label>
                      Location
                      <input name="location" value={form.location} onChange={handleProfileInput} />
                    </label>
                    <label>
                      Timezone
                      <input name="timezone" value={form.timezone} onChange={handleProfileInput} />
                    </label>
                    <label className="profile-form-wide">
                      Bio
                      <textarea name="bio" value={form.bio} onChange={handleProfileInput} rows="4" />
                    </label>
                  </div>

                  <div className="profile-edit-block">
                    <label htmlFor="profile-skill-input">Skills</label>
                    <div className="profile-skill-editor">
                      <input
                        id="profile-skill-input"
                        value={skillInput}
                        onChange={(event) => setSkillInput(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            addSkill();
                          }
                        }}
                      />
                      <button type="button" onClick={addSkill}>Add</button>
                    </div>
                    <div className="profile-edit-skills">
                      {form.skills.map((skill) => (
                        <button key={skill} type="button" onClick={() => removeSkill(skill)}>
                          {skill} x
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="profile-edit-block">
                    <p className="profile-edit-label">Social links</p>
                    <div className="profile-form-grid">
                      {Object.keys(EMPTY_SOCIALS).map((key) => (
                        <label key={key}>
                          {SOCIAL_LABELS[key]}
                          <input
                            name={key}
                            value={formSocials[key] || ""}
                            onChange={handleSocialInput}
                          />
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="profile-edit-block" style={{ borderTopColor: 'rgba(239, 68, 68, 0.2)' }}>
                    <p className="profile-edit-label" style={{ color: '#ef4444' }}>Danger zone</p>
                    <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px', marginBottom: '16px' }}>Permanently reset your learning data or completely delete your account.</p>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      <button 
                        type="button" 
                        className="profile-danger-button" 
                        onClick={() => { setShowDeleteModal('data'); setConfirmText(''); setCopied(false); }}
                        style={{ flex: 1, justifyContent: 'center' }}
                      >
                        Reset Learning Data
                      </button>
                      <button 
                        type="button" 
                        className="profile-danger-button" 
                        onClick={() => { setShowDeleteModal('account'); setConfirmText(''); setCopied(false); }}
                        style={{ flex: 1, justifyContent: 'center' }}
                      >
                        Delete Account
                      </button>
                    </div>
                  </div>

                  <div className="profile-edit-actions">
                    <button type="button" className="profile-secondary-button" onClick={() => setIsEditing(false)}>
                      Cancel
                    </button>
                    <button type="button" className="profile-primary-button" onClick={saveProfile} disabled={saving}>
                      {saving ? "Saving..." : "Save changes"}
                    </button>
                  </div>
                </section>
              ) : (
                <>
                  <section className="profile-card profile-stats-card">
                    <div className="profile-section-heading">
                      <h2>Learning stats</h2>
                      <p>Current progress from your watch time, streak, and notes.</p>
                    </div>

                    <div className="profile-stat-grid">
                      <div>
                        <span>XP</span>
                        <strong>{stats.xp?.score || 1}</strong>
                        <small>Level {stats.xp?.level || 1}</small>
                      </div>
                      <div>
                        <span>Streak</span>
                        <strong>{calculateDynamicStreak(stats.streak, stats.streak_dates)}</strong>
                        <small>days</small>
                      </div>
                      <div>
                        <span>Watch time</span>
                        <strong>{formatTime(stats.xp?.watch_time_seconds || 0)}</strong>
                        <small>H:M:S</small>
                      </div>
                      <div>
                        <span>Next level</span>
                        <strong>{stats.xp?.next_level_at || 0}</strong>
                        <small>XP</small>
                      </div>
                    </div>

                    <div className="profile-progress-row">
                      <div>
                        <span>Level progress</span>
                        <strong>{Math.round(xpPercent)}%</strong>
                      </div>
                      <div className="profile-progress-track">
                        <span style={{ width: `${xpPercent}%` }} />
                      </div>
                    </div>
                  </section>

                  <section className="profile-card profile-heatmap-section">
                    <div className="profile-section-heading">
                      <h2>Activity heatmap</h2>
                      <p>Login consistency for the current year.</p>
                    </div>
                    <Heatmap username={profile.username || targetUser} />
                  </section>

                  <section className="profile-card profile-list-card">
                    <div className="profile-tabs-header">
                      {isOwnProfile ? (
                        <>
                          <button 
                            type="button" 
                            className={`profile-tab-btn ${activeTab === 'roadmaps' ? 'active' : ''}`}
                            onClick={() => setActiveTab('roadmaps')}
                          >
                            Saved Roadmaps
                          </button>
                          <button 
                            type="button" 
                            className={`profile-tab-btn ${activeTab === 'watched' ? 'active' : ''}`}
                            onClick={() => setActiveTab('watched')}
                          >
                            Recently Watched
                          </button>
                          <button 
                            type="button" 
                            className={`profile-tab-btn ${activeTab === 'notes' ? 'active' : ''}`}
                            onClick={() => setActiveTab('notes')}
                          >
                            Recent Notes
                          </button>
                        </>
                      ) : (
                        <button 
                          type="button" 
                          className="profile-tab-btn active"
                        >
                          Recent Notes
                        </button>
                      )}
                    </div>

                    <div className="profile-tab-content">
                      {isOwnProfile && activeTab === 'roadmaps' && (
                        <>
                          <div className="profile-section-heading">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                              <div>
                                <h2>Saved Roadmaps</h2>
                                <p>Your custom learning paths and generated canvases.</p>
                              </div>
                              <button 
                                className="profile-secondary-button" 
                                onClick={() => navigate("/roadmap")}
                                style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                              >
                                Open Canvas
                              </button>
                            </div>
                          </div>
                          <div className="profile-activity-list">
                            {savedRoadmaps.length > 0 ? (
                              savedRoadmaps.map((item) => (
                                <article 
                                  key={item.id} 
                                  className="clickable-item"
                                  onClick={() => navigate("/roadmap")}
                                  style={{ cursor: 'pointer' }}
                                >
                                  <div>
                                    <h3>{item.title}</h3>
                                    <p>{item.skill || "Custom Path"}</p>
                                  </div>
                                  <span>{item.nodes?.length || 0} Steps</span>
                                </article>
                              ))
                            ) : (
                              <EmptyState label="No roadmaps saved yet." />
                            )}
                          </div>
                        </>
                      )}

                      {isOwnProfile && activeTab === 'watched' && (
                        <>
                          <div className="profile-section-heading">
                            <h2>Recently watched</h2>
                            <p>Videos logged from real watch sessions.</p>
                          </div>

                          {recentVideos.length > 0 && (
                            <div className="profile-search-container">
                              <div className="profile-search-wrapper">
                                <FiSearch />
                                <input 
                                  type="text" 
                                  placeholder="Search watched videos..." 
                                  className="profile-search-input"
                                  value={videoSearchTerm}
                                  onChange={(e) => setVideoSearchTerm(e.target.value)}
                                />
                                {videoSearchTerm && (
                                  <button className="profile-clear-btn" onClick={() => setVideoSearchTerm("")}>
                                    &times;
                                  </button>
                                )}
                              </div>
                            </div>
                          )}

                          <div className="profile-activity-list profile-activity-list-scrollable">
                            {recentVideos.length > 0 ? (
                              filteredVideos.length > 0 ? (
                                filteredVideos.map((item) => (
                                  <article 
                                    key={item.id} 
                                    className={item.reference_id ? "clickable-item" : ""}
                                    onClick={() => handleActivityClick(item.reference_id)}
                                    style={item.reference_id ? { cursor: 'pointer' } : {}}
                                  >
                                    <div>
                                      <h3>{item.title}</h3>
                                      <p>{item.subtitle}</p>
                                    </div>
                                    <span>{item.status}</span>
                                  </article>
                                ))
                              ) : (
                                <EmptyState label="No matching videos found." />
                              )
                            ) : (
                              <EmptyState label="No videos watched yet." />
                            )}
                          </div>
                        </>
                      )}

                      {(!isOwnProfile || activeTab === 'notes') && (
                        <>
                          <div className="profile-section-heading">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                              <div>
                                <h2>Recent notes</h2>
                                <p>Latest saved notes from your learning sessions.</p>
                              </div>
                              {isOwnProfile && (
                                <button 
                                  className="profile-secondary-button" 
                                  onClick={() => navigate("/notes")}
                                  style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                                >
                                  View All
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="profile-activity-list profile-activity-list-scrollable">
                            {recentNotes.length > 0 ? (
                              recentNotes.map((item) => (
                                <article 
                                  key={item.id}
                                  className={item.reference_id ? "clickable-item" : ""}
                                  onClick={() => item.reference_id && navigate(`/notes/${targetUser}/${item.reference_id}`)}
                                  style={item.reference_id ? { cursor: 'pointer' } : {}}
                                >
                                  <div>
                                    <h3>{item.title}</h3>
                                    <p>{item.subtitle}</p>
                                  </div>
                                  <span>{item.status}</span>
                                </article>
                              ))
                            ) : (
                              <EmptyState label="No notes taken yet." />
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </section>
                </>
              )}
            </div>
          </div>
        )}

        <footer className="profile-minimal-footer">
          <Link to="/about">About EduForge</Link>
          <span className="separator">•</span>
          <a href="https://github.com/saharshbaiju/EduForge" target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
          <span className="separator">•</span>
          <Link to="/privacy">Privacy Policy</Link>
          <span className="separator">•</span>
          <Link to="/terms">Terms of Conditions</Link>
        </footer>
      </main>

      {showDeleteModal && (
        <div className="profile-modal-overlay">
          <div className="profile-modal-content">
            <div className="profile-modal-icon">⚠️</div>
            <h3>{showDeleteModal === 'account' ? 'Delete Account?' : 'Reset Learning Data?'}</h3>
            <p>
              {showDeleteModal === 'account' 
                ? "This action is completely irreversible. All of your saved roadmaps, notes, watch time, and profile data will be permanently wiped."
                : "This will reset your level, XP, streak, and delete all of your saved roadmaps, notes, and activity history. Your profile details will remain."
              }
            </p>
            
            <div className="profile-modal-phrase-box">
              <strong>{showDeleteModal === 'account' ? 'deleteaccountconfirmed' : 'deletedataconfirmed'}</strong>
              <button 
                type="button" 
                className="profile-modal-copy-btn"
                onClick={() => {
                  navigator.clipboard.writeText(showDeleteModal === 'account' ? 'deleteaccountconfirmed' : 'deletedataconfirmed');
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                title="Copy to clipboard"
              >
                {copied ? <FiCheck /> : <FiCopy />}
              </button>
            </div>

            <div className="profile-modal-input-group">
              <input 
                type="text" 
                className="profile-modal-input" 
                placeholder={`Type "${showDeleteModal === 'account' ? 'deleteaccountconfirmed' : 'deletedataconfirmed'}" to confirm`}
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                autoComplete="off"
              />
            </div>

            <div className="profile-modal-actions">
              <button 
                type="button"
                className="btn-cancel-modal" 
                onClick={() => { setShowDeleteModal(null); setConfirmText(""); }}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button 
                type="button"
                className="btn-confirm-delete" 
                onClick={showDeleteModal === 'account' ? handleDeleteAccount : handleDeleteData}
                disabled={isDeleting || confirmText !== (showDeleteModal === 'account' ? 'deleteaccountconfirmed' : 'deletedataconfirmed')}
              >
                {isDeleting ? "Processing..." : "Yes, I am sure"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
