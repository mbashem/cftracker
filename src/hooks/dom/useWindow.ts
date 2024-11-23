import { useState, useEffect } from 'react';

function useWindow() {
	const [windowStats, setWindowStats] = useState<{ height: number; width: number; }>({ width: window.innerWidth, height: window.innerHeight });

	useEffect(() => {
		// Update the window width on resize
		const handleResize = () => {
			setWindowStats({ width: window.innerWidth, height: window.innerHeight });
		};

		// Add event listener for window resize
		window.addEventListener('resize', handleResize);

		// Clean up the event listener when the component is unmounted
		return () => {
			window.removeEventListener('resize', handleResize);
		};
	}, []);

	return windowStats;
};

export default useWindow;
