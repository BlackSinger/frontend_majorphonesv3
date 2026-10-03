import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { initMetaPixel, isTrackedPath, trackPageView } from '../analytics/metaPixel';

// The app switches screens without reloading the page: send a PageView on every route change
const MetaPixelTracker: React.FC = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    if (!isTrackedPath(pathname)) return;
    initMetaPixel();
    trackPageView();
  }, [pathname]);

  return null;
};

export default MetaPixelTracker;
