'use client';
import {  FC, useEffect, useState } from 'react';
import Navigation from '@/components/custom/Navigation';
import EmailReceipentsContentArea from '@/components/custom/EmailReceipentsContentArea';

const EmailReceipentsPage: FC = () => {
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
      <EmailReceipentsContentArea onShowNavigation={handleShowNavigation} showNavigation={showNavigation} />
    </div>
  );
};

export default EmailReceipentsPage;
