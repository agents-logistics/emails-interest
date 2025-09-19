'use client';
import styles from '@/styles/ContentArea.module.css';  
import React,{ FC  } from 'react';
import { Button } from '../ui/button';
import { SignOut } from '@/components/auth/sign-out';


type ContentAreaProps = {
  onShowNavigation: () => void;
  showNavigation: boolean;
};

const SettingsContentArea: FC<ContentAreaProps> = ({ onShowNavigation, showNavigation }) => {

  return (
    <div className={`${styles.customRounded} flex flex-col items-center p-4 bg-white shadow-lg rounded-lg w-full h-full`}>
      <div className="w-full flex items-start mb-4">
        {!showNavigation && (
          <div className="">
            <Button onClick={onShowNavigation} className="items-start mr-2 flex-shrink-0 bg-carevox text-white">
              <img src="/images/nav.svg" alt="Icon" className="text-white" width={24}/>  
            </Button>
          </div>
        )}
      </div>
      <SignOut />

    </div>
  );
  
};

export default SettingsContentArea;
