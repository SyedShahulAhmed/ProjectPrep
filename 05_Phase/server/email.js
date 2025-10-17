import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

console.log("📩 Loaded Gmail user:", process.env.GMAIL_USER ? "✅" : "❌ MISSING");
console.log("📩 Loaded App password:", process.env.GMAIL_APP_PASSWORD ? "✅" : "❌ MISSING");

const { GMAIL_USER, GMAIL_APP_PASSWORD } = process.env;

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: GMAIL_USER,
    pass: GMAIL_APP_PASSWORD,
  },
});

export async function sendEmail(to, subject, text) {
  try {
    const info = await transporter.sendMail({
      from: `"Daily Quote Bot" <${GMAIL_USER}>`,
      to,
      subject,
      text,
    });
    console.log(`✅ Email sent to ${to}: ${info.response}`);
  } catch (error) {
    console.error(`❌ Failed to send email to ${to}:`, error.message);
  }
}
