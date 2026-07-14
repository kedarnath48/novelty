import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
	plugins: [
		react(), // Inside your defineconfig plugins array
		{
			name: "fix-electrobun-paths",
			enforce: "post",
			apply: "build",
			transformIndexHtml(html) {
				// This looks for src="../projectsview/projectsview.js"
				// and changes it to src="projectsview.js"
				return html.replace(/\.\.\/[^/]+\//g, "./");
			},
		},
	],
	root: "src",
	// Using an empty string or './' for base is vital for relative paths
	base: "./",
	build: {
		outDir: "../dist",
		emptyOutDir: true,
		rollupOptions: {
			input: {
				mainview: resolve(__dirname, "src/mainview/index.html"),
			},
			output: {
				// Force the JS to be inside the view folder
				entryFileNames: "[name]/[name].js",
				assetFileNames: "[name]/[name].[ext]",

				// CRITICAL: Disable code splitting
				// This forces 'client-Xk-RIFYY.js' content INTO projectsview.js
				manualChunks: undefined,
				inlineDynamicImports: false,

				// This helper ensures that shared dependencies don't
				// create a separate 'chunks' folder
				chunkFileNames: "[name]/[name].js",
			},
		},
	},
});
