import { useEffect, useState } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { API_URL } from "../config";

export default function BiometricsPage() {
  const [workouts, setWorkouts] = useState([]);
  const [connected, setConnected] = useState(false);
  const [backendError, setBackendError] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch(`${API_URL}/workouts`);
        if (!res.ok) throw new Error("bad response");
        const data = await res.json();
        if (cancelled) return;
        setWorkouts(data.workouts);
        setConnected(data.connected);
        setBackendError(false);
      } catch {
        if (!cancelled) setBackendError(true);
      }
    };

    load();
    const id = setInterval(load, 3000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const selected = workouts.find((w) => w.id === selectedId) || workouts[0];

  // let status = "Device not connected";
  // if (backendError) status = "Can't reach the backend.";
  // else if (connected) status = "Device connected";

  const formatDate = (ts) => new Date(ts * 1000).toLocaleString();

  return (
    <div className="container gallery">
      <h1 className="header">My Workouts</h1>
      <p className="subtitle">
        <span className={connected ? "status-dot on" : "status-dot"} />
        {status}
      </p>

      {workouts.length === 0 && !backendError && (
        <p className="status-text">
          No workouts yet. Plug in your MyMOVA and press its reset button to sync.
        </p>
      )}

      {selected && (
        <>
          <p className="subtitle" style={{ marginBottom: 12 }}>
            {formatDate(selected.ts)}
          </p>

          <div className="bpm-row" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
            <div className="bpm-card">
              <div className="bpm-value small">{selected.sets.length}</div>
              <div className="bpm-label">Sets</div>
            </div>
            <div className="bpm-card">
              <div className="bpm-value small">{selected.total_reps}</div>
              <div className="bpm-label">Total reps</div>
            </div>
            <div className="bpm-card">
              <div className="bpm-value small">{selected.avg_bpm ?? "--"}</div>
              <div className="bpm-label">Avg heart rate</div>
            </div>
          </div>

          <div className="bpm-chart">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={selected.sets}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="set" tickFormatter={(n) => `Set ${n}`} />
                <YAxis yAxisId="left" allowDecimals={false} />
                <YAxis yAxisId="right" orientation="right" domain={["dataMin - 10", "dataMax + 10"]} />
                <Tooltip labelFormatter={(n) => `Set ${n}`} />
                <Legend />
                <Bar yAxisId="left" dataKey="reps" name="Reps" fill="#6B9080" radius={[6, 6, 0, 0]} />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="bpm"
                  name="Heart rate (BPM)"
                  stroke="#dc2626"
                  strokeWidth={2}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {workouts.length > 1 && (
        <div className="workout-list">
          {workouts.map((w) => (
            <button
              key={w.id}
              type="button"
              className={w.id === selected.id ? "workout-item active" : "workout-item"}
              onClick={() => setSelectedId(w.id)}
            >
              <span>{formatDate(w.ts)}</span>
              <span className="meta">
                {w.sets.length} sets · {w.total_reps} reps
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
} 