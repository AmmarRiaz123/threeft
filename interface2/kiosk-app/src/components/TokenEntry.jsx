import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import "./TokenEntry.css";

const TokenEntry = ({ onSubmit }) => {
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const verifyToken = async (tokenValue) => {
    const { data, error } = await supabase
      .from("registered_voters") // Make sure your table is named 'tokens'
      .select("*")
      .eq("token", tokenValue)
      .single();
    return !!data && !error;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const isValid = await verifyToken(token.trim());

    setLoading(false);

    if (isValid) {
      onSubmit(token);
    } else {
      setError("❌ Invalid token. Please try again.");
    }
  };

  return (
    <div className="token-screen">
      <div className="token-box">
        <h2>Enter Access Token</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Enter Token"
            required
            disabled={loading}
          />
          <button type="submit" disabled={loading}>
            {loading ? "Verifying..." : "Verify"}
          </button>
        </form>
        {error && <p className="error-text">{error}</p>}
      </div>
    </div>
  );
};

export default TokenEntry;
