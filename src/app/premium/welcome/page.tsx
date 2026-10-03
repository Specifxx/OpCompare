import type { Metadata } from "next";
import { WelcomePoller } from "./WelcomePoller";

export const metadata: Metadata = { title: "Welcome", robots: { index: false, follow: false } };

export default function Welcome() {
  return (
    <div className="container-app flex justify-center py-16">
      <div className="max-w-md text-center">
        <WelcomePoller />
      </div>
    </div>
  );
}
