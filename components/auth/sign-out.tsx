'use client';

import React, { useEffect, useState } from 'react';
import { signOut } from "next-auth/react";
import { Button } from "../ui/button";
import { HOME_PAGE } from "@/routes";
import { Card } from '@/components/ui/card';

export const SignOut = () => {
    const onClick = () => {
        signOut({
            callbackUrl: HOME_PAGE
        });
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }} className='text-black'>
            <Card style={{ padding: '2rem', boxShadow: '0 0 15px rgba(0,0,0,0.1)', borderRadius: '8px', width: '100%', maxWidth: '600px' }}>
                <div className="flex flex-col items-center w-full gap-y-4">
                    <h1 className="text-2xl font-bold text-blue-500 mb-4">Settings</h1>
                    <div className="flex items-center w-full gap-x-2 mt-12">
                        <Button size="lg" className="w-full bg-blue-500 text-white" variant="outline" onClick={onClick}>
                            Sign out
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
};
