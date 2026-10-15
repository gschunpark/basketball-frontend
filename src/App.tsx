import BallPhotoSetup from "./BallPhotoSetup";
import { FormEvent, useEffect, useRef, useState } from "react";

import { advanceScore, isBallMoving, isInTarget, type BallSample } from "./ballTracking";
import { brightenBallPicture, CameraBudget } from "./cameraQuality";

type Tab = "lessons" | "goals" | "streak" | "profile";
type PlayerLevel = "Beginner" | "Intermediate" | "Advanced" | "NBA";
type DominantHand = "right" | "left";

const levelUnitNumber: Record<PlayerLevel, number> = {
  Beginner: 1,
  Intermediate: 2,
  Advanced: 3,
  NBA: 4,
};

function getInitials(username: string) {
  const words = username.trim().split(/\s+/).filter(Boolean);
  if (words.length > 1) {
    return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
  }
  return username.slice(0, 2).toUpperCase() || "SS";
}

function getHandle(username: string) {
  return username.toLowerCase().trim().replace(/\s+/g, ".") || "player";
}

function SportStarLogo() {
  return (
    <div className="brand" aria-label="SportStar">
      <span className="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 48 48" role="img">
          <circle cx="24" cy="24" r="19" fill="currentColor" />
          <path
            d="M8.5 17.5c9.5 1.2 17.9 8.8 20.8 20.1M18.5 7.7c.7 8.7-2.7 16.7-10 21.3M38.6 12.3C28.8 16.1 22.1 25.2 21.3 39M10 32.8c8.1-2.6 17.6-1.7 25.8 3"
            fill="none"
            stroke="white"
            strokeLinecap="round"
            strokeWidth="2.2"
          />
          <path
            d="m37.4 3.8 1.7 3.5 3.9.6-2.8 2.7.7 3.9-3.5-1.9-3.5 1.9.7-3.9-2.8-2.7 3.9-.6 1.7-3.5Z"
            fill="white"
            stroke="currentColor"
            strokeLinejoin="round"
            strokeWidth="1.4"
          />
        </svg>
      </span>
      <span>
        Sport<span>Star</span>
      </span>
    </div>
  );
}

function Icon({ name }: { name: string }) {
  const paths: Record<string, string> = {
    lessons: "M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5v-15Zm0 15A2.5 2.5 0 0 1 6.5 18H20v3H6.5A2.5 2.5 0 0 1 4 18.5",
    goals: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-4.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Zm0-4.5 7-7",
    streak: "M13.2 2.5c.4 3.2-1.9 4.8-3.5 6.6-1.4 1.5-2.3 3-1.5 5.2.5 1.5 1.9 2.6 3.6 2.7-1-1.6-.5-3 .5-4.2.7-.8 1.4-1.6 1.5-2.8 2.1 1.7 3.4 3.7 3.4 6.1 0 3-2.3 5.4-5.2 5.4s-6.3-2.2-6.3-6.2c0-3.5 2.4-5.4 4.3-7.5 1.5-1.6 2.8-3 3.2-5.3Z",
    profile: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7 8a7 7 0 0 0-14 0",
    clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13v4.5l3 1.8",
    bolt: "m13.5 2-8 11h6L10.5 22l8-12h-6l1-8Z",
    check: "m5 12.5 4.2 4.2L19 7",
    lock: "M7 11V8a5 5 0 0 1 10 0v3m-11 0h12v10H6V11Z",
    arrow: "M5 12h14m-5-5 5 5-5 5",
    chevron: "m9 18 6-6-6-6",
    edit: "M13.5 6.5 17.5 10.5M4 20l4.5-1 10-10a2.8 2.8 0 0 0-4-4l-10 10L4 20Z",
    mail: "M3 5h18v14H3V5Zm1 1 8 7 8-7",
    calendar: "M5 3v3m14-3v3M3 9h18M4 5h16v16H4V5Z",
    trophy: "M8 4h8v4c0 3-1.8 5-4 5S8 11 8 8V4Zm0 2H4v2c0 2.2 1.8 4 4 4m8-6h4v2c0 2.2-1.8 4-4 4m-4 1v4m-4 3h8",
    camera: "M8 6.5 9.5 4h5L16 6.5h4a2 2 0 0 1 2 2V19H2V8.5a2 2 0 0 1 2-2h4ZM12 16a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z",
    reset: "M4 4v6h6M5.2 15a8 8 0 1 0 .8-8.7L4 10",
    coin: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm2.5-12c-.5-.7-1.3-1-2.5-1-1.4 0-2.5.7-2.5 1.8 0 2.8 5.5 1.2 5.5 4 0 1.2-1.2 2.2-3 2.2-1.3 0-2.3-.4-3-1.2M12 6.5v11",
  };

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d={paths[name]}
        fill={name === "streak" ? "currentColor" : "none"}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.9"
      />
    </svg>
  );
}

function EyeIcon({ hidden }: { hidden: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d={
          hidden
            ? "M3 3l18 18M10.6 10.7a2 2 0 0 0 2.7 2.7M9.9 4.3A10.8 10.8 0 0 1 12 4c5.4 0 9 5.3 9 8 0 1.1-.6 2.4-1.6 3.7M6.6 6.6C4.3 8.2 3 10.6 3 12c0 2.7 3.6 8 9 8 1.3 0 2.5-.3 3.6-.8"
            : "M3 12c0-2.7 3.6-8 9-8s9 5.3 9 8-3.6 8-9 8-9-5.3-9-8Zm9 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
        }
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

type Lesson = {
  id: string;
  number: string;
  label: string;
  title: string;
  description: string;
  duration: string;
  progress: number;
  state: "active" | "ready" | "locked";
  difficulty: string;
  coins: number;
  cameraDrill: boolean;
};

const curriculumSections = {
  Beginner: [
    {
      name: "Dribbling",
      drills: [
        "Stationary Pound Dribbles",
        "Strong & Weak Hand Control",
        "Walking with the Ball",
        "Running While Dribbling",
      ],
    },
    {
      name: "Mid-Range Shooting",
      drills: [
        "Shooting Form",
        "One-Two Step",
        "Five-Spot Shooting",
        "Basic Pull-Up",
      ],
    },
    {
      name: "Passing",
      drills: [
        "Chest Pass",
        "Bounce Pass",
        "Overhead Pass",
        "Passing on the Move",
      ],
    },
    {
      name: "Awareness",
      drills: [
        "Learn the Court",
        "Basic Spacing",
        "Scan for Teammates",
        "Transition Lanes",
      ],
    },
    {
      name: "Long-Range Shooting",
      drills: [
        "Build Your Range",
        "Power from the Legs",
        "Straight-Line Release",
        "Corner Three Basics",
      ],
    },
    {
      name: "Layups",
      drills: [
        "Right-Hand Layup",
        "Left-Hand Layup",
        "Use the Backboard",
        "Running Layups",
      ],
    },
  ],
  Intermediate: [
    {
      name: "Dribbling",
      drills: [
        "Speed Crossovers",
        "Between-the-Legs Control",
        "Crossover to Drive",
        "Combination Dribbles",
      ],
    },
    {
      name: "Mid-Range Shooting",
      drills: [
        "Dribble Pull-Up",
        "Catch-and-Shoot Footwork",
        "Turnaround Jumper",
        "Shooting over a Contest",
      ],
    },
    {
      name: "Passing",
      drills: [
        "One-Hand Push Pass",
        "Pick-and-Roll Pocket Pass",
        "Skip Pass",
        "Drive-and-Kick Reads",
      ],
    },
    {
      name: "Awareness",
      drills: [
        "Recognize Help Defense",
        "Read a Ball Screen",
        "Shot Clock Decisions",
        "Off-Ball Movement",
      ],
    },
    {
      name: "Long-Range Shooting",
      drills: [
        "Catch-and-Shoot Threes",
        "Relocation Shooting",
        "Trail Threes",
        "Rhythm Dribble Threes",
      ],
    },
    {
      name: "Layups",
      drills: [
        "Reverse Layups",
        "Euro Step",
        "Inside-Hand Finish",
        "Finishing through Contact",
      ],
    },
  ],
  Advanced: [
    {
      name: "Dribbling",
      drills: [
        "Behind-the-Back Control",
        "Behind-the-Back Crossover",
        "Double-Move Counters",
        "Pressure Escape Dribbles",
      ],
    },
    {
      name: "Mid-Range Shooting",
      drills: [
        "Step-Back Jumper",
        "Fadeaway Footwork",
        "Snake Dribble Pull-Up",
        "Shooting off Screens",
      ],
    },
    {
      name: "Passing",
      drills: [
        "Live-Dribble Passing",
        "No-Look Reads",
        "Hook Pass",
        "Transition Lead Pass",
      ],
    },
    {
      name: "Awareness",
      drills: [
        "Read Defensive Rotations",
        "Create an Advantage",
        "Pick-and-Roll Coverages",
        "Control Game Tempo",
      ],
    },
    {
      name: "Long-Range Shooting",
      drills: [
        "Off-Dribble Threes",
        "Step-Back Threes",
        "Deep-Range Control",
        "Contested Threes",
      ],
    },
    {
      name: "Layups",
      drills: [
        "Spin Finishes",
        "Wrong-Foot Layups",
        "Extended Finishes",
        "Floater Combinations",
      ],
    },
  ],
  NBA: [
    {
      name: "Dribbling",
      drills: [
        "Elite Change-of-Pace Footwork",
        "Hang Dribble Reads",
        "Advanced Counter Chains",
        "Screen-Rejection Techniques",
      ],
    },
    {
      name: "Mid-Range Shooting",
      drills: [
        "Pro-Level Shot Footwork",
        "Split-Step Pull-Up",
        "Pace Manipulation",
        "Late-Contest Reads",
      ],
    },
    {
      name: "Passing",
      drills: [
        "Defensive Manipulation",
        "Weak-Side Window Reads",
        "Short-Roll Playmaking",
        "Tight-Window Passing",
      ],
    },
    {
      name: "Awareness",
      drills: [
        "Pre-Snap Defensive Reads",
        "Matchup Hunting",
        "Possession Management",
        "Late-Game Decisions",
      ],
    },
    {
      name: "Long-Range Shooting",
      drills: [
        "Movement Threes",
        "Logo-Range Footwork",
        "Screen-Rejection Threes",
        "Quick-Release Contests",
      ],
    },
    {
      name: "Layups",
      drills: [
        "Elite Gather Footwork",
        "High-Glass Finishes",
        "Mid-Air Body Control",
        "Rim-Read Combinations",
      ],
    },
  ],
} as const;

const unitBlueprints = [
  {
    number: 1,
    title: "Beginner Foundations",
    description:
      "Build strong fundamentals with controlled, confidence-building drills.",
    level: "Beginner",
    progress: 17,
    status: "current",
    lessonsPerSection: 4,
  },
  {
    number: 2,
    title: "Intermediate Development",
    description:
      "Add speed, pressure, movement, and more difficult game situations.",
    level: "Intermediate",
    progress: 0,
    status: "locked",
    lessonsPerSection: 5,
  },
  {
    number: 3,
    title: "Advanced Performance",
    description:
      "Train complex reads and game-speed execution against tough defense.",
    level: "Advanced",
    progress: 0,
    status: "locked",
    lessonsPerSection: 6,
  },
  {
    number: 4,
    title: "NBA-Level Mastery",
    description:
      "Master professional pace, precision, decision-making, and creativity.",
    level: "NBA",
    progress: 0,
    status: "locked",
    lessonsPerSection: 8,
  },
] as const;

const units = unitBlueprints.map((unit) => ({
  ...unit,
  sections: curriculumSections[unit.level].map((section, index) => ({
    number: index + 1,
    title: `${unit.level} ${section.name}`,
    lessons: unit.lessonsPerSection,
    drills: section.drills,
  })),
}));

function createSectionLessons(
  unit: (typeof units)[number],
  section: (typeof units)[number]["sections"][number],
): Lesson[] {
  const difficultyRewards: Record<string, number> = {
    Beginner: 20,
    Intermediate: 35,
    Advanced: 50,
    NBA: 75,
  };
  const baseReward = difficultyRewards[unit.level];

  return section.drills.map((drill, index) => ({
    id: `${unit.number}-${section.number}-${index + 1}`,
    number: String(index + 1).padStart(2, "0"),
    label:
      index === 0 ? "Start here" : index === section.drills.length - 1 ? "Section challenge" : "Skill lesson",
    title: drill,
    description: `${unit.level} ${section.title.replace(`${unit.level} `, "").toLowerCase()} training focused on game-ready technique and control.`,
    duration: `${8 + index * 3} min`,
    progress: index === 0 ? 25 : 0,
    state:
      index === 0
        ? "active"
        : index === section.drills.length - 1
          ? "locked"
          : "ready",
    difficulty: unit.level,
    coins: baseReward + index * 5,
    cameraDrill:
      unit.level === "Beginner" &&
      section.title.endsWith("Dribbling") &&
      index === 0,
  }));
}

function LessonCard({
  lesson,
  onStartDrill,
  completed,
}: {
  lesson: Lesson;
  onStartDrill?: () => void;
  completed: boolean;
}) {
  return (
    <article
      className={`lesson-card ${lesson.state}${completed ? " completed" : ""}`}
    >
      <div className="lesson-card-top">
        <span className="lesson-number">{lesson.number}</span>
        <span className="lesson-reward">
          <Icon name="coin" />
          {lesson.coins} coins
        </span>
        <span className="lesson-time">
          <Icon name="clock" />
          {lesson.duration}
        </span>
      </div>
      <div className="lesson-ball" aria-hidden="true">
        <span />
        {lesson.state === "locked" ? (
          <Icon name="lock" />
        ) : lesson.progress ? (
          <span className="lesson-percent">{lesson.progress}%</span>
        ) : (
          <Icon name="bolt" />
        )}
      </div>
      <div className="lesson-label-row">
        <p className="lesson-label">{lesson.label}</p>
        <span>{lesson.difficulty}</span>
      </div>
      <h3>{lesson.title}</h3>
      <p className="lesson-description">{lesson.description}</p>
      {lesson.progress > 0 && (
        <div
          className="lesson-progress"
          aria-label={`${lesson.progress}% complete`}
        >
          <span style={{ width: `${lesson.progress}%` }} />
        </div>
      )}
      <button
        type="button"
        disabled={lesson.state === "locked" || completed}
        onClick={onStartDrill}
      >
        {completed
          ? `Completed · +${lesson.coins} coins`
          : lesson.state === "active"
          ? "Keep training"
          : lesson.state === "locked"
            ? "Complete lesson 3"
            : "Start lesson"}
        {lesson.state !== "locked" && (
          <Icon name={completed ? "check" : "arrow"} />
        )}
      </button>
    </article>
  );
}

type CameraState = "requesting" | "ready" | "denied";
type ZoneState = "searching" | "inside" | "outside";
type DrillResult = { seconds: number; goodReps: number; badReps: number };

function LessonComplete({ lesson, result, onContinue }: {
  lesson: Lesson;
  result: DrillResult;
  onContinue: () => void;
}) {
  const minutes = Math.floor(result.seconds / 60);
  const seconds = result.seconds % 60;
  const stats = [
    { label: "Time to finish", value: `${minutes}:${String(seconds).padStart(2, "0")}`, icon: "clock", color: "blue" },
    { label: "Good reps", value: lesson.cameraDrill ? result.goodReps : "—", icon: "check", color: "green" },
    { label: "Bad reps", value: lesson.cameraDrill ? result.badReps : "—", icon: "reset", color: "red" },
    { label: "Coins earned", value: `+${lesson.coins}`, icon: "coin", color: "gold" },
  ];
  return (
    <main className="completion-page">
      <section className="completion-content" aria-labelledby="completion-title">
        <div className="completion-celebration" aria-hidden="true">
          <span className="completion-spark spark-left">✦</span>
          <div className="completion-trophy"><Icon name="trophy" /></div>
          <span className="completion-spark spark-right">✦</span>
        </div>
        <p className="completion-eyebrow">Goal reached</p>
        <h1 id="completion-title">Lesson Complete!</h1>
        <p className="completion-lesson">{lesson.title}</p>
        <div className="completion-stats">
          {stats.map((stat) => <div key={stat.label} className={`completion-stat ${stat.color}`}>
            <h2>{stat.label}</h2>
            <div><Icon name={stat.icon} /><strong>{stat.value}</strong></div>
          </div>)}
        </div>
        <p className="completion-note">{lesson.cameraDrill
          ? "Each rep is one second of detected ball movement inside the green box."
          : "Rep tracking is available in the first dribbling drill."}</p>
      </section>
      <footer className="completion-footer"><button type="button" onClick={onContinue} autoFocus>Continue<Icon name="arrow" /></button></footer>
    </main>
  );
}

function CameraConsent({ onAllow, onCancel }: { onAllow: () => void; onCancel: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  return (
    <dialog ref={dialogRef} className="camera-consent" aria-labelledby="camera-consent-title" aria-describedby="camera-consent-description" onCancel={onCancel}>
      <div className="camera-consent-icon"><Icon name="camera" /></div>
      <h2 id="camera-consent-title">Allow your camera?</h2>
      <p id="camera-consent-description">See yourself live while you train. Your camera stays on this device and is not recorded. Your browser may also ask you to allow access.</p>
      <div className="camera-consent-actions">
        <button type="button" onClick={onCancel}>Not now</button>
        <button type="button" onClick={onAllow} autoFocus>Yes, allow camera</button>
      </div>
    </dialog>
  );
}

function DrillScreen({
  lesson,
  stream,
  cameraState,
  cameraError,
  onRetry,
  onExit,
  onComplete,
  reward,
  dominantHand,
}: {
  lesson: Lesson;
  stream: MediaStream | null;
  cameraState: CameraState;
  cameraError: string;
  onRetry: () => void;
  onExit: () => void;
  onComplete: (result: DrillResult) => void;
  reward: number;
  dominantHand: DominantHand;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [detectorState, setDetectorState] = useState<"loading" | "ready" | "error">("loading");
  const [detectorAttempt, setDetectorAttempt] = useState(0);
  const [phase, setPhase] = useState<"intro" | "calibrate" | "countdown" | "active">("intro");
  const phaseRef = useRef(phase);
  const [calibrationPending, setCalibrationPending] = useState(false);
  const ballWorkerRef = useRef<Worker | null>(null);
  const [countdown, setCountdown] = useState(3);
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [torchPending, setTorchPending] = useState(false);
  const [lightError, setLightError] = useState("");
  const [screenLight, setScreenLight] = useState(false);
  const [count, setCount] = useState(0);
  const repsRef = useRef({ goodReps: 0, badReps: 0 });
  const scoringResetRef = useRef(0);
  const [ballMoving, setBallMoving] = useState(false);
  const startedAtRef = useRef<number | null>(null);
  const finishedRef = useRef(false);
  const [zoneState, setZoneState] = useState<ZoneState>("searching");
  const [ballPosition, setBallPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);

  function changePhase(next: typeof phase) {
    phaseRef.current = next;
    setPhase(next);
  }

  useEffect(() => {
    const track = stream?.getVideoTracks()[0];
    const capabilities = track?.getCapabilities?.() as (MediaTrackCapabilities & { torch?: boolean }) | undefined;
    setTorchSupported(capabilities?.torch === true);
    setTorchOn(Boolean((track?.getSettings?.() as (MediaTrackSettings & { torch?: boolean }) | undefined)?.torch));
    setLightError("");
  }, [stream]);

  async function toggleFlashlight() {
    const track = stream?.getVideoTracks()[0];
    if (!track || !torchSupported || torchPending) return;
    const enabled = !torchOn;
    setTorchPending(true);
    setLightError("");
    try {
      const constraints: MediaTrackConstraints & { advanced: (MediaTrackConstraintSet & { torch: boolean })[] } = {
        ...track.getConstraints(), advanced: [{ torch: enabled }],
      };
      await track.applyConstraints(constraints);
      setTorchOn(Boolean((track.getSettings() as MediaTrackSettings & { torch?: boolean }).torch));
    } catch {
      setLightError("The camera flashlight could not be changed. Try screen light instead.");
    } finally { setTorchPending(false); }
  }

  useEffect(() => {
    if (phase === "calibrate") return;
    setScreenLight(false);
    const track = stream?.getVideoTracks()[0];
    if (track?.readyState === "live" && (track.getSettings() as MediaTrackSettings & { torch?: boolean }).torch) {
      const constraints: MediaTrackConstraints & { advanced: (MediaTrackConstraintSet & { torch: boolean })[] } = {
        ...track.getConstraints(), advanced: [{ torch: false }],
      };
      void track.applyConstraints(constraints).then(() => setTorchOn(false)).catch(() => setLightError("Turn off the flashlight using the camera controls."));
    }
  }, [phase, stream]);

  useEffect(() => {
    if (phase !== "countdown") return;
    setCountdown(3);
    let remaining = 3;
    const interval = window.setInterval(() => {
      if (document.hidden) return;
      remaining -= 1;
      if (remaining === 0) {
        window.clearInterval(interval);
        startedAtRef.current = performance.now();
        scoringResetRef.current += 1;
        changePhase("active");
      } else setCountdown(remaining);
    }, 1000);
    return () => window.clearInterval(interval);
  }, [phase]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream) return;
    video.srcObject = stream;
    video.play().catch(() => undefined);
  }, [stream]);

  function finishDrill() {
    if (finishedRef.current || phaseRef.current !== "active" || (lesson.cameraDrill && count < 15)) return;
    finishedRef.current = true;
    onComplete({
      ...repsRef.current,
      seconds: Math.floor((performance.now() - (startedAtRef.current ?? performance.now())) / 1000),
    });
  }

  useEffect(() => {
    if (lesson.cameraDrill && count >= 15) finishDrill();
  }, [count, lesson.cameraDrill]);

  useEffect(() => {
    if (!stream || !lesson.cameraDrill) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!video || !canvas || !context) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let freshnessTimer: ReturnType<typeof setTimeout> | undefined;
    const worker = new Worker(new URL("./ballDetector.worker.ts", import.meta.url), { type: "module" });
    ballWorkerRef.current = worker;
    type BallDetection = { bbox: [number, number, number, number]; score: number; id: number };
    let resolveFrame: ((balls: BallDetection[]) => void) | undefined;
    let rejectFrame: ((reason: Error) => void) | undefined;
    let lastVideoTime = -1;
    let analysisEdge = 400;
    const cameraBudget = new CameraBudget();
    let qualityChanging = false;
    let trackId: number | null = null;
    let previousY: number | null = null;
    let previousX: number | null = null;
    let samples: BallSample[] = [];
    let activeMilliseconds = 0;
    let wasActive = false;
    let scoringReset = scoringResetRef.current;
    let lastSeenAt = 0;
    setDetectorState("loading");
    setBallPosition(null);
    setZoneState("searching");

    const detectBall = async () => {
      if (cancelled || finishedRef.current) return;
      if (video.readyState < 2 || !video.clientWidth || !video.clientHeight) {
        timer = setTimeout(() => void runDetection(), 100);
        return;
      }
      if ((phaseRef.current === "intro" || phaseRef.current === "calibrate") || video.currentTime === lastVideoTime || document.hidden) {
        timer = setTimeout(() => void runDetection(), 16);
        return;
      }
      lastVideoTime = video.currentTime;
      const processingStarted = performance.now();
      // Detect the exact crop displayed by object-fit: cover, then mirror its coordinates.
      const previewRatio = video.clientWidth / video.clientHeight;
      const sourceRatio = video.videoWidth / video.videoHeight;
      const sourceWidth = sourceRatio > previewRatio
        ? video.videoHeight * previewRatio : video.videoWidth;
      const sourceHeight = sourceRatio > previewRatio
        ? video.videoHeight : video.videoWidth / previewRatio;
      canvas.width = Math.round(Math.min(sourceWidth, analysisEdge * Math.min(1, previewRatio)));
      canvas.height = Math.round(canvas.width / previewRatio);
      context.drawImage(video,
        (video.videoWidth - sourceWidth) / 2,
        (video.videoHeight - sourceHeight) / 2,
        sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);
      const frame = await createImageBitmap(canvas);
      if (cancelled || finishedRef.current) { frame.close(); return; }
      const balls = await new Promise<BallDetection[]>((resolve, reject) => {
        resolveFrame = resolve;
        rejectFrame = reject;
        worker.postMessage({ type: "frame", frame, timestamp: processingStarted }, [frame]);
      });
      if (cancelled || finishedRef.current) return;
      const preferredWidth = cameraBudget.observe(performance.now() - processingStarted, performance.now());
      const track = stream.getVideoTracks()[0];
      if (preferredWidth && track && !qualityChanging) {
        const capabilities = track.getCapabilities?.();
        const width = Math.min(preferredWidth, capabilities?.width?.max ?? preferredWidth);
        qualityChanging = true;
        void track.applyConstraints({ ...track.getConstraints(), width: { ideal: width }, height: { ideal: Math.round(width * 9 / 16) }, frameRate: { ideal: 60, max: 60 } })
          .catch(() => undefined).finally(() => { qualityChanging = false; });
      }
      // The worker follows one ball across frames and returns its stable track ID.
      clearTimeout(freshnessTimer);
      const ball = performance.now() - processingStarted <= 200 ? balls[0] : undefined;
      if (!ball) {
        setBallPosition(null);
        setZoneState("searching");
        previousY = null;
        previousX = null;
        trackId = null;
        samples = [];
        wasActive = false;
        setBallMoving(false);
        timer = setTimeout(() => void runDetection(), 0);
        return;
      }
      const normalizedX = 1 - (ball.bbox[0] + ball.bbox[2] / 2) / canvas.width;
      const normalizedY = (ball.bbox[1] + ball.bbox[3] / 2) / canvas.height;
      const now = performance.now();
      if (ball.id !== trackId || now - lastSeenAt > 500 || (previousX !== null && previousY !== null &&
        Math.hypot(normalizedX - previousX, normalizedY - previousY) > 0.35)) {
        previousY = null;
        samples = [];
        wasActive = false;
        setBallMoving(false);
      }
      const elapsed = now - lastSeenAt;
      trackId = ball.id;
      lastSeenAt = now;
      if (scoringReset !== scoringResetRef.current) {
        scoringReset = scoringResetRef.current;
        samples = [];
        activeMilliseconds = 0;
        wasActive = false;
      }
      samples = samples.filter((sample) => now - sample.at <= 350);
      samples.push({ x: normalizedX, y: normalizedY, at: now });
      const moving = isBallMoving(samples);
      const inside = isInTarget(normalizedX, normalizedY, dominantHand);
      setBallMoving(moving);

      setBallPosition({ x: normalizedX * 100, y: normalizedY * 100 });
      freshnessTimer = setTimeout(() => {
        setBallPosition(null); setBallMoving(false); setZoneState("searching");
        previousX = null; previousY = null; samples = []; wasActive = false;
      }, Math.max(0, 200 - (performance.now() - processingStarted)));
      setZoneState(inside ? "inside" : "outside");

      const active = phaseRef.current === "active" && inside && moving && !document.hidden;
      const score = advanceScore(activeMilliseconds, elapsed, active && wasActive);
      activeMilliseconds = score.milliseconds;
      wasActive = active;
      if (score.points > 0) {
        const awarded = Math.min(score.points, 15 - repsRef.current.goodReps);
        repsRef.current.goodReps += awarded;
        setCount(repsRef.current.goodReps);
      }
      previousY = normalizedY;
      previousX = normalizedX;
      timer = setTimeout(() => void runDetection(), 0);
    };

    const runDetection = async () => {
      try {
        await detectBall();
      } catch {
        if (!cancelled) {
          setDetectorState("error");
          setBallPosition(null);
          setZoneState("searching");
        }
      }
    };

    const failDetection = () => {
      if (cancelled) return;
      setDetectorState("error");
      setBallPosition(null);
      setZoneState("searching");
      setBallMoving(false);
      setCalibrationPending(false);
      rejectFrame?.(new Error("Ball detection failed"));
      resolveFrame = undefined;
      rejectFrame = undefined;
    };
    worker.onmessage = (event) => {
      if (cancelled) return;
      if (event.data.type === "ready") {
        setDetectorState("ready");
        void runDetection();

      } else if (event.data.type === "result") {
        if (Number.isFinite(event.data.analysisEdge)) analysisEdge = Math.max(320, Math.min(960, event.data.analysisEdge));
        resolveFrame?.(event.data.balls);
        resolveFrame = undefined;
        rejectFrame = undefined;
      } else if (event.data.type === "error") {
        failDetection();
      }
    };
    worker.onerror = failDetection;
    const base = new URL(import.meta.env.BASE_URL, window.location.href);
    worker.postMessage({
      type: "initialize",
      modelUrl: new URL("tensorflow/ball/model.json", base).href,
    });
    return () => {
      cancelled = true;
      clearTimeout(timer);
      clearTimeout(freshnessTimer);
      resolveFrame?.([]);
      worker.terminate();
      if (ballWorkerRef.current === worker) ballWorkerRef.current = null;
    };
  }, [stream, lesson.cameraDrill, dominantHand, detectorAttempt]);

  return (
    <main className="drill-page">
      <header className="drill-header">
        <button type="button" onClick={onExit}>
          <Icon name="chevron" />
          Exit lesson
        </button>
        <div>
          <p>{lesson.difficulty} training</p>
          <h1>{lesson.title}</h1>
        </div>
        <span className="drill-step">{phase === "active" ? "Live practice" : "Getting ready"}</span>
      </header>

      {cameraState === "ready" && stream ? (
        <div className="drill-layout">
          <section className={`camera-card ${screenLight ? "screen-light" : ""}`}>
            <div className="camera-stage">
              <video ref={videoRef} muted playsInline />
              <canvas ref={canvasRef} aria-hidden="true" />
              {lesson.cameraDrill && (phase === "active" || phase === "countdown") && <>
                <div className={`target-zone target-zone-${dominantHand}`}><span>+1</span></div>
              </>}
              {ballPosition && (
                <span
                  className="tracked-ball"
                  style={{
                    left: `${ballPosition.x}%`,
                    top: `${ballPosition.y}%`,
                  }}
                  aria-hidden="true"
                />
              )}
              {lesson.cameraDrill && phase === "active" && <div className={`detection-status ${zoneState}`}>
                <span />
                {detectorState === "loading" ? "Loading ball detection..."
                  : detectorState === "error" ? "Ball detection unavailable"
                  : zoneState === "inside"
                  ? ballMoving ? "Moving in target - scoring" : "Move the ball to score"
                  : zoneState === "outside"
                    ? "Ball outside target"
                    : "Looking for basketball"}
              </div>}
              {phase === "intro" && (
                <div className="drill-setup-overlay">
                  <div className="drill-setup-card">
                    <p>Before you begin</p>
                    <h2>{lesson.title}</h2>
                    <span>{lesson.cameraDrill
                      ? `Keep dribbling in the green area on the ${dominantHand} side of the screen. Each second of ball movement earns one rep. Your goal is 15 reps.`
                      : lesson.description}</span>
                    <button type="button" className="complete-drill" onClick={() => changePhase(lesson.cameraDrill ? "calibrate" : "countdown")}>
                      {lesson.cameraDrill ? "Set up my ball" : "Start countdown"}
                    </button>
                  </div>
                </div>
              )}
              {phase === "countdown" && (
                <div className="drill-setup-overlay countdown-overlay" role="status" aria-live="assertive">
                  <p>Step back and get ready</p>
                  <strong>{countdown}</strong>
                  <span>{lesson.cameraDrill ? `Move your ball into the green area on the ${dominantHand}.` : "Your practice is about to start."}</span>
                </div>
              )}
            </div>
            {phase === "calibrate" && (
              <section className="ball-calibration-controls">
                <div className="calibration-light-controls" role="group" aria-label="Picture lighting">
                  <button type="button" aria-pressed={torchOn} disabled={!torchSupported || torchPending || calibrationPending} onClick={() => void toggleFlashlight()}>
                    <Icon name="bolt" /> {torchPending ? "Changing light..." : torchOn ? "Flashlight on" : "Flashlight"}
                  </button>
                  <button type="button" aria-pressed={screenLight} disabled={calibrationPending} onClick={() => setScreenLight((value) => !value)}>
                    <Icon name="bolt" /> {screenLight ? "Screen light on" : "Screen light"}
                  </button>
                </div>
                {!torchSupported && <p className="lighting-hint">This camera has no flashlight control. Screen light adds a bright border to help light your ball.</p>}
                {lightError && <p role="status" className="lighting-hint">{lightError}</p>}
                <BallPhotoSetup video={videoRef.current} worker={ballWorkerRef.current} ready={detectorState === "ready" && !torchPending} onBusyChanged={setCalibrationPending} onConfirmed={() => changePhase("countdown")} />
              </section>
            )}
            {lesson.cameraDrill && detectorState === "error" && (
              <div className="camera-privacy" role="alert">
                Ball detection could not start. Check your connection and try again.
                <button type="button" className="secondary-button" onClick={() => {
                  setCalibrationPending(false);
                  changePhase("calibrate");
                  setDetectorAttempt((value) => value + 1);
                }}>Retry ball detection</button>
              </div>
            )}
            <p className="camera-privacy">
              Camera processing stays on this device and is not recorded.
            </p>
            <p className="ball-visibility-warning"><Icon name="camera" /><span><strong>Keep the ball on screen the entire time.</strong> Keep it fully inside the camera view while setting up and dribbling.</span></p>
          </section>

          <aside className="drill-sidebar">
            {lesson.cameraDrill ? <>
            <section className={`dribble-counter ${zoneState}`}>
              <p>Dribble score</p>
              <strong>{count}</strong>
              <span>Goal: 15 reps</span>
              <div>
                <span style={{ width: `${Math.max(0, Math.min((count / 15) * 100, 100))}%` }} />
              </div>
            </section>

            <section className="drill-instructions">
              <p>How it works</p>
              <ol>
                <li>
                  <span>1</span>
                  Place your full body and ball in view.
                </li>
                <li>
                  <span>2</span>
                  Keep the basketball in the green rectangle.
                </li>
                <li>
                  <span>3</span>
                  Every second the detected ball is moving inside the green box earns 1 rep. Reach 15 reps to finish.
                </li>
              </ol>
            </section>

            <button
              type="button"
              className="complete-drill"
              disabled={phase !== "active" || count < 15}
              onClick={finishDrill}
            >
              <Icon name={count >= 15 ? "coin" : "lock"} />
              {count >= 15
                ? `Complete lesson · +${reward} coins`
                : `${15 - count} points until reward`}
            </button>

            <button
              type="button"
              className="reset-counter"
              disabled={phase !== "active"}
              onClick={() => {
                scoringResetRef.current += 1;
                setCount(0);
                repsRef.current = { goodReps: 0, badReps: 0 };
                startedAtRef.current = performance.now();
              }}
            >
              <Icon name="reset" />
              Reset counter
            </button>
            {phase === "active" && <button type="button" className="reset-counter" onClick={() => {
              scoringResetRef.current += 1;
              changePhase("calibrate");
            }}>Recalibrate ball</button>}
            </> : <>
              <section className="drill-instructions">
                <p>Your practice</p>
                <h2>{lesson.title}</h2>
                <p>{lesson.description}</p>
                <p>Keep yourself in view and use the live preview to check your technique.</p>
              </section>
              <button type="button" className="complete-drill" disabled={phase !== "active"} onClick={finishDrill}>Finish practice · +{reward} coins</button>
            </>}
          </aside>
        </div>
      ) : (
        <section className="camera-permission">
          <span>
            <Icon name="camera" />
          </span>
          <p>Camera access</p>
          <h2>
            {cameraState === "requesting"
              ? "Allow your camera to begin"
              : "We couldn’t access your camera"}
          </h2>
          <p>
            {cameraState === "requesting"
              ? "Use the browser prompt to allow access. SportStar needs the camera to follow the basketball during this drill."
              : cameraError}
          </p>
          {cameraState === "requesting" ? (
            <div className="permission-loader" aria-label="Waiting for permission" />
          ) : (
            <button type="button" onClick={onRetry}>
              <Icon name="camera" />
              Try camera again
            </button>
          )}
        </section>
      )}
    </main>
  );
}

function UnitsView({
  onBack,
  onSelectSection,
  currentUnitNumber,
}: {
  onBack: () => void;
  onSelectSection: (unitNumber: number, sectionNumber: number) => void;
  currentUnitNumber: number;
}) {
  const [expandedUnit, setExpandedUnit] = useState<number | null>(
    currentUnitNumber,
  );

  return (
    <section className="units-view">
      <button type="button" className="units-back" onClick={onBack}>
        <Icon name="chevron" />
        Back to training
      </button>
      <div className="units-heading">
        <p>SportStar curriculum</p>
        <h1>Build your complete game.</h1>
        <span>
          Progress through four levels, from beginner fundamentals to
          NBA-level skill and decision-making.
        </span>
      </div>
      <div className="units-list">
        {units.map((unit) => {
          const expanded = expandedUnit === unit.number;
          const unlocked = unit.number <= currentUnitNumber;
          const current = unit.number === currentUnitNumber;
          const status = current ? "current" : unlocked ? "ready" : "locked";
          return (
          <article
            key={unit.number}
            className={`unit-card unit-${status}${expanded ? " expanded" : ""}`}
          >
            <div className="unit-card-number">
              <span>Unit</span>
              {String(unit.number).padStart(2, "0")}
            </div>
            <div className="unit-card-copy">
              <div className="unit-meta">
                <span>{unit.level}</span>
                <span>{unit.sections.length} sections</span>
              </div>
              <h2>{unit.title}</h2>
              <p>{unit.description}</p>
              {current && (
                <div className="unit-card-progress">
                  <span style={{ width: `${unit.progress}%` }} />
                </div>
              )}
            </div>
            <button
              type="button"
              className="unit-expand-button"
              onClick={() => setExpandedUnit(expanded ? null : unit.number)}
              aria-expanded={expanded}
            >
              {expanded ? "Hide sections" : "View sections"}
              <Icon name="chevron" />
            </button>
            {expanded && (
              <div className="unit-sections-panel">
                <div className="unit-sections-heading">
                  <span>{unit.level} curriculum</span>
                  <strong>
                    {unit.sections.length * unit.lessonsPerSection} total
                    lessons
                  </strong>
                </div>
                <div className="unit-section-grid">
                  {unit.sections.map((section) => (
                    <button
                      type="button"
                      key={section.number}
                      disabled={!unlocked}
                      onClick={
                        unlocked
                          ? () => onSelectSection(unit.number, section.number)
                          : undefined
                      }
                    >
                      <span className="unit-section-number">
                        {String(section.number).padStart(2, "0")}
                      </span>
                      <span>
                        <strong>{section.title}</strong>
                        <small>{section.lessons} lessons</small>
                        <span className="unit-drill-list">
                          {section.drills.map((drill) => (
                            <em key={drill}>{drill}</em>
                          ))}
                        </span>
                      </span>
                      <Icon
                        name={unlocked ? "arrow" : "lock"}
                      />
                    </button>
                  ))}
                </div>
                {!unlocked && (
                  <p className="unit-lock-note">
                    <Icon name="lock" />
                    Complete the previous unit to unlock these lessons.
                  </p>
                )}
                {unlocked && (
                  <button
                    type="button"
                    className="unit-continue-button"
                    onClick={onBack}
                  >
                    Open {unit.level.toLowerCase()} training
                    <Icon name="arrow" />
                  </button>
                )}
              </div>
            )}
          </article>
          );
        })}
      </div>
    </section>
  );
}

const goalPool = [
  {
    icon: "lessons",
    title: "Complete 2 lessons",
    description: "Any lesson in your current unit counts.",
    current: 1,
    total: 2,
    value: "1 / 2",
    action: "Continue",
  },
  {
    icon: "clock",
    title: "Practice for 30 minutes",
    description: "Lesson and free-practice time both count.",
    current: 18,
    total: 30,
    value: "18 / 30 min",
    action: "Practice",
  },
  {
    icon: "goals",
    title: "Finish a ball-control lesson",
    description: "Complete one focused skill session.",
    current: 0,
    total: 1,
    value: "0 / 1",
    action: "Start",
  },
  {
    icon: "check",
    title: "Score 80% on a lesson",
    description: "Accuracy matters more than speed today.",
    current: 0,
    total: 1,
    value: "0 / 1",
    action: "Try now",
  },
  {
    icon: "clock",
    title: "Train your weak hand for 15 minutes",
    description: "Use focused dribbling or finishing practice.",
    current: 5,
    total: 15,
    value: "5 / 15 min",
    action: "Practice",
  },
  {
    icon: "goals",
    title: "Complete a perfect lesson",
    description: "Finish a lesson without missing a drill.",
    current: 0,
    total: 1,
    value: "0 / 1",
    action: "Start",
  },
  {
    icon: "streak",
    title: "Train in 2 separate sessions",
    description: "A short morning and evening session both count.",
    current: 1,
    total: 2,
    value: "1 / 2",
    action: "Continue",
  },
];

function GoalsView({
  onTrain,
  onOpenStreak,
}: {
  onTrain: () => void;
  onOpenStreak: () => void;
}) {
  const today = new Date();
  const dayIndex = today.getDay();
  const dailyGoals = [0, 2, 4].map(
    (offset) => goalPool[(dayIndex + offset) % goalPool.length],
  );
  const dateLabel = today.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  return (
    <section className="goals-view">
      <div className="goals-heading">
        <div>
          <p>Make every session count</p>
          <h1>Your goals</h1>
          <span>
            Complete lessons and log practice time to build consistency.
          </span>
        </div>
        <div className="goal-reset">
          <Icon name="clock" />
          <span>
            Daily goals reset in
            <strong>12 hours</strong>
          </span>
        </div>
      </div>

      <button
        type="button"
        className="goals-streak-card"
        onClick={onOpenStreak}
      >
        <span className="goals-streak-icon">
          <Icon name="streak" />
          <strong>7</strong>
        </span>
        <span className="goals-streak-copy">
          <small>Your current streak</small>
          <strong>7 days in a row</strong>
          <span>Complete a lesson today to keep it going.</span>
        </span>
        <span className="goals-streak-action">
          View streak
          <Icon name="arrow" />
        </span>
      </button>

      <section className="weekly-challenge">
        <div className="challenge-top">
          <div>
            <span className="challenge-label">This week</span>
            <h2>Consistency Challenge</h2>
            <p>Complete 5 training sessions before Sunday.</p>
          </div>
          <div className="challenge-medal" aria-hidden="true">
            <Icon name="streak" />
          </div>
        </div>
        <div className="challenge-progress-copy">
          <strong>3 of 5 sessions</strong>
          <span>60% complete</span>
        </div>
        <div className="challenge-progress" aria-label="60% complete">
          <span />
        </div>
        <div className="challenge-days" aria-hidden="true">
          {["M", "T", "W", "T", "F"].map((day, index) => (
            <span key={`${day}-${index}`} className={index < 3 ? "done" : ""}>
              {index < 3 ? <Icon name="check" /> : day}
            </span>
          ))}
        </div>
      </section>

      <div className="daily-goals-heading">
        <div>
          <p>{dateLabel}</p>
          <h2>Daily goals</h2>
        </div>
        <span>New basketball goals are selected every day</span>
      </div>

      <div className="goal-list">
        {dailyGoals.map((goal) => {
          const progress = (goal.current / goal.total) * 100;
          return (
            <article className="goal-card" key={goal.title}>
              <div className={`goal-card-icon ${goal.icon}`}>
                <Icon name={goal.icon} />
              </div>
              <div className="goal-card-content">
                <div className="goal-card-title">
                  <div>
                    <h3>{goal.title}</h3>
                    <p>{goal.description}</p>
                  </div>
                  <strong>{goal.value}</strong>
                </div>
                <div
                  className="goal-card-progress"
                  aria-label={`${Math.round(progress)}% complete`}
                >
                  <span style={{ width: `${progress}%` }} />
                </div>
              </div>
              <button type="button" onClick={onTrain}>
                {goal.action}
                <Icon name="arrow" />
              </button>
            </article>
          );
        })}
      </div>

      <div className="practice-note">
        <span>
          <Icon name="bolt" />
        </span>
        <div>
          <strong>How practice time works</strong>
          <p>
            Time spent in lessons and skill practice automatically moves your
            daily goal forward.
          </p>
        </div>
      </div>
    </section>
  );
}

function StreakView({ onTrain }: { onTrain: () => void }) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = new Date(year, month, 1).getDay();
  const monthLabel = today.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const streakDays = new Set<number>();

  for (let offset = 0; offset < 7; offset += 1) {
    const date = new Date(year, month, today.getDate() - offset);
    if (date.getMonth() === month) streakDays.add(date.getDate());
  }

  const calendarDays: Array<number | null> = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];

  return (
    <section className="streak-view">
      <div className="streak-hero">
        <div>
          <p>Current streak</p>
          <div className="streak-count">
            <strong>7</strong>
            <span>days in a row</span>
          </div>
          <p className="streak-message">
            Complete one lesson today to keep your streak alive.
          </p>
          <button type="button" onClick={onTrain}>
            Do today’s lesson
            <Icon name="arrow" />
          </button>
        </div>
        <div className="streak-flame" aria-hidden="true">
          <Icon name="streak" />
          <span>7</span>
        </div>
      </div>

      <div className="streak-layout">
        <section className="streak-calendar-card">
          <div className="calendar-heading">
            <div>
              <p>Lesson activity</p>
              <h2>{monthLabel}</h2>
            </div>
            <div className="calendar-key">
              <span />
              Lesson completed
            </div>
          </div>
          <div className="calendar-weekdays" aria-hidden="true">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="calendar-grid" aria-label={`${monthLabel} calendar`}>
            {calendarDays.map((day, index) =>
              day === null ? (
                <span className="calendar-empty" key={`empty-${index}`} />
              ) : (
                <span
                  key={day}
                  className={[
                    streakDays.has(day) ? "practiced" : "",
                    day === today.getDate() ? "today" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  aria-label={`${monthLabel} ${day}${streakDays.has(day) ? ", lesson completed" : ""}`}
                >
                  {streakDays.has(day) && <Icon name="check" />}
                  <b>{day}</b>
                </span>
              ),
            )}
          </div>
        </section>

        <aside className="streak-sidebar">
          <div className="streak-stat-grid">
            <div>
              <span>Longest streak</span>
              <strong>14 days</strong>
            </div>
            <div>
              <span>Lessons this month</span>
              <strong>{streakDays.size + 3}</strong>
            </div>
          </div>

          <section className="streak-milestone">
            <div className="milestone-heading">
              <span>
                <Icon name="goals" />
              </span>
              <div>
                <p>Next milestone</p>
                <h3>Two-week streak</h3>
              </div>
              <strong>7 / 14</strong>
            </div>
            <div className="milestone-progress">
              <span />
            </div>
            <p>Train for 7 more days to earn the Consistent Player badge.</p>
          </section>

          <section className="streak-protection">
            <span>
              <Icon name="bolt" />
            </span>
            <div>
              <h3>Streak protection</h3>
              <p>Complete today’s lesson before midnight.</p>
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}

const achievements = [
  {
    icon: "streak",
    title: "On Fire",
    description: "Reach a 14-day training streak",
    current: 7,
    total: 14,
    label: "7 / 14 days",
    tone: "orange",
  },
  {
    icon: "lessons",
    title: "Fundamentals First",
    description: "Complete every lesson in Unit 1",
    current: 3,
    total: 4,
    label: "3 / 4 lessons",
    tone: "blue",
  },
  {
    icon: "trophy",
    title: "Dedicated Player",
    description: "Log 300 total practice minutes",
    current: 210,
    total: 300,
    label: "210 / 300 min",
    tone: "gold",
  },
];

function ProfileView({
  username,
  onUsernameChange,
  profileImage,
  onProfileImageChange,
  coins,
  playerLevel,
  dominantHand,
  onDominantHandChange,
}: {
  username: string;
  onUsernameChange: (username: string) => void;
  profileImage: string | null;
  onProfileImageChange: (file: File) => void;
  coins: number;
  playerLevel: PlayerLevel;
  dominantHand: DominantHand;
  onDominantHandChange: (hand: DominantHand) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draftUsername, setDraftUsername] = useState(username);
  const [draftDominantHand, setDraftDominantHand] = useState(dominantHand);
  const [profileImageError, setProfileImageError] = useState("");
  const profileImageInput = useRef<HTMLInputElement>(null);

  function handleEditProfile() {
    if (editing) {
      const nextUsername = draftUsername.trim();
      if (!nextUsername) return;
      onUsernameChange(nextUsername);
      onDominantHandChange(draftDominantHand);
    } else {
      setDraftUsername(username);
      setDraftDominantHand(dominantHand);
    }
    setEditing((value) => !value);
  }

  return (
    <section className="profile-view">
      <section className="profile-hero">
        <div className="profile-cover" aria-hidden="true">
          <span className="profile-cover-ball" />
        </div>
        <button
          type="button"
          className="profile-edit"
          onClick={handleEditProfile}
          disabled={editing && !draftUsername.trim()}
        >
          <Icon name={editing ? "check" : "edit"} />
          {editing ? "Save profile" : "Edit profile"}
        </button>
        <div className="profile-identity">
          {editing && (
            <input
              ref={profileImageInput}
              className="profile-image-input"
              type="file"
              accept="image/*"
              aria-label="Choose a profile picture"
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                if (!file) return;
                if (!file.type.startsWith("image/")) {
                  setProfileImageError("Choose an image file to upload.");
                  event.currentTarget.value = "";
                  return;
                }
                setProfileImageError("");
                onProfileImageChange(file);
                event.currentTarget.value = "";
              }}
            />
          )}
          {editing ? (
            <button
              type="button"
              className="profile-avatar profile-avatar-edit"
              aria-label="Upload profile picture"
              onClick={() => profileImageInput.current?.click()}
            >
              {profileImage ? (
                <img src={profileImage} alt="Profile" />
              ) : (
                <span>{getInitials(draftUsername)}</span>
              )}
              <i>
                <Icon name="edit" />
              </i>
            </button>
          ) : (
            <div className="profile-avatar" aria-label={`${username} avatar`}>
              {profileImage ? (
                <img src={profileImage} alt={`${username} profile`} />
              ) : (
                <span>{getInitials(username)}</span>
              )}
              <i>
                <Icon name="check" />
              </i>
            </div>
          )}
          <div>
            {editing ? (
              <>
                <input
                  className="profile-name-input"
                  aria-label="Username"
                  value={draftUsername}
                  onChange={(event) => setDraftUsername(event.target.value)}
                  autoFocus
                />
                <p className="profile-edit-hint">
                  Click your photo to upload a profile picture. This name
                  appears throughout SportStar.
                </p>
                {profileImageError && (
                  <p className="profile-image-error" role="alert">
                    {profileImageError}
                  </p>
                )}
              </>
            ) : (
              <>
                <h1>{username}</h1>
                <p>@{getHandle(username)}</p>
              </>
            )}
            <div className="profile-tags">
              <span>Point guard</span>
              <span>{playerLevel}</span>
              <span>Joined 2025</span>
            </div>
          </div>
        </div>
      </section>

      <section className="profile-stats" aria-label="Player statistics">
        <div>
          <span className="profile-stat-icon fire">
            <Icon name="streak" />
          </span>
          <p>Current streak</p>
          <strong>7 days</strong>
        </div>
        <div>
          <span className="profile-stat-icon">
            <Icon name="clock" />
          </span>
          <p>Practice time</p>
          <strong>210 min</strong>
        </div>
        <div>
          <span className="profile-stat-icon">
            <Icon name="lessons" />
          </span>
          <p>Lessons done</p>
          <strong>18</strong>
        </div>
        <div>
          <span className="profile-stat-icon coins">
            <Icon name="coin" />
          </span>
          <p>Coin balance</p>
          <strong>{coins.toLocaleString()} coins</strong>
        </div>
      </section>

      <div className="profile-grid">
        <section className="account-card">
          <div className="profile-section-heading">
            <div>
              <p>Your information</p>
              <h2>Account details</h2>
            </div>
          </div>
          <div className="account-rows">
            <div>
              <span className="account-row-icon">
                <Icon name="mail" />
              </span>
              <span>
                <small>Email address</small>
                <strong>jordan.smith@example.com</strong>
              </span>
            </div>
            <div>
              <span className="account-row-icon">
                <Icon name="calendar" />
              </span>
              <span>
                <small>Member since</small>
                <strong>August 2025</strong>
              </span>
            </div>
            <div>
              <span className="account-row-icon">
                <Icon name="goals" />
              </span>
              <span>
                <small>Primary goal</small>
                <strong>Make the school team</strong>
              </span>
            </div>
            <div>
              <span className="account-row-icon">
                <Icon name="profile" />
              </span>
              <span>
                <small>Experience level</small>
                <strong>{playerLevel} player</strong>
              </span>
            </div>
            <div>
              <span className="account-row-icon">
                <Icon name="profile" />
              </span>
              <span>
                <small id="dominant-hand-label">Dominant hand</small>
                {editing ? (
                  <select
                    className="profile-hand-select"
                    aria-labelledby="dominant-hand-label"
                    value={draftDominantHand}
                    onChange={(event) => setDraftDominantHand(event.target.value as DominantHand)}
                  >
                    <option value="right">Right-handed</option>
                    <option value="left">Left-handed</option>
                  </select>
                ) : (
                  <strong>{dominantHand === "right" ? "Right-handed" : "Left-handed"}</strong>
                )}
                <small>
                  Drill target: {(editing ? draftDominantHand : dominantHand) === "right" ? "right" : "left"} side of the screen
                </small>
              </span>
            </div>
          </div>
        </section>

        <section className="achievements-card">
          <div className="profile-section-heading">
            <div>
              <p>Milestones</p>
              <h2>Achievements</h2>
            </div>
            <span>3 in progress</span>
          </div>
          <div className="achievement-list">
            {achievements.map((achievement) => (
              <article key={achievement.title}>
                <div className={`achievement-badge ${achievement.tone}`}>
                  <Icon name={achievement.icon} />
                </div>
                <div className="achievement-copy">
                  <div>
                    <h3>{achievement.title}</h3>
                    <strong>{achievement.label}</strong>
                  </div>
                  <p>{achievement.description}</p>
                  <div
                    className="achievement-progress"
                    aria-label={`${Math.round((achievement.current / achievement.total) * 100)}% complete`}
                  >
                    <span
                      style={{
                        width: `${(achievement.current / achievement.total) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}

const assessmentQuestions = [
  {
    question: "Which hand is your dominant hand?",
    helper: "We will position the drill target to match your dominant hand.",
    options: [
      { label: "Right-handed", detail: "The target will be on the right of the screen.", score: 0 },
      { label: "Left-handed", detail: "The target will be on the left of the screen.", score: 1 },
    ],
  },
  {
    question: "How much organized basketball have you played?",
    helper: "Choose the answer that best matches your experience.",
    options: [
      { label: "I’m brand new", detail: "I’m learning the rules and basics.", score: 0 },
      { label: "Mostly casual games", detail: "I play for fun and know the fundamentals.", score: 1 },
      { label: "Team experience", detail: "I’ve played organized or competitive basketball.", score: 2 },
      { label: "High-level competition", detail: "I train and compete at an elite pace.", score: 3 },
    ],
  },
  {
    question: "Which dribbling skills can you use under pressure?",
    helper: "Think about what you can perform consistently in a game.",
    options: [
      { label: "Basic control", detail: "Stationary and running dribbles.", score: 0 },
      { label: "Crossovers", detail: "Crossovers and between-the-legs moves.", score: 1 },
      { label: "Advanced counters", detail: "Behind-the-back and combination moves.", score: 2 },
      { label: "Pro-level creation", detail: "Footwork, pace, and chained counters.", score: 3 },
    ],
  },
  {
    question: "How advanced is your shooting and decision-making?",
    helper: "Select the level you can perform at game speed.",
    options: [
      { label: "Learning technique", detail: "Form shooting, layups, and basic reads.", score: 0 },
      { label: "Reliable fundamentals", detail: "Mid-range shots and simple game reads.", score: 1 },
      { label: "Difficult shot maker", detail: "Off-dribble shots and advanced reads.", score: 2 },
      { label: "Professional pace", detail: "Deep range, elite footwork, and fast decisions.", score: 3 },
    ],
  },
] as const;

function getPlacementLevel(score: number): PlayerLevel {
  if (score <= 2) return "Beginner";
  if (score <= 5) return "Intermediate";
  if (score <= 7) return "Advanced";
  return "NBA";
}

function OnboardingAssessment({
  username,
  onComplete,
  onBack,
}: {
  username: string;
  onComplete: (level: PlayerLevel, hand: DominantHand) => void;
  onBack: () => void;
}) {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [result, setResult] = useState<PlayerLevel | null>(null);
  const question = assessmentQuestions[questionIndex];
  const selectedScore = answers[questionIndex];

  function chooseAnswer(score: number) {
    setAnswers((current) => {
      const next = [...current];
      next[questionIndex] = score;
      return next;
    });
  }

  function continueAssessment() {
    if (selectedScore === undefined) return;
    if (questionIndex < assessmentQuestions.length - 1) {
      setQuestionIndex((current) => current + 1);
      return;
    }
    const total = answers.slice(1).reduce((sum, score) => sum + (score ?? 0), 0);
    setResult(getPlacementLevel(total));
  }

  if (result) {
    return (
      <main className="assessment-page">
        <section className="assessment-result">
          <span className="assessment-result-icon">
            <Icon name="trophy" />
          </span>
          <p>Your SportStar placement</p>
          <h1>{result}</h1>
          <span>
            {username}, your answers place you in the {result} unit. You’ll
            still have access to every earlier unit for review.
          </span>
          <div className="assessment-result-details">
            <div>
              <small>Starting unit</small>
              <strong>Unit {levelUnitNumber[result]}</strong>
            </div>
            <div>
              <small>First section</small>
              <strong>{result} Dribbling</strong>
            </div>
          </div>
          <button type="button" onClick={() => onComplete(result, answers[0] === 1 ? "left" : "right")}>
            Start my training
            <Icon name="arrow" />
          </button>
          <button
            type="button"
            className="assessment-retake"
            onClick={() => {
              setAnswers([]);
              setQuestionIndex(0);
              setResult(null);
            }}
          >
            Retake assessment
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="assessment-page">
      <header className="assessment-header">
        <SportStarLogo />
        <button type="button" onClick={onBack}>
          Back to account
        </button>
      </header>
      <section className="assessment-card">
        <div className="assessment-progress-copy">
          <span>
            Question {questionIndex + 1} of {assessmentQuestions.length}
          </span>
          <strong>Find your starting level</strong>
        </div>
        <div className="assessment-progress">
          <span
            style={{
              width: `${((questionIndex + 1) / assessmentQuestions.length) * 100}%`,
            }}
          />
        </div>
        <div className="assessment-copy">
          <p>Player assessment</p>
          <h1>{question.question}</h1>
          <span>{question.helper}</span>
        </div>
        <div className="assessment-options">
          {question.options.map((option) => (
            <button
              type="button"
              key={option.label}
              className={selectedScore === option.score ? "selected" : ""}
              onClick={() => chooseAnswer(option.score)}
            >
              <span>
                <strong>{option.label}</strong>
                <small>{option.detail}</small>
              </span>
              <i>{selectedScore === option.score && <Icon name="check" />}</i>
            </button>
          ))}
        </div>
        <div className="assessment-actions">
          <button
            type="button"
            disabled={questionIndex === 0}
            onClick={() => setQuestionIndex((current) => current - 1)}
          >
            Previous
          </button>
          <button
            type="button"
            disabled={selectedScore === undefined}
            onClick={continueAssessment}
          >
            {questionIndex === assessmentQuestions.length - 1
              ? "See my placement"
              : "Continue"}
            <Icon name="arrow" />
          </button>
        </div>
      </section>
    </main>
  );
}

function HomeScreen({
  username,
  onUsernameChange,
  playerLevel,
  dominantHand,
  onDominantHandChange,
}: {
  username: string;
  onUsernameChange: (username: string) => void;
  playerLevel: PlayerLevel;
  dominantHand: DominantHand;
  onDominantHandChange: (hand: DominantHand) => void;
}) {
  const [activeTab, setActiveTab] = useState<Tab>("lessons");
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [showUnits, setShowUnits] = useState(false);
  const [selectedUnitNumber, setSelectedUnitNumber] = useState(
    levelUnitNumber[playerLevel],
  );
  const [selectedSectionNumber, setSelectedSectionNumber] = useState(1);
  const [drillOpen, setDrillOpen] = useState(false);
  const [completion, setCompletion] = useState<{ lesson: Lesson; result: DrillResult } | null>(null);
  const [pendingLesson, setPendingLesson] = useState<Lesson | null>(null);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [coins, setCoins] = useState(0);
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraState, setCameraState] =
    useState<CameraState>("requesting");
  const [cameraError, setCameraError] = useState("");
  const lessonTrack = useRef<HTMLDivElement>(null);
  const cameraRequest = useRef(0);
  const selectedUnit =
    units.find((unit) => unit.number === selectedUnitNumber) ?? units[0];
  const selectedSection =
    selectedUnit.sections.find(
      (section) => section.number === selectedSectionNumber,
    ) ?? selectedUnit.sections[0];
  const lessons = createSectionLessons(selectedUnit, selectedSection);

  useEffect(() => {
    return () => {
      if (profileImage) URL.revokeObjectURL(profileImage);
    };
  }, [profileImage]);

  function updateProfileImage(file: File) {
    setProfileImage(URL.createObjectURL(file));
  }

  function moveLessons(direction: number) {
    lessonTrack.current?.scrollBy({ left: direction * 330, behavior: "smooth" });
  }

  async function startDrill() {
    if (pendingLesson) setActiveLesson(pendingLesson);
    setPendingLesson(null);
    const requestId = cameraRequest.current + 1;
    cameraRequest.current = requestId;
    setDrillOpen(true);
    setCameraState("requesting");
    setCameraError("");

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraState("denied");
      setCameraError(
        "Camera access is not supported in this browser. Try opening SportStar in a modern browser with camera permissions enabled.",
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "user" },
          width: { ideal: 3840 },
          height: { ideal: 2160 },
          frameRate: { ideal: 60, max: 60 },
        },
        audio: false,
      });

      if (requestId !== cameraRequest.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      setCameraStream(stream);
      setCameraState("ready");
    } catch (error) {
      if (requestId !== cameraRequest.current) return;
      setCameraState("denied");
      setCameraError(
        error instanceof DOMException && error.name === "NotFoundError"
          ? "No camera was found. Connect a camera, then try again."
          : error instanceof DOMException && error.name === "NotReadableError"
            ? "Your camera is unavailable. Close other apps using it, then try again."
            : "Camera access was blocked. Allow camera access in your browser settings, then try again.",
      );
    }
  }

  function exitDrill() {
    cameraRequest.current += 1;
    cameraStream?.getTracks().forEach((track) => track.stop());
    setCameraStream(null);
    setDrillOpen(false);
  }

  function completeLesson(lesson: Lesson) {
    if (completedLessons.includes(lesson.id)) return;
    setCompletedLessons((current) => [...current, lesson.id]);
    setCoins((current) => current + lesson.coins);
  }

  function completeDrill(result: DrillResult) {
    if (activeLesson) {
      completeLesson(activeLesson);
      setCompletion({ lesson: activeLesson, result });
    }
    exitDrill();
  }

  function selectSection(unitNumber: number, sectionNumber: number) {
    setSelectedUnitNumber(unitNumber);
    setSelectedSectionNumber(sectionNumber);
    setShowUnits(false);
  }

  useEffect(() => {
    return () => {
      cameraStream?.getTracks().forEach((track) => track.stop());
    };
  }, [cameraStream]);

  if (completion) {
    return <LessonComplete lesson={completion.lesson} result={completion.result} onContinue={() => setCompletion(null)} />;
  }

  if (drillOpen && activeLesson) {
    return (
      <DrillScreen
        dominantHand={dominantHand}
        lesson={activeLesson}
        stream={cameraStream}
        cameraState={cameraState}
        cameraError={cameraError}
        onRetry={startDrill}
        onExit={exitDrill}
        onComplete={completeDrill}
        reward={activeLesson.coins}
      />
    );
  }

  return (
    <main className="home-page">
      {pendingLesson && <CameraConsent onAllow={startDrill} onCancel={() => setPendingLesson(null)} />}
      <header className="home-header">
        <div className="home-brand">
          <SportStarLogo />
        </div>
        <div className="header-stats">
          <div>
            <span className="avatar">{getInitials(username)}</span>
            <span>
              <strong>{username}</strong>
              {playerLevel} player
            </span>
          </div>
        </div>
      </header>

      <div className="home-content">
        {activeTab === "lessons" ? (
          showUnits ? (
            <UnitsView
              onBack={() => setShowUnits(false)}
              onSelectSection={selectSection}
              currentUnitNumber={levelUnitNumber[playerLevel]}
            />
          ) : (
            <>
            <section className="welcome-row">
              <div>
                <p className="home-eyebrow">Today’s training</p>
                <h1>Hi, {username}.</h1>
                <p>Keep your rhythm going with the next lesson in your plan.</p>
              </div>
              <div className="weekly-goal">
                <div className="goal-ring">
                  <span>3</span>
                  <small>/ 5</small>
                </div>
                <div>
                  <strong>Weekly goal</strong>
                  <span>Two sessions to go</span>
                </div>
              </div>
            </section>

            <button
              type="button"
              className="unit-banner"
              onClick={() => setShowUnits(true)}
            >
              <div className="unit-icon" aria-hidden="true">
                <span className="mini-ball" />
              </div>
              <div>
                <p>
                  Units · Unit {selectedUnit.number} · {selectedUnit.level}
                </p>
                <h2>{selectedUnit.title}</h2>
                <span>
                  Section: {selectedSection.title.replace(`${selectedUnit.level} `, "")}
                  {" · "}
                  {selectedSection.drills.length} lessons
                </span>
              </div>
              <div className="unit-progress">
                <strong>{selectedUnit.progress}%</strong>
                <span>View all units</span>
              </div>
            </button>

            <section className="lesson-section">
              <div className="section-heading">
                <div>
                  <p>
                    {selectedSection.title.replace(`${selectedUnit.level} `, "")}
                  </p>
                  <h2>{selectedSection.title} lessons</h2>
                </div>
                <div className="carousel-controls">
                  <button
                    type="button"
                    aria-label="Previous lessons"
                    onClick={() => moveLessons(-1)}
                  >
                    <Icon name="chevron" />
                  </button>
                  <button
                    type="button"
                    aria-label="Next lessons"
                    onClick={() => moveLessons(1)}
                  >
                    <Icon name="chevron" />
                  </button>
                </div>
              </div>
              <div className="lesson-track" ref={lessonTrack}>
                {lessons.map((lesson) => (
                  <LessonCard
                    key={lesson.id}
                    lesson={lesson}
                    onStartDrill={() => setPendingLesson(lesson)}
                    completed={completedLessons.includes(lesson.id)}
                  />
                ))}
              </div>
            </section>
            </>
          )
        ) : activeTab === "goals" ? (
          <GoalsView
            onTrain={() => setActiveTab("lessons")}
            onOpenStreak={() => setActiveTab("streak")}
          />
        ) : activeTab === "streak" ? (
          <StreakView onTrain={() => setActiveTab("lessons")} />
        ) : activeTab === "profile" ? (
          <ProfileView
            dominantHand={dominantHand}
            onDominantHandChange={onDominantHandChange}
            username={username}
            onUsernameChange={onUsernameChange}
            profileImage={profileImage}
            onProfileImageChange={updateProfileImage}
            coins={coins}
            playerLevel={playerLevel}
          />
        ) : (
          <section className="placeholder-section">
            <div className="placeholder-icon">
              <Icon name={activeTab} />
            </div>
            <p>SportStar</p>
            <h1>
              {activeTab === "goals"
                ? "Your personal goals"
                : activeTab === "streak"
                  ? "Your training streak"
                  : "Your player profile"}
            </h1>
            <span>
              This section is ready for the next step. Return to Lessons to
              continue training.
            </span>
            <button type="button" onClick={() => setActiveTab("lessons")}>
              Back to lessons
            </button>
          </section>
        )}
      </div>

      <nav className="bottom-nav" aria-label="Main navigation">
        {(["lessons", "goals", "profile"] as Tab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            className={
              activeTab === tab || (activeTab === "streak" && tab === "goals")
                ? "active"
                : ""
            }
            onClick={() => {
              setActiveTab(tab);
              if (tab !== "lessons") setShowUnits(false);
            }}
          >
            <span>
              <Icon name={tab} />
            </span>
            {tab === "lessons"
              ? "Home"
              : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </nav>
    </main>
  );
}

export default function App() {
  const [showPassword, setShowPassword] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [showAssessment, setShowAssessment] = useState(false);
  const [playerLevel, setPlayerLevel] = useState<PlayerLevel>("Beginner");
  const [dominantHand, setDominantHand] = useState<DominantHand>("right");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isCreatingAccount) {
      setShowAssessment(true);
    } else {
      setSignedIn(true);
    }
  }

  if (showAssessment) {
    return (
      <OnboardingAssessment
        username={username}
        onBack={() => setShowAssessment(false)}
        onComplete={(level, hand) => {
          setPlayerLevel(level);
          setDominantHand(hand);
          setShowAssessment(false);
          setSignedIn(true);
        }}
      />
    );
  }

  if (signedIn) {
    return (
      <HomeScreen
        onDominantHandChange={setDominantHand}
        dominantHand={dominantHand}
        username={username}
        onUsernameChange={setUsername}
        playerLevel={playerLevel}
      />
    );
  }

  return (
    <main className="auth-page">
      <div className="court-pattern" aria-hidden="true">
        <span className="basketball ball-one">
          <i />
        </span>
        <span className="basketball ball-two">
          <i />
        </span>
        <span className="basketball ball-three">
          <i />
        </span>
        <span className="basketball ball-four">
          <i />
        </span>
        <span className="spot spot-one" />
        <span className="spot spot-two" />
        <span className="spot spot-three" />
        <span className="spot spot-four" />
        <span className="spot spot-five" />
        <span className="spot spot-six" />
      </div>

      <section className="form-panel">
        <div className="mobile-brand">
          <SportStarLogo />
        </div>
        <div className="form-wrap">
          <div className="form-heading">
            <p className="step-label">
              {isCreatingAccount ? "Join SportStar" : "Welcome back"}
            </p>
            <h2>
              {isCreatingAccount
                ? "Start your training."
                : "Ready to get better?"}
            </h2>
            <p>
              {isCreatingAccount
                ? "Create an account to build your personalized plan."
                : "Sign in to continue your training."}
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <label className="field">
              <span>Username</span>
              <input
                name="username"
                type="text"
                placeholder="What should we call you?"
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                required
              />
            </label>

            {isCreatingAccount && (
              <label className="field">
                <span>Email address</span>
                <input
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
              </label>
            )}

            <label className="field">
              <span className="password-label">
                Password
                {!isCreatingAccount && (
                  <button type="button" className="forgot-link">
                    Forgot password?
                  </button>
                )}
              </span>
              <span className="password-input">
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={
                    isCreatingAccount
                      ? "Create a secure password"
                      : "Enter your password"
                  }
                  autoComplete={
                    isCreatingAccount ? "new-password" : "current-password"
                  }
                  required
                />
                <button
                  type="button"
                  className="visibility-toggle"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((visible) => !visible)}
                >
                  <EyeIcon hidden={showPassword} />
                </button>
              </span>
            </label>

            {!isCreatingAccount && (
              <label className="remember">
                <input type="checkbox" name="remember" />
                <span>Keep me signed in</span>
              </label>
            )}

            <button className="submit-button" type="submit">
              {isCreatingAccount ? "Create account" : "Sign in"}
              <Icon name="arrow" />
            </button>
          </form>

          <div className="divider">
            <span />
            <p>
              {isCreatingAccount
                ? "Already have an account?"
                : "New to SportStar?"}
            </p>
            <span />
          </div>

          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              setIsCreatingAccount((value) => !value);
              setShowPassword(false);
            }}
          >
            {isCreatingAccount ? "Back to sign in" : "Create an account"}
          </button>
        </div>

        <footer>
          <span>© 2025 SportStar</span>
          <nav aria-label="Legal">
            <button type="button">Privacy</button>
            <button type="button">Terms</button>
          </nav>
        </footer>
      </section>
    </main>
  );
}
