import Agenda from "agenda";
import dotenv from "dotenv";
dotenv.config();

const mongoConnectionString = process.env.MONGO_URI || "mongodb://localhost:27017/dailyquotes";

export const agenda = new Agenda({
  db: { address: mongoConnectionString, collection: "agendaJobs" },
  processEvery: "30 seconds",
});

export async function startAgenda() {
  await agenda.start();
  console.log("✅ Agenda connected to MongoDB and started");
}
