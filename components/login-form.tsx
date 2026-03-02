"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function LoginForm({ registered }: { registered: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl: "/dashboard",
    });

    setLoading(false);

    if (!result || result.error) {
      setError("Invalid email or password");
      return;
    }

    router.push(result.url || "/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.14),transparent_48%),radial-gradient(circle_at_80%_20%,rgba(59,130,246,0.18),transparent_40%),#0a0a0a] px-4 py-16 text-white">
      <div className="mx-auto max-w-md">
        <Card className="rounded-2xl border-white/15 bg-white/5 backdrop-blur-xl">
          <CardContent className="space-y-6 p-8">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold">Sign In</h1>
              <p className="text-sm text-white/60">
                Access your dashboard and continue where you left off.
              </p>
            </div>

            {registered ? (
              <p className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
                Account created. You can sign in now.
              </p>
            ) : null}

            <form className="space-y-4" onSubmit={onSubmit}>
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
              />
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>

            {error ? <p className="text-sm text-red-400">{error}</p> : null}

            <p className="text-sm text-white/60">
              New here?{" "}
              <Link href="/register" className="text-white underline underline-offset-4">
                Create an account
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
