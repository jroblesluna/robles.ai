import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Stethoscope, Clock } from "lucide-react";

import XrayIcon from '@/assets/icons/x-ray.svg?react';
import UltrasoundIcon from '@/assets/icons/ultrasound.svg?react';
import RetinaIcon from '@/assets/icons/retina.svg?react';
import DermatologyIcon from '@/assets/icons/dermatology.svg?react';
import HistopathologyIcon from '@/assets/icons/histopathology.svg?react';

import { useTranslation } from "react-i18next";
import { DemoNav } from "@/components/demo/DemoNav";

const modalityOptions = [
    {
        key: "xray",
        icon: XrayIcon,
    },
    {
        key: "ultrasound",
        icon: UltrasoundIcon,
    },
    {
        key: "retina",
        icon: RetinaIcon,
    },
    {
        key: "dermatology",
        icon: DermatologyIcon,
    },
    {
        key: "histopathology",
        icon: HistopathologyIcon,
    },
];

const iconColors: Record<string, string> = {
    xray: "text-blue-600",
    ultrasound: "text-pink-600",
    retina: "text-green-600",
    dermatology: "text-yellow-500",
    histopathology: "text-purple-600",
};

const bgColors: Record<string, string> = {
    xray: "bg-blue-50",
    ultrasound: "bg-pink-50",
    retina: "bg-green-50",
    dermatology: "bg-yellow-50",
    histopathology: "bg-purple-50",
};

const cardColors: Record<string, string> = {
    xray: "bg-blue-50",
    ultrasound: "bg-pink-50",
    retina: "bg-green-50",
    dermatology: "bg-yellow-50",
    histopathology: "bg-purple-50",
};

const buttonColors: Record<string, string> = {
    xray: "bg-blue-600/80 hover:bg-blue-700/80",
    ultrasound: "bg-pink-600/80 hover:bg-pink-700/80",
    retina: "bg-green-600/80 hover:bg-green-700/80",
    dermatology: "bg-yellow-500/80 hover:bg-yellow-600/80 text-black",
    histopathology: "bg-purple-600/80 hover:bg-purple-700/80",
};

export default function TryMedical() {
    const [step, setStep] = useState(1);
    const [modality, setModality] = useState<string | null>(null);
    const [subtype, setSubtype] = useState<string | null>(null);
    const [images, setImages] = useState<File[]>([]);

    const { t } = useTranslation();

    const reset = () => {
        setStep(1);
        setModality(null);
        setSubtype(null);
        setImages([]);
    };

    return (
        <div className="bg-white min-h-screen py-12">
            <div className="container mx-auto px-6 max-w-[max(72rem,70vw)]">
                <DemoNav tone="emerald" className="mb-8" />
                <div className="mb-10">
                    <div className="flex flex-col sm:flex-row items-center sm:items-center text-center sm:text-left gap-4 sm:gap-5">
                        <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-[6.5rem] md:h-[6.5rem] rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-sm shrink-0">
                            <Stethoscope className="h-10 w-10 sm:h-12 sm:w-12 md:h-[3.25rem] md:w-[3.25rem]" />
                        </div>
                        <div className="flex flex-col justify-center">
                            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2">{t("try-medical.title")}</h1>
                            <p className="text-gray-600 text-sm sm:text-base">{t("try-medical.description")}</p>
                        </div>
                    </div>
                </div>

                {step === 1 && (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">{t("try-medical.select_modality")}</h2>
                            <p className="text-sm text-gray-600">{t("try-medical.select_modality_instruction")}</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                            {modalityOptions.map(({ key, icon: Icon }) => (
                                <div
                                    key={key}
                                    className="bg-white rounded-xl shadow-md border border-gray-200 p-5 hover:shadow-lg transition-shadow flex flex-col justify-between"
                                >
                                    <div className="space-y-2 text-center">
                                        <div className={`w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-3 ${bgColors[key]}`}>
                                            <Icon className={`w-8 h-8 ${iconColors[key]}`} />
                                        </div>
                                        <h3 className="text-lg font-semibold text-gray-900">
                                            {t(`try-medical.modalities.${key}.title`)}
                                        </h3>
                                        <p className="text-sm text-gray-600">
                                            {t(`try-medical.modalities.${key}.description`)}
                                        </p>
                                    </div>

                                    <div className="mt-4">
                                        <Button
                                            className={`w-full text-white font-medium rounded-lg shadow-sm ${buttonColors[key]}`}
                                            onClick={() => {
                                                setModality(key);
                                                setStep(2);
                                            }}
                                        >
                                            {t("try-medical.select", {
                                                modality: t(`try-medical.modalities.${key}.title`),
                                            })}
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {step === 2 && modality && (
                    <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 space-y-3">
                        <h2 className="text-sm font-semibold text-gray-900">{t("try-medical.select_subtype")}</h2>
                        <div className="flex flex-wrap gap-2">
                            {(t(`try-medical.modalities.${modality}.subtypes`, { returnObjects: true }) as string[]).map((s) => (
                                <Button
                                    key={s}
                                    variant="outline"
                                    className="border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg"
                                    onClick={() => { setSubtype(s); setStep(3); }}
                                >
                                    {s}
                                </Button>
                            ))}
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 space-y-3">
                        <h2 className="text-sm font-semibold text-gray-900">{t("try-medical.upload_images")}</h2>
                        <Input
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={(e) => setImages(Array.from(e.target.files || []))}
                            className="rounded-lg border-gray-300"
                        />
                        <Button
                            onClick={() => setStep(4)}
                            disabled={images.length === 0}
                            className="bg-blue-600/80 hover:bg-blue-700/80 text-white rounded-lg font-medium shadow-sm"
                        >
                            {t("try-medical.next")}
                        </Button>
                    </div>
                )}

                {step === 4 && (
                    // No backend yet: the demo is "coming soon" in the catalog. Images stay
                    // in the browser — nothing is uploaded or stored anywhere.
                    <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 space-y-4">
                        <p className="text-sm text-gray-600">{t("try-medical.upload_images")}: {images.length}</p>
                        <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 text-amber-900 text-sm rounded-lg p-4">
                            <Clock className="h-4 w-4 mt-0.5 shrink-0 text-amber-500" />
                            <p>{t("try-medical.coming_soon")}</p>
                        </div>
                        <Button
                            variant="outline"
                            onClick={reset}
                            className="border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg"
                        >
                            {t("try-medical.results.start_new")}
                        </Button>
                    </div>
                )}

            </div>
        </div>
    );
}
