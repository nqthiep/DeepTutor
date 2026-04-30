"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { Mail, GraduationCap, ArrowLeft, CheckCircle2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Card from "@/components/ui/Card";
import { useAuth } from "@/context/AuthContext";

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const { forgotPassword } = useAuth();

  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError(t("Please enter your email"));
      return;
    }

    setLoading(true);
    try {
      await forgotPassword(email);
      setSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("Something went wrong"));
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <Card>
        <div className="flex flex-col items-center text-center py-4">
          <div className="w-14 h-14 rounded-full bg-[var(--primary)]/10 flex items-center justify-center mb-5">
            <CheckCircle2 size={32} className="text-[var(--primary)]" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
            {t("Check your email")}
          </h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-2 leading-relaxed max-w-sm">
            {t("We've sent a password reset link to")} <span className="font-medium text-[var(--foreground)]">{email}</span>
            . {t("Please check your inbox and follow the instructions.")}
          </p>
          <Link
            href="/login"
            className="mt-6 inline-flex items-center gap-1.5 text-[13px] text-[var(--primary)] hover:underline font-medium"
          >
            <ArrowLeft size={15} />
            {t("Back to login")}
          </Link>
        </div>
      </Card>
    );
  }

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
          {t("Forgot your password?")}
        </h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-2 text-center leading-relaxed max-w-sm">
          {t("Enter your email address and we'll send you a link to reset your password.")}
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

        {error && (
          <div className="rounded-lg bg-[var(--destructive)]/10 border border-[var(--destructive)]/20 px-4 py-2.5 text-sm text-[var(--destructive)]">
            {error}
          </div>
        )}

        <Button type="submit" loading={loading} className="w-full h-[44px] text-[15px]" size="lg">
          {t("Send reset link")}
        </Button>
      </form>

      <div className="mt-6 text-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-[13px] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
        >
          <ArrowLeft size={15} />
          {t("Back to login")}
        </Link>
      </div>
    </Card>
  );
}
