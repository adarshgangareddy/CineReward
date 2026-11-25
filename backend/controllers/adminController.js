const User = require("../models/User");
const MovieTeam = require("../models/MovieTeam");
const Ticket = require("../models/Ticket");
const Review = require("../models/Review");
const jwt = require("jsonwebtoken");
const {
  hashSecret,
  digestSecret,
  formatKeyHint,
} = require("../utils/passwordHash");

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
        return res.status(500).json({
          message: "Super admin login is not configured on the server",
        });
      }

      const matchesIdentity =
        cleanUsername === adminUsername ||
        (adminEmail && cleanUsername === adminEmail);

      if (matchesIdentity && cleanPassword === adminPassword) {
        if (secretKey && adminSecret && secretKey.trim() !== adminSecret) {
          return res.status(401).json({
            message: "Admin secret code is incorrect",
          });
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
      const userCount = await User.countDocuments();
      const teamCount = await MovieTeam.countDocuments();
      const ticketCount = await Ticket.countDocuments();
      const reviewCount = await Review.countDocuments();

      const revenue = await Ticket.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: { $multiply: ["$price", 0.02] } },
          },
        },
      ]);

      res.json({
        users: userCount,
        teams: teamCount,
        tickets: ticketCount,
        reviews: reviewCount,
        revenue: revenue[0]?.total || 0,
      });
    } catch (err) {
      res
        .status(500)
        .json({ message: "Error fetching stats", error: err.message });
    }
  },

  getUsers: async (req, res) => {
    try {
      const users = await User.find().select("-password -resetCodeHash");
      res.json(users);
    } catch (err) {
      res
        .status(500)
        .json({ message: "Error fetching users", error: err.message });
    }
  },

  createMovieTeam: async (req, res) => {
    try {
      const { name, email, password, secretKey, assignedMovies } = req.body;
      const normalizedEmail = email?.trim().toLowerCase();
      const cleanKey = secretKey?.trim();
      const cleanPass = password?.trim();

      if (!name?.trim() || !normalizedEmail || (!cleanKey && !cleanPass)) {
        return res.status(400).json({
          message: "Name, email, and a Secret Key (or password) are required",
        });
      }

      const keyDigest = cleanKey ? digestSecret(cleanKey) : undefined;

      const existing = await MovieTeam.findOne({
        $or: [
          { email: normalizedEmail },
          ...(keyDigest ? [{ secretKeyDigest: keyDigest }] : []),
        ],
      });
      if (existing) {
        return res
          .status(409)
          .json({ message: "Team email or secret key already exists" });
      }

      const team = new MovieTeam({
        name: name.trim(),
        email: normalizedEmail,
        ...(cleanPass ? { password: await hashSecret(cleanPass) } : {}),
        ...(cleanKey
          ? {
              secretKeyDigest: keyDigest,
              secretKeyHash: await hashSecret(cleanKey),
              secretKeyHint: formatKeyHint(cleanKey),
            }
          : {}),
        assignedMovies: Array.isArray(assignedMovies) ? assignedMovies : [],
      });

      await team.save();
      res.status(201).json({
        message: "Movie Team created successfully (credentials hashed with Argon2d)",
        team: team.toObject({
          transform: (_, value) => {
            delete value.password;
            delete value.secretKeyHash;
            delete value.secretKeyDigest;
            return value;
          },
        }),
      });
    } catch (err) {
      res
        .status(500)
        .json({ message: "Error creating team", error: err.message });
    }
  },

  updateMovieTeam: async (req, res) => {
    try {
      const { name, email, password, secretKey, assignedMovies } = req.body;
      const team = await MovieTeam.findById(req.params.id);
      if (!team) {
        return res.status(404).json({ message: "Movie team not found" });
      }

      const normalizedEmail = email?.trim().toLowerCase();
      const cleanKey = secretKey?.trim();
      if (!name?.trim() || !normalizedEmail) {
        return res.status(400).json({ message: "Name and email are required" });
      }

      const keyDigest = cleanKey ? digestSecret(cleanKey) : undefined;
      const duplicate = await MovieTeam.findOne({
        _id: { $ne: team._id },
        $or: [
          { email: normalizedEmail },
          ...(keyDigest ? [{ secretKeyDigest: keyDigest }] : []),
        ],
      });
      if (duplicate) {
        return res
          .status(409)
          .json({ message: "Team email or secret key already exists" });
      }

      team.name = name.trim();
      team.email = normalizedEmail;
      team.assignedMovies = Array.isArray(assignedMovies) ? assignedMovies : [];

      if (cleanKey) {
        team.secretKeyDigest = keyDigest;
        team.secretKeyHash = await hashSecret(cleanKey);
        team.secretKeyHint = formatKeyHint(cleanKey);
        team.secretKey = undefined;
      }
      if (password?.trim()) {
        team.password = await hashSecret(password.trim());
      }

      await team.save();
      res.json({
        message: "Movie team updated successfully",
        team: team.toObject({
          transform: (_, value) => {
            delete value.password;
            delete value.secretKeyHash;
            delete value.secretKeyDigest;
            return value;
          },
        }),
      });
    } catch (err) {
      res
        .status(500)
        .json({ message: "Error updating team", error: err.message });
    }
  },

  getAllTeams: async (req, res) => {
    try {
      const teams = await MovieTeam.find().select(
        "-password -secretKeyHash -secretKeyDigest -secretKey -resetCodeHash"
      );
      res.json(teams);
    } catch (err) {
      res
        .status(500)
        .json({ message: "Error fetching teams", error: err.message });
    }
  },
};

module.exports = adminController;
