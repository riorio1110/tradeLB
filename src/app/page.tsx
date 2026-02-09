import { createClient } from "@/utils/supabase/server";

export default async function Home() {
  const supabase = await createClient();

  // Try to fetch data to verify connection
  // RLS is enabled, so this should return empty array if not logged in (or error depending on policy)
  // For RLS 'Select' policy: USING (auth.uid() = user_id) -> returns empty array for anon users
  const { data: trades, error } = await supabase.from("trades").select("*").limit(1);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col items-center gap-8 row-start-2 items-center sm:items-start">
        <h1 className="text-4xl font-bold text-center sm:text-left">
          Welcome to TradeNote
        </h1>

        <div className="p-6 border rounded-lg shadow-md w-full max-w-md bg-white dark:bg-zinc-900">
          <h2 className="text-xl font-semibold mb-4">Database Connection Status</h2>

          {error ? (
            <div className="text-red-500 bg-red-50 p-4 rounded">
              <p className="font-bold">Error Connecting:</p>
              <pre className="text-sm mt-2 whitespace-pre-wrap">{JSON.stringify(error, null, 2)}</pre>
            </div>
          ) : (
            <div className="text-green-600 bg-green-50 p-4 rounded">
              <p className="font-bold">✅ Connection Successful!</p>
              <p className="text-sm mt-2 text-gray-600">
                Fetched {trades?.length ?? 0} trades.
                (Expected 0 as you are not logged in yet)
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
