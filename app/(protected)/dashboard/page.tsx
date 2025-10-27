'use client';
import {  FC, useState, useEffect } from 'react';
import Navigation from '@/components/custom/Navigation';
import IndexContentArea from '@/components/custom/IndexContentArea';

const Home: FC = () => {
  const [showNavigation, setShowNavigation] = useState<boolean>(true);
  const [userEmail, setUserEmail] = useState<string>('');
  
  const handleHideNavigation = (): void => {
    setShowNavigation(false);
  };

  const handleShowNavigation = (): void => {
    setShowNavigation(true);
  };

  useEffect(() => {
    const loadUserSession = async () => {
      try {
        const res = await fetch('/api/auth/session');
        const session = await res.json();
        if (session?.user?.email) {
          setUserEmail(session.user.email);
        }
      } catch (e: any) {
        console.error('Failed to load user session:', e);
      }
    };
    loadUserSession();
  }, []);

  return (
    <div className='flex bg-carevox h-screen'>
      {showNavigation && <Navigation consultid='' onHide={handleHideNavigation} userEmail={userEmail} />}
      <IndexContentArea onShowNavigation={handleShowNavigation} showNavigation={showNavigation} />
    </div>
  );
};

export default Home;
