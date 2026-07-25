import React, { useState } from "react";
import { ShieldAlert, Save, Sparkles, X } from "lucide-react";
import { initFirebase } from "./firebase";

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

export default function FirebaseConfigModal({ onConfigured }) {
  const [rawJson, setRawJson] = useState("");
  const [form, setForm] = useState({
    apiKey: "",
    authDomain: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: "",
  });
  const [error, setError] = useState("");

  const handleFieldChange = (key) => (e) => {
    setForm({ ...form, [key]: e.target.value });
    setError("");
  };

  const handleSave = () => {
    let finalConfig = null;

    if (rawJson.trim()) {
      try {
        // Try parsing raw config object/json
        // Clean JS object notation so it's valid JSON
        let cleanJson = rawJson.trim();
        // Remove 'const firebaseConfig = ' or similar if present
        cleanJson = cleanJson.replace(/^(const|let|var)\s+\w+\s*=\s*/, "");
        // Remove trailing semicolon
        cleanJson = cleanJson.replace(/;$/, "");
        // Convert JS object keys to double quoted keys for JSON.parse
        cleanJson = cleanJson.replace(/([{\s,])(\w+)(:)/g, '$1"$2"$3');
        // Replace single quotes with double quotes
        cleanJson = cleanJson.replace(/'/g, '"');
        // Strip trailing commas from objects/arrays
        cleanJson = cleanJson.replace(/,(\s*[}\]])/g, "$1");

        const parsed = JSON.parse(cleanJson);
        if (parsed.apiKey && parsed.projectId) {
          finalConfig = {
            apiKey: parsed.apiKey,
            authDomain: parsed.authDomain || "",
            projectId: parsed.projectId,
            storageBucket: parsed.storageBucket || "",
            messagingSenderId: parsed.messagingSenderId || "",
            appId: parsed.appId || "",
          };
        } else {
          setError("Pasted configuration is missing 'apiKey' or 'projectId'.");
          return;
        }
      } catch (e) {
        setError("Could not parse the pasted config. Please check the format or fill out the fields manually.");
        console.error(e);
        return;
      }
    } else {
      if (!form.apiKey || !form.projectId) {
        setError("API Key and Project ID are required.");
        return;
      }
      finalConfig = form;
    }

    if (finalConfig) {
      localStorage.setItem("firebase_config", JSON.stringify(finalConfig));
      const initialized = initFirebase();
      if (initialized) {
        onConfigured();
      } else {
        setError("Failed to initialize Firebase with the provided configuration.");
      }
    }
  };

  return (
    <div style={{ background: "rgba(5,5,6,0.85)", backdropFilter: "blur(8px)" }} className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        style={{ background: C.surface, border: `1px solid ${C.border}`, maxWidth: 520, width: "100%" }} 
        className="rounded-2xl overflow-hidden shadow-2xl p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <div style={{ width: 36, height: 36, borderRadius: 10, background: C.amberDim }} className="flex items-center justify-center flex-shrink-0">
            <Sparkles size={18} style={{ color: C.amber }} />
          </div>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: C.text }}>Configure Firebase Storage</h3>
            <p style={{ fontSize: 12.5, color: C.textDim, marginTop: 1 }}>Connect your project to a Firebase Firestore instance</p>
          </div>
        </div>

        <div style={{ background: C.surface2, border: `1px solid ${C.border}`, padding: 12 }} className="rounded-xl mb-4 text-[12.5px] text-left leading-relaxed">
          <div className="flex gap-2 items-start text-amber-500 font-semibold mb-1">
            <ShieldAlert size={14} className="mt-0.5" />
            <span>Permanent Storage Setup Required</span>
          </div>
          <span style={{ color: C.textDim }}>
            To store your trades securely, create a project on the{" "}
            <a 
              href="https://console.firebase.google.com/" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="underline text-amber-400 hover:text-amber-300"
            >
              Firebase Console
            </a>
            , enable <strong>Authentication</strong> (with Google/Email) and <strong>Cloud Firestore</strong>, then provide the config below.
          </span>
        </div>

        <div className="space-y-4">
          {/* Option A: Paste Raw Config */}
          <div>
            <label style={{ display: "block", fontSize: 11, color: C.textFaint, marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Option 1: Paste Firebase Config JS Object (Recommended)
            </label>
            <textarea
              style={{ width: "100%", height: 90, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 9, padding: 8, color: C.text, fontFamily: "monospace", fontSize: 11.5 }}
              placeholder={`const firebaseConfig = {\n  apiKey: "...",\n  projectId: "...",\n  ...\n};`}
              value={rawJson}
              onChange={(e) => {
                setRawJson(e.target.value);
                setError("");
              }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }} className="my-2">
            <span style={{ height: 1, flex: 1, background: C.border }} />
            <span style={{ fontSize: 11, color: C.textFaint, margin: "0 10px", textTransform: "uppercase" }}>Or</span>
            <span style={{ height: 1, flex: 1, background: C.border }} />
          </div>

          {/* Option B: Direct Form Input */}
          <div>
            <label style={{ display: "block", fontSize: 11, color: C.textFaint, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Option 2: Enter Config Fields Manually
            </label>
            <div className="grid grid-cols-2 gap-3">
              <input
                placeholder="API Key *"
                style={{ width: "100%", background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 10px", color: C.text, fontSize: 12.5 }}
                value={form.apiKey}
                onChange={handleFieldChange("apiKey")}
                disabled={rawJson.trim().length > 0}
              />
              <input
                placeholder="Project ID *"
                style={{ width: "100%", background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 10px", color: C.text, fontSize: 12.5 }}
                value={form.projectId}
                onChange={handleFieldChange("projectId")}
                disabled={rawJson.trim().length > 0}
              />
              <input
                placeholder="Auth Domain"
                style={{ width: "100%", background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 10px", color: C.text, fontSize: 12.5 }}
                value={form.authDomain}
                onChange={handleFieldChange("authDomain")}
                disabled={rawJson.trim().length > 0}
              />
              <input
                placeholder="App ID"
                style={{ width: "100%", background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 10px", color: C.text, fontSize: 12.5 }}
                value={form.appId}
                onChange={handleFieldChange("appId")}
                disabled={rawJson.trim().length > 0}
              />
            </div>
          </div>
        </div>

        {error && (
          <div style={{ color: C.red, fontSize: 12, marginTop: 14 }} className="text-left font-medium">
            ● {error}
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <button
            onClick={handleSave}
            className="flex items-center justify-center gap-2 w-full rounded-lg"
            style={{ padding: "10px 16px", background: C.amber, color: "#1A1400", fontWeight: 700, fontSize: 13.5, border: "none", cursor: "pointer" }}
          >
            <Save size={15} /> Save & Connect Storage
          </button>
        </div>
      </div>
    </div>
  );
}
