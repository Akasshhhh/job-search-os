"use client";

import { useEffect, useRef, useState } from "react";
import type { SavedJob } from "@/src/domain/job";
import { JobCard } from "@/components/job-card";
import { JobIntakeForm } from "@/components/job-intake-form";
import { SavedJobs } from "@/components/saved-jobs";

export default function HomePage() {
  const [jobs, setJobs] = useState<SavedJob[]>([]);
  const [latestJob, setLatestJob] = useState<SavedJob | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const resultHeading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/jobs", { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        const body = (await response.json()) as { jobs?: SavedJob[]; error?: string };
        if (!response.ok || !Array.isArray(body.jobs)) throw new Error(body.error || "Saved jobs could not be loaded.");
        if (controller.signal.aborted) return;

        const loadedJobs = body.jobs;
        setJobs((current) => {
          const currentIds = new Set(current.map((job) => job.id));
          return [...current, ...loadedJobs.filter((job) => !currentIds.has(job.id))];
        });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setLoadError(error instanceof Error ? error.message : "Saved jobs could not be loaded.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [loadAttempt]);

  useEffect(() => {
    if (latestJob) resultHeading.current?.focus();
  }, [latestJob]);

  function handleSaved(job: SavedJob) {
    setLatestJob(job);
    setJobs((current) => [job, ...current.filter((saved) => saved.id !== job.id)]);
  }

  return (
    <main>
      <nav className="topbar shell">
        <div className="brand"><span className="brand-mark">✦</span> job search <strong>OS</strong></div>
        <div className="topbar-status"><span className="status-dot" /> Personal workspace</div>
      </nav>

      <section className="hero shell">
        <div className="hero-copy">
          <span className="eyebrow">The first step of your job pipeline</span>
          <h1>Turn a job posting into a <em>clear next move.</em></h1>
          <p>Paste any job description. We&apos;ll extract the signal, preserve the evidence, and give you a structured opportunity you can actually work with.</p>
        </div>
        <div className="hero-stats">
          <div><strong>01</strong><span>Paste</span></div>
          <div><strong>02</strong><span>Normalize</span></div>
          <div><strong>03</strong><span>Track</span></div>
        </div>
      </section>

      <section className="intake-section shell">
        <div className="section-heading intake-heading">
          <div>
            <span className="eyebrow">New opportunity</span>
            <h2>What are you looking at?</h2>
          </div>
          <span className="step-label">STEP 01 / 03</span>
        </div>
        <JobIntakeForm onSaved={handleSaved} />
      </section>

      {latestJob ? (
        <section className="result-section shell" aria-labelledby="result-heading">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Normalized result</span>
              <h2 id="result-heading" ref={resultHeading} tabIndex={-1}>Here&apos;s what we found</h2>
            </div>
            <span className="result-check">✓ Saved to pipeline</span>
          </div>
          <JobCard job={latestJob} featured />
        </section>
      ) : null}

      <section className="shell">
        {loadError ? (
          <div className="form-message form-error page-error">
            <p role="alert">{loadError} {jobs.length > 0 ? "The saved list below may be incomplete." : "Your saved list could not be verified."}</p>
            <button className="secondary-button" type="button" onClick={() => {
              setIsLoading(true);
              setLoadError(null);
              setLoadAttempt((attempt) => attempt + 1);
            }}>Retry loading saved jobs</button>
          </div>
        ) : null}
        <div role="status" aria-live="polite">
          {isLoading ? <div className="loading-line"><span className="spinner" aria-hidden="true" /> Loading your pipeline...</div> : null}
        </div>
        {jobs.length > 0 || (!isLoading && !loadError) ? <SavedJobs jobs={jobs} /> : null}
      </section>

      <footer className="shell footer">Built for a calmer, more deliberate job search.</footer>
    </main>
  );
}
