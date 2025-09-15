import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

// Variabili d'ambiente (da impostare su Render → Environment)
const SMOOBU_API_KEY = process.env.SMOOBU_API_KEY;
const TG_BOT_TOKEN   = process.env.TG_BOT_TOKEN;
const TG_CHAT_ID     = process.env.TG_CHAT_ID;

app.use(cors({
  origin: [
    "https://franchino1982.github.io",          // dominio GitHub Pages
    "https://franchino1982.github.io/19rueneuve"
  ]
}));
app.use(express.json());

// Health check
app.get("/", (_req, res) => res.json({ ok: true }));
app.get("/healthz", (_req, res) => res.status(200).send("ok"));

// ---- Funzione per leggere le date da Smoobu
async function getDatesFromSmoobu(reservationId) {
  const url = `https://login.smoobu.com/api/reservations/${encodeURIComponent(reservationId)}`;
  const resp = await fetch(url, {
    headers: { "Api-Key": SMOOBU_API_KEY, "Cache-Control": "no-cache" }
  });

  if (!resp.ok) {
    const txt = await resp.text().catch(() => "");
    throw new Error(txt || `Smoobu ${resp.status}`);
  }

  const data = await resp.json();
  const arrival   = data.arrival   || data["arrival-date"]   || data["arrivalDate"];
  const departure = data.departure || data["departure-date"] || data["departureDate"];

  if (!arrival || !departure) throw new Error("Missing arrival/departure");
  return { arrival, departure };
}

// ---- Endpoint /booking/:id
app.get("/booking/:id", async (req, res) => {
  try {
    const b = String(req.params.id || "").replace(/\D/g, "");
    if (!b) return res.status(400).json({ ok: false, error: "Missing booking id" });

    const { arrival, departure } = await getDatesFromSmoobu(b);
    res.json({ ok: true, start: arrival, end: departure });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ---- Endpoint /open/:id
app.get("/open/:id", async (req, res) => {
  try {
    if (!TG_BOT_TOKEN || !TG_CHAT_ID) {
      return res.status(500).json({ ok: false, error: "Telegram vars not set" });
    }

    const b = String(req.params.id || "").replace(/\D/g, "");
    const text = `🔓 Apertura porta per booking ${b}. Benvenuti a NeaSpace! Sali al secondo piano, porta destra. Keybox codice 0204.`;

    const r = await fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: TG_CHAT_ID, text })
    });

    const data = await r.json();
    res.status(r.ok ? 200 : 500).json(data);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.listen(PORT, () => console.log(`✅ Server listening on ${PORT}`));
