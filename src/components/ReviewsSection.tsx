import { getApprovedReviews } from "@/lib/data";
import { ReviewsBlock } from "./ReviewsBlock";

// "What people say". Since 2026-11-03 (owner: every site's reviews approved in
// RiftCompare's admin, star ratings public at once) new ratings and reviews go
// to RiftCompare's shared review service; the ones approved here before then
// keep showing. The server renders those (so the HTML has them), the browser
// adds the shared score and reviews (components/ReviewsBlock.tsx). No
// Review/AggregateRating markup, ever: self-collected reviews do not qualify.
export async function ReviewsSection() {
  const legacy = await getApprovedReviews(12);
  return <ReviewsBlock legacy={legacy} />;
}
