"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { Mail, Lock, GraduationCap } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Card from "@/components/ui/Card";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const { t } = useTranslation();
  const { login, isAuthenticated, isLearner } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      router.push(isLearner ? "/dashboard" : "/chat");
    }
  }, [isAuthenticated, isLearner, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError(t("Please enter your email"));
      return;
    }
    if (!password) {
      setError(t("Please enter your password"));
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("Invalid email or password"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <div className="flex flex-col items-center mb-8">
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[var(--primary)] flex items-center justify-center">
            <GraduationCap size={22} className="text-[var(--primary-foreground)]" />
          </div>
          <span className="text-xl font-bold tracking-tight text-[var(--foreground)]">
            DeepTutor
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
          {t("Welcome back")}
        </h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">
          {t("Sign in to your account")}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label={t("Email")}
          type="email"
          placeholder={t("you@example.com")}
          icon={<Mail size={18} />}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          autoFocus
        />

        <Input
          label={t("Password")}
          type="password"
          placeholder={t("Enter your password")}
          icon={<Lock size={18} />}
          showPasswordToggle
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="w-4 h-4 rounded border-[var(--border)] bg-[var(--background)] text-[var(--primary)] focus:ring-[var(--primary)]/30"
            />
            <span className="text-[13px] text-[var(--muted-foreground)]">
              {t("Remember me")}
            </span>
          </label>
          <Link
            href="/forgot-password"
            className="text-[13px] text-[var(--primary)] hover:underline"
          >
            {t("Forgot password?")}
          </Link>
        </div>

        {error && (
          <div className="rounded-lg bg-[var(--destructive)]/10 border border-[var(--destructive)]/20 px-4 py-2.5 text-sm text-[var(--destructive)]">
            {error}
          </div>
        )}

        <Button type="submit" loading={loading} className="w-full h-[44px] text-[15px]" size="lg">
          {t("Sign in")}
        </Button>
      </form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[var(--border)]/30" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-[var(--card)] px-3 text-[12px] text-[var(--muted-foreground)]">
            {t("or")}
          </span>
        </div>
      </div>

      <p className="text-center text-[13px] text-[var(--muted-foreground)]">
        {t("Don't have an account?")}{" "}
        <Link href="/register" className="text-[var(--primary)] hover:underline font-medium">
          {t("Sign up")}
        </Link>
      </p>
    </Card>
  );
}
