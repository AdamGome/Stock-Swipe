import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
}

if (!supabaseServiceKey) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

type ApiBudgetOptions = {
  provider: string;
  endpoint: string;
  dailyLimit: number;
};

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

export async function canUseApiCall({
  provider,
  endpoint,
  dailyLimit,
}: ApiBudgetOptions) {
  const today = getTodayDate();

  const { data, error } = await supabaseAdmin
    .from("api_usage")
    .select("call_count")
    .eq("provider", provider)
    .eq("endpoint", endpoint)
    .eq("usage_date", today)
    .maybeSingle();

  if (error) {
    console.error("API budget check failed:", error);
    return false;
  }

  const currentCount = data?.call_count || 0;

  return currentCount < dailyLimit;
}

export async function recordApiCall({
  provider,
  endpoint,
}: {
  provider: string;
  endpoint: string;
}) {
  const today = getTodayDate();

  const { data: existing, error: readError } = await supabaseAdmin
    .from("api_usage")
    .select("id, call_count")
    .eq("provider", provider)
    .eq("endpoint", endpoint)
    .eq("usage_date", today)
    .maybeSingle();

  if (readError) {
    console.error("API usage read failed:", readError);
    return;
  }

  if (existing) {
    const { error: updateError } = await supabaseAdmin
      .from("api_usage")
      .update({
        call_count: existing.call_count + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    if (updateError) {
      console.error("API usage update failed:", updateError);
    }

    return;
  }

  const { error: insertError } = await supabaseAdmin.from("api_usage").insert({
    provider,
    endpoint,
    usage_date: today,
    call_count: 1,
  });

  if (insertError) {
    console.error("API usage insert failed:", insertError);
  }
}