import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in - Guwahati Run" };

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col justify-center px-4 py-10">
      <h1 className="text-[2rem] font-semibold leading-tight tracking-tight">Guwahati Run</h1>
      <p className="mt-2 text-muted-foreground">Gujarat to IIT Guwahati and back, 28 Oct to 4 Nov.</p>
      <LoginForm />
    </main>
  );
}
