import express from "express";
import cors from "cors";

const app = express();

const PORT = process.env.PORT || 3000;
const SMOOBU_API_KEY = process.env.SMOOBU_API_KEY;
const TG_BOT_TOKEN   = process.env.TG_BOT_TOKEN;   // opzionale (per /open)
const TG_CHAT_ID     = process.env.TG_CHAT_ID;     // opzionale (per /open)

app.use(cors({
  origin: [
    "https://franchino1982.github.io",          // dominio GitHub Pages
    "https://franchino1982.github.io/19rueneuve"
  ]
}));
app.use(express.json());

// Health
app.get("/", (_req, res) => res.json({ ok: true }));
app.get("/healthz", (_req, res) => res.status(200).send("ok"));

// ---- Core: funzione per leggere le date da Smoobu
async function getDatesFromSmoobu(reservationId) {
  const url = `https://login.smoobu.com/api/reservations/${encodeURIComponent(reservationId)}`;
  const resp = await fetch(url, {
    headers: { "Api-Key": SMOOBU_API_KEY, "Cache-Control": "no-cache" }
  });
  if (!resp.ok) {
    const txt = await resp.text().catch(() => "");
    const err = new Error(txt || `Smoobu ${resp.status}`);
    err.status = resp.status;
    throw err;
  }
  const data = await resp.json();
  const arrival   = data.arrival   || data["arrival-date"]   || data["arrivalDate"];
  const departure = data.departure || data["departure-date"] || data["departureDate"];
  if (!arrival || !departure) {
    const err = new Error("Missing arrival/departure");
    err.status = 500;
    throw err;
  }
  return { arrival, departure };
}

// ---- Vecchi endpoint (restano utilizzabili)
app.get("/checkBooking", async (req, res) => {
  try {
    const b = String(req.query.b || "").replace(/\D/g, "");
    if (!b) return res.status(400).json({ ok: false, error: "Missing booking id ?b=" });
    const { arrival, departure } = await getDatesFromSmoobu(b);
    res.json({ ok: true, arrival, departure });
  } catch (e) {
    res.status(e.status || 500).json({ ok: false, error: e.message });
  }
});

app.get("/notify", async (req, res) => {
  try {
    if (!TG_BOT_TOKEN || !TG_CHAT_ID) {
      return res.status(500).json({ ok: false, error: "TG env vars not set" });
    }
    const text = req.query.text || "🔔 Ping";
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

// ---- Nuovi alias allineati con il tuo HTML
app.get("/booking/:id", async (req, res) => {
  try {
    const b = String(req.params.id || "").replace(/\D/g, "");
    if (!b) return res.status(400).json({ ok: false, error: "Missing booking id param" });
    const { arrival, departure } = await getDatesFromSmoobu(b);
    // ritorno con campi "start" e "end" come vuole l'HTML
    res.json({ ok: true, start: arrival, end: departure });
  } catch (e) {
    res.status(e.status || 500).json({ ok: false, error: e.message });
  }
});

app.get("/open/:id", async (req, res) => {
  try {
    if (!TG_BOT_TOKEN || !TG_CHAT_ID) {
      return res.status(500).json({ ok: false, error: "TG env vars not set" });
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

app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
