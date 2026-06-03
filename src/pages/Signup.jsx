import React, { useState } from "react";
import Background from "../components/background/Background";
import { Link, useNavigate } from "react-router-dom";
import { fetchApi } from "../services/api";
import { supabase } from "../services/supabaseClient";
import StatusDots from "../components/status/StatusDots";

function Signup(){

    const navigate = useNavigate();

    const [username,setusername] = useState("");
    const [password,setpassword] = useState("");
    const [repassword,setrepassword] = useState("");
    const [error, setError ] = useState("");
    const [acceptTerms, setAcceptTerms] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    async function handleSignUp(e) {
        e.preventDefault();
        setError("");

        if (!acceptTerms) {
            setError("You must agree to the Terms of Conditions to create an account.");
            return;
        }

        if (!username || username.trim() === "") {
            setError("Username is required.");
            return;
        }

        if (username.length < 3) {
            setError("Username must be at least 3 characters.");
            return;
        }

        if (username.length > 20) {
            setError("Username must be at most 20 characters.");
            return;
        }

        const usernameRegex = /^[a-z0-9_]+$/;
        if (!usernameRegex.test(username)) {
            setError("Username can only contain lowercase letters, numbers, and underscores (no spaces or capitals).");
            return;
        }

        if (!password) {
            setError("Password is required.");
            return;
        }

        if (password.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }

        if (password !== repassword) {
            setError("Passwords do not match.");
            return;
        }

        setIsLoading(true);
        try {
            const res = await fetchApi('signup', { username, password }, 'POST');
            const data = await res.json();
            if (res.ok) {
                navigate("/login", { state: { message: "Account created successfully!" } });
            } else {
                setError(data.error || "Signup failed");
            }
        } catch {
            setError("Server connection failed!!!");
        } finally {
            setIsLoading(false);
        }
    };

    async function handleGoogleSignUp() {
        setError("");

        if (!acceptTerms) {
            setError("You must agree to the Terms of Conditions to create an account.");
            return;
        }

        setIsLoading(true);
        try {
            localStorage.setItem("oauth_redirect_path", "/home");

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
            setError(err.message || "Failed to initiate Google sign-up.");
            setIsLoading(false);
        }
    }

    const isMatch = password === repassword;
    const isTypingConfirm = repassword.length > 0;
    return(

        <>
                    <img onClick={() => navigate("/")} className="logo" src="/forge.png" alt="logo" />

        <Background/>
        
        <div className="signup-wrapper">
            <div className="dynamic-scroll-container">
                <div className="scroll-content">
                    <img src="/cover1.png" alt="scroll image" />
                    <img src="/cover2.png" alt="scroll image" />


                    {/* for infinite scroll */}

                    <img src="/cover1.png" alt="scroll image" />
                    <img src="/cover2.png" alt="scroll image" />
                </div>
            </div>   
            <div className="signup-container">
                <h1>Welcome</h1>
                <p> Already have an account? <Link to='/login' ><b>Login here</b></Link></p>
                <form className="signup-form" onSubmit={handleSignUp}>
                    <label htmlFor="username">Username</label>
                    <input type="text" id="username" 
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

                    
                    <label htmlFor="signup-pass">Password</label>
                    <input type="password" 
                    id="signup-pass" 
                    placeholder="Password"
                    value={password}
                    className={password.length > 0 ? "success" : ""}
                    onChange={(e) => setpassword(e.target.value)}
                    autocomplete="new-password"
                    disabled={isLoading}
                    required
                    />    
                    
                    <label htmlFor="signup-confirm-pass">Confirm Password</label>
                    <input type="password" 
                    id="signup-confirm-pass" 
                    className={
                        isTypingConfirm
                        ? isMatch
                            ? "input success"
                            : "input error"
                        : "input"
                    }
                    placeholder="Confirm Password"
                    value={repassword}
                    onChange={(e) => setrepassword(e.target.value)}
                    autocomplete="new-password"
                    disabled={isLoading}
                    required
                    /> 

                    <div className="signup-terms-checkbox">
                        <input 
                            type="checkbox" 
                            id="accept-terms" 
                            checked={acceptTerms}
                            onChange={(e) => setAcceptTerms(e.target.checked)}
                            disabled={isLoading}
                            required
                        />
                        <label htmlFor="accept-terms">
                            I agree to the <Link to="/terms">Terms of Conditions</Link>
                        </label>
                    </div>

                    {error && 
                    !error.toLowerCase().includes("user") && (
                            <div className="error-container">
                                <p className="error-text">{error}</p>
                            </div>

                    )}         
                    <button type="submit" disabled={isLoading}>
                        {isLoading ? "Signing up..." : "Sign up"}
                    </button>
                </form>

                <div className="oauth-divider">or</div>

                <button 
                    type="button" 
                    className="google-oauth-btn" 
                    onClick={handleGoogleSignUp}
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

                <div className="signup-footer-links">
                    <Link to="/about">About</Link>
                    <Link to="/terms">Terms of Conditions</Link>
                </div>
                
                <div className="signup-status">
                    <StatusDots />
                </div>
                
            </div>
            
        </div>
            
        </>
    
        
)
}
export default Signup;
