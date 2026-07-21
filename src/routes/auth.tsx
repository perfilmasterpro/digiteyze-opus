import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — Growth OS" },
      { name: "description", content: "Acesse o Growth OS: entre ou crie sua conta." },
      { property: "og:title", content: "Entrar — Growth OS" },
      { property: "og:description", content: "Acesse o Growth OS: entre ou crie sua conta." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { status } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");

  useEffect(() => {
    if (status === "authenticated") {
      void navigate({ to: "/" });
    }
  }, [status, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Growth OS</CardTitle>
          <CardDescription>Sistema operacional da Digiteyze.</CardDescription>
        </CardHeader>
        <CardContent>
          {mode === "forgot" ? (
            <ForgotForm onBack={() => setMode("signin")} />
          ) : (
            <Tabs value={mode} onValueChange={(v) => setMode(v as "signin" | "signup")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Entrar</TabsTrigger>
                <TabsTrigger value="signup">Criar conta</TabsTrigger>
              </TabsList>
              <TabsContent value="signin" className="pt-4">
                <SignInForm onForgot={() => setMode("forgot")} />
              </TabsContent>
              <TabsContent value="signup" className="pt-4">
                <SignUpForm />
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SignInForm({ onForgot }: { onForgot: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Bem-vindo!");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="signin-email">E-mail</Label>
        <Input
          id="signin-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="signin-pass">Senha</Label>
        <Input
          id="signin-pass"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Entrando..." : "Entrar"}
      </Button>
      <button
        type="button"
        onClick={onForgot}
        className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
      >
        Esqueci minha senha
      </button>
    </form>
  );
}

function SignUpForm() {
  const [name, setName] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          display_name: name || undefined,
          workspace_name: workspaceName || undefined,
        },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Conta criada! Verifique seu e-mail se a confirmação estiver ativa.");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="signup-name">Seu nome</Label>
        <Input id="signup-name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-ws">Nome do workspace</Label>
        <Input
          id="signup-ws"
          placeholder="Ex.: Digiteyze"
          value={workspaceName}
          onChange={(e) => setWorkspaceName(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-email">E-mail</Label>
        <Input
          id="signup-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-pass">Senha</Label>
        <Input
          id="signup-pass"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Criando..." : "Criar conta"}
      </Button>
    </form>
  );
}

function ForgotForm({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Enviamos um link de recuperação para seu e-mail.");
    onBack();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Informe seu e-mail para receber um link de redefinição de senha.
      </p>
      <div className="space-y-2">
        <Label htmlFor="forgot-email">E-mail</Label>
        <Input
          id="forgot-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Enviando..." : "Enviar link"}
      </Button>
      <button
        type="button"
        onClick={onBack}
        className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
      >
        Voltar para entrar
      </button>
    </form>
  );
}
