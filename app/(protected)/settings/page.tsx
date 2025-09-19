'use client';
import {  FC, useEffect, useState } from 'react';
import Navigation from '@/components/custom/Navigation';
import SettingsContentArea from '@/components/custom/SettingsContentArea';

const SettingsPage: FC = () => {
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
      <SettingsContentArea onShowNavigation={handleShowNavigation} showNavigation={showNavigation} />
    </div>
  );
};

export default SettingsPage;
