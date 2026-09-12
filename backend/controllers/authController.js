const User = require("../models/User");
const MovieTeam = require("../models/MovieTeam");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const emailService = require("../services/emailService");

const generateToken = (user) => {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

const authController = {
  signup: async (req, res) => {
    try {
      const { name, username, email, password } = req.body;
      const normalizedUsername = username?.trim().toLowerCase();
      const normalizedEmail = email?.trim().toLowerCase();
      let user = await User.findOne({
        $or: [
          { email: normalizedEmail },
          ...(normalizedUsername ? [{ username: normalizedUsername }] : []),
        ],
      });
      if (user) return res.status(400).json({ message: "User already exists" });

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      user = new User({
        name,
        username: normalizedUsername,
        email: normalizedEmail,
        password: hashedPassword,
      });
      await user.save();

      const token = generateToken(user);
      res.status(201).json({
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          coins: user.coins,
          role: user.role,
        },
      });
    } catch (err) {
      res.status(500).json({ message: "Server error", error: err.message });
    }
  },

  login: async (req, res) => {
    try {
      const { identifier, email, password, secretKey } = req.body;
      const loginIdentifier = (identifier || email || "").trim();
      if (!loginIdentifier || !password) {
        return res
          .status(400)
          .json({ message: "Email/username and password are required" });
      }

      const normalizedIdentifier = loginIdentifier.toLowerCase();
      const adminEmail = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
      const adminUsername =
        process.env.SUPER_ADMIN_USERNAME?.trim().toLowerCase();
      const adminSecret = process.env.SUPER_ADMIN_SECRET_CODE?.trim();

      if (
        (normalizedIdentifier === adminEmail ||
          normalizedIdentifier === adminUsername) &&
        password === process.env.SUPER_ADMIN_PASSWORD &&
        (!adminSecret || !/^\d{16}$/.test(adminSecret))
      ) {
        return res.status(503).json({
          message:
            "Super admin login is not configured. Add SUPER_ADMIN_SECRET_CODE with exactly 16 digits to backend/.env and restart the server.",
        });
      }

      if (
        (normalizedIdentifier === adminEmail ||
          normalizedIdentifier === adminUsername) &&
        password === process.env.SUPER_ADMIN_PASSWORD &&
        (!secretKey ||
          secretKey.trim() !== adminSecret ||
          !/^\d{16}$/.test(secretKey.trim()))
      ) {
        return res.status(401).json({
          message: "Admin login requires the correct 16-digit secret code",
        });
      }

      if (
        (normalizedIdentifier === adminEmail ||
          normalizedIdentifier === adminUsername) &&
        password === process.env.SUPER_ADMIN_PASSWORD
      ) {
        const token = jwt.sign(
          { role: "super_admin", username: loginIdentifier },
          process.env.JWT_SECRET,
          { expiresIn: "7d" },
        );
        return res.json({
          token,
          user: {
            name: "Super Admin",
            email: adminEmail || loginIdentifier,
            role: "super_admin",
          },
        });
      }

      if (secretKey) {
        const team = await MovieTeam.findOne({ email: normalizedIdentifier });
        if (team && (await bcrypt.compare(password, team.password))) {
          if (team.secretKey !== secretKey.trim()) {
            return res
              .status(401)
              .json({ message: "Movie team secret key is incorrect" });
          }
          const token = jwt.sign(
            { id: team._id, role: "movie_team" },
            process.env.JWT_SECRET,
            { expiresIn: "7d" },
          );
          return res.json({
            token,
            user: {
              id: team._id,
              name: team.name,
              email: team.email,
              role: "movie_team",
              assignedMovies: team.assignedMovies,
              freeTicketsCount: team.freeTicketsCount,
            },
          });
        }
      } else {
        const team = await MovieTeam.findOne({ email: normalizedIdentifier });
        if (team && (await bcrypt.compare(password, team.password))) {
          return res
            .status(401)
            .json({ message: "Movie team login requires the secret key" });
        }
      }

      const user = await User.findOne({
        $or: [
          { email: normalizedIdentifier },
          { username: normalizedIdentifier },
        ],
      });
      if (!user || !user.password)
        return res.status(401).json({ message: "Invalid login credentials" });

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch)
        return res.status(400).json({ message: "Invalid credentials" });

      const token = generateToken(user);
      return res.json({
        token,
        user: {
          id: user._id,
          name: user.name,
          username: user.username,
          email: user.email,
          coins: user.coins,
          role: user.role,
        },
      });
    } catch (err) {
      res.status(500).json({ message: "Server error", error: err.message });
    }
  },

  googleSuccess: (req, res) => {
    if (req.user) {
      const token = generateToken(req.user);
      // In a real app, you might redirect to a frontend success page with the token
      res.json({
        token,
        user: {
          id: req.user._id,
          name: req.user.name,
          email: req.user.email,
          coins: req.user.coins,
          role: req.user.role,
          profilePicture: req.user.profilePicture,
        },
      });
    } else {
      res.status(401).json({ message: "Google authentication failed" });
    }
  },

  handlePhoneAuth: async (req, res) => {
    try {
      const { uid, phone, name } = req.body;

      if (!uid || !phone) {
        return res
          .status(400)
          .json({ message: "UID and Phone number are required" });
      }

      // Check if user exists by phone or googleId (using uid as the identifier here)
      let user = await User.findOne({ $or: [{ phone }, { googleId: uid }] });

      if (user) {
        // Login case
        const token = generateToken(user);
        return res.status(200).json({
          token,
          user: {
            id: user._id,
            name: user.name,
            phone: user.phone,
            email: user.email,
            coins: user.coins,
            role: user.role,
          },
        });
      }

      // Signup case: allow phone-only signups by creating a friendly default name when not provided
      const defaultName = name || `User${phone.slice(-4)}`;
      user = new User({
        name: defaultName,
        phone,
        googleId: uid, // storing Firebase UID here
      });

      await user.save();
      const token = generateToken(user);

      return res.status(201).json({
        token,
        user: {
          id: user._id,
          name: user.name,
          phone: user.phone,
          email: user.email,
          coins: user.coins,
          role: user.role,
        },
      });
    } catch (err) {
      console.error("Phone Auth Error:", err);
      // Handle MongoDB Duplicate Key errors (E11000) specifically
      if (err.code === 11000) {
        return res.status(400).json({
          message:
            "An account with this phone number or credentials already exists.",
        });
      }
      res.status(500).json({
        message: "Server error during phone authentication",
        error: err.message,
      });
    }
  },

  forgotPassword: async (req, res) => {
    try {
      const { email } = req.body;
      const user = await User.findOne({ email });
      if (!user) return res.status(404).json({ message: "User not found" });

      const token = crypto.randomBytes(20).toString("hex");
      user.resetPasswordToken = token;
      user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
      await user.save();

      const frontendUrl = (
        process.env.FRONTEND_URL || "http://localhost:3000"
      ).replace(/\/$/, "");
      const resetUrl = `${frontendUrl}/reset-password/${token}`;

      await emailService.sendPasswordResetEmail(user.email, resetUrl);
      res.json({ message: "Password reset link sent to your email" });
    } catch (err) {
      res.status(500).json({ message: "Server error", error: err.message });
    }
  },

  resetPassword: async (req, res) => {
    try {
      const { token, password } = req.body;
      const user = await User.findOne({
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: Date.now() },
      });

      if (!user)
        return res
          .status(400)
          .json({ message: "Invalid or expired reset token" });

      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();

      res.json({ message: "Password reset successfully" });
    } catch (err) {
      res.status(500).json({ message: "Server error", error: err.message });
    }
  },
};

module.exports = authController;
