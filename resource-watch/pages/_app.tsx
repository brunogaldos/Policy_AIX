import { FC, useEffect } from 'react';
import type { AppProps } from 'next/app';
import Script from 'next/script';

import { Provider as AuthenticationProvider } from 'next-auth/client';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Hydrate } from 'react-query/hydration';

// lib
import wrapper from 'lib/store';
import MediaContextProvider from 'lib/media';

// es6 shim for .finally() in promises
import finallyShim from 'promise.prototype.finally';

// global styles
import 'css/index.scss';

finallyShim.shim();

const queryClient = new QueryClient();

const ResourceWatchApp: FC<AppProps> = ({ Component, pageProps }: AppProps) => {
  // Global error handler to suppress external API errors
  useEffect(() => {
    const hasMapboxToken = !!process.env.NEXT_PUBLIC_RW_MAPBOX_API_TOKEN;
    const hasGoogleToken = !!process.env.NEXT_PUBLIC_RW_GOGGLE_API_TOKEN_SHORTENER;

    // Development-only warning about missing API tokens
    if (process.env.NODE_ENV === 'development') {
      if (!hasMapboxToken) {
        console.warn('⚠️  NEXT_PUBLIC_RW_MAPBOX_API_TOKEN is not set. Map functionality will be limited.');
      }
      if (!hasGoogleToken) {
        console.warn('⚠️  NEXT_PUBLIC_RW_GOGGLE_API_TOKEN_SHORTENER is not set. Google Maps functionality will be limited.');
      }
    }

    if (!hasMapboxToken || !hasGoogleToken) {
      const originalError = console.error;
      const originalWarn = console.warn;

      console.error = (...args) => {
        const message = args[0]?.toString() || '';
        // Suppress Mapbox and Google Maps related errors when tokens are missing
        if (
          (!hasMapboxToken && (message.includes('mapbox') || message.includes('Mapbox'))) ||
          (!hasGoogleToken && (message.includes('googleapis') || message.includes('maps.googleapis')))
        ) {
          return;
        }
        originalError.apply(console, args);
      };

      console.warn = (...args) => {
        const message = args[0]?.toString() || '';
        // Suppress CORS warnings for external APIs when tokens are missing
        if (
          (!hasMapboxToken && (message.includes('mapbox') || message.includes('Mapbox'))) ||
          (!hasGoogleToken && (message.includes('googleapis') || message.includes('maps.googleapis')))
        ) {
          return;
        }
        originalWarn.apply(console, args);
      };

      return () => {
        console.error = originalError;
        console.warn = originalWarn;
      };
    }
  }, []);

  return (
    <>
      {process.env.NEXT_PUBLIC_GOOGLE_TAG_MANAGER_CONTAINER_ID && (
        <noscript>
          {/* Google Tag Manager (noscript) */}
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${process.env.NEXT_PUBLIC_GOOGLE_TAG_MANAGER_CONTAINER_ID}`}
            height={0}
            width={0}
            style={{
              display: 'none',
              visibility: 'hidden',
            }}
          />
          {/* End Google Tag Manager (noscript) */}
        </noscript>
      )}

      {/* Google places API */}
      {process.env.NEXT_PUBLIC_RW_GOGGLE_API_TOKEN_SHORTENER && (
        <Script
          src={`https://maps.googleapis.com/maps/api/js?v=weekly&key=${process.env.NEXT_PUBLIC_RW_GOGGLE_API_TOKEN_SHORTENER}&libraries=places`}
          onError={(e) => {
            // Suppress Google Maps API errors when token is not available
            console.warn('Google Maps API failed to load - API key may be missing or invalid');
          }}
        />
      )}
      <QueryClientProvider client={queryClient}>
        <MediaContextProvider>
          <Hydrate state={pageProps.dehydratedState}>
            <AuthenticationProvider
              session={pageProps.session}
              options={{
                clientMaxAge: 5 * 60, // Re-fetch session if cache is older than 60 seconds
                keepAlive: 10 * 60, // Send keepAlive message every 10 minutes
              }}
            >
              <Component {...pageProps} />
            </AuthenticationProvider>
          </Hydrate>
        </MediaContextProvider>
      </QueryClientProvider>
    </>
  );
};

export default wrapper.withRedux(ResourceWatchApp);
