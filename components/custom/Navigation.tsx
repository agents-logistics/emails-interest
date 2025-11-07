'use client';
import React, { FC, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '../ui/button';
import Link from 'next/link';

type NavigationProps = {
  consultid: string;
  onHide: () => void;
  userEmail?: string;
};
const Navigation: FC<NavigationProps> = ({ consultid, onHide, userEmail }) => {
 

  return (
    <div className="w-1/4 p-4 flex flex-col">
      <div className="flex items-center space-x-4">
        <Button 
            className="nav-button flex-grow items-center justify-center rounded-lg mt-2 pt-2 pb-2 bg-carevox text-white" 
            >
            Progenetics
        </Button>
        <Button onClick={onHide} className='nav-button flex items-center justify-center rounded-lg mt-2 pt-2 pb-2 bg-carevox border border-white text-white'>
          <img src="/images/nav.svg" alt="Icon" className="text-black" width={16}/>  
        </Button>
      </div>


      <div className="mt-8 flex flex-col space-y-4">
        <Link href="/dashboard" className="consult-history flex items-center justify-between cursor-pointer text-white p-2 rounded-lg text-xs hover:bg-gray-700">
          <div className="flex items-center">
            <img src="/images/calle-side.svg" alt="Icon" className="mr-2 icon-small" style={{ width: '12px', height: 'auto', marginRight: '8px' }}  /> 
            <span>Send Email</span>
          </div>
          <img src="/images/arrow.svg" alt="Icon" className="icon-small" />
        </Link>
        
        { (userEmail === 'agents@progenetics.co.il' || userEmail === 'dror@progenetics.co.il') && (
          <>
            <Link href="/addtests" className="consult-history flex items-center justify-between cursor-pointer text-white p-2 rounded-lg text-xs hover:bg-gray-700">
              <div className="flex items-center">
                <img src="/images/calle-summary-side.svg" alt="Icon" className="mr-2 icon-small" style={{ width: '12px', height: 'auto', marginRight: '8px' }}  /> 
                <span>Add Tests</span>
              </div>
              <img src="/images/arrow.svg" alt="Icon" className="icon-small" />
            </Link>

            <Link href="/edittests" className="consult-history flex items-center justify-between cursor-pointer text-white p-2 rounded-lg text-xs hover:bg-gray-700">
              <div className="flex items-center">
                <img src="/images/calle-summary-side.svg" alt="Icon" className="mr-2 icon-small" style={{ width: '12px', height: 'auto', marginRight: '8px' }}  /> 
                <span>Edit Tests</span>
              </div>
              <img src="/images/arrow.svg" alt="Icon" className="icon-small" />
            </Link>
            
            <Link href="/addtemplates" className="consult-history flex items-center justify-between cursor-pointer text-white p-2 rounded-lg text-xs hover:bg-gray-700">
              <div className="flex items-center">
                <img src="/images/calle-summary-side.svg" alt="Icon" className="mr-2 icon-small" style={{ width: '12px', height: 'auto', marginRight: '8px' }}  /> 
                <span>Add or Edit Templates </span>
              </div>
              <img src="/images/arrow.svg" alt="Icon" className="icon-small" />
            </Link>

            <Link href="/bloodTestLocation" className="consult-history flex items-center justify-between cursor-pointer text-white p-2 rounded-lg text-xs hover:bg-gray-700">
              <div className="flex items-center">
                <img src="/images/calle-summary-side.svg" alt="Icon" className="mr-2 icon-small" style={{ width: '12px', height: 'auto', marginRight: '8px' }}  /> 
                <span>Blood Test Locations</span>
              </div>
              <img src="/images/arrow.svg" alt="Icon" className="icon-small" />
            </Link>

            <Link href="/emailReceipents" className="consult-history flex items-center justify-between cursor-pointer text-white p-2 rounded-lg text-xs hover:bg-gray-700">
              <div className="flex items-center">
                <img src="/images/calle-summary-side.svg" alt="Icon" className="mr-2 icon-small" style={{ width: '12px', height: 'auto', marginRight: '8px' }}  /> 
                <span>CC Default Emails</span>
              </div>
              <img src="/images/arrow.svg" alt="Icon" className="icon-small" />
            </Link>

            <Link href="/signatures" className="consult-history flex items-center justify-between cursor-pointer text-white p-2 rounded-lg text-xs hover:bg-gray-700">
              <div className="flex items-center">
                <img src="/images/calle-summary-side.svg" alt="Icon" className="mr-2 icon-small" style={{ width: '12px', height: 'auto', marginRight: '8px' }}  /> 
                <span>Signatures</span>
              </div>
              <img src="/images/arrow.svg" alt="Icon" className="icon-small" />
            </Link>

            <Link href="/smartsheetmaps" className="consult-history flex items-center justify-between cursor-pointer text-white p-2 rounded-lg text-xs hover:bg-gray-700">
              <div className="flex items-center">
                <img src="/images/calle-summary-side.svg" alt="Icon" className="mr-2 icon-small" style={{ width: '12px', height: 'auto', marginRight: '8px' }}  /> 
                <span>Smartsheet Auto-Populate</span>
              </div>
              <img src="/images/arrow.svg" alt="Icon" className="icon-small" />
            </Link>
          </>
        )}

        <Link href="/settings" className="consult-history flex items-center justify-between cursor-pointer text-white p-2 rounded-lg text-xs hover:bg-gray-700">
          <div className="flex items-center">
            <img src="/images/calle-summary-side.svg" alt="Icon" className="mr-2 icon-small" style={{ width: '12px', height: 'auto', marginRight: '8px' }}  /> 
            <span>Settings</span>
          </div>
          <img src="/images/arrow.svg" alt="Icon" className="icon-small" />
        </Link>
      </div>
        
    </div>

  );
};

export default Navigation;
