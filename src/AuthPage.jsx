import React, { useState } from "react";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signInAnonymously 
} from "firebase/auth";
import { auth } from "./firebase";
import { Mail, Lock, LogIn, UserPlus, Sparkles, Activity, ShieldAlert } from "lucide-react";

const C = {
  bg: "#0A0A0C",
  surface: "#111114",
  surface2: "#17171B",
  border: "#26262C",
  borderLite: "#323238",
  text: "#F2F1ED",
  textDim: "#9A9AA2",
  textFaint: "#5C5C64",
  amber: "#F0B90B",
  amberDim: "rgba(240,185,11,0.10)",
  amberBorder: "rgba(240,185,11,0.35)",
  green: "#22D67A",
  red: "#F5455C",
};

const FONT = {
  display: "'Space Grotesk', sans-serif",
  body: "'Inter', sans-serif",
  mono: "'JetBrains Mono', monospace",
};

export default function AuthPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill out all fields.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      if (isRegister) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      console.error(err);
      let msg = err.message;
      if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        msg = "Invalid email or password.";
      } else if (err.code === "auth/email-already-in-use") {
        msg = "An account with this email already exists.";
      } else if (err.code === "auth/weak-password") {
        msg = "Password should be at least 6 characters.";
      } else if (err.code === "auth/invalid-email") {
        msg = "Please enter a valid email address.";
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error(err);
      if (err.code !== "auth/popup-closed-by-user") {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGuestSignIn = async () => {
    setError("");
    setLoading(true);
    try {
      await signInAnonymously(auth);
    } catch (err) {
      console.error(err);
      setError("Failed to sign in as guest: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: C.bg, fontFamily: FONT.body, color: C.text }} className="min-h-screen w-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background ambient glows */}
      <div 
        style={{ 
          position: "absolute", 
          top: "10%", 
          left: "25%", 
          width: "400px", 
          height: "400px", 
          background: "radial-gradient(circle, rgba(240,185,11,0.06) 0%, rgba(0,0,0,0) 70%)", 
          zIndex: 1,
          pointerEvents: "none"
        }} 
      />
      <div 
        style={{ 
          position: "absolute", 
          bottom: "10%", 
          right: "25%", 
          width: "400px", 
          height: "400px", 
          background: "radial-gradient(circle, rgba(34,214,122,0.04) 0%, rgba(0,0,0,0) 70%)", 
          zIndex: 1,
          pointerEvents: "none"
        }} 
      />

      <div style={{ zIndex: 10 }} className="w-full max-w-[420px] flex flex-col items-center">
        {/* Logo and Title */}
        <div className="flex items-center gap-3 mb-6">
          <div style={{ width: 36, height: 36, borderRadius: 10, background: C.amberDim, border: `1px solid ${C.amberBorder}` }} className="flex items-center justify-center">
            <Activity size={18} style={{ color: C.amber }} />
          </div>
          <span style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 20, letterSpacing: 0.5 }}>Ledger Journal</span>
        </div>

        {/* Card */}
        <div 
          style={{ 
            background: C.surface, 
            border: `1px solid ${C.border}`,
            boxShadow: "0 20px 50px rgba(0,0,0,0.5)"
          }} 
          className="w-full rounded-2xl p-7 flex flex-col"
        >
          <div className="flex border-b mb-6" style={{ borderColor: C.border }}>
            <button 
              onClick={() => { setIsRegister(false); setError(""); }}
              className="flex-1 pb-3 text-sm font-semibold transition-colors"
              style={{ 
                color: !isRegister ? C.amber : C.textDim, 
                borderBottom: `2px solid ${!isRegister ? C.amber : "transparent"}`,
                cursor: "pointer"
              }}
            >
              Sign In
            </button>
            <button 
              onClick={() => { setIsRegister(true); setError(""); }}
              className="flex-1 pb-3 text-sm font-semibold transition-colors"
              style={{ 
                color: isRegister ? C.amber : C.textDim, 
                borderBottom: `2px solid ${isRegister ? C.amber : "transparent"}`,
                cursor: "pointer"
              }}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label style={{ display: "block", fontSize: 11, color: C.textDim, marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>Email Address</label>
              <div className="flex items-center gap-2 rounded-lg" style={{ padding: "0 10px", background: C.surface2, border: `1px solid ${C.border}` }}>
                <Mail size={14} style={{ color: C.textFaint }} />
                <input 
                  type="email" 
                  placeholder="name@example.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ background: "transparent", border: "none", padding: "10px 4px", color: C.text, fontSize: 13.5, width: "100%", outline: "none" }} 
                  required
                />
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11, color: C.textDim, marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>Password</label>
              <div className="flex items-center gap-2 rounded-lg" style={{ padding: "0 10px", background: C.surface2, border: `1px solid ${C.border}` }}>
                <Lock size={14} style={{ color: C.textFaint }} />
                <input 
                  type="password" 
                  placeholder="••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ background: "transparent", border: "none", padding: "10px 4px", color: C.text, fontSize: 13.5, width: "100%", outline: "none" }} 
                  required
                />
              </div>
            </div>

            {error && (
              <div style={{ color: C.red, fontSize: 12 }} className="flex items-start gap-2 pt-1 font-medium">
                <ShieldAlert size={14} className="mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="flex items-center justify-center gap-2 w-full rounded-lg font-bold transition-all"
              style={{ 
                padding: "11px 0", 
                background: C.amber, 
                color: "#1A1400", 
                fontSize: 14, 
                border: "none", 
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1
              }}
            >
              {isRegister ? <UserPlus size={15} /> : <LogIn size={15} />}
              {loading ? "Please wait..." : isRegister ? "Create Account" : "Sign In with Email"}
            </button>
          </form>

          {/* Separator */}
          <div className="flex items-center justify-center my-5">
            <span className="flex-1 h-[1px]" style={{ background: C.border }} />
            <span className="mx-3 text-[11px]" style={{ color: C.textFaint, textTransform: "uppercase", letterSpacing: 0.5 }}>Or Continue With</span>
            <span className="flex-1 h-[1px]" style={{ background: C.border }} />
          </div>

          <div className="space-y-2.5">
            {/* Google Login */}
            <button 
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="flex items-center justify-center gap-2.5 w-full rounded-lg font-semibold transition-colors"
              style={{ 
                padding: "10px 0", 
                background: "transparent", 
                border: `1px solid ${C.border}`,
                color: C.text, 
                fontSize: 13,
                cursor: loading ? "not-allowed" : "pointer"
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Google Account
            </button>

            {/* Guest Login */}
            <button 
              onClick={handleGuestSignIn}
              disabled={loading}
              className="flex items-center justify-center gap-2 w-full rounded-lg font-semibold transition-colors"
              style={{ 
                padding: "10px 0", 
                background: C.amberDim, 
                border: `1px solid ${C.amberBorder}`,
                color: C.amber, 
                fontSize: 13,
                cursor: loading ? "not-allowed" : "pointer"
              }}
            >
              <Sparkles size={14} />
              Continue as Guest (No Account)
            </button>
          </div>
        </div>

        {/* Info footer */}
        <p className="mt-6 text-center text-xs" style={{ color: C.textFaint, lineHeight: 1.5 }}>
          Your data is synchronized in real-time. Guests accounts will persist on this browser but won't sync to other devices.
        </p>
      </div>
    </div>
  );
}
