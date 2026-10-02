import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/AppShell";

export default function ChangePasswordPage() {
  const [, setLocation] = useLocation(); const mutation = trpc.auth.updatePassword.useMutation();
  const [currentPassword, setCurrentPassword] = useState(""); const [newPassword, setNewPassword] = useState(""); const [message, setMessage] = useState("");
  const submit = async (event: React.FormEvent) => { event.preventDefault(); setMessage(""); if (newPassword.length < 8 || newPassword.length > 16 || !/[A-Z]/.test(newPassword) || !/[^A-Za-z0-9]/.test(newPassword)) { setMessage("New password must be 8–16 characters with an uppercase letter and special character."); return; } try { await mutation.mutateAsync({ currentPassword, newPassword }); setMessage("Password updated successfully."); setCurrentPassword(""); setNewPassword(""); } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to update password."); } };
  return <div className="narrow-page"><PageHeader eyebrow="Account security" title="Change password" description="Keep your StoreMate account protected with a password you can remember." action={<button className="secondary-button" onClick={() => setLocation("/" )}>Back to workspace</button>} /><div className="card form-card"><form className="stack-form" onSubmit={submit}><label className="field"><span>Current password</span><input type="password" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} autoComplete="current-password" /></label><label className="field"><span>New password</span><input type="password" value={newPassword} onChange={event => setNewPassword(event.target.value)} autoComplete="new-password" /></label><p className="password-hint">8–16 characters, at least one uppercase letter and one special character.</p>{message && <div className={message.includes("successfully") ? "success-state" : "form-alert"}>{message}</div>}<button className="primary-button" disabled={mutation.isPending}>{mutation.isPending ? "Updating…" : "Update password"}</button></form></div></div>;
}
