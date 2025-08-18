import Script from 'next/script';

const GoogleTagManagerScript = () => {
  if (!process.env.NEXT_PUBLIC_GOOGLE_TAG_MANAGER_CONTAINER_ID) {
    console.warn('GOOGLE TAG MANAGER: CONTAINER ID NOT DEFINED');
    return null;
  }

  return (
    <>
      {/* Fallback for plausible function to prevent GTM errors */}
      <Script
        id="plausible-fallback"
        dangerouslySetInnerHTML={{
          __html: `
            // Fallback for plausible function to prevent GTM errors
            if (typeof window !== 'undefined' && !window.plausible) {
              window.plausible = function() {
                console.warn('Plausible analytics not loaded, but GTM tried to call it');
                return false;
              };
            }
          `,
        }}
      />
      <Script
        id="google-tag-manager"
        dangerouslySetInnerHTML={{
          __html: `
          (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
          new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
          'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','${process.env.NEXT_PUBLIC_GOOGLE_TAG_MANAGER_CONTAINER_ID}');
          `,
        }}
      />
    </>
  );
};

export default GoogleTagManagerScript;
