"use client";

import { useEffect } from "react";
import { applyEbayBtn } from "@/lib/buy-btn-arm";

/** Assigns the eBay-button A/B arm and sets `<html data-ebaybtn>` (lib/buy-btn-arm.ts). Renders nothing. */
export function BuyBtnArm() {
  useEffect(() => applyEbayBtn(), []);
  return null;
}
