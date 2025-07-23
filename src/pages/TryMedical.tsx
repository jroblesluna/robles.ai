import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { v4 as uuidv4 } from "uuid";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebaseConfig";

import XrayIcon from '@/assets/icons/x-ray.svg?react';
import UltrasoundIcon from '@/assets/icons/ultrasound.svg?react';
import RetinaIcon from '@/assets/icons/retina.svg?react';
import DermatologyIcon from '@/assets/icons/dermatology.svg?react';
import HistopathologyIcon from '@/assets/icons/histopathology.svg?react';

import { useTranslation } from "react-i18next";

const getBaseApi = () => {
    if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
        return `${window.location.protocol}//${window.location.hostname}:8080`;
    }
    return "https://medical-api.robles.ai";
};

const BASE_API = getBaseApi();

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
    xray: "bg-blue-600 hover:bg-blue-700",
    ultrasound: "bg-pink-600 hover:bg-pink-700",
    retina: "bg-green-600 hover:bg-green-700",
    dermatology: "bg-yellow-500 hover:bg-yellow-600 text-black",
    histopathology: "bg-purple-600 hover:bg-purple-700",
};

export default function TryMedical() {
    const [step, setStep] = useState(1);
    const [modality, setModality] = useState<string | null>(null);
    const [subtype, setSubtype] = useState<string | null>(null);
    const [images, setImages] = useState<File[]>([]);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);

    const { t } = useTranslation();

    const uploadImage = async (file: File, path: string) => {
        const storageRef = ref(storage, path);
        const snapshot = await uploadBytes(storageRef, file);
        return await getDownloadURL(snapshot.ref);
    };

    const handleAnalyze = async () => {
        try {
            setLoading(true);
            const uploadId = uuidv4();
            const uploadedUrls = await Promise.all(
                images.map((img, i) => uploadImage(img, `try-medical/${uploadId}/img-${i}.jpg`))
            );

            const payload = { modality, subtype, imageUrls: uploadedUrls };
            const res = await fetch(`${BASE_API}/medical/analyze`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const json = await res.json();
            setResult(json.data);
            setStep(5);
        } catch (err: any) {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const reset = () => {
        setStep(1);
        setModality(null);
        setSubtype(null);
        setImages([]);
        setResult(null);
    };

    return (
        <div className="p-6 space-y-6 max-w-4xl mx-auto">
            {step === 1 && (
                <div className="space-y-8">
                    <div className="text-center">
                        <h2 className="text-3xl font-bold text-gray-800">{t("try-medical.title")}</h2>
                        <p className="text-sm text-gray-500 mt-2">{t("try-medical.description")}</p>
                        <h3 className="mt-6 text-xl font-semibold text-gray-700">{t("try-medical.select_modality")}</h3>
                        <p className="text-sm text-gray-500">{t("try-medical.select_modality_instruction")}</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                        {modalityOptions.map(({ key, icon: Icon }) => (
                            <div
                                key={key}
                                className={`border rounded-2xl shadow-md p-5 hover:shadow-lg transition-all flex flex-col justify-between ${bgColors[key]}`}
                            >
                                <div className="space-y-2 text-center">
                                    <div className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-3 bg-white shadow-md">
                                        <Icon className={`w-8 h-8 ${iconColors[key]}`} />
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-800">
                                        {t(`try-medical.modalities.${key}.title`)}
                                    </h3>
                                    <p className="text-sm text-gray-500">
                                        {t(`try-medical.modalities.${key}.description`)}
                                    </p>
                                </div>

                                <div className="mt-4">
                                    <Button
                                        className={`w-full text-white font-bold rounded-xl ${buttonColors[key]}`}
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
                <div className="space-y-3">
                    <p>Select clinical subtype for {modality}:</p>
                    {(modality === "Ultrasound" ? ["Thyroid", "Breast", "Cardiac"] :
                        modality === "X-ray" ? ["Chest", "Bone"] :
                            modality === "Retina" ? ["Diabetic Retinopathy", "Macular Degeneration"] :
                                modality === "Dermatology" ? ["Skin Lesion", "Melanoma"] :
                                    ["Breast Cancer", "Lung Cancer", "Colon Cancer"]).map((s) => (
                                        <Button key={s} onClick={() => { setSubtype(s); setStep(3); }}>{s}</Button>
                                    ))}
                </div>
            )}

            {step === 3 && (
                <div className="space-y-3">
                    <p>Upload 1 or more images (JPG/PNG):</p>
                    <Input type="file" multiple accept="image/*" onChange={(e) => setImages(Array.from(e.target.files || []))} />
                    <Button onClick={() => setStep(4)} disabled={images.length === 0}>Next</Button>
                </div>
            )}

            {step === 4 && (
                <div className="space-y-3">
                    <p>Ready to analyze {images.length} image(s)?</p>
                    <Button onClick={handleAnalyze} disabled={loading}>{loading ? "Analyzing..." : "Run AI Analysis"}</Button>
                </div>
            )}

            {step === 5 && result && (
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold">Results</h2>
                    {result.images?.map((img: any, i: number) => (
                        <div key={i} className="border p-3 rounded">
                            <img src={img.image_url} className="w-full max-h-64 object-contain mb-2" />
                            <div className="text-sm">Label: <strong>{img.label}</strong> ({(img.confidence * 100).toFixed(1)}%)</div>
                        </div>
                    ))}
                    <div className="font-bold">Summary Diagnosis: {result.summary}</div>
                    <Button variant="secondary" onClick={reset}>Start New Case</Button>
                    <div className="text-xs text-yellow-700 bg-yellow-100 p-2 rounded">
                        ⚠️ This demo is for educational use only and not a medical device.
                    </div>
                </div>
            )}
        </div>
    );
}
