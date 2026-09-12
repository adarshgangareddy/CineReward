const User = require("../models/User");
const MovieTeam = require("../models/MovieTeam");
const Ticket = require("../models/Ticket");
const Review = require("../models/Review");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const adminController = {
  superLogin: async (req, res) => {
    try {
      const { username, password } = req.body;
      const cleanUsername = username?.trim();
      const cleanPassword = password?.trim();

      const adminUsername = process.env.SUPER_ADMIN_USERNAME;
      const adminPassword = process.env.SUPER_ADMIN_PASSWORD;

      if (!adminUsername || !adminPassword) {
        console.error(
          "[Super Admin Login] SUPER_ADMIN_USERNAME/SUPER_ADMIN_PASSWORD are not configured.",
        );
        return res.status(500).json({
          message: "Super admin login is not configured on the server",
        });
      }

      if (cleanUsername === adminUsername && cleanPassword === adminPassword) {
        const token = jwt.sign(
          { role: "super_admin", username: cleanUsername },
          process.env.JWT_SECRET,
          { expiresIn: "7d" },
        );
        res.json({
          message: "Super Admin Login Successful",
          role: "super_admin",
          username: cleanUsername,
          token,
        });
      } else {
        res.status(401).json({ message: "Invalid credentials" });
      }
    } catch (err) {
      res.status(500).json({ message: "Login error", error: err.message });
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
      const users = await User.find().select("-password");
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
      if (
        !name?.trim() ||
        !normalizedEmail ||
        !password ||
        !secretKey?.trim()
      ) {
        return res.status(400).json({
          message: "Name, email, password, and secret key are required",
        });
      }

      let team = await MovieTeam.findOne({
        $or: [{ email: normalizedEmail }, { secretKey: secretKey.trim() }],
      });
      if (team)
        return res
          .status(409)
          .json({ message: "Team email or secret key already exists" });

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      team = new MovieTeam({
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        secretKey: secretKey.trim(),
        assignedMovies,
      });

      await team.save();
      res
        .status(201)
        .json({ message: "Movie Team created successfully", team });
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
      if (!team)
        return res.status(404).json({ message: "Movie team not found" });

      const normalizedEmail = email?.trim().toLowerCase();
      if (!name?.trim() || !normalizedEmail || !secretKey?.trim()) {
        return res
          .status(400)
          .json({ message: "Name, email, and secret key are required" });
      }

      const duplicate = await MovieTeam.findOne({
        _id: { $ne: team._id },
        $or: [{ email: normalizedEmail }, { secretKey: secretKey.trim() }],
      });
      if (duplicate)
        return res
          .status(409)
          .json({ message: "Team email or secret key already exists" });

      team.name = name.trim();
      team.email = normalizedEmail;
      team.secretKey = secretKey.trim();
      team.assignedMovies = Array.isArray(assignedMovies) ? assignedMovies : [];
      if (password?.trim())
        team.password = await bcrypt.hash(password.trim(), 10);

      await team.save();
      res.json({
        message: "Movie team updated successfully",
        team: team.toObject({
          transform: (_, value) => {
            delete value.password;
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
      const teams = await MovieTeam.find().select("-password");
      res.json(teams);
    } catch (err) {
      res
        .status(500)
        .json({ message: "Error fetching teams", error: err.message });
    }
  },
};

module.exports = adminController;
