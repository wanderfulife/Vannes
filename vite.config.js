import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
	plugins: [vue()],
	build: {
		rollupOptions: {
			output: {
				manualChunks: {
					// Example: Split 'node_modules' into a separate chunk
					vendor: ["vue", "vue-router", "vuex"],
				},
			},
		},
		chunkSizeWarningLimit: 1000, // Adjust the limit as needed
	},
});
