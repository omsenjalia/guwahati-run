"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function LoginForm() {
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Something went wrong");
      const next = new URLSearchParams(window.location.search).get("next");
      // Only same-site paths; parents always land on their own page.
      const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : null;
      window.location.replace(body.role === "team" && safeNext ? safeNext : body.redirect);
    } catch (err) {
      setError(navigator.onLine ? (err as Error).message : "You're offline. Connect once to sign in.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-8 flex flex-col gap-2">
      <label htmlFor="passcode" className="text-sm font-medium">
        Passcode
      </label>
      <input
        id="passcode"
        name="passcode"
        type="password"
        autoComplete="current-password"
        autoFocus
        value={passcode}
        onChange={(e) => setPasscode(e.target.value)}
        aria-invalid={!!error}
        aria-describedby={error ? "passcode-error" : undefined}
        className="h-14 rounded-lg border border-input bg-card px-4 font-mono text-lg tracking-widest outline-none focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-ring/40 aria-invalid:border-bad"
      />
      {error && (
        <p id="passcode-error" className="text-sm text-bad">
          {error}
        </p>
      )}
      <Button type="submit" size="lg" className="mt-3 h-14 text-base" disabled={busy || !passcode}>
        {busy ? "Checking" : "Unlock"}
      </Button>
      <p className="mt-3 text-sm text-muted-foreground">Team and parents have separate passcodes.</p>
    </form>
  );
}
