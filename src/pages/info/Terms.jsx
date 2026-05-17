import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiShield, FiAlertTriangle, FiInfo, FiLock, FiCpu } from 'react-icons/fi';
import Background from '../../components/background/Background';
import './info.css';

const Terms = () => {
    const navigate = useNavigate();

    return (
        <div className="info-page">
            <Background />
            <div className="info-container terms-container">
                <button className="btn-icon back-top" onClick={() => navigate(-1)}>
                    <FiArrowLeft /> Back
                </button>

                <header className="info-header">
                    <h1>Terms & Conditions</h1>
                    <p className="subtitle">Last Updated: May 2026</p>
                </header>

                <div className="terms-content">
                    <section>
                        <p>Welcome to EduForge. By accessing or using the platform, you agree to comply with these Terms & Conditions. Please read them carefully before using the service.</p>
                    </section>

                    <section>
                        <h2><FiInfo /> User Responsibilities</h2>
                        <ul>
                            <li>Provide accurate account information</li>
                            <li>Maintain account security</li>
                            <li>Use the platform responsibly</li>
                            <li>Follow applicable laws and regulations</li>
                        </ul>
                        <p>Users are responsible for all content they upload or share.</p>
                    </section>

                    <section>
                        <h2><FiAlertTriangle /> Acceptable Use</h2>
                        <p>Users may not:</p>
                        <ul>
                            <li>Upload malicious software</li>
                            <li>Attempt unauthorized access</li>
                            <li>Harass or abuse others</li>
                            <li>Share illegal or copyrighted material</li>
                            <li>Exploit vulnerabilities</li>
                            <li>Spam or misuse platform services</li>
                        </ul>
                        <p>Violations may result in account suspension or termination.</p>
                    </section>

                    <section>
                        <h2><FiShield /> Platform Scope</h2>
                        <p>EduForge is a productivity and learning assistance platform.</p>
                        <p>We do not directly provide, sell, certify, or guarantee academic courses, degrees, official certifications, or licensed educational programs. All educational content is intended only for learning support and productivity assistance.</p>
                    </section>

                    <section>
                        <h2><FiAlertTriangle /> Community Guidelines</h2>
                        <p>Strictly prohibited: Abusive behavior, hate speech, harassment, threats, bullying, impersonation, spamming, or inappropriate content. EduForge reserves the right to remove violating content or suspend accounts.</p>
                    </section>

                    <section>
                        <h2><FiLock /> Account Security</h2>
                        <p>Users are responsible for protecting their credentials. EduForge is not liable for unauthorized access caused by weak passwords, shared credentials, or user negligence.</p>
                    </section>

                    <section>
                        <h2>Privacy</h2>
                        <p>EduForge may collect account information, usage analytics, uploaded educational content, and security logs. We do not sell personal user data to third parties.</p>
                    </section>

                    <section>
                        <h2>Intellectual Property</h2>
                        <p>All EduForge branding, design assets, and platform features belong to EduForge unless otherwise stated. Users retain ownership of uploaded content while granting EduForge permission to process content necessary for platform functionality.</p>
                    </section>

                    <section>
                        <h2><FiCpu /> Future Features</h2>
                        <p>EduForge may introduce AI-powered tools and learning assistance features in future updates.</p>
                        <p>Any future AI-generated recommendations or automated features may occasionally contain inaccuracies, and users should independently verify important educational or factual information. EduForge is not responsible for decisions made solely using AI-generated outputs.</p>
                    </section>

                    <section>
                        <h2>Service Availability</h2>
                        <p>EduForge strives to maintain reliable uptime, but uninterrupted service cannot be guaranteed. We reserve the right to modify features, perform maintenance, or temporarily suspend services without prior notice.</p>
                    </section>

                    <section>
                        <h2>Limitation of Liability</h2>
                        <p>EduForge is provided on an “as-is” basis. We are not liable for data loss, academic outcomes, downtime, or third-party integrations.</p>
                    </section>

                    <section className="terms-footer-contact">
                        <p>Contact Information: <a href="mailto:serviceforensic5@gmail.com">serviceforensic5@gmail.com</a></p>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default Terms;
