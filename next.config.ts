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
            ...ignoredAsArray.filter(item => typeof item === 'string' && item.length > 0),
            '**/public/bases-manifest.json',
        ]
    };
    
    return config;
  },
};

export default nextConfig;

    