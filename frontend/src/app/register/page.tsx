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
  name: z.string().min(2, "Informe seu nome"),
  nickname: z.string().min(2, "Informe seu nick"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});
type Form = z.infer<typeof schema>;

export default function Register() {
  const router = useRouter();
  const [error, setError] = useState("");
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: Form) => {
    setError("");
    try {
      const tokens = await api<{ access_token: string; refresh_token: string }>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(data),
      });
      localStorage.setItem("vod_access", tokens.access_token);
      localStorage.setItem("vod_refresh", tokens.refresh_token);
      router.push("/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha no cadastro");
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-6">
      <Link href="/" className="mb-6 text-center text-xl font-extrabold">🎯 VOD Analyst Pro</Link>
      <div className="rounded-2xl border border-white/10 bg-card p-6">
        <h1 className="text-xl font-bold">Criar conta</h1>
        <p className="mb-4 text-sm text-gray-400">3 análises grátis por mês, sem cartão.</p>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
          <Input placeholder="Nome" {...register("name")} />
          {errors.name && <p className="-mt-2 text-xs text-red-400">{errors.name.message}</p>}
          <Input placeholder="Nick no jogo" {...register("nickname")} />
          {errors.nickname && <p className="-mt-2 text-xs text-red-400">{errors.nickname.message}</p>}
          <Input placeholder="Email" type="email" {...register("email")} />
          {errors.email && <p className="-mt-2 text-xs text-red-400">{errors.email.message}</p>}
          <Input placeholder="Senha" type="password" {...register("password")} />
          {errors.password && <p className="-mt-2 text-xs text-red-400">{errors.password.message}</p>}
          {error && <p className="text-xs text-red-400">{error}</p>}
          <Button disabled={isSubmitting}>{isSubmitting ? "Criando…" : "Criar conta grátis"}</Button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-400">
          Já tem conta? <Link href="/login" className="text-blue-400">Entrar</Link>
        </p>
      </div>
    </main>
  );
}
