const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY in environment variables.");
}

function getAuthHeader(req) {
  const authHeader = req.headers.authorization;
  return authHeader && authHeader.startsWith("Bearer ") ? authHeader : null;
}

function getSupabaseClient(req) {
  const authHeader = getAuthHeader(req);

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: authHeader ? { Authorization: authHeader } : {},
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function getAuthenticatedUser(req) {
  const supabase = getSupabaseClient(req);
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return null;
  }

  return data.user;
}

module.exports = {
  getSupabaseClient,
  getAuthenticatedUser,
};
