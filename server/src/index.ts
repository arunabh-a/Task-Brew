import { app } from "./app.js";

const PORT = process.env.PORT || 3000;
const RENDER_URL = process.env.RENDER_URL; // e.g., https://your-app.onrender.com

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);

    // Self-ping to keep the server alive on Render (every 14 minutes)
    if (RENDER_URL) {
        setInterval(
            async () => {
                try {
                    const response = await fetch(`${RENDER_URL}/health`);
                    if (response.ok) {
                        console.log(
                            `Self-ping successful at ${new Date().toISOString()}`,
                        );
                    }
                } catch (error) {
                    console.error("Self-ping failed:", error);
                }
            },
            14 * 60 * 1000,
        ); // 14 minutes in milliseconds
    }
});

export default app;
