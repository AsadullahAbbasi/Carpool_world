import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'RideSharee - Rideshare App',
        short_name: 'RideSharee',
        description: 'Connect. Share. Travel Together.',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#000000',
        icons: [
            {
                src: '/RideShare_Logo.png',
                sizes: '512x512',
                type: 'image/png',
            },
        ],
    };
}
