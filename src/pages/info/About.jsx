import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiTarget, FiZap, FiBox, FiCloud, FiActivity, FiUsers, FiSearch, FiMonitor } from 'react-icons/fi';
import Background from '../../components/background/Background';
import './info.css';

const About = () => {
    const navigate = useNavigate();

    return (
        <div className="info-page">
            <Background />
            <div className="info-container">
                <button className="btn-icon back-top" onClick={() => navigate(-1)}>
                    <FiArrowLeft /> Back
                </button>

                <header className="info-header">
                    <h1>Quality Learning, Curated Smarter</h1>
                    <p className="subtitle">EduForge helps students discover high-quality educational content from YouTube, share notebooks, and connect with other learners through a focused and distraction-free learning platform.</p>
                </header>

                <section className="info-section">
                    <div className="section-card">
                        <h2><FiTarget /> Mission</h2>
                        <p>EduForge was created to solve the problem of information overload in online learning. Instead of wasting hours searching through low-quality or distracting videos, students can access carefully filtered educational content, share notes and notebooks, and collaborate with other learners in one unified platform.</p>
                    </div>
                </section>

                <section className="info-section">
                    <h2><FiBox /> What We Offer</h2>
                    <div className="features-grid">
                        <div className="feature-item">
                            <FiSearch />
                            <h3>Curated Content</h3>
                            <p>Curated educational YouTube content</p>
                        </div>
                        <div className="feature-item">
                            <FiZap />
                            <h3>Smart Filtering</h3>
                            <p>Smart filtering of high-quality learning resources</p>
                        </div>
                        <div className="feature-item">
                            <FiActivity />
                            <h3>Notebook Sharing</h3>
                            <p>Notebook and note sharing</p>
                        </div>
                        <div className="feature-item">
                            <FiUsers />
                            <h3>Student Networking</h3>
                            <p>Student networking and collaboration</p>
                        </div>
                        <div className="feature-item">
                            <FiBox />
                            <h3>Organized Learning</h3>
                            <p>Organized subject-based learning</p>
                        </div>
                        <div className="feature-item">
                            <FiMonitor />
                            <h3>Distraction-Free</h3>
                            <p>Distraction-free study environment</p>
                        </div>
                        <div className="feature-item">
                            <FiCloud />
                            <h3>Productivity Tools</h3>
                            <p>Productivity-focused tools for students</p>
                        </div>
                    </div>
                </section>

                <section className="info-section">
                    <div className="section-card">
                        <h2>Vision</h2>
                        <p>We envision a future where students spend less time searching and more time learning, collaborating, and sharing knowledge through curated educational content and connected learning communities.</p>
                        <p style={{ marginTop: '20px', fontSize: '0.95rem', color: '#94a3b8', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '20px' }}>
                            In the future, EduForge may introduce AI-powered features and smarter learning tools to further improve the student learning experience.
                        </p>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default About;
