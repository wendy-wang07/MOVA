import os
import sqlite3
import threading
import time
import serial
from flask import Blueprint, jsonify, request

SERIAL_PORT = os.getenv("SERIAL_PORT", "COM3") 
BAUD_RATE = 115200                             
DB_FILE = "biometrics.db"
QUIET_SECONDS = 1.5                          
MAX_SETS = 50                                  

biometrics_bp = Blueprint("biometrics", __name__)

state = {"connected": False}
_started = False


def init_db():
    db = sqlite3.connect(DB_FILE)
    db.executescript("""
        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ts INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS sets (
            session_id INTEGER NOT NULL,
            set_number INTEGER NOT NULL,
            reps INTEGER NOT NULL,
            bpm INTEGER NOT NULL
        );
    """)
    db.commit()
    db.close()


def parse_dump(values):
    """
    values: list of ints exactly as the device sent them.
    Returns a list of (reps, bpm) tuples, [] for an empty dump,
    or None if the data doesn't look valid.
    """
    if not values:
        return None

    n = values[0]

    if n == 0 and len(values) == 1:
        return []                      

    if n < 0 or n > MAX_SETS or len(values) != 1 + 2 * n:
        return None                   
    
    sets = []
    for i in range(n):
        reps = values[1 + 2 * i]
        bpm = values[2 + 2 * i]
        if not (0 < reps <= 1000 and 0 <= bpm <= 250):
            return None
        sets.append((reps, bpm))

    return sets


def save_session(db, sets, ts=None):
    ts = ts or int(time.time())
    cur = db.execute("INSERT INTO sessions (ts) VALUES (?)", (ts,))
    session_id = cur.lastrowid
    db.executemany(
        "INSERT INTO sets (session_id, set_number, reps, bpm) VALUES (?, ?, ?, ?)",
        [(session_id, i + 1, reps, bpm) for i, (reps, bpm) in enumerate(sets)],
    )
    db.commit()
    return session_id


def _read_loop():
    warned = False
    db = sqlite3.connect(DB_FILE)  

    while True:
        try:
            with serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=QUIET_SECONDS) as ser:
                print(f"[biometrics] connected to {SERIAL_PORT}")
                state["connected"] = True
                warned = False
                buffer = []

                while True:
                    raw = ser.readline().decode("utf-8", errors="ignore").strip()

                    if raw:
                        try:
                            buffer.append(int(raw))
                        except ValueError:
                            pass      
                        continue

                    if buffer:
                        sets = parse_dump(buffer)
                        if sets is None:
                            print(f"[biometrics] ignored {len(buffer)} values (not a valid dump)")
                        elif sets:
                            sid = save_session(db, sets)
                            print(f"[biometrics] saved workout #{sid} with {len(sets)} sets")
                        buffer = []

        except (serial.SerialException, OSError) as e:
            state["connected"] = False
            if not warned:
                print(f"[biometrics] can't open {SERIAL_PORT}: {e}. Retrying...")
                warned = True
            time.sleep(2)           


def start_reader():
    """Call once when the server starts."""
    global _started
    if _started:
        return
    _started = True
    init_db()
    threading.Thread(target=_read_loop, daemon=True).start()


@biometrics_bp.route("/workouts", methods=["GET"])
def workouts():
    limit = min(max(request.args.get("limit", 20, type=int), 1), 100)

    db = sqlite3.connect(DB_FILE)
    sessions = db.execute(
        "SELECT id, ts FROM sessions ORDER BY id DESC LIMIT ?", (limit,)
    ).fetchall()

    result = []
    for session_id, ts in sessions:
        rows = db.execute(
            "SELECT set_number, reps, bpm FROM sets WHERE session_id = ? ORDER BY set_number",
            (session_id,),
        ).fetchall()

        sets = [{"set": n, "reps": r, "bpm": b} for n, r, b in rows]
        bpms = [s["bpm"] for s in sets if s["bpm"] > 0]

        result.append({
            "id": session_id,
            "ts": ts,
            "sets": sets,
            "total_reps": sum(s["reps"] for s in sets),
            "avg_bpm": round(sum(bpms) / len(bpms)) if bpms else None,
        })

    db.close()
    return jsonify({"connected": state["connected"], "workouts": result}), 200