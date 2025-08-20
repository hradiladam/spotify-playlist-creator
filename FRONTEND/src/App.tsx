//FRONTEND/src/App.tsx

import { Routes, Route } from "react-router-dom";
import { Home } from "@/pages/home/Home";
import { Callback } from "@/pages/Callback";

export default function App() {
	return (
		<Routes>
			<Route path="/" element={<Home />} />
			<Route path="/callback" element={<Callback />} />
		</Routes>
	);
}
