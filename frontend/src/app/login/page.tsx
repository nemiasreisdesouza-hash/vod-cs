"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const schema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});
type Form = z.infer<typeof schema>;

export default function Login() {
  const router = useRouter();
  const [error, setError] = useState("");
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: Form) => {
    setError("");
    try {
      const tokens = await api<{ access_token: string; refresh_token: string }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(data),
      });
      localStorage.setItem("vod_access", tokens.access_token);
      localStorage.setItem("vod_refresh", tokens.refresh_token);
      router.push("/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha no login");
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-6">
      <Link href="/" className="mb-6 text-center text-xl font-extrabold">🎯 VOD Analyst Pro</Link>
      <div className="rounded-2xl border border-white/10 bg-card p-6">
        <h1 className="text-xl font-bold">Entrar</h1>
        <p className="mb-4 text-sm text-gray-400">Demo: pro@vod.gg / pro123</p>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
          <div>
            <Input placeholder="Email" type="email" {...register("email")} />
            {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>}
          </div>
          <div>
            <Input placeholder="Senha" type="password" {...register("password")} />
            {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password.message}</p>}
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <Button disabled={isSubmitting}>{isSubmitting ? "Entrando…" : "Entrar"}</Button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-400">
          Sem conta? <Link href="/register" className="text-blue-400">Cadastre-se</Link>
        </p>
      </div>
    </main>
  );
}
