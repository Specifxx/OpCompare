import Script from "next/script";
import { CONSENT_REGIONS, GA_ENABLED, GA_MEASUREMENT_ID } from "@/lib/ga";

// gtag.js with Consent Mode defaults set before `config`. GA4's enhanced
// measurement records client-side navigations itself. Outbound buy clicks are
// sent as `buy_click` (RiftCompare's event name) from any link carrying
// data-retailer, so affiliate clicks per store and per page show up in GA.
// /admin is never measured: `config` (the first page view) is skipped there and
// the ga-disable flag set; AdminNoAnalytics keeps it set on client navigation.
export function GoogleAnalytics() {
  if (!GA_ENABLED) return null;
  const init = `
window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;
gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',region:${JSON.stringify(CONSENT_REGIONS)},wait_for_update:500});
gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'granted'});
gtag('js',new Date());if(location.pathname.indexOf('/admin')!==0){gtag('config','${GA_MEASUREMENT_ID}');}else{window['ga-disable-${GA_MEASUREMENT_ID}']=true;}
document.addEventListener('click',function(e){var a=e.target&&e.target.closest&&e.target.closest('a[data-retailer]');if(!a)return;
gtag('event','buy_click',{retailer:a.getAttribute('data-retailer'),page_type:a.getAttribute('data-page')||location.pathname.split('/')[1]||'home',link_url:a.href,transport_type:'beacon'});},true);`;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`} strategy="afterInteractive" />
      <Script id="ga-init" strategy="afterInteractive">
        {init}
      </Script>
    </>
  );
}
