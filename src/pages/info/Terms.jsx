import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import Background from '../../components/background/Background';
import './info.css';

const Terms = () => {
    const navigate = useNavigate();

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="info-page">
            <Background />
            <div className="info-container">
                <button className="back-top" onClick={() => navigate(-1)}>
                    <FiArrowLeft /> Back
                </button>

                <header className="info-header">
                    <h1>Terms of Service</h1>
                    <p className="subtitle">Last Updated: May 2026</p>
                </header>

                <div className="terms-content">
                    <section>
                        <p>Welcome to EduForge. By accessing or using our platform, you agree to comply with these terms. Please read them carefully.</p>
                    </section>

                    <section>
                        <h2>User Responsibilities</h2>
                        <ul>
                            <li>Provide accurate account information.</li>
                            <li>Maintain the security of your account.</li>
                            <li>Use the platform responsibly and legally.</li>
                            <li>You are responsible for all content you share.</li>
                        </ul>
                    </section>

                    <section>
                        <h2>Acceptable Use</h2>
                        <p>We expect all users to respect the community. Prohibited actions include:</p>
                        <ul>
                            <li>Uploading malicious software or exploits.</li>
                            <li>Harassing, abusing, or threatening others.</li>
                            <li>Sharing illegal or copyrighted material.</li>
                            <li>Spamming or misusing platform services.</li>
                        </ul>
                    </section>

                    <section>
                        <h2>Platform Scope</h2>
                        <p>EduForge is a productivity and learning assistance platform. We do not directly provide academic degrees or official certifications. All content is intended for learning support.</p>
                    </section>

                    <section>
                        <h2>Account Security</h2>
                        <p>You are responsible for protecting your credentials. EduForge is not liable for unauthorized access resulting from user negligence.</p>
                    </section>

                    <section>
                        <h2>Privacy & Data</h2>
                        <p>We collect minimal data necessary for platform functionality and security. We do not sell your personal data to third parties.</p>
                    </section>

                    <section>
                        <h2>Intellectual Property</h2>
                        <p>EduForge branding and platform features are owned by us. Users retain ownership of their uploaded content but grant us permission to process it for platform services.</p>
                    </section>

                    <section>
                        <h2>Future Features & AI</h2>
                        <p>We may introduce AI-powered tools. While we strive for accuracy, AI-generated content should be independently verified by users.</p>
                    </section>

                    <section>
                        <h2>Service Availability</h2>
                        <p>We strive for high uptime but cannot guarantee uninterrupted service. We reserve the right to modify or suspend services for maintenance.</p>
                    </section>

                    <section className="terms-footer-contact">
                        <p>Questions about our terms? Contact us at <a href="mailto:serviceforensic5@gmail.com">serviceforensic5@gmail.com</a></p>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default Terms;
