import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-3xl font-bold">CityPulse</h1>
      <p className="text-gray-500">AI-Powered Civic Decision Intelligence</p>
      <div className="flex gap-4">
        <Link href="/report" className="rounded bg-blue-600 px-4 py-2 text-white">
          Report a problem
        </Link>
        <Link href="/login" className="rounded border px-4 py-2">
          Sign in (officials)
        </Link>
      </div>
    </main>
  );
}
