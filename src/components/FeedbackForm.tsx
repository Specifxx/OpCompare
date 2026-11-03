"use client";

import { RatingForm } from "./site-reviews/RatingForm";

// /feedback. Since 2026-11-03 (owner: every site's reviews approved in
// RiftCompare's admin, star ratings public at once) this is the shared
// rating-and-review form, sent to RiftCompare's shared review service: stars
// count in the site's score at once, a review shows once approved and only if
// "Show my review" stays ticked. A message that wants a reply goes to /contact.
export function FeedbackForm() {
  return (
    <div className="card-surface p-5">
      <RatingForm />
    </div>
  );
}
