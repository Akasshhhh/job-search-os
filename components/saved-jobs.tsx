import type { SavedJob } from "@/src/domain/job";
import { JobCard } from "@/components/job-card";

export function SavedJobs({ jobs }: { jobs: SavedJob[] }) {
  return (
    <section className="saved-section" aria-labelledby="saved-jobs-heading">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Your pipeline</span>
          <h2 id="saved-jobs-heading">Saved opportunities</h2>
        </div>
        <span className="count-badge" aria-label={`${jobs.length} saved opportunities`}>{jobs.length.toString().padStart(2, "0")}</span>
      </div>

      {jobs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon" aria-hidden="true">✦</div>
          <h3>Your first opportunity starts here</h3>
          <p>Normalize a job description above and it will appear in your personal pipeline.</p>
        </div>
      ) : (
        <div className="saved-grid">
          {jobs.map((job) => <JobCard key={job.id} job={job} />)}
        </div>
      )}
    </section>
  );
}
