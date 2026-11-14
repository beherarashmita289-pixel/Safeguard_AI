import { useState, useRef, useEffect } from "react";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import "@tensorflow/tfjs";

export default function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const audioRef = useRef(null);
  const soundRef = useRef(false);
  const wasDetectedRef = useRef(false);

  const [running, setRunning] = useState(false);
  const [model, setModel] = useState(null);
  const [modelStatus, setModelStatus] = useState("Loading AI...");
  const [people, setPeople] = useState(0);
  const [alerts, setAlerts] = useState([]);
  const [logs, setLogs] = useState([]);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [error, setError] = useState("");

  const addLog = (message) => {
    setLogs(prev => [
      `${new Date().toLocaleTimeString()} - ${message}`,
      ...prev
    ].slice(0, 15));
  };

  // Load AI model
  useEffect(() => {
    let cancelled = false;

    async function loadAI() {
      try {
        const loaded = await cocoSsd.load();
        if (!cancelled) {
          setModel(loaded);
          setModelStatus("AI Model Ready");
          addLog("AI model loaded");
        }
      } catch {
        if (!cancelled) {
          setModelStatus("AI Loading Failed");
          setError("AI model could not load. Check your internet.");
        }
      }
    }

    loadAI();
    return () => { cancelled = true; };
  }, []);

  // Enable sound with user permission
  const enableSound = async () => {
    try {
      const AudioContextClass =
        window.AudioContext || window.webkitAudioContext;

      if (!AudioContextClass) {
        setError("Sound is not supported by this browser.");
        return;
      }

      if (!audioRef.current) {
        audioRef.current = new AudioContextClass();
      }

      await audioRef.current.resume();
      soundRef.current = true;
      setSoundEnabled(true);
      addLog("Sound notifications enabled");
    } catch {
      setError("Could not enable sound.");
    }
  };

  // Play alert sound
  const playAlertSound = () => {
    const audio = audioRef.current;
    if (!soundRef.current || !audio || audio.state !== "running") return;

    const oscillator = audio.createOscillator();
    const gain = audio.createGain();

    oscillator.frequency.value = 880;
    gain.gain.value = 0.12;

    oscillator.connect(gain);
    gain.connect(audio.destination);

    oscillator.start();
    oscillator.stop(audio.currentTime + 0.2);
  };
const downloadReport = () => {
  if (alerts.length === 0) {
    alert("No detection records available.");
    return;
  }

  const rows = [
    ["Date and Time", "Detection Event"],
    ...alerts.map(alert => [alert.time, alert.message])
  ];

  const csv = rows
    .map(row =>
      row.map(value =>
        `"${String(value).replace(/"/g, '""')}"`
      ).join(",")
    )
    .join("\n");

  const blob = new Blob([csv], {
    type: "text/csv;charset=utf-8;"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "Safeguard_AI_Report.csv";
  link.click();

  URL.revokeObjectURL(url);
};
  // Start camera
  const startCamera = async () => {
    try {
      setError("");

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false
      });

      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      wasDetectedRef.current = false;
      setRunning(true);
      addLog("Live monitoring started");
    } catch {
      setError("Camera could not start. Check camera permission.");
    }
  };

  // Stop camera
  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;

    if (videoRef.current) videoRef.current.srcObject = null;

    const canvas = canvasRef.current;
    if (canvas) {
      canvas.getContext("2d").clearRect(
        0, 0, canvas.width, canvas.height
      );
    }

    setRunning(false);
    setPeople(0);
    wasDetectedRef.current = false;
    addLog("Monitoring stopped");
  };

  // AI detection
  useEffect(() => {
    if (!running || !model) return;

    let active = true;
    let animationId;

    const detect = async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (!active) return;

      if (!video || !canvas || video.readyState < 2 || !video.videoWidth) {
        animationId = requestAnimationFrame(detect);
        return;
      }

      try {
        const predictions = await model.detect(video);
        if (!active) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const detected = predictions.filter(
          item => item.class === "person" && item.score > 0.5
        );

        detected.forEach(person => {
          const [x, y, w, h] = person.bbox;

          ctx.strokeStyle = "#22d3ee";
          ctx.lineWidth = 4;
          ctx.strokeRect(x, y, w, h);

          ctx.fillStyle = "#22d3ee";
          ctx.font = "18px Arial";
          ctx.fillText(
            `Person ${Math.round(person.score * 100)}%`,
            x,
            Math.max(y - 8, 20)
          );
        });

        setPeople(detected.length);

        // Create alert only when a person first appears
        if (detected.length > 0 && !wasDetectedRef.current) {
          wasDetectedRef.current = true;

          const alert = {
            id: Date.now(),
            message: `${detected.length} person(s) detected`,
            time: new Date().toLocaleString()
          };

          setAlerts(prev => [alert, ...prev].slice(0, 30));
          addLog(alert.message);
          playAlertSound();
        }

        if (detected.length === 0) {
          wasDetectedRef.current = false;
        }

      } catch (err) {
        console.error("Detection error:", err);
      }

      if (active) {
        animationId = requestAnimationFrame(detect);
      }
    };

    detect();

    return () => {
      active = false;
      cancelAnimationFrame(animationId);
    };
  }, [running, model]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach(track => track.stop());
      audioRef.current?.close();
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">

      <header className="flex justify-between flex-wrap gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-cyan-400">
            SAFEGUARD AI
          </h1>
          <p className="text-slate-400">
            Intelligent Security Monitoring
          </p>
        </div>

        <span className={`px-4 py-2 rounded-full ${
          running ? "bg-green-600" : "bg-red-600"
        }`}>
          {running ? "● LIVE" : "● OFFLINE"}
        </span>
      </header>

      <div className="grid md:grid-cols-3 gap-5">

        <section className="md:col-span-2 bg-slate-900 p-5 rounded-2xl">
          <h2 className="text-xl font-semibold mb-4">
            Live Camera Feed
          </h2>

          <div className="relative aspect-video bg-black rounded-xl overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-contain"
            />

            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none"
            />

            {!running && (
              <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                Camera Offline
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-3 mt-5">
            <button
              onClick={startCamera}
              disabled={running}
              className="bg-green-600 px-5 py-3 rounded-lg disabled:opacity-40"
            >
              Start Monitoring
            </button>

            <button
              onClick={stopCamera}
              disabled={!running}
              className="bg-red-600 px-5 py-3 rounded-lg disabled:opacity-40"
            >
              Stop Monitoring
            </button>
          </div>

          {error && (
            <p className="text-red-400 mt-3">{error}</p>
          )}
        </section>

        <section className="space-y-5">

          <div className="bg-slate-900 p-5 rounded-2xl">
            <h2 className="font-semibold mb-3">AI System Status</h2>
            <p className="text-slate-300">
              Camera: {running ? "Connected" : "Disconnected"}
            </p>
            <p className="text-cyan-400 mt-2">{modelStatus}</p>
          </div>

          <div className="bg-slate-900 p-5 rounded-2xl">
            <h2 className="font-semibold mb-3">People Detected</h2>
            <p className="text-5xl font-bold text-cyan-400">{people}</p>
          </div>

          <div className="bg-slate-900 p-5 rounded-2xl">
            <div className="flex justify-between items-center gap-2">
              <h2 className="font-semibold">Smart Alerts</h2>
              <button
                onClick={() => setAlerts([])}
                className="text-xs text-red-400"
              >
                Clear Alerts
              </button>
              <button
                onClick={downloadReport}
                className="bg-cyan-600 px-3 py-2 rounded-lg text-sm"
              >
  Download Report
</button>
            </div>

            <button
              onClick={enableSound}
              disabled={soundEnabled}
              className="bg-cyan-700 px-3 py-2 rounded-lg text-sm mt-3 disabled:opacity-50"
            >
              {soundEnabled ? "Sound Enabled" : "Enable Sound"}
            </button>

            <div className="mt-4 space-y-3">
              {alerts.length === 0 ? (
                <p className="text-slate-400 text-sm">
                  No alerts yet.
                </p>
              ) : alerts.map(alert => (
                <div key={alert.id} className="bg-slate-800 p-3 rounded-lg">
                  <p className="text-yellow-400 text-sm">
                    ⚠ {alert.message}
                  </p>
                  <p className="text-slate-400 text-xs mt-1">
                    {alert.time}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900 p-5 rounded-2xl">
            <h2 className="font-semibold mb-3">Activity Log</h2>
            <div className="space-y-2 text-sm text-slate-300">
              {logs.length === 0
                ? <p>No activity yet.</p>
                : logs.map((log, index) => (
                    <p key={index}>{log}</p>
                  ))}
            </div>
          </div>

        </section>
      </div>

      <footer className="text-center text-slate-500 mt-8 text-sm">
        Safeguard AI | Smart Monitoring System
      </footer>
    </div>
  );
}