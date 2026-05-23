import { useState, useEffect } from 'react';
import { MdPalette } from 'react-icons/md';
import { FiX, FiCheck } from 'react-icons/fi';
import './ThemeSelector.css';

const THEMES = [
  { id: 0, name: "Default Dark", mood: "Distraction-free dark productivity", colors: ["#0c0c0e", "#3b82f6", "#1a1a1e"] },
  { id: 1, name: "Neon Scholar", mood: "Futuristic cyberpunk engineering lab", colors: ["#020205", "#00f2fe", "#050a14"] },
  { id: 2, name: "Midnight Matrix", mood: "Elite hacker workstation aesthetic", colors: ["#040805", "#00ff66", "#08100c"] },
  { id: 3, name: "Frost Glass", mood: "Apple-inspired operating system UI", colors: ["#eef2f6", "#0071e3", "#ffffff"] },
  { id: 4, name: "Quantum Purple", mood: "AI intelligence & research layout", colors: ["#05030a", "#d946ef", "#150b28"] },
  { id: 5, name: "Solar Gold", mood: "Luxury prestige learning system", colors: ["#121214", "#d4af37", "#1e1e22"] },
  { id: 6, name: "Ocean Deep", mood: "Calming deep focus workspace", colors: ["#030b16", "#00b4d8", "#0d1e36"] },
  { id: 7, name: "Crimson Velocity", mood: "High-performance racing dashboard", colors: ["#050507", "#ff003c", "#16161c"] },
  { id: 8, name: "Retro Synthwave", mood: "Creative futuristic nostalgia", colors: ["#120320", "#ff007f", "#220b39"] },
  { id: 9, name: "Forest Academia", mood: "Elite academic university library", colors: ["#08120c", "#b89047", "#fbf9f4"] },
  { id: 10, name: "Monochrome Minimal", mood: "Ultra clean distraction-free OS", colors: ["#000000", "#ffffff", "#121212"] }
];

export default function ThemeSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTheme, setActiveTheme] = useState(0);

  useEffect(() => {
    // Read theme from localStorage on initial render
    const savedTheme = localStorage.getItem("eduforge-theme") || "theme-0";
    const themeId = parseInt(savedTheme.replace("theme-", ""), 10);
    if (!isNaN(themeId) && themeId >= 0 && themeId <= 10) {
      setActiveTheme(themeId);
      applyThemeClass(themeId);
    } else {
      setActiveTheme(0);
      applyThemeClass(0);
    }
  }, []);

  const applyThemeClass = (id) => {
    const classes = document.body.className.split(' ').filter(c => !c.startsWith('theme-'));
    classes.push(`theme-${id}`);
    document.body.className = classes.join(' ').trim();
  };

  const handleSelectTheme = (id) => {
    setActiveTheme(id);
    applyThemeClass(id);
    localStorage.setItem("eduforge-theme", `theme-${id}`);
  };

  return (
    <>
      <button 
        className="theme-floating-btn" 
        onClick={() => setIsOpen(true)} 
        title="Customize Theme"
        aria-label="Customize Theme"
      >
        <MdPalette size={22} />
      </button>

      {isOpen && (
        <div className="theme-modal-overlay" onClick={() => setIsOpen(false)}>
          <div className="theme-modal-content" onClick={e => e.stopPropagation()}>
            <button className="theme-modal-close" onClick={() => setIsOpen(false)} aria-label="Close menu">
              <FiX size={18} />
            </button>
            
            <div className="theme-modal-header">
              <div className="theme-icon-wrapper">
                <MdPalette size={24} />
              </div>
              <h3>Premium Themes</h3>
            </div>
            
            <p className="theme-note">
              Choose an immersive background environment designed for focused building and study.
            </p>

            <div className="themes-grid-container">
              {THEMES.map((t) => (
                <div 
                  key={t.id} 
                  className={`theme-card-option ${activeTheme === t.id ? 'active' : ''}`}
                  onClick={() => handleSelectTheme(t.id)}
                >
                  <div className="theme-card-info">
                    <div className="theme-card-title-row">
                      <span className="theme-card-name">{t.name}</span>
                      {activeTheme === t.id && (
                        <span className="theme-active-indicator">
                          <FiCheck size={14} />
                        </span>
                      )}
                    </div>
                    <span className="theme-card-mood">{t.mood}</span>
                  </div>
                  
                  <div className="theme-colors-preview">
                    {t.colors.map((color, index) => (
                      <span 
                        key={index} 
                        className="theme-color-dot" 
                        style={{ backgroundColor: color }}
                        title={index === 0 ? "Background" : index === 1 ? "Accent" : "Surface"}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
