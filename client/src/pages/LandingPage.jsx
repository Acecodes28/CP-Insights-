import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import HandleSearchBar from "../components/profile/HandleSearchBar";
import HeroBackground from "../components/effects/HeroBackground";
import ScrollStack, { ScrollStackItem } from "../components/effects/ScrollStack";
import "../styles/landing.css";

const FEATURES = [
  {
    title: "1v1 duels, real Codeforces problems",
    desc: "Challenge a rival or queue for a match. Same problem, same clock — first to get Accepted on Codeforces takes the round. Best of 3.",
    tag: "Core",
  },
  {
    title: "Recommendations tuned to you",
    desc: "Not \"popular problems\" — picks weighted by your actual weak tags and the rating gap right above where you're solving now.",
    tag: "Core",
  },
  {
    title: "Every problem you've touched, logged",
    desc: "Solved, attempted, starred, annotated. Your own searchable problem log with notes — the thing CF itself never gave you.",
    tag: "New",
  },
  {
    title: "Rating history, actually visualized",
    desc: "Every rated contest plotted over time, with rank, name, and delta on hover — not just a number.",
  },
  {
    title: "Tag-level strengths & gaps",
    desc: "Solved vs. attempted-but-unsolved, broken down per topic — graphs, DP, greedy — so weak spots stop hiding in aggregate stats.",
  },
  {
    title: "Groups & streaks",
    desc: "Track a squad's progress side by side, keep your solve streak alive, and unlock badges as milestones land.",
  },
];

const STEPS = [
  { n: "01", title: "Link your handle", desc: "Connect your Codeforces handle — no CF login required, just a public username." },
  { n: "02", title: "Get your dashboard", desc: "Rating history, tag breakdowns, and personalized recommendations, ready instantly." },
  { n: "03", title: "Queue for a duel", desc: "Challenge a rival or find a random opponent in your rating band. First to solve wins the round." },
];

const FAQS = [
  {
    q: "Do I need a Codeforces account to use this?",
    a: "No. You need a free CP Insights account to save handles and duel, but looking up any public Codeforces handle doesn't require linking or logging into Codeforces itself.",
  },
  {
    q: "How do duels actually work?",
    a: "You and an opponent get the same problem and the same clock. Whoever gets an Accepted verdict on Codeforces first wins that round — best of 3 wins the duel. We poll Codeforces for your submission, we never see your code.",
  },
  {
    q: "How current is the data?",
    a: "Profiles are cached for a few hours after each fetch. Visiting a profile page after the cache expires triggers a fresh pull from Codeforces.",
  },
  {
    q: "Is this affiliated with Codeforces?",
    a: "No. CP Insights is an independent layer built on top of the public Codeforces API. All contest and problem data belongs to Codeforces.",
  },
  {
    q: "Is it free?",
    a: "Yes, completely free — handle lookups, duels, tracking, all of it.",
  },
];

export default function LandingPage() {
  const { user } = useAuth();

  return (
    <div className="landing">
      <section className="landing-hero">
        <HeroBackground className="landing-hero-bg" />
        <div className="landing-hero-scrim" aria-hidden="true" />
        <div className="page-shell landing-hero-inner">
          <span className="landing-eyebrow mono">CODEFORCES ANALYTICS + 1V1 ARENA</span>
          <h1>
            Track your climb.
            <br />
            <span className="landing-hero-accent">Duel your rivals.</span>
          </h1>
          <p className="landing-hero-sub">
            Rating trends, tag-level gaps, and a full problem log for any Codeforces handle —
            plus real-time 1v1 duels on real CF problems. The stuff your CF profile never showed you.
          </p>

          <div className="landing-hero-search">
            <HandleSearchBar placeholder="Try a handle, e.g. tourist" />
          </div>

          <p className="landing-hero-hint">No sign-up required to look someone up.</p>
        </div>
      </section>

      <section className="landing-section" id="features">
        <div className="page-shell">
          <div className="landing-section-header">
            <span className="landing-eyebrow mono">FEATURES</span>
            <h2>Everything your CF profile page doesn't show you</h2>
          </div>
        </div>

        <ScrollStack
          className="landing-scroll-stack"
          useWindowScroll
          itemDistance={90}
          itemScale={0.035}
          itemStackDistance={26}
          stackPosition="18%"
          scaleEndPosition="8%"
          baseScale={0.88}
          rotationAmount={0.4}
          blurAmount={0.6}
        >
          {FEATURES.map((f) => (
            <ScrollStackItem key={f.title} itemClassName="landing-feature-stack-card">
              <div className="landing-feature-card-inner">
                {f.tag && <span className={`landing-feature-tag landing-feature-tag-${f.tag.toLowerCase()}`}>{f.tag}</span>}
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            </ScrollStackItem>
          ))}
        </ScrollStack>
      </section>

      <section className="landing-section landing-section-alt" id="how-it-works">
        <div className="page-shell">
          <div className="landing-section-header">
            <span className="landing-eyebrow mono">HOW IT WORKS</span>
            <h2>From handle to first duel in minutes</h2>
          </div>

          <div className="landing-steps">
            {STEPS.map((s) => (
              <div key={s.n} className="landing-step">
                <span className="landing-step-num mono">{s.n}</span>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section" id="faq">
        <div className="page-shell">
          <div className="landing-section-header">
            <span className="landing-eyebrow mono">FAQ</span>
            <h2>Common questions</h2>
          </div>

          <div className="landing-faq-list">
            {FAQS.map((f) => (
              <details key={f.q} className="landing-faq-item card">
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-cta">
        <div className="page-shell landing-cta-inner">
          {user ? (
            <>
              <h2>Welcome back, {user.name}</h2>
              <p>Jump back into your dashboard to check streaks, duels, and recommendations.</p>
              <Link to="/dashboard" className="landing-cta-btn">
                Go to dashboard
              </Link>
            </>
          ) : (
            <>
              <h2>Ready to see your stats?</h2>
              <p>Create a free account, link your handle, and queue for your first duel.</p>
              <Link to="/signup" className="landing-cta-btn">
                Get started
              </Link>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
