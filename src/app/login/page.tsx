"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid email or password");
      setLoading(false);
      return;
    }

    // Fetch session to determine redirect
    const res = await fetch("/api/auth/session");
    const session = await res.json();

    if (session?.user?.role === "ADMIN") {
      router.push("/admin");
    } else {
      router.push("/");
    }
  }

  return (
    <div className="min-h-screen bg-otm-light flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Image
            src="/otm-logo.png"
            alt="OTM"
            width={120}
            height={48}
            className="mx-auto h-12 w-auto mb-4"
          />
          <h1 className="font-outfit font-bold text-otm-navy text-xl">
            Client Portal
          </h1>
          <p className="text-sm text-otm-gray mt-1">
            Sign in to view your strategy engagement
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-otm-gray mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-otm-teal"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-otm-gray mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-otm-teal"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-otm-teal text-white font-medium py-2 rounded hover:bg-otm-teal/90 transition-colors disabled:opacity-50 text-sm"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
