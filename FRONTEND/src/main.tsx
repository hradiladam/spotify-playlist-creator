//FRONTEND/src/main.tsx

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App";


// Normalize host for local dev so PKCE sessionStorage survives redirect.
// If Netlify dev opens http://localhost:8888, jump to http://127.0.0.1:8888.
if (import.meta.env.DEV && location.hostname === "localhost") {
	const to = `${location.protocol}//127.0.0.1:${location.port}${location.pathname}${location.search}${location.hash}`;
	location.replace(to);
}

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<BrowserRouter>
			<App />
		</BrowserRouter>
	</StrictMode>
);
