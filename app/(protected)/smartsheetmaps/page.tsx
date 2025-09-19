'use client';
import {  FC, useState } from 'react';
import Navigation from '@/components/custom/Navigation';
import SmartsheetMapsContentArea from '@/components/custom/SmartsheetMapsContentArea';

const Home: FC = () => {
  const [showNavigation, setShowNavigation] = useState<boolean>(true);
  const handleHideNavigation = (): void => {
    setShowNavigation(false);
  };

  const handleShowNavigation = (): void => {
    setShowNavigation(true);
  };

  return (
    <div className='flex bg-carevox h-screen'>
      {showNavigation && <Navigation consultid='' onHide={handleHideNavigation} />}
      <SmartsheetMapsContentArea onShowNavigation={handleShowNavigation} showNavigation={showNavigation} />
    </div>
  );
};

export default Home;
