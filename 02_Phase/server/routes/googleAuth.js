// server/routes/googleAuth.js
import express from "express";
import pkg from "google-auth-library";
import User from "../models/UserModel.js";
import jwt from "jsonwebtoken";

const { OAuth2Client } = pkg;
const router = express.Router();

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

router.post("/google", async (req, res) => {
  const { idToken } = req.body;
  if (!idToken) {
    return res.status(400).json({ msg: "idToken missing" });
  }

  try {
    // verify once
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    // helpful debug log
    console.log("Google payload:", {
      aud: payload.aud,
      azp: payload.azp,
      sub: payload.sub,
      email: payload.email,
      email_verified: payload.email_verified,
      iat: payload.iat,
      exp: payload.exp,
    });

    if (!payload?.email) {
      return res.status(400).json({ msg: "Google payload missing email" });
    }

    // extract fields
    const email = payload.email;
    const googleId = payload.sub;
    const name = payload.name || email.split("@")[0];

    // find or create user
    let user = await User.findOne({ email });
    if (!user) {
      user = new User({ name, email, googleId });
      await user.save();
    } else if (!user.googleId) {
      user.googleId = googleId;
      await user.save();
    }

    // sign app JWT — make sure env names match your .env
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || "1h",
    });

    return res.status(200).json({
      token,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (err) {
    console.error("Google verify error:", err?.message || err);
    return res.status(401).json({ msg: "Invalid Google token" });
  }
});

export default router;
