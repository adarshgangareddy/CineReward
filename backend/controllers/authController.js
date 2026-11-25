const mongoose = require("mongoose");
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

const formatUserResponse = (user) => ({
  id: user._id,
  name: user.name,
  username: user.username,
  email: user.email,
  phone: user.phone,
  coins: user.coins || 0,
  role: user.role || "user",
  profilePicture: user.profilePicture || "",
});

const authController = {
  signup: async (req, res) => {
    try {
      const { name, username, email, password } = req.body;
      const trimmedName = name?.trim();
      const normalizedUsername = username?.trim().toLowerCase() || undefined;
      const normalizedEmail = email?.trim().toLowerCase();

      if (!trimmedName || !normalizedEmail || !password) {
        return res
          .status(400)
          .json({ message: "Name, email, and password are required" });
      }
      if (password.length < 6) {
        return res
          .status(400)
          .json({ message: "Password must be at least 6 characters" });
      }

      const existingUser = await User.findOne({
        $or: [
          { email: normalizedEmail },
          ...(normalizedUsername ? [{ username: normalizedUsername }] : []),
        ],
      });
      if (existingUser) {
        return res.status(400).json({
          message: "An account with this email or username already exists",
        });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const user = new User({
        name: trimmedName,
        username: normalizedUsername,
        email: normalizedEmail,
        password: hashedPassword,
      });
      await user.save();

      const token = generateToken(user);
      res.status(201).json({
        token,
        user: formatUserResponse(user),
      });
    } catch (err) {
      if (err.code === 11000) {
        return res.status(400).json({
          message: "An account with this email or username already exists",
        });
      }
      res.status(500).json({ message: "Server error", error: err.message });
    }
  },

  login: async (req, res) => {
    try {
      const { identifier, email, password, secretKey } = req.body;
      const loginIdentifier = (identifier || email || secretKey || "").trim();
      if (!loginIdentifier || !password) {
        return res
          .status(400)
          .json({ message: "Email/username/secret key and password are required" });
      }

      const normalizedIdentifier = loginIdentifier.toLowerCase();
      const adminEmail = (
        process.env.SUPER_ADMIN_EMAIL ||
        process.env.EMAIL_USER ||
        ""
      )
        .trim()
        .toLowerCase();
      const adminUsername =
        process.env.SUPER_ADMIN_USERNAME?.trim().toLowerCase();
      const adminPassword = process.env.SUPER_ADMIN_PASSWORD;
      const adminSecret = process.env.SUPER_ADMIN_SECRET_CODE?.trim();

      const matchesAdminIdentity = Boolean(
        (adminEmail && normalizedIdentifier === adminEmail) ||
          (adminUsername && normalizedIdentifier === adminUsername)
      );

      // 1. Admin authentication by email or username + password
      if (matchesAdminIdentity && adminPassword && password === adminPassword) {
        if (secretKey && adminSecret && secretKey.trim() !== adminSecret) {
          return res.status(401).json({
            message: "Admin secret code is incorrect",
          });
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

      // Database required for MovieTeam and User lookups
      if (mongoose.connection.readyState !== 1) {
        return res.status(503).json({
          message:
            "Database is currently disconnected. Please verify MONGODB_URI in backend/.env and try again.",
        });
      }

      // 2. Movie Team login via Team Email OR Secret Key + Password
      const teamQuery = secretKey
        ? {
            $or: [
              { email: normalizedIdentifier },
              { secretKey: secretKey.trim() },
            ],
          }
        : {
            $or: [
              { email: normalizedIdentifier },
              { secretKey: loginIdentifier },
            ],
          };

      const team = await MovieTeam.findOne(teamQuery);
      if (team) {
        const teamPasswordMatches = await bcrypt.compare(password, team.password);
        if (!teamPasswordMatches) {
          return res
            .status(401)
            .json({ message: "Invalid movie team credentials" });
        }
        if (secretKey && team.secretKey !== secretKey.trim()) {
          return res
            .status(401)
            .json({ message: "Movie team secret key is incorrect" });
        }

        const token = jwt.sign(
          { id: team._id, role: "movie_team" },
          process.env.JWT_SECRET,
          { expiresIn: "7d" }
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

      // 3. Regular User login via Email or Username + Password
      const user = await User.findOne({
        $or: [
          { email: normalizedIdentifier },
          { username: normalizedIdentifier },
        ],
      });
      if (!user) {
        return res
          .status(401)
          .json({ message: "Invalid email/username or password" });
      }

      if (!user.password) {
        return res.status(401).json({
          message:
            "This account uses Google or Phone Sign-In. Please continue with Google or use Forgot Password to set a password.",
        });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res
          .status(401)
          .json({ message: "Invalid email/username or password" });
      }

      const token = generateToken(user);
      return res.json({
        token,
        user: formatUserResponse(user),
      });
    } catch (err) {
      res.status(500).json({ message: "Server error", error: err.message });
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

      if (mongoose.connection.readyState !== 1) {
        return res.status(503).json({ message: "Database disconnected" });
      }

      if (req.auth.role === "movie_team") {
        const team = await MovieTeam.findById(req.auth.id).select("-password");
        if (!team) {
          return res.status(404).json({ message: "Movie team not found" });
        }
        return res.json({
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

      const user = await User.findById(req.auth.id).select("-password");
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      return res.json({ user: formatUserResponse(user) });
    } catch (err) {
      res.status(500).json({ message: "Server error", error: err.message });
    }
  },

  googleSuccess: (req, res) => {
    if (req.user) {
      const token = generateToken(req.user);
      res.json({
        token,
        user: formatUserResponse(req.user),
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

      let user = await User.findOne({ $or: [{ phone }, { googleId: uid }] });

      if (user) {
        const token = generateToken(user);
        return res.status(200).json({
          token,
          user: formatUserResponse(user),
        });
      }

      const defaultName = name || `User${phone.slice(-4)}`;
      user = new User({
        name: defaultName,
        phone,
        googleId: uid,
      });

      await user.save();
      const token = generateToken(user);

      return res.status(201).json({
        token,
        user: formatUserResponse(user),
      });
    } catch (err) {
      console.error("Phone Auth Error:", err);
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
      const normalizedEmail = req.body?.email?.trim().toLowerCase();
      if (!normalizedEmail) {
        return res.status(400).json({ message: "Email address is required" });
      }

      const user = await User.findOne({ email: normalizedEmail });
      if (!user)
        return res
          .status(404)
          .json({ message: "No account found with that email" });

      const token = crypto.randomBytes(20).toString("hex");
      user.resetPasswordToken = token;
      user.resetPasswordExpires = Date.now() + 3600000;
      await user.save();

      const frontendUrl = (
        process.env.FRONTEND_URL || "http://localhost:3000"
      ).replace(/\/$/, "");
      const resetUrl = `${frontendUrl}/reset-password/${token}`;

      const emailSent = await emailService.sendPasswordResetEmail(
        user.email,
        resetUrl
      );
      if (!emailSent) {
        return res.status(503).json({
          message:
            "Password reset email could not be delivered right now. Please check email server configuration.",
        });
      }

      res.json({ message: "Password reset link sent to your email" });
    } catch (err) {
      res.status(500).json({ message: "Server error", error: err.message });
    }
  },

  resetPassword: async (req, res) => {
    try {
      const { token, password } = req.body;
      if (!token || !password || password.length < 6) {
        return res.status(400).json({
          message: "Valid token and password (minimum 6 characters) are required",
        });
      }

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
