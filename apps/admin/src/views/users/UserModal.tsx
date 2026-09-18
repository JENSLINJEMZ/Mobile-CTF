import { Role, type UserAdminDto } from "@ctf/shared";
import { useEffect, useState } from "react";

import { GRANTABLE_ROLES, ROLE_LABEL, roleClass, userIdLabel } from "./format";
import { Avatar, RoleIcon, SVG, X } from "./UserIcons";

export interface UserModalSubmit {
  email: string;
  username: string;
  password: string;
  role: Role;
  isActive?: boolean;
}

export function UserModal({
  open,
  user,
  saving,
  error,
  onSubmit,
  onClose,
}: {
  open: boolean;
  user: UserAdminDto | null;
  saving: boolean;
  error: string | null;
  onSubmit: (input: UserModalSubmit) => void;
  onClose: () => void;
}) {
  const isCreate = user === null;

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>(Role.USER);
  const [isActive, setIsActive] = useState(true);
  const [fieldErr, setFieldErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (user) {
      setEmail(user.email);
      setUsername(user.username);
      setRole(user.role);
      setIsActive(user.isActive);
      setPassword("");
    } else {
      setEmail("");
      setUsername("");
      setPassword("");
      setRole(Role.USER);
      setIsActive(true);
    }
    setFieldErr(null);
  }, [open, user]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const submit = () => {
    const em = email.trim();
    const un = username.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      setFieldErr("Enter a valid email address.");
      return;
    }
    if (isCreate) {
      if (un.length < 3) {
        setFieldErr("Username must be at least 3 characters.");
        return;
      }
      if (password.length < 8) {
        setFieldErr("Password must be at least 8 characters.");
        return;
      }
    }
    setFieldErr(null);
    onSubmit({ email: em, username: un, password, role, isActive });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={isCreate ? "Add User" : `Edit ${user.username}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h3 className="modal-title">
            {isCreate ? "Add New User" : `Edit ${user.username}`}
          </h3>
          <button className="modal-close" aria-label="Close" onClick={onClose}>
            <SVG d={X} />
          </button>
        </div>

        <div className="modal-body">
          {!isCreate ? (
            <div className="usr-modal-user">
              <span className="user-avatar-sm">
                <Avatar name={user.username} seed={user.id} />
              </span>
              <div className="usr-modal-user-meta">
                <span className="usr-modal-user-name">
                  {user.username}
                  <span className={`role-pill usr-modal-pill ${roleClass(user.role)}`}>
                    <RoleIcon role={user.role} />
                    {ROLE_LABEL[user.role]}
                  </span>
                </span>
                <span className="usr-modal-user-id">
                  {user.email} · {userIdLabel(user)}
                </span>
              </div>
            </div>
          ) : null}

          {!isCreate ? (
            <div className="usr-modal-toggle">
              <span className="usr-modal-toggle-text">
                <b>Account status</b>
                <small>
                  {isActive
                    ? "Active users can sign in and submit flags."
                    : "Disabled users are blocked from signing in."}
                </small>
              </span>
              <div className="toggle-row">
                <span
                  className={`toggle-track${isActive ? " is-on" : ""}`}
                  onClick={() => {
                    setIsActive(!isActive);
                    setFieldErr(null);
                  }}
                  role="switch"
                  aria-checked={isActive}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === " " || e.key === "Enter") setIsActive(!isActive);
                  }}
                >
                  <span className="toggle-thumb" />
                </span>
                <span className="toggle-label">{isActive ? "Active" : "Disabled"}</span>
              </div>
            </div>
          ) : null}

          <div className="usr-form">
            <label className="usr-field">
              <span>Email address</span>
              <input
                type="email"
                autoComplete="email"
                value={email}
                disabled={!isCreate}
                placeholder="hacker@example.com"
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label className="usr-field">
              <span>Username</span>
              <input
                type="text"
                autoComplete="username"
                value={username}
                disabled={!isCreate}
                placeholder="notori0us_h4xor"
                onChange={(e) => setUsername(e.target.value)}
              />
            </label>
            {isCreate ? (
              <label className="usr-field">
                <span>Password</span>
                <input
                  type="text"
                  autoComplete="new-password"
                  value={password}
                  placeholder="Minimum 8 characters"
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
            ) : null}
            <label className="usr-field">
              <span>Role</span>
              <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
                {GRANTABLE_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {fieldErr ? <div className="usr-form-error">{fieldErr}</div> : null}
          {error ? <div className="usr-form-error">{error}</div> : null}
        </div>

        <div className="modal-foot">
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={submit} disabled={saving}>
            {saving
              ? "Saving…"
              : isCreate
                ? "Create User"
                : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}