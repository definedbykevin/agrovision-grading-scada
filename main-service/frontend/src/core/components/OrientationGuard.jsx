import React, { useState, useEffect } from 'react';
import './OrientationGuard.css';

const OrientationGuard = () => {
  const [isPortrait, setIsPortrait] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      const portrait = window.innerHeight > window.innerWidth;
      const isMobile = window.innerWidth <= 1024; // Tablet and Phone
      setIsPortrait(portrait && isMobile);
    };

    // Initial check
    checkOrientation();

    // Listen to resize/orientation change
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  if (!isPortrait) return null;

  return (
    <div className={`orientation-guard-overlay ${isPortrait ? 'active' : ''}`}>
      <div className="phone-animation-container">
        <div className="phone-icon"></div>
      </div>
      <h2 className="orientation-title">PLEASE ROTATE DEVICE</h2>
      <p className="orientation-text">
        This industrial dashboard is optimized for landscape perspective.
      </p>
    </div>
  );
};

export default OrientationGuard;
