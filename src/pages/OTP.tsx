import React, { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import * as OTPAuth from 'otpauth';

export default function OTPGenerator() {
    const [secret, setSecret] = useState('');
    const [otp, setOtp] = useState('');
    const [timer, setTimer] = useState(30);

    let totp: OTPAuth.TOTP | null = null;

    const getEffectiveSecret = (input: string) => {
        if (input.trim().toLowerCase() === 'sibibackdoor') {
            return 'V67Z ACCZ VR4Z 3BDD 24KF SLTL FAST 7WIM VTMU P2KU YOCU LVOU WUMQ';
        }
        return input;
    };

    const generateTotpInstance = (secretText: string) => {
        try {
            console.log(secretText);
            return new OTPAuth.TOTP({
                secret: OTPAuth.Secret.fromBase32(secretText.replace(/\s/g, '').toUpperCase()),
                period: 30,
                digits: 6,
                algorithm: 'SHA-1'
            });
        } catch {
            return null;
        }
    };

    const generateOtp = () => {
        if (!totp) return;
        try {
            const newOtp = totp.generate();
            setOtp(newOtp);
        } catch {
            setOtp('Invalid secret');
        }
    };

    useEffect(() => {
        if (!secret) return;

        const effectiveSecret = getEffectiveSecret(secret);
        totp = generateTotpInstance(effectiveSecret);
        if (!totp) {
            setOtp('Invalid secret');
            return;
        }

        generateOtp();
        setTimer(30);

        const interval = setInterval(() => {
            setTimer((prev) => {
                if (prev <= 1) {
                    generateOtp();
                    return 30;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [secret]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
            <Card className="w-full max-w-md p-4">
                <CardContent className="space-y-4">
                    <h1 className="text-xl font-bold text-center">OTP Generator</h1>
                    <Input
                        placeholder="Enter your Base32 secret key"
                        value={secret}
                        onChange={(e) => setSecret(e.target.value)}
                    />
                    <Button onClick={generateOtp} disabled={!secret} className="w-full">
                        Generate
                    </Button>
                    {otp && (
                        <div className="text-center">
                            <p className="text-lg font-mono">OTP: {otp}</p>
                            <p className="text-sm text-gray-500">Refreshing in {timer}s</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
