"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"USER" | "BUSINESS">("USER");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        password,
        role,
      }),
    });

    const data = (await res.json()) as { error?: string };
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Registration failed");
      return;
    }

    setMessage("Account created successfully. Redirecting to sign in...");
    setTimeout(() => {
      router.push("/login?registered=1");
    }, 800);
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.16),transparent_48%),radial-gradient(circle_at_80%_20%,rgba(34,197,94,0.14),transparent_40%),#0a0a0a] px-4 py-16 text-white">
      <div className="mx-auto max-w-md">
        <Card className="rounded-2xl border-white/15 bg-white/5 backdrop-blur-xl">
          <CardContent className="space-y-6 p-8">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold">Create Account</h1>
              <p className="text-sm text-white/60">
                Join as a user to earn, or as a business to run campaigns.
              </p>
            </div>

            <form className="space-y-4" onSubmit={onSubmit}>
              <Input
                placeholder="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />

              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant={role === "USER" ? "default" : "outline"}
                  onClick={() => setRole("USER")}
                >
                  User
                </Button>
                <Button
                  type="button"
                  variant={role === "BUSINESS" ? "default" : "outline"}
                  onClick={() => setRole("BUSINESS")}
                >
                  Business
                </Button>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Creating..." : "Create Account"}
              </Button>
            </form>

            {message ? <p className="text-sm text-emerald-300">{message}</p> : null}
            {error ? <p className="text-sm text-red-400">{error}</p> : null}

            <p className="text-sm text-white/60">
              Already have an account?{" "}
              <Link href="/login" className="text-white underline underline-offset-4">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
