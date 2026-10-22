// Text supplied by the user; paraphrases are explicitly labeled.
const phrases = [
  { text: "Spiral out. Keep going.", credit: "TOOL · Lateralus" },
  { text: "I know the pieces fit.", credit: "TOOL · Schism" },
  { text: "Face your shadow and grow beyond who you are.", credit: "Forty Six & 2 · Paraphrase" },
  { text: "Embrace the gift of being alive, even through pain.", credit: "Parabola · Paraphrase" },
  { text: "Find the strength to persevere when you feel exhausted.", credit: "The Patient · Paraphrase" },
  { text: "Look beyond yourself and connect with something greater.", credit: "Reflection · Paraphrase" },
] as const;

export function LoadingLyrics({ label }: { label: string }) {
  return (
    <div className="orb-status" role="status" aria-live="polite">
      <div className="loading-lyrics" aria-hidden="true">
        {phrases.map((phrase, index) => (
          <div className="loading-lyrics-slide" key={phrase.text}
            style={{ animationDelay: `${index * 3}s` }}>
            <p className="loading-lyrics-quote">{phrase.text}</p>
            <p className="loading-lyrics-song">{phrase.credit}</p>
          </div>
        ))}
      </div>
      <span className="loading-dots" aria-hidden="true"><span>.</span><span>.</span><span>.</span></span>
      <span className="sr-only">{label}</span>
    </div>
  );
}
