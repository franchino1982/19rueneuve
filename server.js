import express from "express";
import cors from "cors";

const app = express();

const PORT = process.env.PORT || 3000;
const SMOOBU_API_KEY = process.env.SMOOBU_API_KEY;
const TG_BOT_TOKEN   = process.env.TG_BOT_TOKEN;   // opzionale
const TG_CHAT_ID     = process.env.TG_CHAT_ID;     // opzionale

app.use(cors({
  origin: [
    "https://franchino1982.github.io",
    "https://franchino1982.github.io/19rueneuve"
  ]
}));
app.use(express.json());

app.get("/", (_req, res) => res.json({ ok: true }));
app.get("/healthz", (_req, res) => res.status(200).send("ok"));

app.get("/checkBooking", async (req, res) => {
  try {
    const b = String(req.query.b || "").replace(/\D/g, "");
    if (!b) return res.status(400).json({ ok: false, error: "Missing booking id ?b=" });

    const url = `https://login.smoobu.com/api/reservations/${encodeURIComponent(b)}`;
    const resp = await fetch(url, {
      headers: { "Api-Key": SMOOBU_API_KEY, "Cache-Control": "no-cache" }
    });
    if (!resp.ok) {
      const txt = await resp.text().catch(() => "");
      return res.status(resp.status).json({ ok: false, error: txt || `Smoobu ${resp.status}` });
    }
    const data = await resp.json();

    const arrival   = data.arrival   || data["arrival-date"]   || data["arrivalDate"];
    const departure = data.departure || data["departure-date"] || data["departureDate"];
    if (!arrival || !departure) return res.status(500).json({ ok: false, error: "Missing arrival/departure" });

    res.json({ ok: true, arrival, departure });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get("/notify", async (req, res) => {
  try {
    if (!TG_BOT_TOKEN || !TG_CHAT_ID) {
      return res.status(500).json({ ok: false, error: "TG env vars not set" });
    }
    const text = req.query.text || "🔔 Ping";
    const tgUrl = `https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`;
    const tgResp = await fetch(tgUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: TG_CHAT_ID, text })
    });
    const data = await tgResp.json();
    res.status(tgResp.ok ? 200 : 500).json(data);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
