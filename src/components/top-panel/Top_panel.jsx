import "./Top_panel.css"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom";
const forgeLogo = "/forge.png";
import searchIcon from "../../assets/search.svg";
import { FiFileText, FiAward, FiMap } from "react-icons/fi";
import StatusDots from "../status/StatusDots";

export default function Top_panel({ initialQuery, profileImage }){
    const [input,setinput] = useState(initialQuery||"");
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    const navigate = useNavigate();

    const toProfile = () =>{
        navigate("/profile");
    }

    useEffect(() => {
        setinput(initialQuery || "");
    }, [initialQuery]);
    
    const handlesubmit = (e) => {
        e.preventDefault();
        if (!input.trim()) return;
        navigate(`/home?query=${encodeURIComponent(input)}`);
        setIsSearchOpen(false);
    }

    return(
        <div className={`top-panel ${isSearchOpen ? 'search-active' : ''}`}>
            <div className="top-panel-logo" onClick={() => navigate("/")} style={{cursor: 'pointer'}}>
                <img src={forgeLogo} alt="EduForge" />
            </div>

            <form onSubmit={handlesubmit} className="search-form">
                <div className="wrapper-top">
                    <input type="search" 
                    value={input}
                    onChange={(e) => setinput(e.target.value)}
                    placeholder="Search skills"
                    className="home-search" />
                    <button type="submit" className="search-button">
                        <img src={searchIcon} alt="search" />
                    </button>
                </div>
            </form>

            <div className="top-panel-actions">
                <StatusDots />

                <button 
                    className="mobile-search-toggle" 
                    onClick={() => setIsSearchOpen(true)}
                    aria-label="Open search"
                >
                    <img src={searchIcon} alt="search" />
                </button>

                {isSearchOpen && (
                    <button 
                        className="mobile-search-close" 
                        onClick={() => setIsSearchOpen(false)}
                        aria-label="Close search"
                    >
                        &times;
                    </button>
                )}

                <button 
                    className="top-panel-notes-btn" 
                    onClick={() => navigate("/notes")}
                    title="My Notes"
                >
                    <FiFileText size={20} />
                </button>

                <button 
                    className="top-panel-leaderboard-btn" 
                    onClick={() => navigate("/leaderboard")}
                    title="Leaderboard"
                >
                    <FiAward size={20} />
                </button>

                <button 
                    className="top-panel-roadmap-btn" 
                    onClick={() => navigate("/roadmap")}
                    title="AI Roadmap"
                >
                    <FiMap size={20} />
                </button>

                <button className="profile" onClick={toProfile}>
                    {profileImage && <img src={profileImage} alt="profile" style={{width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover'}} />}
                </button>
            </div>
        </div>
    )
}
