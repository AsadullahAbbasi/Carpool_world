import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
    return [
        {
            url: 'https://carpool-world-git-main-asadullahabbasis-projects.vercel.app',
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 1,
        },
        {
            url: 'https://carpool-world-git-main-asadullahabbasis-projects.vercel.app/auth',
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.8,
        },
        {
            url: 'https://carpool-world-git-main-asadullahabbasis-projects.vercel.app/dashboard',
            lastModified: new Date(),
            changeFrequency: 'always',
            priority: 0.5,
        },
    ];
}
