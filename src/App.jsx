import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarPlus,
  ChevronDown,
  Heart,
  MapPin,
  MessageCircleHeart,
  Music2,
  Send,
  Sparkles,
  Users,
} from "lucide-react";

const EVENT_TIME = new Date("2026-06-15T11:00:00+01:00").getTime();
const MAP_URL =
  "https://www.google.com/maps/place/19+Benny+Otuya+Aucubeze+St,+Dushepe+901101,+Federal+Capital+Territory/@9.1496218,7.3650481,16.21z/data=!4m6!3m5!1s0x104ddf25ad02e997:0xb85bfd17a42a5025!8m2!3d9.1515589!4d7.3650492!16s%2Fg%2F11jnst3w0g?entry=ttu";
const CALENDAR_URL =
  "https://calendar.google.com/calendar/render?action=TEMPLATE&text=Baby%20Girl%20Naming%20Ceremony&dates=20260615T100000Z/20260615T130000Z&details=Our%20daughter%27s%20naming%20ceremony%20starts%20at%2011%3A00%20AM%20WAT.&location=19%20Benny%20Otuya%20Aucubeze%20Street%2C%20Dushepe%2C%20Kubwa%2C%20FCT";
const STREAMING_URL = "https://calendar.app.google/k55mSAGegCvkwcmW6";
const SHEET_API_URL = import.meta.env.VITE_GOOGLE_SCRIPT_URL || "";

const slides = [
  { id: "welcome", label: "Opening" },
  { id: "ceremony", label: "Blessing" },
  { id: "venue", label: "Journey" },
  { id: "prayers", label: "Wall" },
  { id: "rsvp", label: "Guest Book" },
];

const seedPrayers = [
  {
    id: "seed-1",
    name: "Family",
    text: "May her name open doors of favour, wisdom, and joy all the days of her life.",
  },
  {
    id: "seed-2",
    name: "Loved ones",
    text: "May she grow in beauty, strength, kindness, and grace.",
  },
  {
    id: "seed-3",
    name: "Friends",
    text: "May this home always have reasons to laugh and give thanks.",
  },
];

const ceremonyMarks = ["A name", "A blessing", "A morning", "A daughter"];

if (typeof window !== "undefined") {
  const params = new URLSearchParams(window.location.search);
  if (params.has("resetPreview")) {
    window.localStorage.removeItem("naming-prayers");
    window.localStorage.removeItem("naming-rsvps");
    window.history.replaceState({}, "", window.location.pathname);
  }
}

function loadStored(key, fallback) {
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function useCountdown() {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return useMemo(() => {
    const distance = Math.max(EVENT_TIME - now, 0);
    return {
      days: Math.floor(distance / 86_400_000),
      hours: Math.floor((distance / 3_600_000) % 24),
      minutes: Math.floor((distance / 60_000) % 60),
      seconds: Math.floor((distance / 1000) % 60),
    };
  }, [now]);
}

function formatPart(value) {
  return String(value).padStart(2, "0");
}

function jsonp(url, params = {}) {
  return new Promise((resolve, reject) => {
    const callbackName = `namingSheet_${Date.now()}_${Math.random()
      .toString(16)
      .slice(2)}`;
    const script = document.createElement("script");
    const searchParams = new URLSearchParams({
      ...params,
      callback: callbackName,
    });

    window[callbackName] = (payload) => {
      resolve(payload);
      script.remove();
      delete window[callbackName];
    };

    script.onerror = () => {
      reject(new Error("Unable to reach Google Sheet."));
      script.remove();
      delete window[callbackName];
    };

    script.src = `${url}?${searchParams.toString()}`;
    document.body.appendChild(script);
  });
}

async function sendToSheet(type, payload) {
  if (!SHEET_API_URL) {
    throw new Error("Google Sheet endpoint is not configured.");
  }

  await fetch(SHEET_API_URL, {
    method: "POST",
    mode: "no-cors",
    headers: {
      "Content-Type": "text/plain;charset=utf-8",
    },
    body: JSON.stringify({ type, payload }),
  });
}

function App() {
  const stageRef = useRef(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [prayers, setPrayers] = useState(() =>
    loadStored("naming-prayers", seedPrayers),
  );
  const [rsvps, setRsvps] = useState(() => loadStored("naming-rsvps", []));
  const [prayerForm, setPrayerForm] = useState({ name: "", text: "" });
  const [rsvpForm, setRsvpForm] = useState({
    name: "",
    phone: "",
    guests: "1",
    attendance: "coming",
    note: "",
  });
  const [toast, setToast] = useState("");
  const countdown = useCountdown();

  useEffect(() => {
    if (!SHEET_API_URL) return;

    let isMounted = true;
    jsonp(SHEET_API_URL, { type: "prayers" })
      .then((payload) => {
        if (isMounted && Array.isArray(payload?.rows) && payload.rows.length) {
          setPrayers(payload.rows);
        }
      })
      .catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const root = stageRef.current;
    if (!root) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) {
          setActiveSlide(Number(visible.target.dataset.slideIndex));
        }
      },
      { root, threshold: [0.55, 0.72] },
    );

    root.querySelectorAll(".slide").forEach((slide) => observer.observe(slide));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    function onKeyDown(event) {
      if (!["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft"].includes(event.key)) {
        return;
      }

      const direction = ["ArrowDown", "ArrowRight"].includes(event.key) ? 1 : -1;
      const next = Math.min(Math.max(activeSlide + direction, 0), slides.length - 1);
      goToSlide(next);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeSlide]);

  function goToSlide(index) {
    const node = stageRef.current?.querySelector(`[data-slide-index="${index}"]`);
    node?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function showToast(message) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  }

  async function submitPrayer(event) {
    event.preventDefault();
    const name = prayerForm.name.trim() || "Guest";
    const text = prayerForm.text.trim();

    if (!text) {
      showToast("Please write a prayer first.");
      return;
    }

    const entry = {
      id: crypto.randomUUID(),
      name,
      text,
      createdAt: new Date().toISOString(),
    };

    try {
      await sendToSheet("prayer", entry);
    } catch (error) {
      showToast(error.message);
      return;
    }

    setPrayers((current) => [entry, ...current]);
    setPrayerForm({ name: "", text: "" });
    showToast("Prayer sent to the family sheet.");
  }

  async function submitRsvp(event) {
    event.preventDefault();
    const name = rsvpForm.name.trim();

    if (!name) {
      showToast("Please add your name.");
      return;
    }

    const entry = {
      ...rsvpForm,
      id: crypto.randomUUID(),
      name,
      guests: Number(rsvpForm.guests),
      createdAt: new Date().toISOString(),
    };

    try {
      await sendToSheet("rsvp", entry);
    } catch (error) {
      showToast(error.message);
      return;
    }

    setRsvps((current) => [entry, ...current]);
    setRsvpForm({
      name: "",
      phone: "",
      guests: "1",
      attendance: "coming",
      note: "",
    });
    showToast("RSVP sent to the family sheet.");
  }

  const whatsappText = encodeURIComponent(
    `Hello, I am RSVPing for the baby girl's naming ceremony on Monday, 15 June 2026 at 11:00 AM WAT. Name: ${rsvpForm.name || "[your name]"}. Guests: ${rsvpForm.guests}.`,
  );

  return (
    <div className="app-shell">
      <div className="woven-rail" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>

      <nav className="frame-nav" aria-label="Invitation slides">
        <button className="brand-mark" onClick={() => goToSlide(0)} type="button" aria-label="Go to opening slide">
          <Heart aria-hidden="true" />
        </button>
        <div className="nav-links">
          {slides.map((slide, index) => (
            <button
              className={activeSlide === index ? "active" : ""}
              key={slide.id}
              id={`nav-btn-${slide.id}`}
              onClick={() => goToSlide(index)}
              type="button"
            >
              {slide.label}
            </button>
          ))}
        </div>
      </nav>

      <div className="progress" aria-hidden="true">
        <span style={{ transform: `scaleX(${(activeSlide + 1) / slides.length})` }} />
      </div>

      <main className="stage" ref={stageRef}>
        <section className="slide hero-slide" data-slide-index="0" id="welcome">
          <div className="hero-image" aria-hidden="true" />
          <div className="hero-textile" aria-hidden="true">
            {ceremonyMarks.map((mark) => (
              <span key={mark}>{mark}</span>
            ))}
          </div>

          <div className="hero-copy reveal">
            <div className="name-seal" aria-hidden="true">
              <strong>15</strong>
              <span>June</span>
            </div>
            <div>
              <p className="eyebrow">With joy and gratitude</p>
              <h1>Our Daughter's Naming Ceremony</h1>
              <p>
                A morning set apart for her name, her blessing, and the circle
                of people who will speak love over her life.
              </p>
              <div className="action-row">
                <button id="hero-rsvp-btn" className="button primary" onClick={() => goToSlide(4)} type="button">
                  <Heart aria-hidden="true" />
                  RSVP
                </button>
                <a id="hero-directions-link" className="button ghost" href={MAP_URL} rel="noreferrer" target="_blank">
                  <MapPin aria-hidden="true" />
                  Directions
                </a>
              </div>
            </div>
          </div>

          <button id="scroll-cue-btn" className="scroll-cue" onClick={() => goToSlide(1)} type="button">
            <ChevronDown aria-hidden="true" />
          </button>
          <button id="next-peek-btn" className="next-peek" onClick={() => goToSlide(1)} type="button">
            <span>Begin the blessing path</span>
            <strong>Monday, 15 June - 11:00 AM WAT</strong>
          </button>
        </section>

        <section className="slide ceremony-slide" data-slide-index="1" id="ceremony">
          <div className="slide-inner ceremony-ledger">
            <div className="ledger-heading reveal">
              <p className="eyebrow">Blessing morning</p>
              <h2>11:00 AM WAT</h2>
              <p className="lead">
                Prayers, names, laughter, and the first memories of a beautiful
                girl child surrounded by love.
              </p>
            </div>
            <div className="countdown" aria-live="polite">
              {Object.entries(countdown).map(([label, value]) => (
                <div className="time-tile" key={label}>
                  <strong>{formatPart(value)}</strong>
                  <span>{label}</span>
                </div>
              ))}
            </div>
            <div className="ceremony-strips reveal delay">
              <article className="strip-card">
                <Sparkles aria-hidden="true" />
                <div>
                  <span>Occasion</span>
                  <strong>Naming Ceremony</strong>
                </div>
              </article>
              <article className="strip-card">
                <Music2 aria-hidden="true" />
                <div>
                  <span>Atmosphere</span>
                  <strong>Warm, graceful, joyful</strong>
                </div>
              </article>
              <article className="strip-card">
                <Users aria-hidden="true" />
                <div>
                  <span>Circle</span>
                  <strong>Family and cherished friends</strong>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className="slide venue-slide" data-slide-index="2" id="venue">
          <div className="slide-inner journey-layout">
            <div className="journey-card reveal">
              <div className="street-plate">
                <span>19</span>
                <strong>Benny Otuya Aucubeze Street</strong>
              </div>
              <div className="map-lines" aria-hidden="true">
                <span />
                <span />
                <span />
                <span />
              </div>
              <MapPin aria-hidden="true" />
            </div>
            <div className="journey-copy reveal delay">
              <p className="eyebrow">Venue</p>
              <h2>19 Benny Otuya Aucubeze Street</h2>
              <p className="lead">
                Dushepe, Kubwa, Federal Capital Territory, 901101.
              </p>
              <div className="venue-actions">
                <a id="venue-map-link" className="button primary" href={MAP_URL} rel="noreferrer" target="_blank">
                  <MapPin aria-hidden="true" />
                  Open Google Maps
                </a>
                <a id="venue-calendar-link" className="button ghost" href={CALENDAR_URL} rel="noreferrer" target="_blank">
                  <CalendarPlus aria-hidden="true" />
                  Add to Calendar
                </a>
                <a id="venue-streaming-link" className="button ghost" href={STREAMING_URL} rel="noreferrer" target="_blank">
                  <MessageCircleHeart aria-hidden="true" />
                  Streaming
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="slide prayers-slide" data-slide-index="3" id="prayers">
          <div className="slide-inner prayer-layout">
            <div className="prayer-compose reveal">
              <p className="eyebrow">Prayers Wall</p>
              <h2>Leave a blessing for our daughter</h2>
              <form className="paper-form" onSubmit={submitPrayer}>
                <label htmlFor="prayer-name">
                  <span>Your name</span>
                  <input
                    id="prayer-name"
                    onChange={(event) =>
                      setPrayerForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    placeholder="Guest"
                    value={prayerForm.name}
                  />
                </label>
                <label htmlFor="prayer-text">
                  <span>Your prayer</span>
                  <textarea
                    id="prayer-text"
                    onChange={(event) =>
                      setPrayerForm((current) => ({
                        ...current,
                        text: event.target.value,
                      }))
                    }
                    placeholder="Write a prayer, wish, or blessing"
                    rows="5"
                    value={prayerForm.text}
                  />
                </label>
                <button id="prayer-submit-btn" className="button primary" type="submit">
                  <Send aria-hidden="true" />
                  Post Prayer
                </button>
              </form>
            </div>
            <div className="prayer-wall reveal delay">
              {prayers.map((prayer, index) => (
                <article
                  className="prayer-card"
                  key={prayer.id}
                  style={{ "--tilt": `${index % 2 === 0 ? -1.2 : 1.1}deg` }}
                >
                  <MessageCircleHeart aria-hidden="true" />
                  <p>{prayer.text}</p>
                  <strong>{prayer.name}</strong>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="slide rsvp-slide" data-slide-index="4" id="rsvp">
          <div className="slide-inner guestbook-layout">
            <div className="guestbook-copy reveal">
              <p className="eyebrow">RSVP</p>
              <h2>Tell us you're coming</h2>
              <p className="lead">
                Every reply helps us prepare a warm welcome for the people
                sharing this special morning with us.
              </p>
            </div>

            <form className="paper-form rsvp-form reveal delay" onSubmit={submitRsvp}>
              <div className="field-grid">
                <label htmlFor="rsvp-name">
                  <span>Name</span>
                  <input
                    id="rsvp-name"
                    onChange={(event) =>
                      setRsvpForm((current) => ({ ...current, name: event.target.value }))
                    }
                    placeholder="Your full name"
                    value={rsvpForm.name}
                  />
                </label>
                <label htmlFor="rsvp-phone">
                  <span>Phone</span>
                  <input
                    id="rsvp-phone"
                    onChange={(event) =>
                      setRsvpForm((current) => ({ ...current, phone: event.target.value }))
                    }
                    placeholder="Optional"
                    type="tel"
                    value={rsvpForm.phone}
                  />
                </label>
              </div>
              <div className="field-grid compact">
                <label htmlFor="rsvp-guests">
                  <span>Guests</span>
                  <input
                    id="rsvp-guests"
                    min="1"
                    max="12"
                    onChange={(event) =>
                      setRsvpForm((current) => ({ ...current, guests: event.target.value }))
                    }
                    type="number"
                    value={rsvpForm.guests}
                  />
                </label>
                <label htmlFor="rsvp-attendance">
                  <span>Attendance</span>
                  <select
                    id="rsvp-attendance"
                    onChange={(event) =>
                      setRsvpForm((current) => ({
                        ...current,
                        attendance: event.target.value,
                      }))
                    }
                    value={rsvpForm.attendance}
                  >
                    <option value="coming">Coming</option>
                    <option value="streaming">Streaming</option>
                    <option value="sending-love">Sending love</option>
                  </select>
                </label>
              </div>
              <label htmlFor="rsvp-note">
                <span>Message</span>
                <textarea
                  id="rsvp-note"
                  onChange={(event) =>
                    setRsvpForm((current) => ({ ...current, note: event.target.value }))
                  }
                  placeholder="Any note for the family"
                  rows="4"
                  value={rsvpForm.note}
                />
              </label>
              <div className="form-actions">
                <button id="rsvp-submit-btn" className="button primary" type="submit">
                  <Heart aria-hidden="true" />
                  Save RSVP
                </button>
                <a
                  id="rsvp-whatsapp-link"
                  className="button ghost"
                  href={`https://wa.me/2348139790293?text=${whatsappText}`}
                  rel="noreferrer"
                  target="_blank"
                >
                  <MessageCircleHeart aria-hidden="true" />
                  WhatsApp
                </a>
                <a id="rsvp-streaming-link" className="button ghost" href={STREAMING_URL} rel="noreferrer" target="_blank">
                  <CalendarPlus aria-hidden="true" />
                  Streaming
                </a>
              </div>
            </form>
          </div>
        </section>
      </main>

      <div className="slide-dots" aria-label="Slide progress">
        {slides.map((slide, index) => (
          <button
            id={`dot-btn-${slide.id}`}
            aria-label={`Go to ${slide.label}`}
            className={activeSlide === index ? "active" : ""}
            key={slide.id}
            onClick={() => goToSlide(index)}
            type="button"
          />
        ))}
      </div>

      <div className={toast ? "toast show" : "toast"} role="status">
        {toast}
      </div>
    </div>
  );
}

export default App;
