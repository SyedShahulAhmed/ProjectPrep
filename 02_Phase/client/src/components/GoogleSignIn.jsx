// src/components/GoogleSignIn.jsx
import React, { useEffect, useContext, useRef } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function GoogleSignIn() {
  const { setTokenFromGoogle } = useContext(AuthContext);
  const navigate = useNavigate();
  const scriptRef = useRef(null);

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    console.log("GoogleSignIn: frontend client id =", clientId);
    if (!clientId) {
      console.warn("VITE_GOOGLE_CLIENT_ID is not set. Add it to .env.local and restart Vite.");
      return;
    }

    if (typeof document === "undefined" || !document.body) {
      console.error("Document/body not available (SSR?). Aborting Google button setup.");
      return;
    }

    const handleCredentialResponse = async (response) => {
      console.log("GSI credential response:", response);
      const idToken = response?.credential;
      if (!idToken) {
        console.error("No idToken in Google response", response);
        return;
      }

      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/auth/google`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken }),
          }
        );
        console.log("POST /auth/google status:", res.status);
        const data = await res.json();
        console.log("POST /auth/google response:", data);
        if (!res.ok) throw new Error(data?.msg || JSON.stringify(data));

        // Persist token and optional user via AuthContext helper
        setTokenFromGoogle(data.token, data.user || null);
        console.log("Token persisted, navigating to /dashboard");
        navigate("/dashboard");
      } catch (err) {
        console.error("Google sign-in failed:", err);
      }
    };

    const renderButtonIfReady = () => {
      if (typeof window === "undefined") return false;
      if (!window.google || !google.accounts || !google.accounts.id) return false;

      try {
        google.accounts.id.initialize({
          client_id: clientId,
          callback: handleCredentialResponse,
        });
        const container = document.getElementById("gsi-button");
        if (container) {
          // remove previous children to re-render cleanly
          container.innerHTML = "";
          google.accounts.id.renderButton(container, { theme: "outline", size: "large" });
        } else {
          console.warn("#gsi-button element not found");
        }
        return true;
      } catch (err) {
        console.error("Error initializing google.accounts.id:", err);
        return false;
      }
    };

    // If google lib already loaded and available, render immediately
    if (renderButtonIfReady()) {
      return () => { /* nothing to cleanup if we didn't add script */ };
    }

    // Reuse existing script if present
    const existing = Array.from(document.getElementsByTagName("script")).find((s) =>
      s.src?.includes("accounts.google.com/gsi/client")
    );

    if (existing) {
      // attach onload just in case google isn't ready yet
      existing.addEventListener("load", () => {
        setTimeout(() => renderButtonIfReady(), 0);
      });
      // attempt immediate render if available
      setTimeout(() => renderButtonIfReady(), 0);
      return () => { /* do not remove shared script */ };
    }

    // Otherwise create the script and remember we added it
    const script = document.createElement("script");
    scriptRef.current = script;
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;

    script.onload = () => {
      setTimeout(() => {
        if (!renderButtonIfReady()) {
          console.error("Google script loaded but google.accounts.id not available");
        }
      }, 0);
    };

    script.onerror = (e) => {
      console.error("Failed to load Google script", e);
    };

    document.body.appendChild(script);

    // cleanup only the script we appended
    return () => {
      try {
        if (scriptRef.current && document.body.contains(scriptRef.current)) {
          document.body.removeChild(scriptRef.current);
          scriptRef.current = null;
        }
      } catch (err) {
        console.warn("Cleanup error removing google script", err);
      }
    };
  }, [setTokenFromGoogle, navigate]);

  return <div id="gsi-button" />;
}
