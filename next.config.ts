/** @type {import('next').NextConfig} */
const nextConfig = {
    // // Menghasilkan folder 'out' saat build
    // output: 'export',
    
    // // Conditional asset prefix untuk deployment yang fleksibel
    // // Untuk development dan testing: tanpa prefix
    // // Untuk Dataiku: bisa menggunakan environment variable
    // assetPrefix: process.env.ASSET_PREFIX || '',
    
    // // Untuk menghindari masalah dengan trailing slash di environment yang berbeda
    // trailingSlash: true,
    
    // // Pastikan gambar juga bekerja dengan path relatif
    // images: {
    //     unoptimized: true,
    // },
    
    // eslint: {
    //     // Warning: This allows production builds to successfully complete even if
    //     // your project has ESLint errors.
    //     ignoreDuringBuilds: true,
    // },
    typescript: {
        // !! WARN !!
        // Dangerously allow production builds to successfully complete even if
        // your project has type errors.
        // !! WARN !!
        ignoreBuildErrors: true,
    },
    experimental: {
        serverActions: {
            bodySizeLimit: '10mb',
        },
    },
};

export default nextConfig;
