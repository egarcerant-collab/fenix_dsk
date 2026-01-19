import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  webpack: (config) => {
    const originalIgnored = config.watchOptions.ignored || [];
    const ignoredAsArray = Array.isArray(originalIgnored) 
      ? originalIgnored 
      : (originalIgnored ? [originalIgnored] : []);

    // Create a new watchOptions object instead of modifying a read-only property
    config.watchOptions = {
        ...config.watchOptions,
        ignored: [
            // Filter out any falsy values (null, undefined, '') which might be in the default config.
            // This is safer than a strict string check, as it will preserve other valid types like RegExps.
            ...ignoredAsArray.filter(Boolean),
            '**/public/bases-manifest.json',
        ]
    };
    
    return config;
  },
};

export default nextConfig;
