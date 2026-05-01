"use client";

import { useEffect, useState } from "react";
import { Pencil, Key, UserMinus, UserPlus, Trash2 } from "lucide-react";

type UserRow = {
  id: string;
  name: string | null;
  email: string;
  active: boolean;
  lastLoginAt: string | null;
  deactivatedAt: string | null;
};

export default function UsersTab({ engagementId }: { engagementId: string }) {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [dialog, setDialog] = useState<
    | { kind: "none" }
    | { kind: "add" }
    | { kind: "addExisting"; existingUserId: string; name: string; email: string; password: string }
    | { kind: "reset"; user: UserRow }
    | { kind: "deactivate"; user: UserRow }
    | { kind: "unlink"; user: UserRow }
  >({ kind: "none" });

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/engagements/${engagementId}/users`);
      if (!res.ok) throw new Error("Failed to load users");
      const data = await res.json();
      setUsers(data.users);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [engagementId]);

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <h2 className="font-outfit font-semibold text-otm-navy text-sm">Client users</h2>
        <button
          onClick={() => setDialog({ kind: "add" })}
          className="text-xs font-semibold px-3 py-1.5 rounded-md text-white bg-otm-teal"
        >
          + Add Client User
        </button>
      </div>

      {loading && <p className="px-6 py-6 text-sm text-gray-400">Loading…</p>}
      {!loading && users.length === 0 && (
        <p className="px-6 py-6 text-sm text-gray-400">
          No client users yet. Click + Add Client User to invite the first one.
        </p>
      )}

      {!loading && users.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] uppercase text-gray-400 tracking-[0.05em]">
              <th className="text-left px-6 py-2 font-medium">Name</th>
              <th className="text-left px-2 py-2 font-medium">Email</th>
              <th className="text-left px-2 py-2 font-medium">Status</th>
              <th className="text-left px-2 py-2 font-medium">Last login</th>
              <th className="px-2 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-gray-100">
                <td className="px-6 py-3 text-otm-navy">{u.name || "—"}</td>
                <td className="px-2 py-3 text-otm-gray">{u.email}</td>
                <td className="px-2 py-3">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      u.active
                        ? "bg-otm-teal/10 text-otm-teal"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {u.active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-2 py-3 text-xs text-gray-500">
                  {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : "Never"}
                </td>
                <td className="px-6 py-3">
                  <div className="flex items-center gap-2 justify-end">
                    <IconBtn label="Reset password" onClick={() => setDialog({ kind: "reset", user: u })}>
                      <Key size={14} />
                    </IconBtn>
                    <IconBtn
                      label={u.active ? "Deactivate" : "Reactivate"}
                      onClick={() => setDialog({ kind: "deactivate", user: u })}
                    >
                      {u.active ? <UserMinus size={14} /> : <UserPlus size={14} />}
                    </IconBtn>
                    <IconBtn label="Remove from engagement" onClick={() => setDialog({ kind: "unlink", user: u })}>
                      <Trash2 size={14} />
                    </IconBtn>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {err && <p className="px-6 py-3 text-sm text-red-600">{err}</p>}

      {dialog.kind === "add" && (
        <AddUserDialog
          engagementId={engagementId}
          onClose={() => setDialog({ kind: "none" })}
          onAddExisting={(payload) => setDialog({ kind: "addExisting", ...payload })}
          onSuccess={() => {
            setDialog({ kind: "none" });
            load();
          }}
        />
      )}
      {dialog.kind === "addExisting" && (
        <AddExistingDialog
          engagementId={engagementId}
          payload={dialog}
          onClose={() => setDialog({ kind: "none" })}
          onSuccess={() => {
            setDialog({ kind: "none" });
            load();
          }}
        />
      )}
      {dialog.kind === "reset" && (
        <ResetPasswordDialog
          user={dialog.user}
          onClose={() => setDialog({ kind: "none" })}
        />
      )}
      {dialog.kind === "deactivate" && (
        <ToggleActiveDialog
          user={dialog.user}
          onClose={() => setDialog({ kind: "none" })}
          onSuccess={() => {
            setDialog({ kind: "none" });
            load();
          }}
        />
      )}
      {dialog.kind === "unlink" && (
        <UnlinkDialog
          user={dialog.user}
          engagementId={engagementId}
          onClose={() => setDialog({ kind: "none" })}
          onSuccess={() => {
            setDialog({ kind: "none" });
            load();
          }}
        />
      )}
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className="w-7 h-7 inline-flex items-center justify-center rounded text-gray-500 hover:bg-gray-100 hover:text-otm-navy"
    >
      {children}
    </button>
  );
}

function generatePassword(): string {
  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  return Array.from(crypto.getRandomValues(new Uint32Array(14)))
    .map((n) => charset[n % charset.length])
    .join("");
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h3 className="font-outfit font-bold text-otm-navy text-lg mb-4">{title}</h3>
        {children}
      </div>
    </div>
  );
}

function AddUserDialog({
  engagementId,
  onClose,
  onSuccess,
  onAddExisting,
}: {
  engagementId: string;
  onClose: () => void;
  onSuccess: () => void;
  onAddExisting: (payload: { existingUserId: string; name: string; email: string; password: string }) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit() {
    setErr("");
    if (!name || !email || password.length < 8) {
      setErr("Name, email, and ≥8-char password required");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/engagements/${engagementId}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      if (res.status === 409) {
        const j = await res.json();
        onAddExisting({ existingUserId: j.existingUserId, name, email, password });
        return;
      }
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Failed to add user");
      }
      onSuccess();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to add user");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Add Client User" onClose={onClose}>
      <div className="space-y-3">
        <Field label="Name">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Email">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Initial Password">
          <div className="flex gap-2">
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="flex-1 border border-gray-200 rounded-md px-3 py-2 text-sm font-mono"
              placeholder="Min 8 characters"
            />
            <button
              type="button"
              onClick={() => setPassword(generatePassword())}
              className="text-xs px-3 border border-gray-200 rounded-md text-otm-gray hover:bg-gray-50"
            >
              Generate
            </button>
          </div>
        </Field>
        {err && <p className="text-sm text-red-600">{err}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            disabled={busy}
            className="text-sm px-4 py-2 border border-gray-300 rounded-md text-otm-gray"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={busy}
            className="text-sm font-semibold px-4 py-2 rounded-md text-white bg-otm-teal disabled:opacity-50"
          >
            {busy ? "…" : "Create & Add to Engagement"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function AddExistingDialog({
  engagementId,
  payload,
  onClose,
  onSuccess,
}: {
  engagementId: string;
  payload: { existingUserId: string; name: string; email: string; password: string };
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit() {
    setBusy(true);
    setErr("");
    try {
      const res = await fetch(
        `/api/admin/engagements/${engagementId}/users?addExisting=true`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: payload.name, email: payload.email, password: payload.password }),
        }
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Failed");
      }
      onSuccess();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="User already exists" onClose={onClose}>
      <p className="text-sm text-otm-gray mb-4">
        A user with email <strong>{payload.email}</strong> already exists. Add them to this
        engagement?
      </p>
      {err && <p className="text-sm text-red-600 mb-2">{err}</p>}
      <div className="flex justify-end gap-2">
        <button
          onClick={onClose}
          disabled={busy}
          className="text-sm px-4 py-2 border border-gray-300 rounded-md text-otm-gray"
        >
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={busy}
          className="text-sm font-semibold px-4 py-2 rounded-md text-white bg-otm-teal disabled:opacity-50"
        >
          {busy ? "…" : "Add to Engagement"}
        </button>
      </div>
    </Modal>
  );
}

function ResetPasswordDialog({ user, onClose }: { user: UserRow; onClose: () => void }) {
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);

  async function submit() {
    setErr("");
    if (pw.length < 8) return setErr("Password must be at least 8 characters");
    if (pw !== confirm) return setErr("Passwords do not match");
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Failed");
      }
      setDone(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={`Reset Password — ${user.name || user.email}`} onClose={onClose}>
      <p className="text-sm text-otm-gray mb-3">
        Set a new password for this user. Share it with them out-of-band (email, Slack, etc.).
      </p>
      <div className="space-y-3">
        <Field label="New Password">
          <div className="flex gap-2">
            <input
              type="text"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              className="flex-1 border border-gray-200 rounded-md px-3 py-2 text-sm font-mono"
            />
            <button
              type="button"
              onClick={() => {
                const p = generatePassword();
                setPw(p);
                setConfirm(p);
              }}
              className="text-xs px-3 border border-gray-200 rounded-md text-otm-gray hover:bg-gray-50"
            >
              Generate
            </button>
          </div>
        </Field>
        <Field label="Confirm Password">
          <input
            type="text"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm font-mono"
          />
        </Field>
        {err && <p className="text-sm text-red-600">{err}</p>}
        {done ? (
          <div className="flex items-center gap-2 pt-2">
            <p className="text-sm text-otm-teal flex-1">Password reset.</p>
            <button
              onClick={() => navigator.clipboard.writeText(pw)}
              className="text-xs px-3 py-1.5 border border-gray-200 rounded-md text-otm-gray hover:bg-gray-50"
            >
              Copy Password
            </button>
            <button
              onClick={onClose}
              className="text-xs px-3 py-1.5 rounded-md text-white bg-otm-navy"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={onClose}
              disabled={busy}
              className="text-sm px-4 py-2 border border-gray-300 rounded-md text-otm-gray"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={busy}
              className="text-sm font-semibold px-4 py-2 rounded-md text-white bg-otm-navy disabled:opacity-50"
            >
              {busy ? "…" : "Reset Password"}
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}

function ToggleActiveDialog({
  user,
  onClose,
  onSuccess,
}: {
  user: UserRow;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const willDeactivate = user.active;

  async function submit() {
    setBusy(true);
    setErr("");
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !user.active }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Failed");
      }
      onSuccess();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={`${willDeactivate ? "Deactivate" : "Reactivate"} ${user.name || user.email}?`} onClose={onClose}>
      <p className="text-sm text-otm-gray mb-4">
        {willDeactivate
          ? "This user will no longer be able to log in. You can reactivate them at any time."
          : "This user will be able to log in again."}
      </p>
      {err && <p className="text-sm text-red-600 mb-2">{err}</p>}
      <div className="flex justify-end gap-2">
        <button
          onClick={onClose}
          disabled={busy}
          className="text-sm px-4 py-2 border border-gray-300 rounded-md text-otm-gray"
        >
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={busy}
          className={`text-sm font-semibold px-4 py-2 rounded-md text-white disabled:opacity-50 ${
            willDeactivate ? "bg-[#c84a3c]" : "bg-otm-teal"
          }`}
        >
          {busy ? "…" : willDeactivate ? "Deactivate" : "Reactivate"}
        </button>
      </div>
    </Modal>
  );
}

function UnlinkDialog({
  user,
  engagementId,
  onClose,
  onSuccess,
}: {
  user: UserRow;
  engagementId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit() {
    setBusy(true);
    setErr("");
    try {
      const res = await fetch(
        `/api/admin/engagements/${engagementId}/users/${user.id}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Failed");
      }
      onSuccess();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={`Remove ${user.name || user.email} from this engagement?`} onClose={onClose}>
      <p className="text-sm text-otm-gray mb-4">
        The user account will not be deleted, but they will no longer have access.
      </p>
      {err && <p className="text-sm text-red-600 mb-2">{err}</p>}
      <div className="flex justify-end gap-2">
        <button
          onClick={onClose}
          disabled={busy}
          className="text-sm px-4 py-2 border border-gray-300 rounded-md text-otm-gray"
        >
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={busy}
          className="text-sm font-semibold px-4 py-2 rounded-md text-white bg-[#c84a3c] disabled:opacity-50"
        >
          {busy ? "…" : "Remove"}
        </button>
      </div>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-otm-navy mb-1">{label}</span>
      {children}
    </label>
  );
}
