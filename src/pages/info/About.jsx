import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiTarget, FiZap, FiBox, FiCloud, FiActivity, FiUsers, FiSearch, FiMonitor } from 'react-icons/fi';
import Background from '../../components/background/Background';
import StatusDots from '../../components/status/StatusDots';
import './info.css';

const About = () => {
    const navigate = useNavigate();

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="info-page">
            <Background />
            <div className="info-container">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <button className="back-top" onClick={() => navigate(-1)} style={{ marginBottom: 0 }}>
                        <FiArrowLeft /> Back
                    </button>
                    <StatusDots />
                </div>

                <header className="info-header">
                    <h1>Quality Learning, Curated Smarter</h1>
                    <p className="subtitle">EduForge helps students discover high-quality educational content, share notes, and connect with other learners through a focused and distraction-free platform.</p>
                </header>

                <section className="info-section">
                    <div className="section-card">
                        <h2><FiTarget /> Mission</h2>
                        <p>EduForge was created to solve the problem of information overload in online learning. Instead of wasting hours searching through low-quality or distracting videos, students can access carefully filtered educational content, share notes, and collaborate with other learners in one unified platform.</p>
                    </div>
                </section>

                <section className="info-section">
                    <h2><FiBox /> Core Features</h2>
                    <div className="features-grid">
                        <div className="feature-item">
                            <FiSearch />
                            <h3>Curated Content</h3>
                            <p>Hand-picked educational YouTube content for focused learning.</p>
                        </div>
                        <div className="feature-item">
                            <FiZap />
                            <h3>Smart Filtering</h3>
                            <p>Advanced filtering of high-quality learning resources.</p>
                        </div>
                        <div className="feature-item">
                            <FiActivity />
                            <h3>Notebook Sharing</h3>
                            <p>Easily share and collaborate on digital notebooks.</p>
                        </div>
                        <div className="feature-item">
                            <FiUsers />
                            <h3>Student Network</h3>
                            <p>Connect with peers and learn together.</p>
                        </div>
                        <div className="feature-item">
                            <FiMonitor />
                            <h3>Distraction-Free</h3>
                            <p>A clean environment optimized for deep work.</p>
                        </div>
                        <div className="feature-item">
                            <FiCloud />
                            <h3>Productivity Tools</h3>
                            <p>Tools designed to streamline your study workflow.</p>
                        </div>
                    </div>
                </section>

                <section className="info-section">
                    <div className="section-card">
                        <h2>Vision</h2>
                        <p>We envision a future where students spend less time searching and more time learning, collaborating, and sharing knowledge through curated educational content and connected learning communities.</p>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default About;
