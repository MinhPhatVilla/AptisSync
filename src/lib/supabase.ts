import { createClient } from "@supabase/supabase-js";

// These env vars MUST be set in Vercel → Settings → Environment Variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (typeof window !== "undefined" && (!supabaseUrl || !supabaseKey)) {
  console.error("[AptisSync] Missing Supabase env vars. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel.");
}

export const supabase = createClient(
  supabaseUrl || "https://yxicgoshfmhjtkwcaeym.supabase.co",
  supabaseKey || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4aWNnb3NoZm1oanRrd2NhZXltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0NzY3NDIsImV4cCI6MjA4NTA1Mjc0Mn0.xPrqB5l89lBxynNsOKLObbrx5sUZVtx28M7kOTKb_Cc"
);
