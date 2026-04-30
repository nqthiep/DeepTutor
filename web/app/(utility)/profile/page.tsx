"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  User,
  Lock,
  Loader2,
  CheckCircle2,
  GraduationCap,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Card from "@/components/ui/Card";
import { useAuth } from "@/context/AuthContext";
import { updateProfile, changePassword } from "@/lib/auth-api";

export default function ProfilePage() {
  const { t } = useTranslation();
  const { user, getAccessToken, refreshUser } = useAuth();

  const [displayName, setDisplayName] = useState(user?.display_name || "");
  const [saving, setSaving] = useState(false);
  const [saveDone, setSaveDone] = useState(false);
  const [saveErr, setSaveErr] = useState("");

  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdDone, setPwdDone] = useState(false);
  const [pwdErr, setPwdErr] = useState("");

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveErr("");
    setSaveDone(false);
    setSaving(true);
    try {
      const token = getAccessToken();
      if (!token) return;
      await updateProfile({ display_name: displayName }, token);
      await refreshUser();
      setSaveDone(true);
    } catch (err: unknown) {
      setSaveErr(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdErr("");
    setPwdDone(false);
    if (newPwd.length < 8) {
      setPwdErr(t("Password must be at least 8 characters"));
      return;
    }
    if (newPwd !== confirmPwd) {
      setPwdErr(t("Passwords don't match"));
      return;
    }
    setPwdSaving(true);
    try {
      const token = getAccessToken();
      if (!token) return;
      await changePassword(currentPwd, newPwd, token);
      setPwdDone(true);
      setCurrentPwd("");
      setNewPwd("");
      setConfirmPwd("");
    } catch (err: unknown) {
      setPwdErr(err instanceof Error ? err.message : "Change failed");
    } finally {
      setPwdSaving(false);
    }
  };

  const initial = (user?.display_name || user?.email || "U").charAt(0).toUpperCase();

  if (!user) return null;

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8 pb-6 border-b border-[var(--border)]/50">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--primary)]/15 text-[var(--primary)] text-2xl font-semibold">
          {initial}
        </div>
        <div>
          <h1 className="text-xl font-bold text-[var(--foreground)]">
            {t("Profile")}
          </h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
            {user.email}
          </p>
        </div>
      </div>

      <div className="space-y-10 max-w-md">
        {/* Display name */}
        <form onSubmit={handleSaveProfile} className="space-y-3">
          <h2 className="text-[14px] font-semibold text-[var(--foreground)]">
            {t("Display name")}
          </h2>
          <Input
            placeholder={t("Your name")}
            icon={<User size={18} />}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
          <div className="flex items-center gap-3">
            <Button type="submit" loading={saving} size="md">
              {t("Save")}
            </Button>
            {saveErr && (
              <span className="text-[12px] text-[var(--destructive)]">
                {saveErr}
              </span>
            )}
            {saveDone && (
              <span className="flex items-center gap-1 text-[12px] text-green-600 dark:text-green-400">
                <CheckCircle2 size={13} />
                {t("Saved")}
              </span>
            )}
          </div>
        </form>

        {/* Change password */}
        <form onSubmit={handleChangePassword} className="space-y-3">
          <h2 className="text-[14px] font-semibold text-[var(--foreground)]">
            {t("Change password")}
          </h2>
          <Input
            label={t("Current password")}
            type="password"
            placeholder={t("Enter your current password")}
            icon={<Lock size={18} />}
            showPasswordToggle
            value={currentPwd}
            onChange={(e) => setCurrentPwd(e.target.value)}
          />
          <Input
            label={t("New password")}
            type="password"
            placeholder={t("At least 8 characters")}
            icon={<Lock size={18} />}
            showPasswordToggle
            value={newPwd}
            onChange={(e) => setNewPwd(e.target.value)}
          />
          <Input
            label={t("Confirm password")}
            type="password"
            placeholder={t("Repeat your password")}
            icon={<Lock size={18} />}
            showPasswordToggle
            value={confirmPwd}
            onChange={(e) => setConfirmPwd(e.target.value)}
          />
          <div className="flex items-center gap-3">
            <Button type="submit" loading={pwdSaving} size="md">
              {t("Update password")}
            </Button>
            {pwdErr && (
              <span className="text-[12px] text-[var(--destructive)]">
                {pwdErr}
              </span>
            )}
            {pwdDone && (
              <span className="flex items-center gap-1 text-[12px] text-green-600 dark:text-green-400">
                <CheckCircle2 size={13} />
                {t("Password changed")}
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
