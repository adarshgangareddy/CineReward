const mongoose = require("mongoose");
const User = require("../models/User");
const MovieTeam = require("../models/MovieTeam");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const emailService = require("../services/emailService");
const { getFirebaseAdmin } = require("../config/notifications");
const {
  hashSecret,
  verifySecret,
  digestSecret,
  formatKeyHint,
} = require("../utils/passwordHash");

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

const formatTeamResponse = (team) => ({
  id: team._id,
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
    if (team.secretKeyHash && (await verifySecret(team.secretKeyHash, cand))) {
      return true;
    }
    if (team.secretKey && String(cand).trim() === String(team.secretKey).trim()) {
      return true;
    }
    if (team.password && (await verifySecret(team.password, cand))) {
      return true;
    }
  }
  return false;
};

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

      const hashedPassword = await hashSecret(password);

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
      const adminUsername =
        process.env.SUPER_ADMIN_USERNAME?.trim().toLowerCase();
      const adminPassword = process.env.SUPER_ADMIN_PASSWORD;
      const adminSecret = process.env.SUPER_ADMIN_SECRET_CODE?.trim();

      const matchesAdminIdentity = Boolean(
        (adminEmail && normalizedIdentifier === adminEmail) ||
          (adminUsername && normalizedIdentifier === adminUsername)
      );

      // 1. Admin authentication via email/username + password
      if (
        matchesAdminIdentity &&
        adminPassword &&
        (await verifySecret(adminPassword, credential))
      ) {
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

      // 2. Unified Movie Team authentication: email + secretKey OR email + password OR secretKey alone
      const digestFromId = digestSecret(loginIdentifier);
      const digestFromKey = digestSecret(secretKey || credential);

      const team = await MovieTeam.findOne({
        $or: [
          { email: normalizedIdentifier },
          { secretKeyDigest: digestFromId },
          ...(digestFromKey ? [{ secretKeyDigest: digestFromKey }] : []),
          { secretKey: loginIdentifier },
        ],
      });

      if (team) {
        const validTeamCred = await verifyMovieTeamCredential(
          team,
          credential,
          secretKey
        );
        if (!validTeamCred) {
          return res
            .status(401)
            .json({ message: "Invalid movie team credentials or secret key" });
        }

        const token = jwt.sign(
          { id: team._id, role: "movie_team" },
          process.env.JWT_SECRET,
          { expiresIn: "7d" }
        );
        return res.json({
          token,
          user: formatTeamResponse(team),
        });
      }

      // 3. Regular User authentication via email or username + password (Argon2d verified)
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
            "This account uses Social or Phone Sign-In. Please continue with Google/X/Phone or reset with your 8-digit email code.",
        });
      }

      const isMatch = await verifySecret(user.password, credential);
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

  firebaseSocialLogin: async (req, res) => {
    try {
      const { idToken } = req.body;
      if (!idToken) {
        return res.status(400).json({ message: "Firebase ID token is required" });
      }
      const adminSdk = getFirebaseAdmin();
      if (!adminSdk) {
        return res
          .status(503)
          .json({ message: "Firebase authentication is not initialized on server" });
      }

      const decoded = await adminSdk.auth().verifyIdToken(idToken);
      const email = decoded.email ? decoded.email.trim().toLowerCase() : null;
      const phone = decoded.phone_number || null;
      const provider = decoded.firebase?.sign_in_provider || "social";

      let user = await User.findOne({
        $or: [
          { firebaseUid: decoded.uid },
          ...(email ? [{ email }] : []),
          ...(phone ? [{ phone }] : []),
        ],
      });

      if (!user) {
        user = await User.create({
          name: decoded.name || (email ? email.split("@")[0] : "CineReward Member"),
          email: email || undefined,
          phone: phone || undefined,
          firebaseUid: decoded.uid,
          xId: provider === "twitter.com" ? decoded.uid : undefined,
          profilePicture: decoded.picture || "",
          coins: 0,
        });
      } else {
        if (!user.firebaseUid) user.firebaseUid = decoded.uid;
        if (!user.profilePicture && decoded.picture) {
          user.profilePicture = decoded.picture;
        }
        await user.save();
      }

      const token = generateToken(user);
      return res.json({
        token,
        user: formatUserResponse(user),
      });
    } catch (err) {
      console.error("[Firebase Auth Error]:", err.message);
      return res
        .status(401)
        .json({ message: "Social sign-in verification failed" });
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
        const team = await MovieTeam.findById(req.auth.id).select(
          "-password -secretKeyHash -secretKeyDigest -secretKey -resetCodeHash"
        );
        if (!team) {
          return res.status(404).json({ message: "Movie team not found" });
        }
        return res.json({ user: formatTeamResponse(team) });
      }

      const user = await User.findById(req.auth.id).select("-password -resetCodeHash");
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

      let user = await User.findOne({ $or: [{ phone }, { googleId: uid }, { firebaseUid: uid }] });

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
        firebaseUid: uid,
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
          message: "An account with this phone number already exists.",
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

      let account = await User.findOne({ email: normalizedEmail });
      let accountRole = "user";

      if (!account) {
        account = await MovieTeam.findOne({ email: normalizedEmail });
        if (account) accountRole = "movie_team";
      }

      if (!account) {
        return res
          .status(404)
          .json({ message: "No User or Movie Team account found with that email" });
      }

      const code = String(crypto.randomInt(10000000, 100000000));
      account.resetCodeHash = await hashSecret(code);
      account.resetCodeExpires = Date.now() + 15 * 60 * 1000;
      await account.save();

      const emailSent = await emailService.sendResetCodeEmail(
        normalizedEmail,
        code,
        accountRole
      );
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

      let account = await User.findOne({ email: normalizedEmail });
      let accountRole = "user";
      if (!account) {
        account = await MovieTeam.findOne({ email: normalizedEmail });
        if (account) accountRole = "movie_team";
      }

      if (
        !account ||
        !account.resetCodeHash ||
        !account.resetCodeExpires ||
        account.resetCodeExpires < Date.now()
      ) {
        return res.status(400).json({
          message: "Verification code is invalid or has expired",
        });
      }

      const codeOk = await verifySecret(account.resetCodeHash, code);
      if (!codeOk) {
        return res
          .status(400)
          .json({ message: "Incorrect 8-digit verification code" });
      }

      return res.json({ valid: true, accountRole });
    } catch (err) {
      res.status(500).json({ message: "Server error", error: err.message });
    }
  },

  resetPassword: async (req, res) => {
    try {
      const { email, code, token, password, newPassword, newSecretKey } = req.body;
      const nextPassword = (newPassword || password || "").trim();
      const nextSecret = (newSecretKey || "").trim();

      // Primary flow: Email + 8-digit code
      if (email && code) {
        const normalizedEmail = email.trim().toLowerCase();
        const trimmedCode = code.trim();
        if (!/^\d{8}$/.test(trimmedCode)) {
          return res
            .status(400)
            .json({ message: "Please enter the exact 8-digit verification code" });
        }

        let account = await User.findOne({ email: normalizedEmail });
        let isTeam = false;
        if (!account) {
          account = await MovieTeam.findOne({ email: normalizedEmail });
          isTeam = Boolean(account);
        }

        if (
          !account ||
          !account.resetCodeHash ||
          !account.resetCodeExpires ||
          account.resetCodeExpires < Date.now()
        ) {
          return res.status(400).json({
            message: "Verification code is invalid or expired. Request a new code.",
          });
        }

        const codeValid = await verifySecret(account.resetCodeHash, trimmedCode);
        if (!codeValid) {
          return res.status(400).json({ message: "Invalid 8-digit verification code" });
        }

        if (isTeam) {
          if (!nextSecret && !nextPassword) {
            return res.status(400).json({
              message: "Enter a new Secret Key or Password (minimum 6 characters)",
            });
          }
          if (nextSecret) {
            if (nextSecret.length < 6) {
              return res
                .status(400)
                .json({ message: "Secret key must be at least 6 characters" });
            }
            account.secretKeyDigest = digestSecret(nextSecret);
            account.secretKeyHash = await hashSecret(nextSecret);
            account.secretKeyHint = formatKeyHint(nextSecret);
            account.secretKey = undefined;
          }
          if (nextPassword) {
            if (nextPassword.length < 6) {
              return res
                .status(400)
                .json({ message: "Password must be at least 6 characters" });
            }
            account.password = await hashSecret(nextPassword);
          }
        } else {
          if (!nextPassword || nextPassword.length < 6) {
            return res
              .status(400)
              .json({ message: "Password must be at least 6 characters" });
          }
          account.password = await hashSecret(nextPassword);
        }

        account.resetCodeHash = undefined;
        account.resetCodeExpires = undefined;
        await account.save();

        return res.json({
          message: isTeam
            ? "Movie Team credentials updated successfully"
            : "Password reset successfully",
        });
      }

      // Legacy fallback: hex reset token
      if (!token || !nextPassword || nextPassword.length < 6) {
        return res.status(400).json({
          message:
            "Email, 8-digit verification code, and new password/key (min 6 chars) are required",
        });
      }

      const user = await User.findOne({
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: Date.now() },
      });

      if (!user) {
        return res
          .status(400)
          .json({ message: "Invalid or expired reset token" });
      }

      user.password = await hashSecret(nextPassword);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();

      return res.json({ message: "Password reset successfully" });
    } catch (err) {
      res.status(500).json({ message: "Server error", error: err.message });
    }
  },
};

module.exports = authController;
