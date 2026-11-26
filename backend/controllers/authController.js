const { getSupabase, isSupabaseReady } = require("../config/supabase");
const {
  mapUser,
  mapMovieTeam,
  toUserRow,
  sanitizeUser,
} = require("../utils/dbMappers");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const emailService = require("../services/emailService");
const {
  hashSecret,
  verifySecret,
  digestSecret,
  formatKeyHint,
} = require("../utils/passwordHash");

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id || user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

const formatUserResponse = (user) => ({
  id: user._id || user.id,
  name: user.name,
  username: user.username,
  email: user.email,
  phone: user.phone,
  coins: user.coins || 0,
  role: user.role || "user",
  profilePicture: user.profilePicture || "",
});

const formatTeamResponse = (team) => ({
  id: team._id || team.id,
  name: team.name,
  email: team.email,
  role: "movie_team",
  assignedMovies: team.assignedMovies || [],
  freeTicketsCount: team.freeTicketsCount || 0,
  secretKeyHint:
    team.secretKeyHint ||
    (team.secretKey ? formatKeyHint(team.secretKey) : "Configured"),
});

const verifyMovieTeamCredential = async (team, credential, explicitKey) => {
  const candidates = [explicitKey, credential].filter(Boolean);
  for (const cand of candidates) {
    if (team.secretKeyHash && (await verifySecret(team.secretKeyHash, cand))) return true;
    if (team.secretKey && String(cand).trim() === String(team.secretKey).trim()) return true;
    if (team.password && (await verifySecret(team.password, cand))) return true;
  }
  return false;
};

const requireDb = () => {
  if (!isSupabaseReady()) {
    const err = new Error("db_unavailable");
    err.statusCode = 503;
    throw err;
  }
  return getSupabase();
};

const authController = {
  signup: async (req, res) => {
    try {
      const { name, username, email, password } = req.body;
      const trimmedName = name?.trim();
      const normalizedUsername = username?.trim().toLowerCase() || undefined;
      const normalizedEmail = email?.trim().toLowerCase();

      if (!trimmedName || !normalizedEmail || !password) {
        return res.status(400).json({ message: "Name, email, and password are required" });
      }
      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }

      const sb = requireDb();

      // Check duplicates
      const orFilters = [`email.eq.${normalizedEmail}`];
      if (normalizedUsername) orFilters.push(`username.eq.${normalizedUsername}`);
      const { data: existing } = await sb
        .from("users")
        .select("id")
        .or(orFilters.join(","))
        .limit(1);

      if (existing && existing.length > 0) {
        return res.status(400).json({
          message: "An account with this email or username already exists",
        });
      }

      const hashedPassword = await hashSecret(password);
      const { data: created, error } = await sb
        .from("users")
        .insert(
          toUserRow({
            name: trimmedName,
            username: normalizedUsername,
            email: normalizedEmail,
            password: hashedPassword,
            coins: 0,
            role: "user",
          })
        )
        .select("*")
        .single();

      if (error) {
        if (error.code === "23505") {
          return res.status(400).json({
            message: "An account with this email or username already exists",
          });
        }
        throw error;
      }

      const user = mapUser(created);
      const token = generateToken(user);
      res.status(201).json({ token, user: formatUserResponse(user) });
    } catch (err) {
      if (err.statusCode === 503) {
        return res.status(503).json({
          message:
            "Database is currently disconnected. Please verify SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are configured.",
        });
      }
      res.status(500).json({ message: "Server error", error: err.message });
    }
  },

  login: async (req, res) => {
    try {
      const { identifier, email, password, secretKey } = req.body;
      const loginIdentifier = (identifier || email || secretKey || "").trim();
      const credential = password || secretKey || "";

      if (!loginIdentifier || !credential) {
        return res.status(400).json({
          message: "Email/username/team ID and password or secret key are required",
        });
      }

      const normalizedIdentifier = loginIdentifier.toLowerCase();
      const adminEmail = (
        process.env.SUPER_ADMIN_EMAIL ||
        process.env.EMAIL_USER ||
        ""
      )
        .trim()
        .toLowerCase();
      const adminUsername = process.env.SUPER_ADMIN_USERNAME?.trim().toLowerCase();
      const adminPassword = process.env.SUPER_ADMIN_PASSWORD;
      const adminSecret = process.env.SUPER_ADMIN_SECRET_CODE?.trim();

      const matchesAdminIdentity = Boolean(
        (adminEmail && normalizedIdentifier === adminEmail) ||
          (adminUsername && normalizedIdentifier === adminUsername)
      );

      // 1. Admin authentication
      if (
        matchesAdminIdentity &&
        adminPassword &&
        (await verifySecret(adminPassword, credential))
      ) {
        if (secretKey && adminSecret && secretKey.trim() !== adminSecret) {
          return res.status(401).json({ message: "Admin secret code is incorrect" });
        }
        const token = jwt.sign(
          { role: "super_admin", username: adminUsername || loginIdentifier },
          process.env.JWT_SECRET,
          { expiresIn: "7d" }
        );
        return res.json({
          token,
          user: {
            id: "super_admin",
            name: "Super Admin",
            username: adminUsername || loginIdentifier,
            email: adminEmail || loginIdentifier,
            role: "super_admin",
          },
        });
      }

      if (!isSupabaseReady()) {
        return res.status(503).json({
          message:
            "Database is currently disconnected. Please verify SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are configured.",
        });
      }
      const sb = getSupabase();

      // 2. Movie Team lookup
      const digestFromId = digestSecret(loginIdentifier);
      const digestFromKey = digestSecret(secretKey || credential);
      const teamOrFilters = [
        `email.eq.${normalizedIdentifier}`,
        `secret_key_digest.eq.${digestFromId}`,
        ...(digestFromKey ? [`secret_key_digest.eq.${digestFromKey}`] : []),
        `secret_key.eq.${loginIdentifier}`,
      ];
      const { data: teamRows } = await sb
        .from("movie_teams")
        .select("*")
        .or(teamOrFilters.join(","))
        .limit(1);

      if (teamRows && teamRows.length > 0) {
        const team = mapMovieTeam(teamRows[0]);
        const validTeamCred = await verifyMovieTeamCredential(team, credential, secretKey);
        if (!validTeamCred) {
          return res.status(401).json({ message: "Invalid movie team credentials or secret key" });
        }
        const token = jwt.sign(
          { id: team._id, role: "movie_team" },
          process.env.JWT_SECRET,
          { expiresIn: "7d" }
        );
        return res.json({ token, user: formatTeamResponse(team) });
      }

      // 3. Regular user
      const { data: userRows } = await sb
        .from("users")
        .select("*")
        .or(`email.eq.${normalizedIdentifier},username.eq.${normalizedIdentifier}`)
        .limit(1);

      if (!userRows || userRows.length === 0) {
        return res.status(401).json({ message: "Invalid email/username or password" });
      }

      const user = mapUser(userRows[0]);
      if (!user.password) {
        return res.status(401).json({
          message:
            "This account uses Social or Phone Sign-In. Please continue with Google/X/Phone or reset with your 8-digit email code.",
        });
      }

      const isMatch = await verifySecret(user.password, credential);
      if (!isMatch) {
        return res.status(401).json({ message: "Invalid email/username or password" });
      }

      const token = generateToken(user);
      return res.json({ token, user: formatUserResponse(user) });
    } catch (err) {
      res.status(500).json({ message: "Server error", error: err.message });
    }
  },

  supabaseSocialLogin: async (req, res) => {
    try {
      const { accessToken } = req.body;
      if (!accessToken) {
        return res.status(400).json({ message: "Supabase access token is required" });
      }
      if (!isSupabaseReady()) {
        return res.status(503).json({ message: "Database not configured" });
      }
      const sb = getSupabase();

      // Verify with Supabase
      const { data: authData, error: authErr } = await sb.auth.getUser(accessToken);
      if (authErr || !authData?.user) {
        return res.status(401).json({ message: "Invalid Supabase token" });
      }

      const su = authData.user;
      const email = su.email ? su.email.trim().toLowerCase() : null;
      const supabaseUid = su.id;
      const provider = su.app_metadata?.provider || "social";
      const profilePicture =
        su.user_metadata?.avatar_url || su.user_metadata?.picture || "";
      const displayName =
        su.user_metadata?.full_name ||
        su.user_metadata?.name ||
        (email ? email.split("@")[0] : "CineReward Member");

      // Find by supabase_uid or email
      const orFilters = [`supabase_uid.eq.${supabaseUid}`];
      if (email) orFilters.push(`email.eq.${email}`);
      const { data: existing } = await sb
        .from("users")
        .select("*")
        .or(orFilters.join(","))
        .limit(1);

      let user;
      if (existing && existing.length > 0) {
        const updates = {};
        if (!existing[0].supabase_uid) updates.supabase_uid = supabaseUid;
        if (provider === "twitter" && !existing[0].x_id) updates.x_id = supabaseUid;
        if (!existing[0].profile_picture && profilePicture)
          updates.profile_picture = profilePicture;

        if (Object.keys(updates).length > 0) {
          const { data: updated } = await sb
            .from("users")
            .update(updates)
            .eq("id", existing[0].id)
            .select("*")
            .single();
          user = mapUser(updated || existing[0]);
        } else {
          user = mapUser(existing[0]);
        }
      } else {
        const { data: created, error: createErr } = await sb
          .from("users")
          .insert(
            toUserRow({
              name: displayName,
              email: email || undefined,
              supabaseUid,
              xId: provider === "twitter" ? supabaseUid : undefined,
              profilePicture,
              coins: 0,
              role: "user",
            })
          )
          .select("*")
          .single();
        if (createErr) throw createErr;
        user = mapUser(created);
      }

      const token = generateToken(user);
      return res.json({ token, user: formatUserResponse(user) });
    } catch (err) {
      console.error("[Supabase Auth Error]:", err.message);
      return res.status(401).json({ message: "Social sign-in verification failed" });
    }
  },

  me: async (req, res) => {
    try {
      if (!req.auth) {
        return res.status(401).json({ message: "Authentication required" });
      }

      if (req.auth.role === "super_admin") {
        return res.json({
          user: {
            id: "super_admin",
            name: "Super Admin",
            username: req.auth.username || process.env.SUPER_ADMIN_USERNAME,
            email:
              process.env.SUPER_ADMIN_EMAIL ||
              process.env.EMAIL_USER ||
              req.auth.username ||
              "admin@cinereward.com",
            role: "super_admin",
          },
        });
      }

      if (!isSupabaseReady()) {
        return res.status(503).json({ message: "Database disconnected" });
      }
      const sb = getSupabase();

      if (req.auth.role === "movie_team") {
        const { data } = await sb
          .from("movie_teams")
          .select("id, name, email, assigned_movies, free_tickets_count, secret_key_hint")
          .eq("id", req.auth.id)
          .single();
        if (!data) return res.status(404).json({ message: "Movie team not found" });
        return res.json({ user: formatTeamResponse(mapMovieTeam(data)) });
      }

      const { data } = await sb
        .from("users")
        .select("id, name, username, email, phone, coins, role, profile_picture, booked_tickets")
        .eq("id", req.auth.id)
        .single();
      if (!data) return res.status(404).json({ message: "User not found" });
      return res.json({ user: formatUserResponse(mapUser(data)) });
    } catch (err) {
      res.status(500).json({ message: "Server error", error: err.message });
    }
  },

  googleSuccess: (req, res) => {
    if (req.user) {
      const token = generateToken(req.user);
      res.json({ token, user: formatUserResponse(req.user) });
    } else {
      res.status(401).json({ message: "Google authentication failed" });
    }
  },

  handlePhoneAuth: async (req, res) => {
    try {
      const { uid, phone, name } = req.body;
      if (!uid || !phone) {
        return res.status(400).json({ message: "UID and Phone number are required" });
      }

      if (!isSupabaseReady()) {
        return res.status(503).json({ message: "Database disconnected" });
      }
      const sb = getSupabase();

      const { data: existing } = await sb
        .from("users")
        .select("*")
        .or(`phone.eq.${phone},supabase_uid.eq.${uid}`)
        .limit(1);

      if (existing && existing.length > 0) {
        const user = mapUser(existing[0]);
        const token = generateToken(user);
        return res.status(200).json({ token, user: formatUserResponse(user) });
      }

      const defaultName = name || `User${phone.slice(-4)}`;
      const { data: created, error } = await sb
        .from("users")
        .insert(toUserRow({ name: defaultName, phone, supabaseUid: uid, coins: 0, role: "user" }))
        .select("*")
        .single();

      if (error) {
        if (error.code === "23505") {
          return res.status(400).json({ message: "An account with this phone number already exists." });
        }
        throw error;
      }
      const user = mapUser(created);
      const token = generateToken(user);
      return res.status(201).json({ token, user: formatUserResponse(user) });
    } catch (err) {
      res.status(500).json({ message: "Server error during phone authentication", error: err.message });
    }
  },

  forgotPassword: async (req, res) => {
    try {
      const normalizedEmail = req.body?.email?.trim().toLowerCase();
      if (!normalizedEmail) {
        return res.status(400).json({ message: "Email address is required" });
      }
      if (!isSupabaseReady()) {
        return res.status(503).json({ message: "Database disconnected" });
      }
      const sb = getSupabase();

      let accountRow = null;
      let accountRole = "user";
      let table = "users";

      const { data: userRows } = await sb
        .from("users")
        .select("id, email, reset_code_hash, reset_code_expires")
        .eq("email", normalizedEmail)
        .limit(1);

      if (userRows && userRows.length > 0) {
        accountRow = userRows[0];
      } else {
        const { data: teamRows } = await sb
          .from("movie_teams")
          .select("id, email, reset_code_hash, reset_code_expires")
          .eq("email", normalizedEmail)
          .limit(1);
        if (teamRows && teamRows.length > 0) {
          accountRow = teamRows[0];
          accountRole = "movie_team";
          table = "movie_teams";
        }
      }

      if (!accountRow) {
        return res.status(404).json({ message: "No User or Movie Team account found with that email" });
      }

      const code = String(crypto.randomInt(10000000, 100000000));
      const codeHash = await hashSecret(code);
      const expires = new Date(Date.now() + 15 * 60 * 1000).toISOString();

      await sb
        .from(table)
        .update({ reset_code_hash: codeHash, reset_code_expires: expires })
        .eq("id", accountRow.id);

      const emailSent = await emailService.sendResetCodeEmail(normalizedEmail, code, accountRole);
      if (!emailSent) {
        return res.status(503).json({
          message:
            "Verification email could not be delivered right now. Please check server SMTP/Resend settings.",
        });
      }

      return res.json({
        message: "An 8-digit verification code has been sent to your email.",
        accountRole,
      });
    } catch (err) {
      res.status(500).json({ message: "Server error", error: err.message });
    }
  },

  verifyResetCode: async (req, res) => {
    try {
      const normalizedEmail = req.body?.email?.trim().toLowerCase();
      const code = req.body?.code?.trim();
      if (!normalizedEmail || !/^\d{8}$/.test(code || "")) {
        return res.status(400).json({
          message: "Email and a valid 8-digit verification code are required",
        });
      }
      if (!isSupabaseReady()) return res.status(503).json({ message: "Database disconnected" });
      const sb = getSupabase();

      let accountRow = null;
      let accountRole = "user";

      const { data: userRows } = await sb
        .from("users")
        .select("id, reset_code_hash, reset_code_expires")
        .eq("email", normalizedEmail)
        .limit(1);

      if (userRows && userRows.length > 0) {
        accountRow = userRows[0];
      } else {
        const { data: teamRows } = await sb
          .from("movie_teams")
          .select("id, reset_code_hash, reset_code_expires")
          .eq("email", normalizedEmail)
          .limit(1);
        if (teamRows && teamRows.length > 0) {
          accountRow = teamRows[0];
          accountRole = "movie_team";
        }
      }

      if (
        !accountRow ||
        !accountRow.reset_code_hash ||
        !accountRow.reset_code_expires ||
        new Date(accountRow.reset_code_expires) < new Date()
      ) {
        return res.status(400).json({ message: "Verification code is invalid or has expired" });
      }

      const codeOk = await verifySecret(accountRow.reset_code_hash, code);
      if (!codeOk) {
        return res.status(400).json({ message: "Incorrect 8-digit verification code" });
      }

      return res.json({ valid: true, accountRole });
    } catch (err) {
      res.status(500).json({ message: "Server error", error: err.message });
    }
  },

  resetPassword: async (req, res) => {
    try {
      const { email, code, password, newPassword, newSecretKey } = req.body;
      const nextPassword = (newPassword || password || "").trim();
      const nextSecret = (newSecretKey || "").trim();

      if (!email || !code) {
        return res.status(400).json({
          message: "Email, 8-digit verification code, and new password/key (min 6 chars) are required",
        });
      }

      const normalizedEmail = email.trim().toLowerCase();
      const trimmedCode = code.trim();
      if (!/^\d{8}$/.test(trimmedCode)) {
        return res.status(400).json({ message: "Please enter the exact 8-digit verification code" });
      }

      if (!isSupabaseReady()) return res.status(503).json({ message: "Database disconnected" });
      const sb = getSupabase();

      let accountRow = null;
      let isTeam = false;
      let table = "users";

      const { data: userRows } = await sb
        .from("users")
        .select("id, reset_code_hash, reset_code_expires")
        .eq("email", normalizedEmail)
        .limit(1);

      if (userRows && userRows.length > 0) {
        accountRow = userRows[0];
      } else {
        const { data: teamRows } = await sb
          .from("movie_teams")
          .select("id, reset_code_hash, reset_code_expires")
          .eq("email", normalizedEmail)
          .limit(1);
        if (teamRows && teamRows.length > 0) {
          accountRow = teamRows[0];
          isTeam = true;
          table = "movie_teams";
        }
      }

      if (
        !accountRow ||
        !accountRow.reset_code_hash ||
        !accountRow.reset_code_expires ||
        new Date(accountRow.reset_code_expires) < new Date()
      ) {
        return res.status(400).json({ message: "Verification code is invalid or expired. Request a new code." });
      }

      const codeValid = await verifySecret(accountRow.reset_code_hash, trimmedCode);
      if (!codeValid) {
        return res.status(400).json({ message: "Invalid 8-digit verification code" });
      }

      const updates = { reset_code_hash: null, reset_code_expires: null };

      if (isTeam) {
        if (!nextSecret && !nextPassword) {
          return res.status(400).json({ message: "Enter a new Secret Key or Password (minimum 6 characters)" });
        }
        if (nextSecret) {
          if (nextSecret.length < 6) return res.status(400).json({ message: "Secret key must be at least 6 characters" });
          updates.secret_key_digest = digestSecret(nextSecret);
          updates.secret_key_hash = await hashSecret(nextSecret);
          updates.secret_key_hint = formatKeyHint(nextSecret);
          updates.secret_key = null;
        }
        if (nextPassword) {
          if (nextPassword.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters" });
          updates.password = await hashSecret(nextPassword);
        }
      } else {
        if (!nextPassword || nextPassword.length < 6) {
          return res.status(400).json({ message: "Password must be at least 6 characters" });
        }
        updates.password = await hashSecret(nextPassword);
      }

      await sb.from(table).update(updates).eq("id", accountRow.id);

      return res.json({
        message: isTeam ? "Movie Team credentials updated successfully" : "Password reset successfully",
      });
    } catch (err) {
      res.status(500).json({ message: "Server error", error: err.message });
    }
  },
};

module.exports = authController;
