'use client';
import {  FC, useEffect, useState } from 'react';
import Navigation from '@/components/custom/Navigation';
import EditTestsContentArea from '@/components/custom/EditTestsContentArea';

const EditTestsPage: FC = () => {
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
      <EditTestsContentArea onShowNavigation={handleShowNavigation} showNavigation={showNavigation} />
    </div>
  );
};

export default EditTestsPage;
