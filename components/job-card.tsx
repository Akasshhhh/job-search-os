import type { SavedJob } from "@/src/domain/job";

type JobCardProps = {
  job: SavedJob;
  featured?: boolean;
};

export function JobCard({ job, featured = false }: JobCardProps) {
  const createdDate = new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(job.createdAt));
  const sourceUrl = externalUrl(job.sourceUrl);
  const applicationUrl = externalUrl(job.applicationUrl);
  const workplace = { remote: "Remote", hybrid: "Hybrid", onsite: "On-site", unknown: "Not stated" }[job.workplaceType];
  const sourceType = { pasted_jd: "Pasted job description", url: "URL", linkedin: "LinkedIn", ashby: "Ashby", other: "Other" }[job.sourceType];

  return (
    <article className={`job-card ${featured ? "job-card-featured" : ""}`} aria-label={job.title}>
      <div className="job-card-topline">
        <span className="eyebrow">{featured ? "Just normalized" : "Saved opportunity"}</span>
        <time className="date-label" dateTime={job.createdAt}>Saved {createdDate}</time>
      </div>

      <div className="job-heading">
        <div className="company-mark" aria-hidden="true">{initials(job.company || "?")}</div>
        <div>
          <h3>{job.title}</h3>
          <p>{job.company || "Company not listed"}</p>
        </div>
      </div>

      <div className="tag-row">
        <Tag label={`Workplace: ${workplace}`} />
        <Tag label={`Target country: ${job.employmentCountry}`} tone="accent" />
        <Tag label={sponsorshipLabel(job.sponsorship)} tone={sponsorshipTone(job.sponsorship)} />
        <Tag label={`Seniority: ${job.seniorityLevel || "Not stated"}`} />
      </div>

      <div className="job-facts">
        <Fact label="Advertised location" value={job.jobLocation || "Not stated"} />
        <Fact label="Employment type" value={job.employmentType || "Not stated"} />
        <Fact label="Compensation" value={job.compensation || "Not stated"} />
      </div>

      <div className="job-sections">
        <ListSection title="Skills" items={job.skills} empty="No specific skills extracted" />
        <ListSection
          title="Experience requirements"
          items={job.experienceRequirements}
          empty="No specific experience requirements extracted"
        />
        <ListSection title="Responsibilities" items={job.responsibilities} empty="No responsibilities extracted" />
      </div>

      <div className="sponsorship-note">
        <div className="note-heading">
          <span className="note-dot" aria-hidden="true" />
          <span>Visa sponsorship evidence</span>
        </div>
        <strong>{sponsorshipLabel(job.sponsorship)}</strong>
        <p>{job.sponsorshipEvidence || "No supporting quote was extracted. Review the original job description."}</p>
      </div>

      <details className="raw-description">
        <summary>Original pasted job description</summary>
        <p>{job.rawDescription}</p>
      </details>

      <div className="job-card-footer">
        <span>Normalized by {job.provider}</span>
        <span>Source type: {sourceType}</span>
        {sourceUrl ? (
          <a href={sourceUrl} target="_blank" rel="noopener noreferrer">
            View source posting ↗ <span className="sr-only">(opens in a new tab)</span>
          </a>
        ) : (
          <span>{job.sourceUrl ? `Source URL is not an HTTP(S) link: ${job.sourceUrl}` : "Source URL not provided"}</span>
        )}
        {applicationUrl && applicationUrl !== sourceUrl ? (
          <a href={applicationUrl} target="_blank" rel="noopener noreferrer">
            View application page ↗ <span className="sr-only">(opens in a new tab)</span>
          </a>
        ) : null}
      </div>
    </article>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="fact">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ListSection({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <section className="job-section">
      <h4>{title}</h4>
      {items.length > 0 ? (
        <ul>
          {items.map((item, index) => (
            <li key={`${index}-${item}`}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="muted-text">{empty}</p>
      )}
    </section>
  );
}

function Tag({ label, tone = "default" }: { label: string; tone?: string }) {
  return <span className={`tag tag-${tone}`}>{label}</span>;
}

function externalUrl(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

function initials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function sponsorshipLabel(value: SavedJob["sponsorship"]) {
  return {
    yes: "Visa sponsorship: Offered",
    no: "Visa sponsorship: Explicitly not offered",
    conditional: "Visa sponsorship: Conditional",
    unknown: "Visa sponsorship: Not stated"
  }[value];
}

function sponsorshipTone(value: SavedJob["sponsorship"]) {
  return value === "yes" ? "positive" : value === "no" ? "negative" : "warning";
}
