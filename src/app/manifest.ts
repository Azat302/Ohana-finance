import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Ohana Finance',
    short_name: 'Ohana',
    description: 'Finance tracking for small business',
    start_url: '/',
    display: 'standalone',
    background_color: '#915F3C',
    theme_color: '#915F3C',
    icons: [
      {
        src: '/logo.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/logo.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
