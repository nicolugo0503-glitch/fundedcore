"use client";
import Script from "next/script";
import { LANDING_CSS, LANDING_HTML } from "./landingData";

export default function Home() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: LANDING_CSS }} />
      <div dangerouslySetInnerHTML={{ __html: LANDING_HTML }} />
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js" strategy="afterInteractive" />
      <Script src="/landing.js" strategy="afterInteractive" />
    </>
  );
}
