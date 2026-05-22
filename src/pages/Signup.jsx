import React, { useState } from "react";
import Background from "../components/background/Background";
import { Link, useNavigate } from "react-router-dom";
import { fetchApi } from "../services/api";
import StatusDots from "../components/status/StatusDots";

function Signup(){

    const navigate = useNavigate();

    const [username,setusername] = useState("");
    const [password,setpassword] = useState("");
    const [repassword,setrepassword] = useState("");
    const [error, setError ] = useState("");

    async function handleSignUp(e) {
        e.preventDefault();
        setError("");

        const usernameRegex = /^[a-z0-9_]+$/;
        if (!usernameRegex.test(username)) {
            setError("Username can only contain lowercase letters, numbers, and underscores (no spaces or capitals).");
            return;
        }

        if (password !== repassword){
            return;
        }
        
        try{
        const res = await fetchApi('signup', { username, password }, 'POST');
        
        const data = await res.json();
        if (res.ok){
            navigate("/login", { state: { message: "Account created successfully!" } });
        }else{
            setError(data.error)
        }
    }catch {
        setError("Server connection failed!!!");
    }
    };

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
                <form className="signup-form">
                    <label htmlFor="username">Username</label>
                    <input type="text" id="username" 
                    placeholder="Enter username"
                    value={username}
                    onChange={(e) => setusername(e.target.value)}
                    className={error.includes("user") ? "input-error" : ""}
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
                    required
                    /> 

                    {error && 
                    !error.toLowerCase().includes("user") && (
                            <div className="error-container">
                                <p className="error-text">{error}</p>
                            </div>

                    )}         
                    <button type="button" onClick={handleSignUp}>Sign up</button>
                </form>

                <div className="signup-footer-links">
                    <Link to="/about">About</Link>
                    <Link to="/terms">User Agreement</Link>
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
