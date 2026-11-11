import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook to manage Coordinate Picker logic across any SVG-based page.
 * @param {React.MutableRefObject} svgRef - Reference to the SVG element.
 */
export function useCoordinatePicker(svgRef) {
    const [isCoordMode, setIsCoordMode] = useState(false);
    const [capturedCoords, setCapturedCoords] = useState([]);
    const [panelSide, setPanelSide] = useState('right');
    const [isPanelMinimized, setIsPanelMinimized] = useState(false);

    // Toggle mode
    const toggleCoordMode = useCallback(() => {
        setIsCoordMode(prev => {
            if (!prev) {
                console.log('%c Coordinate Picker Activated (Press P to exit) ', 'background: #39FF14; color: #000; font-weight: bold;');
            }
            return !prev;
        });
    }, []);

    // Handle keydown events
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key.toLowerCase() === 'p') {
                toggleCoordMode();
            }
            if (!isCoordMode) return;

            if (e.key === 'Escape') {
                setIsCoordMode(false);
            }
            if (e.key.toLowerCase() === 'c') {
                setCapturedCoords([]);
            }
            if (e.key === 'Backspace' && capturedCoords.length > 0) {
                setCapturedCoords(prev => prev.slice(0, -1));
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isCoordMode, capturedCoords, toggleCoordMode]);

    // Function to handle SVG click and capture coordinates
    const handleSvgClick = useCallback((e) => {
        if (!isCoordMode || !svgRef.current) return;

        const svg = svgRef.current;
        const pt = svg.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;

        const svgP = pt.matrixTransform(svg.getScreenCTM().inverse());
        const newCoord = { x: Math.round(svgP.x), y: Math.round(svgP.y) };

        setCapturedCoords(prev => [...prev, newCoord]);
    }, [isCoordMode, svgRef]);

    // Generate Path D string
    const pathD = capturedCoords.length > 0
        ? `M ${capturedCoords[0].x} ${capturedCoords[0].y} ` + 
          capturedCoords.slice(1).map(c => `L ${c.x} ${c.y}`).join(' ')
        : '';

    const copyPathToClipboard = () => {
        if (!pathD) return;
        navigator.clipboard.writeText(pathD);
        return true; // Used by UI to show "Copied" state
    };

    return {
        isCoordMode,
        setIsCoordMode,
        capturedCoords,
        setCapturedCoords,
        panelSide,
        setPanelSide,
        isPanelMinimized,
        setIsPanelMinimized,
        handleSvgClick,
        pathD,
        copyPathToClipboard,
        toggleCoordMode
    };
}
