const { getSupabase, isSupabaseReady } = require("../config/supabase");
const { mapUser, mapMovieTeam, mapTicket, mapReview, toMovieTeamRow } = require("../utils/dbMappers");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const {
  hashSecret,
  digestSecret,
  formatKeyHint,
} = require("../utils/passwordHash");

const generateUnique16DigitKey = () => {
  // First digit 1-9, remaining 15 digits 0-9 -> guaranteed 16-digit numeric secret key
  let digits = String(crypto.randomInt(1, 10));
  for (let i = 0; i < 15; i += 1) {
    digits += String(crypto.randomInt(0, 10));
  }
  return digits;
};

const makeTeamEmailFromName = (name = "team") => {
  const slug = String(name || "team")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 28) || "movie";
  const suffix = crypto.randomInt(100, 999);
  return `${slug}-${suffix}@cinereward.com`;
};

const sb = () => getSupabase();

const adminController = {
  superLogin: async (req, res) => {
    try {
      const { username, password, secretKey } = req.body;
      const cleanUsername = username?.trim().toLowerCase();
      const cleanPassword = password?.trim();

      const adminUsername = process.env.SUPER_ADMIN_USERNAME?.trim().toLowerCase();
      const adminEmail = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
      const adminPassword = process.env.SUPER_ADMIN_PASSWORD;
      const adminSecret = process.env.SUPER_ADMIN_SECRET_CODE?.trim();

      if (!adminUsername || !adminPassword) {
        return res.status(500).json({ message: "Super admin login is not configured on the server" });
      }

      const matchesIdentity =
        cleanUsername === adminUsername || (adminEmail && cleanUsername === adminEmail);

      if (matchesIdentity && cleanPassword === adminPassword) {
        if (secretKey && adminSecret && secretKey.trim() !== adminSecret) {
          return res.status(401).json({ message: "Admin secret code is incorrect" });
        }
        const token = jwt.sign(
          { role: "super_admin", username: adminUsername },
          process.env.JWT_SECRET,
          { expiresIn: "7d" }
        );
        return res.json({
          message: "Super Admin Login Successful",
          id: "super_admin",
          name: "Super Admin",
          role: "super_admin",
          username: adminUsername,
          email: adminEmail || adminUsername,
          token,
        });
      }
      return res.status(401).json({ message: "Invalid credentials" });
    } catch (err) {
      return res.status(500).json({ message: "Login error", error: err.message });
    }
  },

  getStats: async (req, res) => {
    try {
      if (!isSupabaseReady()) return res.status(503).json({ message: "Database disconnected" });
      const db = sb();

      const [{ count: userCount }, { count: teamCount }, { count: ticketCount }, { count: reviewCount }, { data: revenueRows }] =
        await Promise.all([
          db.from("users").select("*", { count: "exact", head: true }),
          db.from("movie_teams").select("*", { count: "exact", head: true }),
          db.from("tickets").select("*", { count: "exact", head: true }),
          db.from("reviews").select("*", { count: "exact", head: true }),
          db.from("tickets").select("price"),
        ]);

      const revenue = (revenueRows || []).reduce(
        (acc, r) => acc + Number(r.price || 0) * 0.02,
        0
      );

      res.json({
        users: userCount || 0,
        teams: teamCount || 0,
        tickets: ticketCount || 0,
        reviews: reviewCount || 0,
        revenue,
      });
    } catch (err) {
      res.status(500).json({ message: "Error fetching stats", error: err.message });
    }
  },

  getUsers: async (req, res) => {
    try {
      if (!isSupabaseReady()) return res.status(503).json({ message: "Database disconnected" });
      const { data } = await sb()
        .from("users")
        .select("id, name, username, email, phone, coins, role, profile_picture, created_at")
        .order("created_at", { ascending: false });
      res.json((data || []).map(mapUser));
    } catch (err) {
      res.status(500).json({ message: "Error fetching users", error: err.message });
    }
  },

  createMovieTeam: async (req, res) => {
    try {
      if (!isSupabaseReady()) return res.status(503).json({ message: "Database disconnected" });
      const { name, email, password, secretKey, assignedMovies } = req.body;
      if (!name?.trim()) {
        return res.status(400).json({ message: "Team name is required" });
      }
      const normalizedEmail = (email?.trim() || makeTeamEmailFromName(name)).toLowerCase();
      let cleanKey = secretKey?.trim() || generateUnique16DigitKey();
      const cleanPass = password?.trim();

      const db = sb();
      let keyDigest = digestSecret(cleanKey);

      // Ensure unique secret key if auto-generated
      if (!secretKey?.trim()) {
        for (let attempt = 0; attempt < 5; attempt += 1) {
          const { data: clash } = await db
            .from("movie_teams")
            .select("id")
            .eq("secret_key_digest", keyDigest)
            .limit(1);
          if (!clash || clash.length === 0) break;
          cleanKey = generateUnique16DigitKey();
          keyDigest = digestSecret(cleanKey);
        }
      }

      // Check duplicate
      const orFilters = [`email.eq.${normalizedEmail}`, `secret_key_digest.eq.${keyDigest}`];
      const { data: existing } = await db.from("movie_teams").select("id").or(orFilters.join(",")).limit(1);
      if (existing && existing.length > 0) {
        return res.status(409).json({ message: "Team email or 16-digit secret key already exists" });
      }

      const row = toMovieTeamRow({
        name: name.trim(),
        email: normalizedEmail,
        ...(cleanPass ? { password: await hashSecret(cleanPass) } : {}),
        secretKeyDigest: keyDigest,
        secretKeyHash: await hashSecret(cleanKey),
        secretKeyHint: formatKeyHint(cleanKey),
        assignedMovies: Array.isArray(assignedMovies) ? assignedMovies.map(String) : [],
      });

      const { data: created, error } = await db.from("movie_teams").insert(row).select("*").single();
      if (error) throw error;

      const team = mapMovieTeam(created);
      const safeTeam = { ...team };
      delete safeTeam.password;
      delete safeTeam.secretKeyHash;
      delete safeTeam.secretKeyDigest;

      res.status(201).json({
        message: "Movie Team assigned successfully (Argon2d hashed)",
        team: safeTeam,
        generatedCredentials: {
          email: normalizedEmail,
          secretKey: cleanKey,
        },
      });
    } catch (err) {
      res.status(500).json({ message: "Error creating team", error: err.message });
    }
  },

  updateMovieTeam: async (req, res) => {
    try {
      if (!isSupabaseReady()) return res.status(503).json({ message: "Database disconnected" });
      const { name, email, password, secretKey, assignedMovies } = req.body;
      const db = sb();

      const { data: found } = await db.from("movie_teams").select("*").eq("id", req.params.id).single();
      if (!found) return res.status(404).json({ message: "Movie team not found" });

      const normalizedEmail = email?.trim().toLowerCase();
      const cleanKey = secretKey?.trim();
      if (!name?.trim() || !normalizedEmail) {
        return res.status(400).json({ message: "Name and email are required" });
      }

      const keyDigest = cleanKey ? digestSecret(cleanKey) : undefined;
      const orFilters = [`email.eq.${normalizedEmail}`];
      if (keyDigest) orFilters.push(`secret_key_digest.eq.${keyDigest}`);
      const { data: dup } = await db
        .from("movie_teams")
        .select("id")
        .or(orFilters.join(","))
        .neq("id", req.params.id)
        .limit(1);

      if (dup && dup.length > 0) {
        return res.status(409).json({ message: "Team email or secret key already exists" });
      }

      const updates = {
        name: name.trim(),
        email: normalizedEmail,
        assigned_movies: Array.isArray(assignedMovies) ? assignedMovies : [],
      };
      if (cleanKey) {
        updates.secret_key_digest = keyDigest;
        updates.secret_key_hash = await hashSecret(cleanKey);
        updates.secret_key_hint = formatKeyHint(cleanKey);
        updates.secret_key = null;
      }
      if (password?.trim()) {
        updates.password = await hashSecret(password.trim());
      }

      const { data: updated } = await db.from("movie_teams").update(updates).eq("id", req.params.id).select("*").single();
      const team = mapMovieTeam(updated);
      const safeTeam = { ...team };
      delete safeTeam.password;
      delete safeTeam.secretKeyHash;
      delete safeTeam.secretKeyDigest;

      res.json({ message: "Movie team updated successfully", team: safeTeam });
    } catch (err) {
      res.status(500).json({ message: "Error updating team", error: err.message });
    }
  },

  getAllTeams: async (req, res) => {
    try {
      if (!isSupabaseReady()) return res.status(503).json({ message: "Database disconnected" });
      const { data } = await sb()
        .from("movie_teams")
        .select("id, name, email, assigned_movies, free_tickets_count, secret_key_hint, created_at")
        .order("created_at", { ascending: false });
      res.json((data || []).map(mapMovieTeam));
    } catch (err) {
      res.status(500).json({ message: "Error fetching teams", error: err.message });
    }
  },
};

module.exports = adminController;
