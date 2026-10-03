import type { Metadata } from "next";
import { StaticPage } from "@/components/StaticPage";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = { title: "Terms of Service", alternates: { canonical: "/terms" } };

export default function Terms() {
  return (
    <StaticPage title="Terms of service" crumb="Terms">
      <p>
        {SITE_NAME} is an information service. Prices come from public store listings and TCGplayer data, are read twice a day and may have changed since: always
        confirm the price, condition, stock and postage on the retailer&apos;s own site before you buy. Purchases are made with the retailer, not with {SITE_NAME}.
      </p>
      <p>
        Reference prices marked “≈” are conversions for comparison only and are not offers. {SITE_NAME} accepts no liability for a purchase made on the strength
        of a price shown here.
      </p>
      <p>
        {SITE_NAME} is not affiliated with Bandai, Eiichiro Oda, Shueisha or Toei Animation. Trademarks and card images belong to their owners.
      </p>
    </StaticPage>
  );
}
