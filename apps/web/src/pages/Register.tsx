import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRegisterMutation } from "@/hooks/use-auth";
import { validatePhone, normalizePhone, validateEmail } from "@/lib/validation";

export default function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const register = useRegisterMutation();
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      setError(t(emailValidation.message ?? "errors.invalidEmail"));
      return;
    }

    if (phone.trim()) {
      const phoneValidation = validatePhone(phone);
      if (!phoneValidation.valid) {
        setError(t(phoneValidation.message ?? "errors.invalidPhone"));
        return;
      }
    }

    try {
      await register.mutateAsync({
        name: name.trim(),
        email: email.trim(),
        password,
        phone: phone.trim() ? normalizePhone(phone) || undefined : undefined,
      });
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.somethingWentWrong"));
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4 py-8">
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="border-2 shadow-xl">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl">{t("auth.register")}</CardTitle>
            <CardDescription>{t("auth.createAccount")} {t("auth.fillDetails")}</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}
              <div className="space-y-2">
                <Label htmlFor="name">{t("auth.name")}</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder={t("auth.namePlaceholder")}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t("auth.email")}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t("auth.emailPlaceholder")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  aria-invalid={!validateEmail(email).valid}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">{t("auth.phone")}</Label>
                <Input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  placeholder={t("auth.phonePlaceholder")}
                  value={phone}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (/^\+?[0-9]*$/.test(v)) setPhone(v);
                  }}
                  autoComplete="tel"
                  aria-invalid={!!(phone.trim() && !validatePhone(phone).valid)}
                  aria-describedby={phone.trim() && !validatePhone(phone).valid ? "phone-error" : undefined}
                />
                {phone.trim() && !validatePhone(phone).valid && (
                  <p id="phone-error" className="text-sm text-destructive" role="alert">
                    {t("errors.invalidPhone")}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t("auth.password")}</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    className="pr-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword((p) => !p)}
                    aria-label={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full" size="lg" disabled={register.isPending}>
                {register.isPending ? t("common.loading") : t("auth.register")}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                {t("auth.alreadyHaveAccount")}{" "}
                <Link to="/login" className="font-medium text-primary hover:underline">
                  {t("auth.login")}
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}
