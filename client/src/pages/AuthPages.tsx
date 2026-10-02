import { useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

const passwordHint = "8–16 characters, one uppercase letter and one special character.";

function AuthFrame({ title, subtitle, children, footer }: { title: string; subtitle: string; children: React.ReactNode; footer: React.ReactNode }) {
  return <main className="auth-page"><div className="auth-panel"><div className="auth-brand"><span className="brand-mark">S</span><span><strong>StoreMate</strong><small>ratings platform</small></span></div><div className="auth-copy"><div className="eyebrow">A clearer view of local places</div><h1>{title}</h1><p>{subtitle}</p></div>{children}<div className="auth-footer">{footer}</div></div><div className="auth-aside"><div className="aside-kicker">THE EVERYDAY SIGNAL</div><h2>Ratings that help people choose with confidence.</h2><p>StoreMate brings customers, store owners and administrators into one calm, focused workspace.</p><div className="aside-rule" /><div className="aside-stat"><strong>1—5</strong><span>Simple, meaningful ratings.<br />No noise. No guesswork.</span></div></div></main>;
}

function Field({ label, value, onChange, type = "text", placeholder, error, autoComplete }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string; error?: string; autoComplete?: string }) {
  return <label className="field"><span>{label}</span><input type={type} value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} autoComplete={autoComplete} aria-invalid={Boolean(error)} />{error && <small className="field-error">{error}</small>}</label>;
}

function validateCredentials(email: string, password: string) { return { email: /\S+@\S+\.\S+/.test(email) ? "" : "Enter a valid email address.", password: password ? "" : "Password is required." }; }

export function LoginPage() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const login = trpc.auth.login.useMutation({ onSuccess: async user => { await utils.auth.me.invalidate(); setLocation(user.role === "admin" ? "/admin" : user.role === "owner" ? "/owner" : "/stores"); } });
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const submit = (event: React.FormEvent) => { event.preventDefault(); const next = validateCredentials(email, password); setErrors(next); if (Object.values(next).some(Boolean)) return; login.mutate({ email, password }); };
  return <AuthFrame title="Welcome back." subtitle="Sign in to keep the signal moving." footer={<span>New to StoreMate? <Link href="/signup">Create a normal user account</Link></span>}><form className="auth-form" onSubmit={submit}><Field label="Email" value={email} onChange={setEmail} placeholder="you@example.com" type="email" autoComplete="email" error={errors.email} /><Field label="Password" value={password} onChange={setPassword} placeholder="Your password" type="password" autoComplete="current-password" error={errors.password} />{login.error && <div className="form-alert">{login.error.message}</div>}<button className="primary-button full-width" disabled={login.isPending}>{login.isPending ? "Signing in…" : "Sign in"}<span>→</span></button><p className="demo-note">Demo accounts are documented in the project README after seed setup.</p></form></AuthFrame>;
}

export function SignupPage() {
  const [, setLocation] = useLocation(); const utils = trpc.useUtils();
  const signup = trpc.auth.signup.useMutation({ onSuccess: async () => { await utils.auth.me.invalidate(); setLocation("/stores"); } });
  const [form, setForm] = useState({ name: "", email: "", address: "", password: "" }); const [errors, setErrors] = useState<Record<string, string>>({});
  const update = (key: keyof typeof form) => (value: string) => setForm(current => ({ ...current, [key]: value }));
  const submit = (event: React.FormEvent) => { event.preventDefault(); const next: Record<string, string> = {}; if (form.name.trim().length < 20 || form.name.trim().length > 60) next.name = "Name must be between 20 and 60 characters."; if (!/\S+@\S+\.\S+/.test(form.email)) next.email = "Enter a valid email address."; if (!form.address.trim() || form.address.length > 400) next.address = "Address is required and must be at most 400 characters."; if (form.password.length < 8 || form.password.length > 16 || !/[A-Z]/.test(form.password) || !/[^A-Za-z0-9]/.test(form.password)) next.password = passwordHint; setErrors(next); if (Object.keys(next).length) return; signup.mutate(form); };
  return <AuthFrame title="Make your voice useful." subtitle="Create a normal user account and start rating the places you know." footer={<span>Already have an account? <Link href="/login">Sign in</Link></span>}><form className="auth-form two-column-form" onSubmit={submit}><Field label="Full name" value={form.name} onChange={update("name")} placeholder="Your full name (20–60 chars)" error={errors.name} /><Field label="Email" value={form.email} onChange={update("email")} placeholder="you@example.com" type="email" error={errors.email} /><Field label="Address" value={form.address} onChange={update("address")} placeholder="Where you live (up to 400 chars)" error={errors.address} /><Field label="Password" value={form.password} onChange={update("password")} placeholder="Create a strong password" type="password" error={errors.password} /><div className="form-span"><small className="password-hint">{passwordHint}</small></div>{signup.error && <div className="form-alert form-span">{signup.error.message}</div>}<button className="primary-button full-width form-span" disabled={signup.isPending}>{signup.isPending ? "Creating account…" : "Create account"}<span>→</span></button></form></AuthFrame>;
}
