import {Routes, Route} from "react-router-dom"
import Front from "./pages/Front";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Profile from "./pages/Profile";
import Notes from "./pages/Notes";
import NoteDetails from "./pages/NoteDetails";
import Leaderboard from "./pages/Leaderboard";
import Roadmap from "./pages/Roadmap";
import About from "./pages/info/About";
import Contact from "./pages/info/Contact";
import Terms from "./pages/info/Terms";
import { useState,useEffect } from "react";
import { fetchApi } from "./services/api";
import { supabase } from "./services/supabaseClient";
const forgeLogo = "/forge.png";

function App() {
  const [user, setuser] = useState(() => {
    return localStorage.getItem("user") || "";
  });

  const [profileImage, setProfileImage] = useState(forgeLogo);
  const [input, setinput] = useState("");

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const username = session.user.user_metadata?.username || session.user.email?.split('@')[0];
        if (username) {
          setuser(username);
        }
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        const username = session.user.user_metadata?.username || session.user.email?.split('@')[0];
        if (username) {
          setuser(username);
        }
      } else {
        setuser("");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    localStorage.setItem("user", user);
    if (user) {
      fetchApi('getProfile', { username: user }, 'GET', { useCache: true })
        .then(res => res.json())
        .then(data => {
          if (data.profile && data.profile.profile_image_url) {
            setProfileImage(data.profile.profile_image_url);
          } else {
            setProfileImage(forgeLogo);
          }
        })
        .catch(err => {
          console.error("Error fetching profile image:", err);
          setProfileImage(forgeLogo);
        });
    } else {
      Promise.resolve().then(() => {
        setProfileImage("");
      });
    }
  }, [user]);


  return (
    <>
    <Routes>
      <Route path="/login" element={<Login setuser={setuser} user={user}/>}/>
      <Route path="/signup" element={<Signup/>}/>
      <Route path="/" element={<Front user={user} input={input} setinput={setinput} profileImage={profileImage}/>}/>
      <Route path="/home" element={<Home user={user} profileImage={profileImage}/>}/>
      <Route path="/profile" element={<Profile user={user} setuser={setuser} setGlobalProfileImage={setProfileImage}/>}/>
      <Route path="/profile/:username" element={<Profile user={user} setuser={setuser} setGlobalProfileImage={setProfileImage}/>}/>
      <Route path="/notes" element={<Notes user={user} profileImage={profileImage}/>}/>
      <Route path="/notes/:owner/:videoId" element={<NoteDetails user={user} profileImage={profileImage}/>}/>
      <Route path="/leaderboard" element={<Leaderboard user={user} profileImage={profileImage}/>}/>
      <Route path="/roadmap" element={<Roadmap user={user} profileImage={profileImage}/>}/>
      <Route path="/about" element={<About />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/terms" element={<Terms />} />
    </Routes>
    </>
  )
}

export default App;
