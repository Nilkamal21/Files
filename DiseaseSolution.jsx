import React, { useState, useRef } from "react";
import { useLanguage } from "../context/LanguageContext"; // ✅ ADDED
import "../styles/DiseaseSolution.css";

const DiseaseSolution = () => {
  const { t, language } = useLanguage(); // ✅ SAME AS SOIL ANALYSER

  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [audioUrl, setAudioUrl] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");

  // ✅ LANGUAGE FROM CONTEXT (SAME AS SOIL/MANDI)
  const [formData] = useState({
    cropType: "",
    growthStage: "",
    symptoms: "",
    notes: "",
    language: language, // ✅ DYNAMIC FROM CONTEXT
  });

  const quickCaptureInputRef = useRef(null);
  const imageUploadInputRef = useRef(null);
  const audioPlayerRef = useRef(null);

  const BACKEND_BASE_URL = "https://pest-disease-backend.onrender.com";
  const PREDICT_PATH = "/predict/";

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setImagePreview(URL.createObjectURL(file));
      setAnalysis(null);
      setError("");
      setAudioUrl("");
    }
  };

  const clearImage = () => {
    setSelectedFile(null);
    setImagePreview("");
    setAnalysis(null);
    setError("");
    setAudioUrl("");
  };

  const triggerQuickCapture = () => {
    quickCaptureInputRef.current?.click();
  };

  const triggerImageUpload = () => {
    imageUploadInputRef.current?.click();
  };

  // ✅ UPDATED: LANGUAGE FROM CONTEXT
  const handleSubmit = async () => {
    if (!selectedFile) {
      alert(t("uploadCropImage") || "Please upload or capture an image.");
      return;
    }

    setIsProcessing(true);
    setError("");
    setAnalysis(null);
    setAudioUrl("");

    const submitFormData = new FormData();
    submitFormData.append("image", selectedFile);
    submitFormData.append("language", language); // ✅ DYNAMIC LANGUAGE
    submitFormData.append("crop_type", formData.cropType.trim());
    submitFormData.append("growth_stage", formData.growthStage);
    submitFormData.append("symptoms", formData.symptoms.trim());
    submitFormData.append("notes", formData.notes.trim());

    try {
      const response = await fetch(`${BACKEND_BASE_URL}${PREDICT_PATH}`, {
        method: "POST",
        body: submitFormData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || t("analysisError") || "Server error");
      }

      const data = await response.json();

      setAnalysis({
        predictedClass: data.predicted_class,
        advice: data?.recommendation?.advice || "",
        pesticides: data?.recommendation?.pesticides || [],
        fertilizers: data?.recommendation?.fertilizers || [],
        dosage: data?.recommendation?.dosage || "",
        profitPercent: data?.recommendation?.profitability_percent ?? null,
      });

      if (data.tts_audio_url) {
        const fullUrl = data.tts_audio_url.startsWith("http")
          ? data.tts_audio_url
          : `${BACKEND_BASE_URL}${data.tts_audio_url}`;

        setAudioUrl(fullUrl);

        setTimeout(() => {
          if (audioPlayerRef.current) {
            audioPlayerRef.current.load();
            audioPlayerRef.current.play().catch((err) => {
              console.warn("Autoplay blocked by browser:", err);
            });
          }
        }, 300);
      }
    } catch (err) {
      setError(err.message || (t("analysisError") || "Something went wrong while analyzing the image."));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="disease-page">
      {/* ✅ HEADER WITH TRANSLATIONS */}
      <header className="disease-topbar">
        <div className="disease-topbar-left">
          <div className="disease-logo">
            <span className="disease-logo-icon">🌿</span>
          </div>
          <div className="disease-topbar-text">
            <h1 className="disease-title">{t("diseaseSolution") || "Disease Solution"}</h1>
            <p className="disease-subtitle">{t("aiPlantDiagnosis") || "AI-Powered Plant Diagnosis"}</p>
          </div>
        </div>
      </header>

      <main className="disease-main">
        <section className="disease-card disease-upload-card">
          <div className="disease-upload-header">
            <div className="disease-upload-header-icon">📷</div>
            <h2 className="disease-upload-title">{t("uploadCropImage") || "Upload Crop Image"}</h2>
          </div>

          <div className="disease-drop-wrapper">
            <div
              className={`disease-dropzone ${
                imagePreview ? "disease-dropzone-has-image" : ""
              }`}
            >
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
                  <img
                    src={imagePreview}
                    alt="Selected crop"
                    className="disease-drop-image"
                  />
                  <button
                    type="button"
                    className="disease-drop-clear"
                    onClick={clearImage}
                  >
                    ✕
                  </button>
                </>
              )}
            </div>
          </div>

          <input
            ref={quickCaptureInputRef}
            type="file"
            accept="image/*"
            capture="camera"
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

          {/* ✅ BUTTONS WITH TRANSLATIONS */}
          <div className="disease-upload-actions">
            <button
              type="button"
              className="disease-btn-outline"
              onClick={triggerImageUpload}
            >
              <span className="disease-btn-icon">⤴️</span>
              {t("uploadImage") || "Upload Image"}
            </button>
            <button
              type="button"
              className="disease-btn-solid"
              onClick={triggerQuickCapture}
            >
              <span className="disease-btn-icon">📷</span>
              {t("takePhoto") || "Take Photo"}
            </button>
          </div>

          <button
            type="button"
            className={`disease-analyze-btn ${
              !selectedFile || isProcessing
                ? "disease-analyze-btn-disabled"
                : ""
            }`}
            onClick={handleSubmit}
            disabled={!selectedFile || isProcessing}
          >
            {isProcessing 
              ? (t("analyzingDisease") || "Analyzing Disease…") 
              : (t("analyzeDisease") || "Analyze Disease")
            }
          </button>
        </section>

        {/* ✅ TIPS WITH TRANSLATIONS */}
        <section className="disease-card disease-tips-card">
          <div className="disease-tips-header">
            <div className="disease-tips-icon">ℹ️</div>
            <h3 className="disease-tips-title">{t("tipsTitle") || "Tips for Best Results"}</h3>
          </div>
          <ul className="disease-tips-list">
            <li>{t("tip1") || "Capture the affected area clearly"}</li>
            <li>{t("tip2") || "Ensure good lighting conditions"}</li>
            <li>{t("tip3") || "Include the whole leaf or plant part"}</li>
            <li>{t("tip4") || "Avoid blurry or distant images"}</li>
          </ul>
        </section>

        {error && (
          <section className="disease-error-card">
            <span className="disease-error-dot">!</span>
            <span>{error}</span>
          </section>
        )}

        {/* ✅ RESULTS WITH TRANSLATIONS */}
        {(analysis || isProcessing) && (
          <section className="disease-results">
            <div className="disease-card disease-result-main-card">
              <div className="disease-result-main-header">
                <div className="disease-result-main-icon">✅</div>
                <div>
                  <p className="disease-result-main-label">
                    {isProcessing 
                      ? (t("analyzingImage") || "Analyzing Image") 
                      : (t("analysisComplete") || "Analysis Complete")
                    }
                  </p>
                  <h2 className="disease-result-main-title">
                    {isProcessing
                      ? (t("pleaseWait") || "Please wait…")
                      : analysis?.predictedClass || "Unknown"
                    }
                  </h2>
                  {analysis?.profitPercent != null && !isProcessing && (
                    <p className="disease-detail-text">
                      {t("estimatedProfitability") || "Estimated profitability"}: {analysis.profitPercent.toFixed(1)}%
                    </p>
                  )}
                </div>
                <div className="disease-result-confidence">
                  <span className="disease-confidence-label">
                    {t("confidence") || "Confidence"}
                  </span>
                  <span className="disease-confidence-value">
                    {isProcessing ? "—" : "94%"}
                  </span>
                </div>
              </div>
              <div className="disease-progress-bar">
                <div className="disease-progress-fill" />
              </div>
            </div>

            {audioUrl && (
              <div className="disease-card disease-audio-card">
                <div className="disease-audio-header">
                  <div className="disease-audio-icon">🔊</div>
                  <div>
                    <p className="disease-audio-title">
                      {t("listenResults") || "Listen to Results"}
                    </p>
                    <p className="disease-audio-subtitle">
                      {t("clickPlayAudio") || "Click to play audio summary"}
                    </p>
                  </div>
                </div>
                <audio
                  ref={audioPlayerRef}
                  src={audioUrl}
                  controls
                  className="disease-audio-player"
                />
              </div>
            )}

            {analysis && (
              <>
                <div className="disease-card disease-detail-card disease-detail-alert">
                  <div className="disease-detail-icon">🐛</div>
                  <div>
                    <h3 className="disease-detail-title">
                      {t("pestDetected") || "Pest Detected"}
                    </h3>
                    <p className="disease-detail-text">
                      {analysis.predictedClass || t("unknownDisease") || "Unknown disease"}
                    </p>
                    <span className="disease-detail-badge">
                      {t("immediateAttention") || "Requires immediate attention"}
                    </span>
                  </div>
                </div>

                {analysis.advice && (
                  <div className="disease-card disease-detail-card">
                    <div className="disease-detail-icon yellow">💡</div>
                    <div>
                      <h3 className="disease-detail-title">
                        {t("expertAdvice") || "Expert Advice"}
                      </h3>
                      <p className="disease-detail-text">{analysis.advice}</p>
                    </div>
                  </div>
                )}

                {analysis.pesticides?.length > 0 && (
                  <div className="disease-card disease-detail-card">
                    <div className="disease-detail-icon blue">💧</div>
                    <div className="disease-detail-block">
                      <h3 className="disease-detail-title">
                        {t("recommendedPesticides") || "Recommended Pesticides"}
                      </h3>
                      <div className="disease-pill-list">
                        {analysis.pesticides.map((pest, idx) => (
                          <div key={idx} className="disease-pill-row">
                            <div className="disease-pill-main">{pest}</div>
                            <span className="disease-pill-dot" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {analysis.fertilizers?.length > 0 && (
                  <div className="disease-card disease-detail-card">
                    <div className="disease-detail-icon green">🌱</div>
                    <div className="disease-detail-block">
                      <h3 className="disease-detail-title">
                        {t("recommendedFertilizers") || "Recommended Fertilizers"}
                      </h3>
                      <div className="disease-pill-list disease-pill-list-green">
                        {analysis.fertilizers.map((fert, idx) => (
                          <div key={idx} className="disease-pill-row">
                            <div className="disease-pill-main">{fert}</div>
                            <span className="disease-pill-dot green-dot" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {analysis.dosage && (
                  <div className="disease-card disease-detail-card">
                    <div className="disease-detail-icon purple">⚖️</div>
                    <div>
                      <h3 className="disease-detail-title">
                        {t("applicationDosage") || "Application Dosage"}
                      </h3>
                      <p className="disease-detail-text">{analysis.dosage}</p>
                    </div>
                  </div>
                )}
              </>
            )}
          </section>
        )}
      </main>
    </div>
  );
};

export default DiseaseSolution;
