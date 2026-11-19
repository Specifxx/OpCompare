"use client";

import { useEffect } from "react";
import { applyEbayBtn } from "@/lib/buy-btn-arm";
import { applyEbayPop } from "@/lib/stand-out-arm";

/** Sets `<html data-ebaybtn>` (lib/buy-btn-arm.ts) and assigns the eBay stand-out A/B arm, `<html data-ebaypop>` (lib/stand-out-arm.ts). Renders nothing. */
export function BuyBtnArm() {
  useEffect(() => {
    applyEbayBtn();
    applyEbayPop();
  }, []);
  return null;
}
