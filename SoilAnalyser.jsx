// src/pages/SoilAnalyser.jsx
import React, { useEffect, useRef, useState } from "react";
import { Mic, Camera } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import "../styles/DiseaseSolution.css";

export default function SoilAnalyser() {
  const navigate = useNavigate();
  const { t, language } = useLanguage(); // ✅ SAME AS MANDI PRICE

  // image + preview
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const audioPlayerRef = useRef(null);
  const audioObjectUrlRef = useRef(null);

  // optional crop name + voice
  const [cropName, setCropName] = useState("");
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  // hidden inputs refs
  const quickCaptureInputRef = useRef(null);
  const imageUploadInputRef = useRef(null);

  const [resultData, setResultData] = useState(null);

  // backend config
  const BACKEND_HOSTS = ["https://soil-advisor-335197944718.asia-south1.run.app"];
  const RECOMMEND_PATH = "/recommend";

  // ✅ CROP OPTIONS LIKE MANDI PRICE (for dropdown if needed later)
  const cropOptions = {
    en: { tomato: "Tomato", wheat: "Wheat", rice: "Rice" },
    hi: { tomato: "टमाटर", wheat: "गेहूं", rice: "चावल" },
    bn: { tomato: "টমেটো", wheat: "গম", rice: "চাল" },
    pa: { tomato: "ਟਮਾਟਰ", wheat: "ਗੇਹੂੰ", rice: "ਚਾਉਲ" }
  };

  // Speech language mapping
  const speechLangMap = {
    en: "en-IN",
    hi: "hi-IN",
    bn: "bn-IN",
    pa: "pa-IN"
  };

  const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const res = reader.result;
        if (typeof res === "string") {
          const base64 = res.split(",")[1];
          resolve(base64);
        } else resolve(null);
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });

  const fetchAndAttachAudio = async (url) => {
    try {
      if (!url) return;
      const res = await fetch(url);
      if (!res.ok) {
        console.warn("Failed to fetch audio:", res.status);
        return;
      }
      const blob = await res.blob();

      if (audioObjectUrlRef.current) {
        try {
          URL.revokeObjectURL(audioObjectUrlRef.current);
        } catch (e) {}
        audioObjectUrlRef.current = null;
      }

      const objUrl = URL.createObjectURL(blob);
      audioObjectUrlRef.current = objUrl;
      setAudioUrl(objUrl);

      if (audioPlayerRef.current) {
        audioPlayerRef.current.src = objUrl;
        audioPlayerRef.current.load();
        setTimeout(() => {
          if (!audioPlayerRef.current) return;
          const p = audioPlayerRef.current.play();
          if (p && p.catch) {
            p.catch((err) => console.warn("Autoplay blocked:", err));
          }
        }, 300);
      }
    } catch (e) {
      console.error("Error fetching/attaching audio:", e);
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setImagePreview(URL.createObjectURL(file));
      setAnalysis(null);
      setError("");
      setAudioUrl("");
      setResultData(null);
      if (audioObjectUrlRef.current) {
        try {
          URL.revokeObjectURL(audioObjectUrlRef.current);
        } catch (e) {}
        audioObjectUrlRef.current = null;
      }
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current.src = "";
      }
    }
  };

  const clearImage = () => {
    setSelectedFile(null);
    setImagePreview("");
    setAnalysis(null);
    setError("");
    setAudioUrl("");
    setResultData(null);
    if (audioObjectUrlRef.current) {
      try {
        URL.revokeObjectURL(audioObjectUrlRef.current);
      } catch (e) {}
      audioObjectUrlRef.current = null;
    }
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.src = "";
    }
  };

  const triggerQuickCapture = () => {
    quickCaptureInputRef.current?.click();
  };

  const triggerImageUpload = () => {
    imageUploadInputRef.current?.click();
  };

  // ✅ SPEECH RECOGNITION WITH LANGUAGE FROM CONTEXT
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition || null;
    if (!SpeechRecognition) {
      recognitionRef.current = null;
      return;
    }

    const recog = new SpeechRecognition();
    recog.lang = speechLangMap[language] || "hi-IN";
    recog.interimResults = false;
    recog.maxAlternatives = 1;

    recog.onresult = (event) => {
      const transcript = event.results[0][0].transcript.trim();
      setCropName((prev) => (prev ? `${prev} ${transcript}` : transcript));
    };

    recog.onerror = (ev) => {
      console.warn("Speech recognition error:", ev);
      setIsListening(false);
    };

    recog.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recog;
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, [language]); // ✅ Re-runs when language changes

  const toggleListening = () => {
    const recog = recognitionRef.current;
    if (!recog) {
      alert(t("voiceNotSupported") || "Voice recognition not supported in this browser.");
      return;
    }

    if (isListening) {
      try {
        recog.stop();
      } catch (e) {
        console.warn(e);
      }
      setIsListening(false);
    } else {
      try {
        recog.start();
        setIsListening(true);
      } catch (e) {
        console.warn("Could not start recognition:", e);
      }
    }
  };

  const postRecommend = async (payload) => {
    let lastErr = null;
    for (const host of BACKEND_HOSTS) {
      try {
        const res = await fetch(`${host}${RECOMMEND_PATH}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(`Error ${res.status} from ${host}: ${txt}`);
        }
        const data = await res.json();
        return { data, baseHost: host };
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr;
  };

  // ✅ BACKEND GETS LANGUAGE FROM CONTEXT (SAME AS MANDI PRICE)
  const handleSubmit = async () => {
    if (!selectedFile) {
      alert(t("uploadSoilImage") || "Please upload or capture a soil image.");
      return;
    }

    setIsProcessing(true);
    setError("");
    setAnalysis(null);
    setAudioUrl("");
    setResultData(null);

    try {
      const base64 = await fileToBase64(selectedFile);

      const payload = {
        soil_image_base64: base64,
        crop_name: cropName && cropName.trim().length > 0 ? cropName.trim() : "",
        language: language, // ✅ SAME AS MANDI PRICE - from context
      };

      const { data, baseHost } = await postRecommend(payload);

      setAnalysis({
        soilType: data.soil_type || data.predicted_class || "Unknown",
        ph: data.ph ?? null,
        nutrients: data.nutrients || [],
        recommendation: data.recommendation || "",
      });

      if (data.tts_audio_url) {
        const fullUrl =
          data.tts_audio_url.startsWith("http")
            ? data.tts_audio_url
            : `${baseHost}${data.tts_audio_url}`;
        await fetchAndAttachAudio(fullUrl);
      }

      setResultData(data);
    } catch (err) {
      console.error(err);
      setError(err.message || (t("analysisError") || "Something went wrong while analyzing the image."));
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    return () => {
      if (audioObjectUrlRef.current) {
        try {
          URL.revokeObjectURL(audioObjectUrlRef.current);
        } catch (e) {}
        audioObjectUrlRef.current = null;
      }
    };
  }, []);

  return (
    <div className="disease-page" style={{ fontSize: 16 }}>
      {/* ✅ HEADER WITH TRANSLATIONS FROM CONTEXT */}
      <header className="disease-topbar">
        <div className="disease-topbar-left">
          <div className="disease-logo">
            <span className="disease-logo-icon">🧪</span>
          </div>
          <div className="disease-topbar-text">
            <h1 className="disease-title">{t("soilAnalyzer") || "Soil Analyzer"}</h1>
            <p className="disease-subtitle">{t("aiSoilDiagnostics") || "AI-Powered Soil Diagnostics"}</p>
          </div>
        </div>
      </header>

      <main className="disease-main">
        <section className="disease-card disease-upload-card">
          <div className="disease-upload-header">
            <div className="disease-upload-header-icon">📷</div>
            <h2 className="disease-upload-title">{t("uploadSoilImage") || "Upload Soil Image"}</h2>
          </div>

          <div className="disease-drop-wrapper">
            <div className={`disease-dropzone ${imagePreview ? "disease-dropzone-has-image" : ""}`}>
              {!imagePreview && (
                <div className="disease-drop-inner">
                  <div className="disease-drop-icon">🖼️</div>
                  <p className="disease-drop-title">{t("dropImageHere") || "Drop your image here"}</p>
                  <p className="disease-drop-subtitle">
                    {t("orUseButtons") || "or use the buttons below"}
                  </p>
                </div>
              )}

              {imagePreview && (
                <>
                  <img src={imagePreview} alt="Selected soil" className="disease-drop-image" />
                  <button type="button" className="disease-drop-clear" onClick={clearImage}>✕</button>
                </>
              )}
            </div>
          </div>

          <input
            ref={quickCaptureInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="disease-file-input"
            onChange={handleFileChange}
          />
          <input
            ref={imageUploadInputRef}
            type="file"
            accept="image/*"
            className="disease-file-input"
            onChange={handleFileChange}
          />

          {/* ✅ CROP INPUT WITH TRANSLATIONS */}
          <div style={{ marginTop: 16 }}>
            <label className="disease-label" htmlFor="soilCrop">
              {t("cropName") || "Crop name"} <span className="disease-optional">{t("optional") || "(optional)"}</span>
            </label>

            <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 6 }}>
              <input
                id="soilCrop"
                type="text"
                className="disease-crop-input"
                placeholder={t("cropPlaceholder") || "e.g. Tomato, Wheat — you can also use voice"}
                value={cropName}
                onChange={(e) => setCropName(e.target.value)}
                style={{
                  flex: 1,
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: "1px solid #e6e9ea",
                  fontSize: 15,
                }}
              />
              <button
                type="button"
                onClick={toggleListening}
                className={`disease-btn-voice ${isListening ? "listening" : ""}`}
                title={t("voiceCropInput") || "Use voice to enter crop name"}
                style={{
                  background: isListening ? "#2563eb" : "#3b82f6",
                  color: "white",
                  borderRadius: 12,
                  padding: "10px 12px",
                  border: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                aria-pressed={isListening}
              >
                <Mic size={16} />
              </button>
            </div>

            <small style={{ display: "block", marginTop: 8, color: "#6b6b6b" }}>
              {t("cropHelp") || "Leave empty to run soil analysis without crop-specific logic."}
            </small>
          </div>

          <div className="disease-upload-actions" style={{ marginTop: 18 }}>
            <button type="button" className="disease-btn-outline" onClick={triggerImageUpload}>
              <span className="disease-btn-icon">⤴️</span>
              {t("uploadImage") || "Upload Image"}
            </button>
            <button type="button" className="disease-btn-solid" onClick={triggerQuickCapture}>
              <span className="disease-btn-icon">📷</span>
              {t("takePhoto") || "Take Photo"}
            </button>
          </div>

          <button
            type="button"
            className={`disease-analyze-btn ${!selectedFile || isProcessing ? "disease-analyze-btn-disabled" : ""}`}
            onClick={handleSubmit}
            disabled={!selectedFile || isProcessing}
            style={{ marginTop: 18 }}
          >
            {isProcessing ? (t("analyzing") || "Analyzing Soil…") : (t("analyzeSoil") || "Analyze Soil")}
          </button>
        </section>

        <section className="disease-card disease-tips-card">
          <div className="disease-tips-header">
            <div className="disease-tips-icon">ℹ️</div>
            <h3 className="disease-tips-title">{t("tipsTitle") || "Tips for Best Results"}</h3>
          </div>
          <ul className="disease-tips-list">
            <li>{t("tip1") || "Take a close, clear photo of the soil surface."}</li>
            <li>{t("tip2") || "Avoid shadows and ensure even lighting."}</li>
            <li>{t("tip3") || "If you know the crop, add the crop name — it's optional."}</li>
          </ul>
        </section>

        {error && (
          <section className="disease-error-card">
            <span className="disease-error-dot">!</span>
            <span>{error}</span>
          </section>
        )}

        {/* ✅ RESULTS WITH TRANSLATIONS */}
        {resultData && (
          <div className="result-stack" style={{ marginTop: 20 }}>
            <section className="card card-main">
              <div className="card-main-header">
                <div className="card-main-left">
                  <div className="card-main-icon">🧪</div>
                  <div>
                    <p className="card-main-label">{t("analysisComplete") || "Soil Analysis Complete"}</p>
                    <h2 className="card-main-title">
                      {resultData.soil_type} · {resultData.soil_moisture}
                    </h2>
                  </div>
                </div>
              </div>
            </section>

            {resultData.tts_audio_url && (
              <section className="card card-audio">
                <div className="card-row-head">
                  <span className="card-icon purple">🔊</span>
                  <div>
                    <p className="card-title">{t("listenReport") || "Listen to Soil Report"}</p>
                    <p className="card-sub">
                      {t("audioAutoStart") || "Audio will start automatically. Use the buttons to stop or play again."}
                    </p>
                  </div>
                </div>
                <audio
                  controls
                  autoPlay
                  src={audioUrl}
                  style={{ width: "100%", marginTop: "10px" }}
                  ref={audioPlayerRef}
                />
                <div className="audio-custom-controls" style={{ marginTop: 8 }}>
                  <button
                    type="button"
                    className="audio-btn stop"
                    onClick={() => {
                      if (audioPlayerRef.current) {
                        audioPlayerRef.current.pause();
                        audioPlayerRef.current.currentTime = 0;
                      }
                    }}
                  >
                    {t("stopAudio") || "⏹ Stop audio"}
                  </button>
                  <button
                    type="button"
                    className="audio-btn play"
                    onClick={() => {
                      if (audioPlayerRef.current) {
                        audioPlayerRef.current.currentTime = 0;
                        audioPlayerRef.current.play();
                      }
                    }}
                  >
                    {t("playAgain") || "🔁 Play again"}
                  </button>
                </div>
              </section>
            )}

            <section className="card">
              <div className="card-row-head">
                <span className="card-icon blue">📋</span>
                <div>
                  <p className="card-title">{t("summary") || "Summary"}</p>
                  <p className="card-sub">{resultData.summary}</p>
                </div>
              </div>
            </section>

            <section className="card">
              <div className="card-row-head">
                <span className="card-icon green">💧</span>
                <div>
                  <p className="card-title">{t("irrigationAdvice") || "Irrigation Advice"}</p>
                  <p className="card-sub">{resultData.moisture_advice}</p>
                </div>
              </div>
            </section>

            <section className="card">
              <div className="card-row-head">
                <span className="card-icon yellow">🌱</span>
                <div>
                  <p className="card-title">{t("soilQuality") || "Soil Quality"}</p>
                  <p className="card-sub">{resultData.soil_quality}</p>
                </div>
              </div>
            </section>

            {resultData.crop_name && (
              <section className="card">
                <div className="card-row-head">
                  <span className="card-icon orange">🌾</span>
                  <div>
                    <p className="card-title">
                      {t("suitabilityFor") || "Suitability for"} {resultData.crop_name}
                    </p>
                    <p className="card-sub">{resultData.crop_suitability}</p>
                    {resultData.better_crops_line && (
                      <p className="card-sub" style={{ marginTop: "4px" }}>
                        {resultData.better_crops_line}
                      </p>
                    )}
                  </div>
                </div>
              </section>
            )}

            {!resultData.crop_name && resultData.recommended_crops && resultData.recommended_crops.length > 0 && (
              <section className="card">
                <div className="card-row-head">
                  <span className="card-icon blue">🧾</span>
                  <div>
                    <p className="card-title">{t("recommendedCrops") || "Recommended Crops"}</p>
                    <p className="card-sub">{resultData.recommended_crops.join(", ")}</p>
                  </div>
                </div>
              </section>
            )}

            {resultData.fertilizer_line && (
              <section className="card">
                <div className="card-row-head">
                  <span className="card-icon green">🧴</span>
                  <div>
                    <p className="card-title">{t("fertilizerPlan") || "Fertilizer Plan"}</p>
                    <p className="card-sub">{resultData.fertilizer_line}</p>
                  </div>
                </div>
              </section>
            )}

            {resultData.how_to_use && (
              <section className="card">
                <div className="card-row-head">
                  <span className="card-icon orange">🧯</span>
                  <div>
                    <p className="card-title">{t("howToUse") || "How to Use"}</p>
                    <p className="card-sub">{resultData.how_to_use}</p>
                  </div>
                </div>
              </section>
            )}

            {resultData.extra_tips && (
              <section className="card">
                <div className="card-row-head">
                  <span className="card-icon blue">💡</span>
                  <div>
                    <p className="card-title">{t("improveYieldTips") || "Tips to Improve Yield"}</p>
                    <p className="card-sub">{resultData.extra_tips}</p>
                  </div>
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
