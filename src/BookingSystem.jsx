import { useState, useEffect, useRef } from "react";

// ─── INITIAL DATA ────────────────────────────────────────────────────────────
const BARBERS = [
  { id: 1, name: "Marco", color: "#c9a84c", password: "marco123" },
  { id: 2, name: "James", color: "#6c9c8e", password: "james123" },
  { id: 3, name: "Luca",  color: "#b56a4a", password: "luca123" },
];

const SERVICES = [
  { id: 1, name: "Haircut",          duration: 30, price: 25 },
  { id: 2, name: "Haircut + Beard",  duration: 45, price: 35 },
  { id: 3, name: "Beard Trim",       duration: 20, price: 15 },
  { id: 4, name: "Hot Towel Shave",  duration: 40, price: 30 },
  { id: 5, name: "Kids Cut",         duration: 20, price: 18 },
];

const HOURS = [
  "09:00","09:30","10:00","10:30","11:00","11:30",
  "12:00","12:30","13:00","13:30","14:00","14:30",
  "15:00","15:30","16:00","16:30","17:00","17:30",
  "18:00","18:30",
];


function getStoredData(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch { return fallback; }
}

function pad(n) { return String(n).padStart(2, "0"); }

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}

function dateLabel(str) {
  const d = new Date(str + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday:"short", month:"short", day:"numeric" });
}

function next7Days() {
  const days = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(); d.setDate(d.getDate() + i);
    days.push(`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`);
  }
  return days;
}

function daysFromStart(startStr, count) {
  const days = [];
  const base = new Date(startStr + "T12:00:00");
  for (let i = 0; i < count; i++) {
    const d = new Date(base); d.setDate(base.getDate() + i);
    days.push(`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`);
  }
  return days;
}

function shiftDate(dateStr, days) {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}

function shortDay(str) {
  const d = new Date(str + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", day: "numeric" });
}

function isValidBulgarianPhone(raw) {
  if (!raw) return true; // optional field
  const phone = String(raw).replace(/[ \-]/g, "");
  // Accept numbers starting with 0 or +359, followed by 8–9 digits
  const re = /^(0\d{8,9}|\+359\d{8,9})$/;
  return re.test(phone);
}

function normalizePhoneForLookup(raw) {
  if (!raw) return "";
  const digits = String(raw).replace(/\D/g, "");
  if (digits.startsWith("359") && digits.length >= 12) return digits;
  if (digits.startsWith("0") && digits.length >= 9) return "359" + digits.slice(1);
  return digits;
}

function getCurrentSlotStart() {
  const d = new Date();
  const mins = d.getHours() * 60 + d.getMinutes();
  const slot = Math.floor(mins / 30) * 30;
  return `${pad(Math.floor(slot / 60))}:${pad(slot % 60)}`;
}

function isAppointmentUpcoming(date, time) {
  const today = todayStr();
  if (date > today) return true;
  if (date < today) return false;
  return time > getCurrentSlotStart();
}

// ─── MAIN EXPORT ─────────────────────────────────────────────────────────────
export default function BookingSystem() {
  const [view, setView] = useState("booking"); // "booking" | "admin" | "mybookings"
  const [loggedInBarber, setLoggedInBarber] = useState(null);
  const [showAdminLink, setShowAdminLink] = useState(false);
  const logoClickCount = useRef(0);
  const logoClickTimer = useRef(null);

  const [appointments, setAppointments] = useState(() =>
    getStoredData("bs_appointments", []));
  const [daysOff, setDaysOff] = useState(() =>
    getStoredData("bs_daysoff", {}));
  const [blockedSlots, setBlockedSlots] = useState(() =>
    getStoredData("bs_blocked_slots", {}));
  // daysOff: { "barberId_date": true }
  // blockedSlots: { "barberId_date_time": true }

  useEffect(() => { localStorage.setItem("bs_appointments", JSON.stringify(appointments)); }, [appointments]);
  useEffect(() => { localStorage.setItem("bs_daysoff", JSON.stringify(daysOff)); }, [daysOff]);
  useEffect(() => { localStorage.setItem("bs_blocked_slots", JSON.stringify(blockedSlots)); }, [blockedSlots]);

  function addAppointment(appt) { setAppointments(prev => [...prev, appt]); }
  function cancelAppointment(id) { setAppointments(prev => prev.filter(a => a.id !== id)); }
  function toggleDayOff(barberId, date) {
    const key = `${barberId}_${date}`;
    setDaysOff(prev => { const n={...prev}; n[key] ? delete n[key] : n[key]=true; return n; });
  }
  function isDayOff(barberId, date) { return !!daysOff[`${barberId}_${date}`]; }
  function isSlotBlocked(barberId, date, time) { return !!blockedSlots[`${barberId}_${date}_${time}`]; }
  function toggleBlockedSlot(barberId, date, time) {
    const key = `${barberId}_${date}_${time}`;
    setBlockedSlots(prev => { const n={...prev}; n[key] ? delete n[key] : n[key]=true; return n; });
  }

  function handleAdminLogin(barber) {
    setLoggedInBarber(barber);
  }

  function handleAdminLogout() {
    setLoggedInBarber(null);
    setShowAdminLink(false);
    setView("booking");
  }

  function handleLogoClick() {
    logoClickCount.current += 1;
    if (logoClickTimer.current) clearTimeout(logoClickTimer.current);
    if (logoClickCount.current >= 5) {
      setShowAdminLink(true);
      logoClickCount.current = 0;
    } else {
      logoClickTimer.current = setTimeout(() => { logoClickCount.current = 0; }, 2000);
    }
  }

  return (
    <div className="booking-app" style={styles.root}>
      <style>{css}</style>

      {/* NAV */}
      <nav className="booking-nav" style={styles.nav}>
        <div style={{...styles.logo, cursor:"pointer"}} onClick={handleLogoClick} role="button" tabIndex={0} onKeyDown={e=>e.key==="Enter"&&handleLogoClick()}>✂ CHOP SHOP</div>
        <div style={styles.navLinks}>
          <button style={{...styles.navBtn, ...(view==="booking"?styles.navActive:{})}} onClick={()=>setView("booking")}>Book</button>
          <button style={{...styles.navBtn, ...(view==="mybookings"?styles.navActive:{})}} onClick={()=>setView("mybookings")}>My bookings</button>
          {showAdminLink && (
            <button style={{...styles.navBtn, ...(view==="admin"?styles.navActive:{})}} onClick={()=>setView("admin")}>Admin</button>
          )}
        </div>
      </nav>

      {/* VIEWS */}
      {view === "booking" && (
        <BookingView
          appointments={appointments}
          addAppointment={addAppointment}
          isDayOff={isDayOff}
          isSlotBlocked={isSlotBlocked}
        />
      )}
      {view === "mybookings" && (
        <MyBookingsView
          appointments={appointments}
          cancelAppointment={cancelAppointment}
        />
      )}
      {view === "admin" && (
        loggedInBarber
          ? <AdminView
              appointments={appointments}
              cancelAppointment={cancelAppointment}
              daysOff={daysOff}
              toggleDayOff={toggleDayOff}
              blockedSlots={blockedSlots}
              toggleBlockedSlot={toggleBlockedSlot}
              onLogout={handleAdminLogout}
              loggedInBarber={loggedInBarber}
            />
          : <AdminLogin onLogin={handleAdminLogin} />
      )}
    </div>
  );
}

// ─── BOOKING VIEW ─────────────────────────────────────────────────────────────
function BookingView({ appointments, addAppointment, isDayOff, isSlotBlocked }) {
  const [step, setStep] = useState(1); // 1=barber 2=service 3=date&time 4=details/confirm
  const [barber, setBarber] = useState(null);
  const [service, setService] = useState(null);
  const [date, setDate] = useState(null);
  const [time, setTime] = useState(null);
  const [info, setInfo] = useState({ name:"", phone:"" });
  const [phoneError, setPhoneError] = useState("");
  const [done, setDone] = useState(false);

  const days = next7Days();

  // auto-select first available day when entering step 3
  const firstAvailDay = barber ? days.find(d => !isDayOff(barber.id, d)) || days[0] : days[0];

  function isBooked(barberId, d, t, duration) {
    return appointments.some(a => {
      if (a.barberId !== barberId || a.date !== d) return false;
      const aStart = HOURS.indexOf(a.time);
      const aEnd   = aStart + Math.ceil(a.duration / 30);
      const bStart = HOURS.indexOf(t);
      const bEnd   = bStart + Math.ceil(duration / 30);
      return bStart < aEnd && bEnd > aStart;
    });
  }

  function availableSlots(forDate) {
    const d = forDate || date;
    if (!barber || !service || !d) return [];
    const dur = service.duration;
    const slots = Math.ceil(dur / 30);
    return HOURS.filter((h, i) => {
      if (i + slots > HOURS.length) return false;
      for (let s = 0; s < slots; s++) {
        if (isBooked(barber.id, d, HOURS[i], dur)) return false;
        if (isSlotBlocked && isSlotBlocked(barber.id, d, HOURS[i + s])) return false;
      }
      return true;
    });
  }

  function submit() {
    if (!info.name.trim()) return;
    const rawPhone = info.phone.replace(/[ \-]/g, "");
    if (rawPhone && !isValidBulgarianPhone(rawPhone)) {
      setPhoneError("Invalid Bulgarian number. Use 0XXXXXXXXX or +359XXXXXXXXX.");
      return;
    }
    setPhoneError("");
    addAppointment({
      id: Date.now(),
      barberId: barber.id,
      barberName: barber.name,
      service: service.name,
      duration: service.duration,
      price: service.price,
      date,
      time,
      name: info.name,
      phone: rawPhone || "",
    });
    setDone(true);
  }

  function reset() {
    setStep(1); setBarber(null); setService(null);
    setDate(null); setTime(null); setInfo({name:"",phone:""});
    setPhoneError(""); setDone(false);
  }

  if (done) return (
    <div className="booking-center" style={styles.center}>
      <div className="confirm-box" style={styles.confirmBox}>
        <div style={styles.checkmark}>✓</div>
        <h2 style={styles.confirmTitle}>Appointment Booked!</h2>
        <div style={{ ...styles.summaryBox, textAlign: "left", marginBottom: "20px" }}>
          <p style={styles.summaryRow}><span style={styles.summaryLabel}>Client</span>{info.name}</p>
          <p style={styles.summaryRow}><span style={styles.summaryLabel}>Barber</span>{barber.name}</p>
          <p style={styles.summaryRow}><span style={styles.summaryLabel}>Service</span>{service.name}</p>
          <p style={styles.summaryRow}><span style={styles.summaryLabel}>Date</span>{dateLabel(date)}</p>
          <p style={styles.summaryRow}><span style={styles.summaryLabel}>Time</span>{time}</p>
          <p style={styles.summaryRow}><span style={styles.summaryLabel}>Price</span><span style={{ color: C.gold, fontWeight: 600 }}>${service.price}</span></p>
        </div>
        <button style={styles.primaryBtn} onClick={reset}>Book Another</button>
      </div>
    </div>
  );

  return (
    <div className="booking-wrap" style={styles.bookingWrap}>
      {/* PROGRESS */}
      <div className="booking-progress" style={styles.progress}>
        {["Barber","Service","Date & Time","Details"].map((s,i)=>{
          const isDone = step > i + 1;
          const isActive = step === i + 1;
          return (
            <div key={s} className="progress-step" style={styles.progressStep}>
              <div className="progress-dot" style={{
                ...styles.progressDot,
                ...(isActive ? { borderColor: C.gold, color: C.gold, background: C.goldLight } : {}),
                ...(isDone ? { borderColor: C.green, color: C.green, background: "rgba(48,209,88,0.1)" } : {}),
              }}>{isDone ? "✓" : i + 1}</div>
              <span style={{ ...styles.progressLabel, ...(isActive ? { color: C.gold } : {}), ...(isDone ? { color: C.green } : {}) }}>{s}</span>
            </div>
          );
        })}
      </div>

      {/* STEP 1: BARBER */}
      {step===1 && (
        <Section title="Choose Your Barber">
          <div style={styles.cardRow}>
            {BARBERS.map(b => (
              <button key={b.id} style={{...styles.barberCard, borderColor: b.color}}
                className="bcard barber-card"
                onClick={()=>{ setBarber(b); setStep(2); }}>
                <div className="barber-avatar" style={{...styles.barberAvatar, background: b.color}}>{b.name[0]}</div>
                <div style={styles.barberName}>{b.name}</div>
              </button>
            ))}
          </div>
        </Section>
      )}

      {/* STEP 2: SERVICE */}
      {step===2 && (
        <Section title="Choose a Service" onBack={()=>setStep(1)}>
          <div style={styles.serviceList}>
            {SERVICES.map(s => (
              <button key={s.id} style={styles.serviceCard} className="bcard service-card"
                onClick={()=>{ setService(s); setDate(firstAvailDay); setTime(null); setStep(3); }}>
                <span style={styles.serviceName}>{s.name}</span>
                <span style={styles.serviceMeta}>{s.duration}min · <strong style={styles.servicePrice}>${s.price}</strong></span>
              </button>
            ))}
          </div>
        </Section>
      )}

      {/* STEP 3: DATE & TIME (combined) */}
      {step===3 && (
        <Section title="Pick a Date & Time" onBack={()=>{ setDate(null); setTime(null); setStep(2); }}>
          <div className="date-grid" style={styles.dateGrid}>
            {days.map(d => {
              const off = isDayOff(barber.id, d);
              return (
                <button key={d}
                  disabled={off}
                  style={{...styles.dateBtn, ...(date===d?styles.dateBtnActive:{}), ...(off?styles.dateBtnOff:{})}}
                  onClick={()=>{ if(!off){ setDate(d); setTime(null); } }}>
                  <span style={styles.dateDow}>{dateLabel(d).split(",")[0]}</span>
                  <span style={styles.dateMd}>{dateLabel(d).split(",")[1]}</span>
                  {off && <span style={styles.offBadge}>Day Off</span>}
                </button>
              );
            })}
          </div>

          {date && (
            <div style={{ marginTop: "28px" }}>
              <h3 style={{ fontSize: "16px", color: C.text, fontWeight: 600, marginBottom: "14px" }}>
                Available times for {dateLabel(date)}
              </h3>
              {availableSlots(date).length === 0
                ? <p style={styles.noSlots}>No available slots. Pick another date above.</p>
                : (
                  <div className="time-grid" style={styles.timeGrid}>
                    {HOURS.map(h => {
                      const avail = availableSlots(date).includes(h);
                      return (
                        <button key={h}
                          disabled={!avail}
                          style={{...styles.timeBtn, ...(time===h?styles.timeBtnActive:{}), ...(!avail?styles.timeBtnTaken:{})}}
                          onClick={()=>{ if(avail){ setTime(h); setStep(4); } }}>
                          {h}
                          {!avail && <span style={styles.takenDot}>●</span>}
                        </button>
                      );
                    })}
                  </div>
                )
              }
            </div>
          )}
        </Section>
      )}

      {/* STEP 4: DETAILS + CONFIRM */}
      {step===4 && (
        <Section title="Confirm Your Appointment" onBack={()=>setStep(3)}>
          <div style={styles.formWrap}>
            <div style={styles.summaryBox}>
              <p style={styles.summaryRow}><span style={styles.summaryLabel}>Barber</span>{barber.name}</p>
              <p style={styles.summaryRow}><span style={styles.summaryLabel}>Service</span>{service.name}</p>
              <p style={styles.summaryRow}><span style={styles.summaryLabel}>Duration</span>{service.duration} min</p>
              <p style={styles.summaryRow}><span style={styles.summaryLabel}>Date</span>{dateLabel(date)}</p>
              <p style={styles.summaryRow}><span style={styles.summaryLabel}>Time</span>{time}</p>
              <p style={styles.summaryRow}><span style={styles.summaryLabel}>Price</span><span style={{ color: C.gold, fontWeight: 600 }}>${service.price}</span></p>
            </div>
            <input style={styles.input} placeholder="Your Name *"
              value={info.name} onChange={e=>setInfo(p=>({...p,name:e.target.value}))} />
            <input
              style={{ ...styles.input, ...(phoneError ? { borderColor: C.red } : {}) }}
              placeholder="Phone Number"
              value={info.phone}
              onChange={e=>setInfo(p=>({...p,phone:e.target.value}))}
              onBlur={() => {
                const normalized = info.phone.replace(/[ \-]/g, "");
                if (normalized && !isValidBulgarianPhone(normalized)) {
                  setPhoneError("Invalid Bulgarian number. Use 0XXXXXXXXX or +359XXXXXXXXX.");
                } else {
                  setPhoneError("");
                }
              }}
            />
            {phoneError && <p style={styles.error}>{phoneError}</p>}
            <button style={{...styles.primaryBtn, opacity: info.name.trim()?1:0.5}}
              onClick={submit}>Confirm Appointment</button>
          </div>
        </Section>
      )}
    </div>
  );
}

// ─── MY BOOKINGS VIEW ─────────────────────────────────────────────────────────
function MyBookingsView({ appointments, cancelAppointment }) {
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [searched, setSearched] = useState(false);

  function handleFind() {
    const raw = phone.replace(/[ \-]/g, "");
    if (!raw) {
      setPhoneError("Enter your phone number.");
      return;
    }
    if (!isValidBulgarianPhone(raw)) {
      setPhoneError("Invalid Bulgarian number. Use 0XXXXXXXXX or +359XXXXXXXXX.");
      return;
    }
    setPhoneError("");
    setSearched(true);
  }

  const normalized = normalizePhoneForLookup(phone.replace(/[ \-]/g, ""));
  const myAppointments = searched
    ? appointments.filter(a => normalizePhoneForLookup(a.phone) === normalized && isAppointmentUpcoming(a.date, a.time))
        .sort((a,b) => a.date === b.date ? a.time.localeCompare(b.time) : a.date.localeCompare(b.date))
    : [];

  function handleCancel(id) {
    if (window.confirm("Are you sure you want to cancel this appointment?")) {
      cancelAppointment(id);
    }
  }

  return (
    <div className="booking-wrap" style={styles.bookingWrap}>
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Cancel my appointment</h2>
        <p style={{ color: C.muted, marginBottom: "20px", fontSize: "14px" }}>
          Enter the phone number you used when booking to find and cancel your appointments.
        </p>
        <div style={styles.formWrap}>
          <input
            style={{ ...styles.input, ...(phoneError ? { borderColor: C.red } : {}) }}
            placeholder="Phone number (0XXXXXXXXX or +359XXXXXXXXX)"
            value={phone}
            onChange={e => { setPhone(e.target.value); setSearched(false); }}
            onKeyDown={e => e.key === "Enter" && handleFind()}
          />
          {phoneError && <p style={styles.error}>{phoneError}</p>}
          <button style={styles.primaryBtn} onClick={handleFind}>Find my appointments</button>
        </div>
      </div>

      {searched && (
        <div style={{ marginTop: "32px" }}>
          {myAppointments.length === 0
            ? <p style={styles.emptyMsg}>No upcoming appointments found for this number.</p>
            : (
              <div style={styles.apptList}>
                {myAppointments.map(a => {
                  const bColor = BARBERS.find(b => b.id === a.barberId)?.color || "#888";
                  return (
                    <div key={a.id} className="appt-card" style={{ ...styles.apptCard, borderLeftColor: bColor }}>
                      <div style={styles.apptMain}>
                        <div style={styles.apptName}>{a.name}</div>
                        <div style={styles.apptMeta}>{a.barberName} · {a.service} · {a.duration}min · ${a.price}</div>
                        <div style={styles.apptTime}>{dateLabel(a.date)} at {a.time}</div>
                      </div>
                      <button className="cancel-btn" style={styles.cancelBtn} onClick={() => handleCancel(a.id)}>Cancel</button>
                    </div>
                  );
                })}
              </div>
            )
          }
        </div>
      )}
    </div>
  );
}

// ─── ADMIN VIEW ───────────────────────────────────────────────────────────────
function AdminView({ appointments, cancelAppointment, daysOff, toggleDayOff, blockedSlots, toggleBlockedSlot, onLogout, loggedInBarber }) {
  const [tab, setTab] = useState("appointments"); // "appointments" | "schedule"
  const [filterBarber, setFilterBarber] = useState("all");
  const [calendarStart, setCalendarStart] = useState(todayStr());
  const [selectedAppt, setSelectedAppt] = useState(null);
  const [blockDate, setBlockDate] = useState(todayStr());
  const days = next7Days();
  const calDays = daysFromStart(calendarStart, 7);

  const filtered = appointments.filter(a =>
    filterBarber === "all" || String(a.barberId) === filterBarber
  );


  return (
    <div className="admin-wrap" style={styles.adminWrap}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px", flexWrap: "wrap", gap: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: loggedInBarber.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: 700, color: "#fff" }}>
            {loggedInBarber.name[0]}
          </div>
          <h2 style={{ ...styles.adminTitle, marginBottom: 0 }}>{loggedInBarber.name}</h2>
        </div>
        <button style={{ ...styles.cancelBtn, borderColor: C.muted, color: C.muted, background: "transparent" }} onClick={onLogout}>Sign out</button>
      </div>
      <div style={styles.tabBar}>
        <button style={{...styles.tabBtn,...(tab==="appointments"?styles.tabActive:{})}} onClick={()=>setTab("appointments")}>📋 Calendar</button>
        <button style={{...styles.tabBtn,...(tab==="schedule"?styles.tabActive:{})}} onClick={()=>setTab("schedule")}>🗓 Days Off</button>
      </div>

      {tab==="appointments" && (
        <div>
          <div style={styles.filterRow}>
            <span style={styles.filterLabel}>Filter:</span>
            {[{id:"all",name:"All Barbers"},...BARBERS].map(b=>(
              <button key={b.id} style={{...styles.filterBtn,...(filterBarber===String(b.id)?styles.filterActive:{})}}
                onClick={()=>setFilterBarber(String(b.id))}>{b.name}</button>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", gap: "12px" }}>
            <button className="cal-nav-btn" style={styles.calNavBtn} onClick={() => setCalendarStart(shiftDate(calendarStart, -7))}>‹ Prev</button>
            <div style={{ textAlign: "center" }}>
              <span style={{ color: C.text, fontSize: "15px", fontWeight: 600 }}>
                {dateLabel(calDays[0])} — {dateLabel(calDays[6])}
              </span>
            </div>
            <button className="cal-nav-btn" style={styles.calNavBtn} onClick={() => setCalendarStart(shiftDate(calendarStart, 7))}>Next ›</button>
          </div>

          <div className="admin-calendar" style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", borderRadius: "12px", border: `1px solid ${C.border}`, background: C.surface }}>
            <div className="cal-grid" style={{
              display: "grid",
              gridTemplateColumns: "54px repeat(7, 1fr)",
              gridTemplateRows: `auto repeat(${HOURS.length}, 40px)`,
              minWidth: "640px",
              position: "relative",
            }}>
              {/* Corner cell */}
              <div style={{ gridRow: 1, gridColumn: 1, borderBottom: `0.5px solid ${C.border}`, background: C.card }} />

              {/* Day headers */}
              {calDays.map((d, di) => {
                const isToday = d === todayStr();
                const dayParts = shortDay(d).split(" ");
                return (
                  <div key={d} className="cal-header" style={{
                    gridRow: 1, gridColumn: di + 2,
                    padding: "10px 4px 8px", textAlign: "center",
                    borderBottom: `0.5px solid ${C.border}`,
                    borderLeft: `0.5px solid ${C.border}`,
                    background: C.card,
                  }}>
                    <div style={{ fontSize: "10px", fontWeight: 500, letterSpacing: "0.5px", color: isToday ? C.gold : C.muted, textTransform: "uppercase" }}>
                      {dayParts[0]}
                    </div>
                    <div style={{
                      fontSize: "18px", fontWeight: 600, color: isToday ? C.gold : C.text,
                      ...(isToday ? { background: C.gold, color: "#000", width: "28px", height: "28px", borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", margin: "2px auto 0" } : { marginTop: "2px" }),
                    }}>
                      {dayParts[1]}
                    </div>
                  </div>
                );
              })}

              {/* Time labels + grid cells */}
              {HOURS.map((h, hi) => (
                <div key={h} style={{ display: "contents" }}>
                  <div className="cal-time-label" style={{
                    gridRow: hi + 2, gridColumn: 1,
                    padding: "0 6px", display: "flex", alignItems: "flex-start", justifyContent: "flex-end",
                    fontSize: "10px", fontFamily: MONO, fontWeight: 500, color: C.muted,
                    borderBottom: `0.5px solid ${C.border}`,
                    paddingTop: "2px",
                  }}>
                    {h}
                  </div>
                  {calDays.map((d, di) => (
                    <div key={`${d}_${h}`} style={{
                      gridRow: hi + 2, gridColumn: di + 2,
                      borderBottom: `0.5px solid ${C.border}`,
                      borderLeft: `0.5px solid ${C.border}`,
                      minHeight: "40px",
                    }} />
                  ))}
                </div>
              ))}

              {/* Appointment blocks */}
              {filtered.map(a => {
                const dayIdx = calDays.indexOf(a.date);
                if (dayIdx === -1) return null;
                const hourIdx = HOURS.indexOf(a.time);
                if (hourIdx === -1) return null;
                const span = Math.ceil((a.duration || 30) / 30);
                const bColor = BARBERS.find(b => b.id === a.barberId)?.color || "#888";

                return (
                  <div key={a.id} className="cal-block" style={{
                    gridRow: `${hourIdx + 2} / span ${span}`,
                    gridColumn: dayIdx + 2,
                    background: bColor + "25",
                    borderLeft: `3px solid ${bColor}`,
                    borderRadius: "6px",
                    padding: "3px 6px",
                    margin: "1px 3px",
                    overflow: "hidden",
                    cursor: "pointer",
                    fontSize: "11px",
                    lineHeight: "1.35",
                    color: C.text,
                  }} onClick={() => setSelectedAppt(a.id)}>
                    <div style={{ fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {a.name}
                    </div>
                    {span >= 2 && (
                      <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: C.secondary, fontSize: "10px" }}>
                        {filterBarber === "all" && <span style={{ color: bColor, fontWeight: 600 }}>{a.barberName} · </span>}{a.service}
                      </div>
                    )}
                    {span >= 2 && a.phone && (
                      <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: C.muted, fontSize: "9px", marginTop: "1px" }}>
                        {a.phone}
                      </div>
                    )}
                    {span < 2 && filterBarber === "all" && (
                      <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: bColor, fontSize: "9px", fontWeight: 600 }}>
                        {a.barberName}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Appointment detail modal */}
          {selectedAppt && (() => {
            const a = appointments.find(x => x.id === selectedAppt);
            if (!a) return null;
            const bColor = BARBERS.find(b => b.id === a.barberId)?.color || "#888";
            const canCancel = a.barberId === loggedInBarber.id;
            return (
              <div className="modal-backdrop" style={{
                position: "fixed", inset: 0, zIndex: 100,
                background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
                display: "flex", alignItems: "center", justifyContent: "center", padding: "20px",
              }} onClick={() => setSelectedAppt(null)}>
                <div className="modal-card" style={{
                  background: C.surface, border: `1px solid ${C.borderLight}`,
                  borderRadius: "20px", padding: "32px", width: "100%", maxWidth: "400px",
                  boxShadow: "0 20px 60px rgba(0,0,0,.5)", position: "relative",
                  animation: "fadeIn .2s cubic-bezier(.4,0,.2,1)",
                }} onClick={e => e.stopPropagation()}>
                  <button onClick={() => setSelectedAppt(null)} style={{
                    position: "absolute", top: "16px", right: "16px",
                    background: C.card, border: "none", color: C.muted,
                    width: "32px", height: "32px", borderRadius: "50%",
                    cursor: "pointer", fontSize: "16px", display: "flex",
                    alignItems: "center", justifyContent: "center",
                  }}>✕</button>

                  <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "20px" }}>
                    <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: bColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", fontWeight: 700, color: "#fff", flexShrink: 0, boxShadow: "0 4px 12px rgba(0,0,0,.3)" }}>
                      {a.barberName?.[0]}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: C.text, fontSize: "18px" }}>{a.name}</div>
                      <div style={{ color: bColor, fontSize: "14px", fontWeight: 500 }}>{a.barberName}</div>
                    </div>
                  </div>

                  <div style={{ background: C.card, borderRadius: "12px", padding: "16px", marginBottom: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                      <span style={{ color: C.muted, fontWeight: 500 }}>Service</span>
                      <span style={{ color: C.text, fontWeight: 500 }}>{a.service}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                      <span style={{ color: C.muted, fontWeight: 500 }}>Duration</span>
                      <span style={{ color: C.text }}>{a.duration} min</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                      <span style={{ color: C.muted, fontWeight: 500 }}>Price</span>
                      <span style={{ color: C.gold, fontWeight: 600 }}>${a.price}</span>
                    </div>
                    <div style={{ height: "1px", background: C.border }} />
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                      <span style={{ color: C.muted, fontWeight: 500 }}>Date</span>
                      <span style={{ color: C.text }}>{dateLabel(a.date)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                      <span style={{ color: C.muted, fontWeight: 500 }}>Time</span>
                      <span style={{ color: C.text, fontFamily: MONO }}>{a.time}</span>
                    </div>
                    {a.phone && (
                      <>
                        <div style={{ height: "1px", background: C.border }} />
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                          <span style={{ color: C.muted, fontWeight: 500 }}>Phone</span>
                          <span style={{ color: C.text }}>{a.phone}</span>
                        </div>
                      </>
                    )}
                  </div>

                  {canCancel ? (
                    <button style={{ ...styles.cancelBtn, fontSize: "14px", padding: "12px 20px", width: "100%", borderRadius: "12px", textAlign: "center" }}
                      onClick={() => { cancelAppointment(a.id); setSelectedAppt(null); }}>
                      Cancel appointment
                    </button>
                  ) : (
                    <p style={{ color: C.muted, fontSize: "13px", textAlign: "center", margin: 0 }}>
                      This is {a.barberName}'s appointment
                    </p>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {tab==="schedule" && (
        <div>
          <p style={styles.scheduleNote}>Toggle your days off. Clients won't be able to book on days marked as off.</p>
          <div style={styles.barberSection}>
            <div style={{...styles.barberSectionTitle, color: loggedInBarber.color}}>✂ {loggedInBarber.name}'s Schedule</div>
            <div className="day-off-grid" style={styles.dayOffGrid}>
              {days.map(d=>{
                const off = !!daysOff[`${loggedInBarber.id}_${d}`];
                return (
                  <button key={d}
                    style={{...styles.dayOffBtn, ...(off?styles.dayOffActive:{})}}
                    onClick={()=>toggleDayOff(loggedInBarber.id,d)}>
                    <span style={styles.dayOffDow}>{dateLabel(d).split(",")[0]}</span>
                    <span style={styles.dayOffMd}>{dateLabel(d).split(",")[1]}</span>
                    <span style={styles.dayOffStatus}>{off?"✗ OFF":"✓ OPEN"}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div style={{ marginTop: "32px", paddingTop: "24px", borderTop: `0.5px solid ${C.border}` }}>
            <h3 style={{ fontSize: "17px", color: C.text, fontWeight: 600, marginBottom: "8px", letterSpacing: "-0.2px" }}>Block specific times</h3>
            <p style={styles.scheduleNote}>Block individual time slots. Clients won't be able to book blocked times.</p>
            <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap", alignItems: "center" }}>
              <span style={styles.filterLabel}>Date:</span>
              {days.slice(0, 7).map(d=>(
                <button key={d} style={{...styles.filterBtn,...(blockDate===d?styles.filterActive:{})}}
                  onClick={()=>setBlockDate(d)}>{dateLabel(d).split(",")[0]}</button>
              ))}
            </div>
            <div className="time-grid" style={styles.timeGrid}>
              {HOURS.map(h=>{
                const blocked = !!blockedSlots[`${loggedInBarber.id}_${blockDate}_${h}`];
                return (
                  <button key={h}
                    style={{...styles.timeBtn, ...(blocked?{ background: "rgba(255,69,58,0.08)", borderColor: C.red, color: C.red }:{})}}
                    onClick={()=>toggleBlockedSlot(loggedInBarber.id, blockDate, h)}>
                    {h}
                    <span style={styles.takenDot}>{blocked?"✗":"✓"}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ADMIN LOGIN ──────────────────────────────────────────────────────────────
function AdminLogin({ onLogin }) {
  const [selectedBarber, setSelectedBarber] = useState(null);
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");

  function handleSubmit() {
    if (!selectedBarber) { setError("Select your name first."); return; }
    if (pass === selectedBarber.password) {
      onLogin(selectedBarber);
    } else {
      setError("Incorrect password.");
    }
  }

  return (
    <div className="booking-center" style={styles.center}>
      <div className="login-box" style={{ ...styles.loginBox, maxWidth: "380px", width: "100%" }}>
        <div style={styles.loginIcon}>🔒</div>
        <h2 style={styles.loginTitle}>Staff Login</h2>
        <p style={{ color: C.muted, fontSize: "13px", margin: 0 }}>Select your name and enter your password.</p>
        <div style={{ display: "flex", gap: "6px", justifyContent: "center", flexWrap: "wrap" }}>
          {BARBERS.map(b => (
            <button key={b.id}
              style={{
                ...styles.filterBtn,
                ...(selectedBarber?.id === b.id ? { borderColor: b.color, color: b.color, background: b.color + "18" } : {}),
              }}
              onClick={() => { setSelectedBarber(b); setError(""); }}>
              {b.name}
            </button>
          ))}
        </div>
        <input style={styles.input} type="password" placeholder="Password"
          value={pass} onChange={e => { setPass(e.target.value); setError(""); }}
          onKeyDown={e => e.key === "Enter" && handleSubmit()} />
        {error && <p style={styles.error}>{error}</p>}
        <button style={styles.primaryBtn} onClick={handleSubmit}>Sign in</button>
      </div>
    </div>
  );
}

// ─── SECTION WRAPPER ──────────────────────────────────────────────────────────
function Section({ title, onBack, children }) {
  return (
    <div style={styles.section}>
      <div style={styles.sectionHeader}>
        {onBack && <button style={styles.backBtn} onClick={onBack}>← Back</button>}
        <h2 className="section-title" style={styles.sectionTitle}>{title}</h2>
      </div>
      {children}
    </div>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const C = {
  bg:      "#000000",
  surface: "#1c1c1e",
  card:    "#2c2c2e",
  elevated:"#3a3a3c",
  gold:    "#d4a843",
  goldDim: "#9a7a2e",
  goldLight:"rgba(212,168,67,0.12)",
  text:    "#f5f5f7",
  secondary:"#a1a1a6",
  muted:   "#8e8e93",
  red:     "#ff453a",
  green:   "#30d158",
  blue:    "#0a84ff",
  border:  "#38383a",
  borderLight:"#48484a",
};

const FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', Helvetica, Arial, sans-serif";
const MONO = "'SF Mono', 'Menlo', 'Monaco', 'Courier New', monospace";

const styles = {
  root:       { fontFamily: FONT, background: C.bg, minHeight:"100vh", width:"100%", color: C.text, overflowX:"hidden", WebkitFontSmoothing:"antialiased", MozOsxFontSmoothing:"grayscale" },
  nav:        { display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:"12px", padding:"14px 28px", background: "rgba(28,28,30,0.85)", backdropFilter:"blur(20px) saturate(180%)", WebkitBackdropFilter:"blur(20px) saturate(180%)", borderBottom:`0.5px solid ${C.border}`, position:"sticky", top:0, zIndex:50 },
  logo:       { fontSize:"20px", fontWeight:700, letterSpacing:"3px", color: C.gold, fontFamily: MONO },
  navLinks:   { display:"flex", gap:"6px" },
  navBtn:     { background:"transparent", border:`1px solid ${C.border}`, color: C.muted, padding:"7px 18px", borderRadius:"8px", cursor:"pointer", fontSize:"12px", fontWeight:500, letterSpacing:"0.5px", textTransform:"uppercase", fontFamily: FONT, transition:"all .2s ease" },
  navActive:  { borderColor: C.gold, color: C.gold, background: C.goldLight },
  bookingWrap:{ maxWidth:"680px", margin:"0 auto", padding:"32px 20px" },
  progress:   { display:"flex", gap:"2px", marginBottom:"36px", overflowX:"auto", padding:"0 4px" },
  progressStep:{ display:"flex", flexDirection:"column", alignItems:"center", gap:"8px", flex:1, minWidth:"56px" },
  progressDot:{ width:"36px", height:"36px", borderRadius:"50%", background: C.card, border:`1.5px solid ${C.border}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"13px", fontWeight:600, transition:"all .3s ease" },
  progressActive:{},
  progressDone:  {},
  progressLabel:{ fontSize:"10px", color: C.muted, textTransform:"uppercase", letterSpacing:"0.5px", fontWeight:500 },
  section:    { animation:"fadeIn .35s cubic-bezier(.4,0,.2,1)" },
  sectionHeader:{ display:"flex", alignItems:"center", gap:"14px", marginBottom:"24px" },
  sectionTitle:{ fontSize:"24px", color: C.text, margin:0, fontWeight:600, letterSpacing:"-0.3px" },
  backBtn:    { background:"transparent", border:"none", color: C.muted, cursor:"pointer", fontSize:"15px", padding:"0", fontWeight:500, transition:"color .15s" },
  cardRow:    { display:"flex", gap:"14px", flexWrap:"wrap" },
  barberCard: { background: C.card, border:`1.5px solid ${C.border}`, borderRadius:"16px", padding:"28px 32px", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:"14px", flex:1, minWidth:"120px", transition:"all .25s cubic-bezier(.4,0,.2,1)" },
  barberAvatar:{ width:"60px", height:"60px", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"22px", fontWeight:700, color:"#fff", boxShadow:"0 4px 12px rgba(0,0,0,.3)" },
  barberName: { fontSize:"15px", color: C.text, fontWeight:600, letterSpacing:"0.3px" },
  serviceList:{ display:"flex", flexDirection:"column", gap:"8px" },
  serviceCard:{ background: C.card, border:`1px solid ${C.border}`, borderRadius:"12px", padding:"16px 20px", cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center", transition:"all .2s cubic-bezier(.4,0,.2,1)" },
  serviceName:{ fontSize:"15px", color: C.text, fontWeight:500 },
  serviceMeta:{ fontSize:"13px", color: C.muted },
  servicePrice:{ color: C.gold, fontWeight:600 },
  dateGrid:   { display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(82px, 1fr))", gap:"8px" },
  dateBtn:    { background: C.card, border:`1px solid ${C.border}`, borderRadius:"12px", padding:"14px 8px", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:"4px", color: C.text, transition:"all .2s cubic-bezier(.4,0,.2,1)" },
  dateBtnActive:{ borderColor: C.gold, background: C.goldLight },
  dateBtnOff: { opacity:0.35, cursor:"not-allowed" },
  dateDow:    { fontSize:"11px", color: C.muted, textTransform:"uppercase", letterSpacing:"0.5px", fontWeight:500 },
  dateMd:     { fontSize:"15px", fontWeight:600 },
  offBadge:   { fontSize:"9px", background: C.red, color:"#fff", borderRadius:"6px", padding:"2px 8px", marginTop:"2px", fontWeight:600 },
  timeGrid:   { display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(72px, 1fr))", gap:"6px" },
  timeBtn:    { background: C.card, border:`1px solid ${C.border}`, borderRadius:"10px", padding:"12px 4px", cursor:"pointer", color: C.text, fontSize:"13px", fontFamily: MONO, fontWeight:500, transition:"all .2s cubic-bezier(.4,0,.2,1)", position:"relative" },
  timeBtnActive:{ borderColor: C.gold, background: C.goldLight, color: C.gold },
  timeBtnTaken: { opacity:0.25, cursor:"not-allowed", textDecoration:"line-through" },
  takenDot:   { display:"block", fontSize:"8px", color: C.red, marginTop:"2px" },
  noSlots:    { color: C.muted, textAlign:"center", padding:"48px 0", fontSize:"14px" },
  formWrap:   { display:"flex", flexDirection:"column", gap:"14px", maxWidth:"420px" },
  summaryBox: { background: C.card, border:`1px solid ${C.border}`, borderRadius:"14px", padding:"18px 22px" },
  summaryRow: { display:"flex", justifyContent:"space-between", margin:"7px 0", fontSize:"14px" },
  summaryLabel:{ color: C.muted, marginRight:"16px", fontWeight:500 },
  input:      { background: C.card, border:`1px solid ${C.border}`, borderRadius:"10px", padding:"13px 16px", color: C.text, fontSize:"15px", outline:"none", fontFamily: FONT, transition:"border-color .2s ease" },
  primaryBtn: { background: C.gold, border:"none", borderRadius:"12px", padding:"14px 28px", color:"#000", fontSize:"15px", fontWeight:600, cursor:"pointer", letterSpacing:"0.3px", transition:"all .2s ease", fontFamily: FONT },
  center:     { display:"flex", justifyContent:"center", alignItems:"center", minHeight:"min(60vh, 400px)", padding:"20px" },
  confirmBox: { background: C.surface, border:`1px solid ${C.border}`, borderRadius:"20px", padding:"40px 32px", textAlign:"center", maxWidth:"400px", width:"100%", boxShadow:"0 8px 32px rgba(0,0,0,.3)" },
  checkmark:  { fontSize:"56px", color: C.green, marginBottom:"16px" },
  confirmTitle:{ fontSize:"22px", color: C.text, marginBottom:"12px", fontWeight:600 },
  confirmDetail:{ color: C.muted, margin:"6px 0", fontSize:"14px" },
  adminWrap:  { maxWidth:"1060px", margin:"0 auto", padding:"28px 20px" },
  adminTitle: { fontSize:"28px", color: C.text, fontWeight:600, letterSpacing:"-0.5px", marginBottom:"24px" },
  tabBar:     { display:"flex", gap:"4px", marginBottom:"28px", background: C.card, borderRadius:"10px", padding:"3px" },
  tabBtn:     { background:"transparent", border:"none", color: C.muted, padding:"10px 22px", borderRadius:"8px", cursor:"pointer", fontSize:"13px", fontWeight:500, letterSpacing:"0.3px", fontFamily: FONT, transition:"all .2s ease" },
  tabActive:  { color: C.text, background: C.elevated, boxShadow:"0 1px 4px rgba(0,0,0,.2)" },
  filterRow:  { display:"flex", gap:"6px", alignItems:"center", marginBottom:"20px", flexWrap:"wrap" },
  filterLabel:{ color: C.muted, fontSize:"11px", textTransform:"uppercase", letterSpacing:"0.5px", fontWeight:600 },
  filterBtn:  { background: C.card, border:`1px solid ${C.border}`, color: C.muted, padding:"6px 14px", borderRadius:"8px", cursor:"pointer", fontSize:"12px", fontWeight:500, fontFamily: FONT, transition:"all .15s ease" },
  filterActive:{ borderColor: C.gold, color: C.gold, background: C.goldLight },
  apptList:   { display:"flex", flexDirection:"column", gap:"10px" },
  apptCard:   { background: C.card, borderLeft:"4px solid", borderRadius:"12px", padding:"16px 20px", display:"flex", flexWrap:"wrap", justifyContent:"space-between", alignItems:"flex-start", gap:"12px" },
  apptMain:   { flex:1 },
  apptName:   { fontSize:"15px", fontWeight:600, color: C.text, marginBottom:"3px" },
  apptMeta:   { fontSize:"12px", color: C.muted, marginBottom:"3px" },
  apptTime:   { fontSize:"13px", color: C.gold, fontWeight:500 },
  apptPhone:  { fontSize:"12px", color: C.muted, marginTop:"3px" },
  cancelBtn:  { background:"rgba(255,69,58,0.1)", border:`1px solid ${C.red}`, color: C.red, padding:"7px 16px", borderRadius:"8px", cursor:"pointer", fontSize:"12px", fontWeight:500, whiteSpace:"nowrap", fontFamily: FONT, transition:"all .15s ease" },
  emptyMsg:   { color: C.muted, textAlign:"center", padding:"60px 0", fontSize:"14px" },
  scheduleNote:{ color: C.muted, fontSize:"13px", marginBottom:"24px", lineHeight:"1.5" },
  barberSection:{ marginBottom:"32px" },
  barberSectionTitle:{ fontSize:"17px", fontWeight:600, letterSpacing:"0.5px", marginBottom:"14px" },
  dayOffGrid: { display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(78px, 1fr))", gap:"6px" },
  dayOffBtn:  { background: C.card, border:`1.5px solid ${C.green}`, borderRadius:"10px", padding:"12px 6px", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:"3px", color: C.text, transition:"all .2s ease" },
  dayOffActive:{ background:"rgba(255,69,58,0.08)", borderColor: C.red },
  dayOffDow:  { fontSize:"10px", color: C.muted, textTransform:"uppercase", letterSpacing:"0.5px", fontWeight:500 },
  dayOffMd:   { fontSize:"13px", fontWeight:600 },
  dayOffStatus:{ fontSize:"9px", fontFamily: MONO, letterSpacing:"0.5px", fontWeight:600 },
  loginBox:   { background: C.surface, border:`1px solid ${C.border}`, borderRadius:"20px", padding:"40px 32px", textAlign:"center", width:"min(340px, 100%)", maxWidth:"100%", display:"flex", flexDirection:"column", gap:"14px", boxShadow:"0 8px 32px rgba(0,0,0,.3)" },
  loginIcon:  { fontSize:"44px" },
  loginTitle: { fontSize:"20px", color: C.text, fontWeight:600, margin:0 },
  error:      { color: C.red, fontSize:"13px", margin:0, fontWeight:500 },
  loginHint:  { color: C.muted, fontSize:"11px", margin:0 },
  calNavBtn:  { background: C.card, border:`1px solid ${C.border}`, color: C.muted, padding:"7px 18px", borderRadius:"8px", cursor:"pointer", fontSize:"12px", fontWeight:500, fontFamily: FONT, transition:"all .15s ease" },
};

const css = `
  * { box-sizing: border-box; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }

  .booking-app { width: 100%; max-width: 100vw; }

  .bcard { transition: transform .2s cubic-bezier(.4,0,.2,1), box-shadow .2s ease, border-color .2s ease; }
  .bcard:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,.25); border-color: ${C.borderLight} !important; }
  .bcard:active { transform: translateY(0); }

  input:focus { border-color: ${C.gold} !important; box-shadow: 0 0 0 3px ${C.goldLight} !important; }

  button { font-family: ${FONT}; }

  .booking-nav { backdrop-filter: blur(20px) saturate(180%); -webkit-backdrop-filter: blur(20px) saturate(180%); }

  .cal-block { transition: all .15s cubic-bezier(.4,0,.2,1); }
  .cal-block:hover { box-shadow: 0 2px 10px rgba(0,0,0,.4); z-index: 5 !important; filter: brightness(1.15); }

  .cal-nav-btn:hover { border-color: ${C.gold} !important; color: ${C.gold} !important; }
  .cal-popover { animation: fadeIn .2s cubic-bezier(.4,0,.2,1); }

  .cancel-btn:hover { background: rgba(255,69,58,0.18) !important; }

  .modal-backdrop { animation: backdropIn .2s ease; }
  @keyframes backdropIn { from { opacity: 0; } to { opacity: 1; } }
  .modal-card { animation: modalIn .25s cubic-bezier(.4,0,.2,1); }
  @keyframes modalIn { from { opacity: 0; transform: scale(0.95) translateY(10px); } to { opacity: 1; transform: none; } }

  .admin-calendar { -webkit-overflow-scrolling: touch; }

  @media (max-width: 768px) {
    .booking-nav { padding: 12px 16px !important; }
    .section-title { font-size: clamp(18px, 4vw, 24px) !important; }
    .barber-card { min-width: 100px !important; padding: 20px 16px !important; }
    .barber-avatar { width: 48px !important; height: 48px !important; font-size: 18px !important; }

    .cal-grid { grid-template-rows: auto repeat(${HOURS.length}, 34px) !important; min-width: 540px !important; }
    .cal-header { padding: 6px 2px !important; }
    .cal-header div:first-child { font-size: 9px !important; }
    .cal-header div:last-child { font-size: 14px !important; }
    .cal-time-label { font-size: 9px !important; padding: 0 3px !important; }
    .cal-block { font-size: 9px !important; padding: 2px 3px !important; border-radius: 4px !important; }
  }

  @media (max-width: 480px) {
    .booking-wrap, .admin-wrap { padding: 16px 12px !important; }
    .booking-progress .progress-step { min-width: 44px !important; }
    .booking-progress .progress-dot { width: 30px !important; height: 30px !important; font-size: 11px !important; }

    .service-card { flex-direction: column !important; align-items: flex-start !important; gap: 4px !important; }
    .date-grid { grid-template-columns: repeat(4, 1fr) !important; }
    .time-grid { grid-template-columns: repeat(4, 1fr) !important; }
    .day-off-grid { grid-template-columns: repeat(4, 1fr) !important; }

    .confirm-box, .login-box { padding: 28px 20px !important; border-radius: 16px !important; }

    .cal-grid { grid-template-columns: 42px repeat(7, 1fr) !important; grid-template-rows: auto repeat(${HOURS.length}, 28px) !important; min-width: 420px !important; }
    .cal-block { font-size: 8px !important; padding: 1px 2px !important; margin: 0 1px !important; }
    .cal-popover { min-width: 180px !important; padding: 12px !important; border-radius: 10px !important; }
  }
`;
