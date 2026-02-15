import { useState, type FormEvent, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function AcceptInvite() {
  const [password, setPasswordInput] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const { setPassword } = useAuth();

  // ======================================
  // Get token from URL
  // ======================================
  const token = searchParams.get("token");

  // ======================================
  // Validate invite link
  // ======================================
  useEffect(() => {
    if (!token) {
      setError("Invalid or missing invitation token.");
    }
  }, [token]);

  // ======================================
  // Submit handler
  // ======================================
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!token) {
      setError("Missing invite token.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      // AuthContext handles API + storage + auth state
      await setPassword({
        invite_token: token,
        password,
      });

      // redirect after successful auth
      navigate("/", { replace: true });

    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to set password"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        {/* ================= HEADER ================= */}
        <div className="auth-header">
          <div className="brand-mark">F</div>
          <h1>Accept Invitation</h1>
          <p className="muted">
            Create a password to activate your account
          </p>
        </div>

        {/* ================= ERROR ================= */}
        {error && <div className="auth-error">{error}</div>}

        {/* ================= FORM ================= */}
        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Create Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Minimum 6 characters"
              required
              minLength={6}
              autoComplete="new-password"
            />
          </label>

          <button
            type="submit"
            disabled={isSubmitting || !token}
            className="auth-btn"
          >
            {isSubmitting ? "Setting password..." : "Set Password"}
          </button>
        </form>

        {/* ================= FOOTER ================= */}
        <div className="auth-footer">
          <p>Password setup completes your account activation.</p>
        </div>
      </div>
    </div>
  );
}
