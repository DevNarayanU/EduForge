import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiMail, FiClock, FiMessageCircle, FiSend } from 'react-icons/fi';
import Background from '../../components/background/Background';
import './info.css';

const Contact = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: ''
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        // Construct mailto link
        const body = `Name: ${formData.name}%0D%0AEmail: ${formData.email}%0D%0A%0D%0AMessage:%0D%0A${formData.message}`;
        window.location.href = `mailto:serviceforensic5@gmail.com?subject=${encodeURIComponent(formData.subject)}&body=${body}`;
    };

    return (
        <div className="info-page">
            <Background />
            <div className="info-container">
                <button className="btn-icon back-top" onClick={() => navigate(-1)}>
                    <FiArrowLeft /> Back
                </button>

                <header className="info-header">
                    <h1>We’d Love to Hear From You</h1>
                    <p className="subtitle">Questions, feedback, feature requests, or support — feel free to reach out anytime.</p>
                </header>

                <div className="contact-layout">
                    <div className="contact-info">
                        <div className="info-block">
                            <FiMail />
                            <h3>Support Email</h3>
                            <p><a href="mailto:serviceforensic5@gmail.com">serviceforensic5@gmail.com</a></p>
                        </div>
                        <div className="info-block">
                            <FiClock />
                            <h3>Response Time</h3>
                            <p>Usually within 24–48 hours.</p>
                        </div>
                        <div className="info-block note-block">
                            <FiMessageCircle />
                            <p>Our team continuously improves EduForge based on community feedback.</p>
                        </div>
                    </div>

                    <form className="contact-form" onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label>Full Name</label>
                            <input 
                                type="text" 
                                required 
                                value={formData.name}
                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                                placeholder="Your Name"
                            />
                        </div>
                        <div className="form-group">
                            <label>Email Address</label>
                            <input 
                                type="email" 
                                required 
                                value={formData.email}
                                onChange={(e) => setFormData({...formData, email: e.target.value})}
                                placeholder="your@email.com"
                            />
                        </div>
                        <div className="form-group">
                            <label>Subject</label>
                            <input 
                                type="text" 
                                required 
                                value={formData.subject}
                                onChange={(e) => setFormData({...formData, subject: e.target.value})}
                                placeholder="What is this about?"
                            />
                        </div>
                        <div className="form-group">
                            <label>Message</label>
                            <textarea 
                                required 
                                rows="5"
                                value={formData.message}
                                onChange={(e) => setFormData({...formData, message: e.target.value})}
                                placeholder="Your message..."
                            ></textarea>
                        </div>
                        <button type="submit" className="btn-primary btn-send">
                            <FiSend /> Send Message
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Contact;
