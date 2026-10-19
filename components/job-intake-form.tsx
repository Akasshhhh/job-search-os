"use client";

import { useState } from "react";
import type { SavedJob } from "@/src/domain/job";

type JobIntakeFormProps = {
  onSaved: (job: SavedJob) => void;
};

export function JobIntakeForm({ onSaved }: JobIntakeFormProps) {
  const [description, setDescription] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [employmentCountry, setEmploymentCountry] = useState("India");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    setError(null);
    setProvider(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, sourceUrl, employmentCountry })
      });
      const body = (await response.json().catch(() => ({
        error: "The server returned an unreadable response. Check your saved list before retrying."
      }))) as { error?: string; job?: SavedJob };

      if (!response.ok || !body.job) {
        throw new Error(body.error || "The job could not be normalized.");
      }

      setProvider(body.job.provider);
      setDescription("");
      setSourceUrl("");
      onSaved(body.job);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="intake-form" onSubmit={handleSubmit} aria-describedby="provider-note">
      <fieldset className="intake-fields" disabled={isSubmitting} aria-busy={isSubmitting}>
        <legend className="sr-only">Job description and source details</legend>
        <div className="field-group">
          <div className="field-label-row">
            <label htmlFor="description">Job description</label>
            <span>{description.length.toLocaleString()} characters</span>
          </div>
          <textarea
            id="description"
            name="description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Paste the complete job description from LinkedIn, Ashby, Greenhouse, or anywhere else..."
            rows={14}
            minLength={30}
            maxLength={60_000}
            aria-describedby="description-hint"
            required
          />
          <p className="field-hint" id="description-hint">Required · at least 30 characters. Paste the full posting to preserve its details.</p>
        </div>

        <div className="form-grid">
          <div className="field-group">
            <label htmlFor="source-url">Source URL <span className="optional">optional</span></label>
            <input
              id="source-url"
              name="sourceUrl"
              type="url"
              maxLength={2_000}
              pattern="https?://.+"
              title="Use an http:// or https:// URL."
              value={sourceUrl}
              onChange={(event) => setSourceUrl(event.target.value)}
              placeholder="https://www.linkedin.com/jobs/view/..."
              aria-describedby="source-hint"
            />
            <p className="field-hint" id="source-hint">For reference only. We normalize the pasted text, not the linked page.</p>
          </div>
          <div className="field-group">
            <label htmlFor="employment-country">Target employment country</label>
            <input
              id="employment-country"
              name="employmentCountry"
              maxLength={100}
              value={employmentCountry}
              onChange={(event) => setEmploymentCountry(event.target.value)}
              placeholder="India"
              aria-describedby="country-hint"
              required
            />
            <p className="field-hint" id="country-hint">Your search preference, separate from the posting&apos;s advertised location.</p>
          </div>
        </div>

        <p className="form-message form-warning" id="provider-note">
          Requires a server-side API key and model ID. Available providers are tried in the configured order: Gemini → OpenRouter → OpenAI by default. Your pasted text is sent to the provider used for normalization.
        </p>

        <div className="form-footer">
          <p>We&apos;ll extract only what the posting says. Missing details stay unknown.</p>
          <button className="primary-button" disabled={isSubmitting || description.trim().length < 30 || !employmentCountry.trim()} type="submit">
            {isSubmitting ? <><span className="spinner" aria-hidden="true" /> Normalizing &amp; saving...</> : <>Normalize &amp; save <span aria-hidden="true">↗</span></>}
          </button>
        </div>
      </fieldset>

      <div role="alert" aria-label="Job intake error" aria-atomic="true">
        {error ? <p className="form-message form-error">{error} Your inputs have been kept so you can try again.</p> : null}
      </div>
      <div role="status" aria-live="polite" aria-atomic="true">
        {isSubmitting ? (
          <p className="form-message">Normalizing and saving the posting. Your inputs are locked until this finishes.</p>
        ) : provider ? (
          <p className="form-message form-success">Normalized and saved with {provider}. Review the extracted details below.</p>
        ) : null}
      </div>
    </form>
  );
}
