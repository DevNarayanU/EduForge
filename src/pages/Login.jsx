import React, { useState } from "react";
import Background from "../components/background/Background";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { fetchApi } from "../services/api";
import { supabase } from "../services/supabaseClient";
import StatusDots from "../components/status/StatusDots";

function Login({ setuser }) {

    const navigate = useNavigate();
    const location = useLocation();
    const [username, setusername] = useState("");
    const [password, setpassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    async function handleLogin(e) {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        try {
            const res = await fetchApi('login', { username, password }, 'POST');

            const data = await res.json();

            if (res.ok) {
                setuser(username.toLowerCase());
                navigate("/" , {state :{ message : "Login Successful!!"}})
                console.log("SETTING USER:", username.toLowerCase());
            } else {
                setError(data.error || "Login failed");
            }
        } catch {
            setError("Server connection failed!!!");
        } finally {
            setIsLoading(false);
        }
    }

    async function handleGoogleLogin() {
        setError("");
        setIsLoading(true);
        try {
            // Save current redirect destination or default to /home
            const redirectPath = location.state?.from || "/home";
            localStorage.setItem("oauth_redirect_path", redirectPath);

            const appUrl = import.meta.env.VITE_APP_URL || window.location.origin;
            const { error: oauthError } = await supabase.auth.signInWithOAuth({
                provider: "google",
                options: {
                    redirectTo: `${appUrl}/auth/callback`,
                    queryParams: {
                        access_type: "offline",
                        prompt: "consent"
                    }
                }
            });
            if (oauthError) throw oauthError;
        } catch (err) {
            setError(err.message || "Failed to initiate Google sign-in.");
            setIsLoading(false);
        }
    }

    return (
        <>
            <Background />
            
            <img onClick={() => navigate("/")} className="logo" src="/forge.png" alt="logo" />

            <div className="login-wrapper">
                <div className="dynamic-scroll-container">
                    <div className="scroll-content">
                        <img src="/cover1.png" alt="scroll" />
                        <img src="/cover2.png" alt="scroll" />
                        <img src="/cover2.png" alt="scroll" />
                        <img src="/cover1.png" alt="scroll" />

                        {/* infinite scroll */}
                        <img src="/cover1.png" alt="scroll" />
                        <img src="/cover2.png" alt="scroll" />
                        <img src="/cover2.png" alt="scroll" />
                        <img src="/cover1.png" alt="scroll" />
                    </div>
                </div>

                <div className="login-container">
                    <h1>Welcome.</h1>
                    <p>
                        <Link to="/signup"><b>Create a free account</b></Link> or log in to get started.
                    </p>

                    <form className="login-form" onSubmit={handleLogin}>

                        <label htmlFor="username">Username</label>
                        <input
                            type="text"
                            id="username"
                            placeholder="Enter username"
                            value={username}
                            onChange={(e) => setusername(e.target.value)}
                            className={error.includes("user") ? "input-error" : ""}
                            autocomplete="username"
                            disabled={isLoading}
                            required
                        />
                        {error.toLowerCase().includes("user") && (
                          <span className="field-error">{error}</span>
                        )}

                        <label htmlFor="login-pass">Password</label>
                        <input
                            type="password"
                            id="login-pass"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setpassword(e.target.value)}
                            className={error.includes("Password") ? "input-error" : ""}
                            autocomplete="current-password"
                            disabled={isLoading}
                            required
                        />
                        
                        {error.toLowerCase().includes("Password") && (
                            <span className="field-error">{error}</span>
                        )}

                        {error && 
                        !error.toLowerCase().includes("user") && 
                        !error.toLowerCase().includes("Password") && (
                            <div className="error-container">
                                <p className="error-text">{error}</p>
                            </div>
                        )}

                        <button type="submit" disabled={isLoading}>
                            {isLoading ? "Logging in..." : "Log In"}
                        </button>
                    </form>

                    <div className="oauth-divider">or</div>

                    <button 
                        type="button" 
                        className="google-oauth-btn" 
                        onClick={handleGoogleLogin}
                        disabled={isLoading}
                    >
                        <span className="google-icon">
                            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                            </svg>
                        </span>
                        Continue with Google
                    </button>

                    <div className="login-status">
                        <StatusDots />
                    </div>
                </div>
            </div>
        </>
    );
}

export default Login;
