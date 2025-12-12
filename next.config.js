/** @type {import('next').NextConfig} */
const nextConfig = {
		experimental: {
			serverComponentsExternalPackages: ['pdf-parse'],
		},
		// Increase API body size limit so large PDF/Word uploads can reach our 100MB business check
		api: {
			bodyParser: {
				sizeLimit: '120mb',
			},
		},
	webpack: (config) => {
		config.resolve.alias.canvas = false;
		config.resolve.alias.encoding = false;
		return config;
	},
};

module.exports = nextConfig;

