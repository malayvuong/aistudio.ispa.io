
/** @type {import('next').NextConfig} */
const nextConfig = {
    // Security: Environment variables are handled exclusively on the server side.
    // Do not expose secrets like MASTER_PASSWORD_HASH to the client bundle.
};

export default nextConfig;
