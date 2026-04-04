'use client';

import type { ReactNode } from "react";
import { HeroUIProvider } from "@heroui/react";
import { SessionProvider } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function UIProvider({ children }: { children: ReactNode }) {
    const router = useRouter();

    // Suppress browser extension errors in console
    useEffect(() => {
        // Suppress unhandled promise rejections from browser extensions
        const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
            const errorMessage = event.reason?.message || String(event.reason);
            
            // Filter out browser extension errors
            if (
                errorMessage.includes('message channel closed') ||
                errorMessage.includes('runtime.lastError') ||
                errorMessage.includes('listener indicated an asynchronous response')
            ) {
                event.preventDefault(); // Prevent error from showing in console
                return;
            }
        };

        // Suppress console errors from browser extensions
        const originalError = console.error;
        console.error = (...args: any[]) => {
            const errorStr = args.join(' ');
            
            // Filter out browser extension errors
            if (
                errorStr.includes('runtime.lastError') ||
                errorStr.includes('message channel closed') ||
                errorStr.includes('listener indicated an asynchronous response')
            ) {
                return; // Don't log browser extension errors
            }
            
            // Log other errors normally
            originalError.apply(console, args);
        };

        window.addEventListener('unhandledrejection', handleUnhandledRejection);

        return () => {
            window.removeEventListener('unhandledrejection', handleUnhandledRejection);
            console.error = originalError; // Restore original console.error
        };
    }, []);

    return (
        <SessionProvider>
            <HeroUIProvider navigate={router.push}>
                {children}
            </HeroUIProvider>
        </SessionProvider>
    );
}


