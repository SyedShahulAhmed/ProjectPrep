// jobs/sendQuote.js
import { quotes } from "../quotes.js";
import { sendEmail } from "../email.js";

// Define the job that sends the daily quote
export const defineSendQuoteJob = (agenda) => {
  agenda.define("send daily quote", async (job) => {
    const { to } = job.attrs.data;
    if (!to) {
      console.warn("⚠️ No recipient email found in job data!");
      return;
    }

    // Pick a random quote
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];

    // Send the email
    await sendEmail(
      to,
      "🌞 Your Daily Motivation",
      `${randomQuote}\n\n– From Daily Quote Bot`
    );

    console.log(`📩 Quote sent to ${to}: "${randomQuote}"`);
  });
};
