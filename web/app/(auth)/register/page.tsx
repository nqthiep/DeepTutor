"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { Mail, Lock, User, GraduationCap } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Card from "@/components/ui/Card";
import { useAuth } from "@/context/AuthContext";

export default function RegisterPage() {
  const { t } = useTranslation();
  const { register, isAuthenticated, isLearner, needsOnboarding } = useAuth();
  const router = useRouter();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      if (needsOnboarding) {
        router.push("/onboarding");
      } else {
        router.push(isLearner ? "/my-learning" : "/chat");
      }
    }
  }, [isAuthenticated, isLearner, needsOnboarding, router]);

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
    if (password.length < 8) {
      setError(t("Password must be at least 8 characters"));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("Passwords don't match"));
      return;
    }

    setLoading(true);
    try {
      await register(email, password, displayName || undefined);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("Registration failed"));
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
          {t("Create an account")}
        </h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">
          {t("Get started with DeepTutor")}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label={t("Display name")}
          type="text"
          placeholder={t("Your name")}
          icon={<User size={18} />}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          autoComplete="name"
        />

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
          placeholder={t("At least 8 characters")}
          icon={<Lock size={18} />}
          showPasswordToggle
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
        />

        <Input
          label={t("Confirm password")}
          type="password"
          placeholder={t("Repeat your password")}
          icon={<Lock size={18} />}
          showPasswordToggle
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
        />

        {error && (
          <div className="rounded-lg bg-[var(--destructive)]/10 border border-[var(--destructive)]/20 px-4 py-2.5 text-sm text-[var(--destructive)]">
            {error}
          </div>
        )}

        <Button type="submit" loading={loading} className="w-full h-[44px] text-[15px]" size="lg">
          {t("Create account")}
        </Button>
      </form>

      <p className="mt-6 text-center text-[13px] text-[var(--muted-foreground)]">
        {t("Already have an account?")}{" "}
        <Link href="/login" className="text-[var(--primary)] hover:underline font-medium">
          {t("Sign in")}
        </Link>
      </p>
    </Card>
  );
}
