import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabaseClient";
import Background from "../components/background/Background";

export default function AuthCallback({ setuser }) {
    const navigate = useNavigate();
    const [error, setError] = useState(null);

    useEffect(() => {
        let mounted = true;

        const handleCallback = async () => {
            try {
                // Fetch the current session
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();
                if (sessionError) throw sessionError;

                if (!session) {
                    // Listen for state change (if the redirect process is setting up)
                    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
                        if (currentSession && mounted) {
                            subscription.unsubscribe();
                            await proceedWithSession(currentSession);
                        }
                    });

                    // Timeout if session doesn't register within 8 seconds
                    setTimeout(() => {
                        if (mounted) {
                            subscription.unsubscribe();
                            setError("Authentication timeout. Please try logging in again.");
                        }
                    }, 8000);
                    return;
                }

                await proceedWithSession(session);
            } catch (err) {
                console.error("OAuth callback error:", err);
                if (mounted) {
                    setError(err.message || "Failed to complete authentication.");
                }
            }
        };

        const proceedWithSession = async (session) => {
            const userId = session.user.id;
            let profile = null;

            // Poll the profiles table to ensure the database trigger handle_new_user has run
            // We do 5 retries, 500ms apart
            for (let i = 0; i < 5; i++) {
                try {
                    const { data, error: dbError } = await supabase
                        .from("profiles")
                        .select("username")
                        .eq("id", userId)
                        .maybeSingle();

                    if (data && data.username) {
                        profile = data;
                        break;
                    }
                } catch (e) {
                    console.warn("Retrying profile fetch...", e);
                }
                await new Promise((resolve) => setTimeout(resolve, 500));
            }

            const finalUsername = profile?.username || session.user.email?.split("@")[0];

            if (mounted) {
                // Set the global username state
                setuser(finalUsername);

                // Retrieve intended route from localStorage
                const redirectPath = localStorage.getItem("oauth_redirect_path") || "/home";
                localStorage.removeItem("oauth_redirect_path");

                // Navigate to the target page with a success message
                navigate(redirectPath, { state: { message: "Login Successful!!" } });
            }
        };

        handleCallback();

        return () => {
            mounted = false;
        };
    }, [navigate, setuser]);

    return (
        <>
            <Background />
            <div className="login-wrapper" style={{ justifyContent: "center", alignItems: "center", flexDirection: "column" }}>
                <img className="logo" src="/forge.png" alt="logo" style={{ position: "relative", marginBottom: "20px", cursor: "pointer" }} onClick={() => navigate("/")} />
                
                <div className="login-container" style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", height: "350px", padding: "40px" }}>
                    {error ? (
                        <>
                            <h2 style={{ color: "#ef4444", marginBottom: "15px", fontFamily: "Urbanist", fontWeight: 400 }}>Authentication Failed</h2>
                            <p style={{ color: "var(--text-secondary)", marginBottom: "30px", fontSize: "15px", fontFamily: "Urbanist" }}>{error}</p>
                            <button 
                                onClick={() => navigate("/login")} 
                                style={{
                                    height: "45px",
                                    padding: "0 30px",
                                    borderRadius: "25px",
                                    border: "none",
                                    background: "var(--text-primary)",
                                    color: "black",
                                    cursor: "pointer",
                                    fontWeight: "bold",
                                    fontFamily: "Urbanist",
                                    fontSize: "15px"
                                }}
                            >
                                Back to Login
                            </button>
                        </>
                    ) : (
                        <>
                            <div className="oauth-spinner" style={{ width: "45px", height: "45px", border: "3px solid rgba(255,255,255,0.05)", borderTop: "3px solid #6366f1", borderRadius: "50%", animation: "oauth-spin 1s linear infinite", marginBottom: "25px" }}></div>
                            <h2 style={{ color: "var(--text-primary)", marginBottom: "10px", fontFamily: "Urbanist", fontWeight: 300 }}>Completing login...</h2>
                            <p style={{ color: "var(--text-secondary)", fontSize: "14px", fontFamily: "Urbanist", fontWeight: 300 }}>Verifying your credentials and establishing secure session.</p>
                        </>
                    )}
                </div>
            </div>
            
            <style>{`
                @keyframes oauth-spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </>
    );
}
