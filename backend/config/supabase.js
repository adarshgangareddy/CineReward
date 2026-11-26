const { createClient } = require("@supabase/supabase-js");

let supabaseClient = null;
let dbReady = false;
let lastDbError = "Supabase not initialized yet.";
let initializedConfigKey = "";

const getSupabaseUrl = () => String(process.env.SUPABASE_URL || "").trim();
const getSupabaseServiceKey = () =>
  String(
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || ""
  ).trim();

const isSupabaseConfigured = () =>
  Boolean(getSupabaseUrl() && getSupabaseServiceKey());

const getSupabase = () => {
  const url = getSupabaseUrl();
  const key = getSupabaseServiceKey();
  if (!url || !key) return null;

  const configKey = `${url}::${key.slice(0, 12)}`;
  if (!supabaseClient || initializedConfigKey !== configKey) {
    supabaseClient = createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    initializedConfigKey = configKey;
  }
  return supabaseClient;
};

/**
 * Allows injecting a mock Supabase client inside unit tests.
 */
const setSupabaseClient = (client, ready = true) => {
  supabaseClient = client;
  dbReady = Boolean(client && ready);
  lastDbError = dbReady ? "" : "Database disconnected";
  initializedConfigKey = "custom-client";
};

const verifySupabaseConnection = async () => {
  const client = getSupabase();
  if (!client) {
    dbReady = false;
    lastDbError =
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are not configured.";
    return { connected: false, configured: false, error: lastDbError };
  }

  try {
    const { error } = await client
      .from("users")
      .select("id", { count: "exact", head: true });

    if (error) {
      dbReady = false;
      const missingTable =
        error.code === "42P01" ||
        error.code === "PGRST205" ||
        /relation .*users.* does not exist/i.test(error.message || "");
      lastDbError = missingTable
        ? "Supabase connected, but tables are missing. Run backend/supabase/schema.sql in Supabase SQL Editor."
        : error.message || "Supabase query failed";
      return {
        connected: false,
        configured: true,
        schemaMissing: missingTable,
        error: lastDbError,
      };
    }

    dbReady = true;
    lastDbError = "";
    return { connected: true, configured: true };
  } catch (err) {
    dbReady = false;
    lastDbError = err.message || "Supabase connection error";
    return { connected: false, configured: true, error: lastDbError };
  }
};

const isSupabaseReady = () => Boolean(getSupabase() && dbReady);

const getLastDbError = () => lastDbError;

module.exports = {
  getSupabase,
  setSupabaseClient,
  isSupabaseConfigured,
  isSupabaseReady,
  verifySupabaseConnection,
  getLastDbError,
};

