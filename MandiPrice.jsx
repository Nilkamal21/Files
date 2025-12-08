// src/pages/MandiPrice.jsx
import React, { useEffect, useState, useRef } from "react";
import { useLanguage } from "../context/LanguageContext";
import {
  ArrowLeft,
  IndianRupee,
  Wheat,
  MapPin,
  BarChart3,
  Navigation,
  Target,
  TrendingUp,
  Calculator,
} from "lucide-react";
import "../styles/MandiPrice.css";

export default function MandiPrice() {
  const { t, language } = useLanguage();

  const [userLatitude, setUserLatitude] = useState(null);
  const [userLongitude, setUserLongitude] = useState(null);
  const [locationVisible, setLocationVisible] = useState(false);
  const [priceBtnEnabled, setPriceBtnEnabled] = useState(false);

  const [crop, setCrop] = useState("wheat");
  const [quantity, setQuantity] = useState(10);
  const [transportCost, setTransportCost] = useState(5);

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);


  const [activeTab, setActiveTab] = useState("table");
  const [selectedMandiIndex, setSelectedMandiIndex] = useState(0);

  // CROP OPTIONS IN ALL LANGUAGES
  const cropOptions = {
    en: { wheat: "Wheat", rice: "Rice", cotton: "Cotton", bajra: "Bajra", corn: "Corn" },
    hi: { wheat: "गेहूं", rice: "चावल", cotton: "कपास", bajra: "बाजरा", corn: "मक्का" },
    bn: { wheat: "গম", rice: "চাল", cotton: "তুলা", bajra: "বাজরা", corn: "ভুট্টা" },
    pa: { wheat: "ਗੇਹੂੰ", rice: "ਚਾਉਲ", cotton: "ਕਪਾਹ", bajra: "ਬਾਜਰਾ", corn: "ਮੱਕੀ" }
  };

  useEffect(() => {
    if (results && results.all_mandis && results.all_mandis.length > 0) {
      const bestName = results.highest_profit_mandi?.mandi_name;
      const idx = bestName != null
        ? results.all_mandis.findIndex((m) => m.mandi_name === bestName)
        : 0;
      setSelectedMandiIndex(idx >= 0 ? idx : 0);
    }
  }, [results]);

  

  useEffect(() => {
    detectLocation();
  }, []);

  function detectLocation() {
    setLocationVisible(true);
    setError(null);

    if (!navigator.geolocation) {
      setError(t("geoNotSupported") || "Geolocation not supported by your browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLatitude(pos.coords.latitude);
        setUserLongitude(pos.coords.longitude);
        setPriceBtnEnabled(true);
      },
      () => {
        setError(t("locationFailed") || "Location detection failed. Please allow location access.");
      }
    );
  }

  async function getPrices() {
    setError(null);

    if (!userLatitude || !userLongitude) {
      setError(t("detectLocationFirst") || "Please detect your location first.");
      return;
    }
    if (!crop.trim()) {
      setError(t("enterCropName") || "Enter a crop name.");
      return;
    }
    if (isNaN(quantity) || quantity <= 0) {
      setError(t("quantityPositive") || "Quantity must be a positive number.");
      return;
    }
    if (isNaN(transportCost) || transportCost < 0) {
      setError(t("transportNotNegative") || "Transport cost cannot be negative.");
      return;
    }

    setLoading(true);
    setResults(null);
    

    const payload = {
      crop,
      quantity_quintal: quantity,
      transport_cost_per_km: transportCost,
      latitude: userLatitude,
      longitude: userLongitude,
      state: "",
      language: language,
    };

    try {
      const res = await fetch("http://localhost:8004/price-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let err = t("serverError") || `Server returned ${res.status}`;
        try {
          const json = await res.json();
          if (json.detail) err = json.detail;
        } catch (e) {}
        throw new Error(err);
      }

      const data = await res.json();
      setResults(data);

     
    } catch (e) {
      setError(t("fetchError") || "Error fetching prices: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  const formatMoney = (num) => {
    if (num == null || isNaN(num)) return "-";
    return Number(num).toLocaleString("en-IN", {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    });
  };

  const formatDistance = (num) => {
    if (num == null || isNaN(num)) return "-";
    return Math.round(Number(num)).toLocaleString("en-IN");
  };

  const formatPercent = (num) => {
    if (num == null || isNaN(num)) return "-";
    return Number(num).toFixed(1) + "%";
  };

  const bestMandi = results?.highest_profit_mandi || results?.nearest_mandi;
  const selectedMandi = results?.all_mandis && results.all_mandis[selectedMandiIndex];

  const expectedRevenue =
    bestMandi && bestMandi.price_per_quintal && quantity
      ? bestMandi.price_per_quintal * quantity
      : null;

  return (
    <div className="mandi-root">
      {/* HEADER BAR */}
      <header className="mandi-header">
        <a href="/dashboard" className="mandi-back" aria-label={t("back") || "back"}>
          <ArrowLeft />
        </a>

        <div className="mandi-header-icon">
          <IndianRupee />
        </div>

        <div>
          <h1>{t("smartCropAdvisory") || "Smart Crop Advisory - Live Data"}</h1>
          <p>{t("realTimePrices") || "Real-time mandi prices and profit analysis"}</p>
        </div>
      </header>

      {/* MAIN LAYOUT */}
      <main className="mandi-main">
        {/* LEFT: INPUT CARD */}
        <section className="mandi-left">
          <div className="mandi-card mandi-input-card">
            {/* HEADER */}
            <div className="mandi-input-header">
              <div className="left">
                <div className="icon-box">
                  <Wheat />
                </div>
                <div>
                  <h2>{t("marketPriceCalc") || "Market Price Calculator"}</h2>
                  <p>{t("calcProfitMargins") || "Calculate your best profit margins"}</p>
                </div>
              </div>

              <div className="live-pill">{t("live") || "LIVE"}</div>
            </div>

            {/* INPUT PARAMETERS */}
            <div className="section-label">
              <span className="dot green"></span>
              {t("inputParameters") || "INPUT PARAMETERS"}
            </div>

            <div className="inputs-grid">
              <div className="input-block">
                <label>{t("cropType") || "Crop Type"}</label>
                <select value={crop} onChange={(e) => setCrop(e.target.value)}>
                  <option value="wheat">{cropOptions[language]?.wheat || "Wheat"}</option>
                  <option value="rice">{cropOptions[language]?.rice || "Rice"}</option>
                  <option value="cotton">{cropOptions[language]?.cotton || "Cotton"}</option>
                  <option value="bajra">{cropOptions[language]?.bajra || "Bajra"}</option>
                  <option value="corn">{cropOptions[language]?.corn || "Corn"}</option>
                </select>
              </div>

              <div className="input-block">
                <label>
                  {t("quantity") || "Quantity"} <span>({t("quintals") || "quintals"})</span>
                </label>
                <input
                  type="number"
                  value={quantity}
                  min="1"
                  onChange={(e) => setQuantity(+e.target.value)}
                />
              </div>

              <div className="input-block">
                <label>
                  {t("transportCost") || "Transport Cost"} <span>({t("rupeesPerKm") || "₹/km"})</span>
                </label>
                <input
                  type="number"
                  value={transportCost}
                  min="0"
                  onChange={(e) => setTransportCost(+e.target.value)}
                />
              </div>
            </div>

          
            {locationVisible && (
              <div className="location-box">
                <div className="location-title">
                  <Navigation />
                  <span>{t("locationDetected") || "Location Detected Successfully"}</span>
                </div>

                <div className="coords">
                  {userLatitude?.toFixed(4)}°N,&nbsp;
                  {userLongitude?.toFixed(4)}°E
                </div>
                <div className="city">{t("landrumPunjab") || "Landrum, Punjab"}</div>
              </div>
            )}

            <button
              className="get-prices-btn"
              onClick={getPrices}
              disabled={!priceBtnEnabled || loading}
            >
              <TrendingUp />
              {loading ? (t("fetching") || "Fetching...") : (t("getMandiPrices") || "GET MANDI PRICES")}
            </button>
          </div>
        </section>

        {/* RIGHT: RESULTS */}
        <section className="mandi-right">
          {error && (
            <div className="mandi-card error-panel">
              <strong>{t("error") || "Error"}:</strong> {error}
            </div>
          )}

          {!results && !error && (
            <div className="mandi-card info-panel">
              <h2>{t("resultsAppearHere") || "Results will appear here"}</h2>
              <p>
                {t("clickGetPrices") || `Click "${t("getMandiPrices") || "Get Mandi Prices"}" to view the best mandi recommendations, detailed table, and map view.`}
              </p>
            </div>
          )}

          {/* BEST MANDI CARD */}
          <div className="mandi-card mandi-best-card">
            <div className="mandi-best-header">
              <div className="mandi-best-title">
                <span className="mandi-best-icon">🏆</span>
                <span>{t("bestMandiRec") || "Best Mandi Recommendation"}</span>
              </div>
            </div>

            {bestMandi && (
              <>
                <div className="mandi-best-subheader">
                  <span className="mandi-badge-primary">{t("mostProfitable") || "Most Profitable"}</span>
                </div>

                <div className="mandi-best-grid">
                  <div className="mandi-best-main">
                    <h4>{bestMandi.mandi_name}</h4>
                    <p className="mandi-best-location">{t("westBengal") || "West Bengal"}</p>

                    <div className="mandi-best-stats">
                      <div className="stat-box stat-price">
                        <span className="stat-label">{t("pricePerQuintal") || "₹ Price/Quintal"}</span>
                        <span className="stat-value">
                          ₹{formatMoney(bestMandi.price_per_quintal)}
                        </span>
                      </div>
                      <div className="stat-box stat-distance">
                        <span className="stat-label">{t("distance") || "📍 Distance"}</span>
                        <span className="stat-value">
                          {formatDistance(bestMandi.distance_km)} {t("km") || "km"}
                        </span>
                      </div>
                      <div className="stat-box stat-net">
                        <span className="stat-label">{t("netProfit") || "₹ Net Profit"}</span>
                        <span className="stat-value">
                          ₹{formatMoney(bestMandi.net_profit)}
                        </span>
                      </div>
                      <div className="stat-box stat-profitability">
                        <span className="stat-label">{t("profitability") || "📈 Profitability"}</span>
                        <span className="stat-value stat-profit">
                          {formatPercent(bestMandi.profitability_percent)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mandi-best-revenue">
                    <div className="revenue-label">{t("expectedRevenue") || "🎯 Expected Revenue"}</div>
                    <div className="revenue-value">
                      ₹{expectedRevenue ? formatMoney(expectedRevenue) : "-"}
                    </div>
                    <div className="revenue-sub">
                      {t("for") || "for"} {quantity} {t("quintalsOf") || "quintals of"} {cropOptions[language]?.[crop] || crop}
                    </div>
                  </div>
                </div>

                <div className="mandi-best-footer">
                  <span className="footer-icon">⭐</span>
                  <span>{t("recommendedMaxProfit") || "Recommended for maximum profit with optimal distance"}</span>
                </div>
              </>
            )}
          </div>

          {/* RESULTS CONTENT */}
          {results && (
            <>
              <div className="mandi-results-wrapper">
                <div className="mandi-card mandi-results-card">
                  <div className="mandi-tabs">
                    <button
                      type="button"
                      className={"mandi-tab-btn " + (activeTab === "table" ? "mandi-tab-active" : "")}
                      onClick={() => setActiveTab("table")}
                    >
                      <Calculator />
                      <span>{t("tableView") || "Table View"}</span>
                    </button>
                    <button
                      type="button"
                      className={"mandi-tab-btn " + (activeTab === "map" ? "mandi-tab-active" : "")}
                      onClick={() => setActiveTab("map")}
                    >
                      <Target />
                      <span>{t("mapView") || "Map View"}</span>
                    </button>
                  </div>

                  {activeTab === "table" && (
                    <div className="mandi-table-wrapper">
                      <div className="mandi-table-header">
                        <MapPin />
                        <span>
                          {t("allMandis") || "All Mandis"} (Top {results.all_mandis.length})
                        </span>
                      </div>

                      <div className="mandi-table-scroll">
                        <table className="mandi-table">
                          <thead>
                            <tr>
                              <th>{t("rank") || "Rank"}</th>
                              <th>{t("mandiName") || "Mandi Name"}</th>
                              <th>
                                <span className="th-icon">₹</span> {t("priceQuintal") || "Price/Quintal"}
                              </th>
                              <th>
                                <span className="th-icon">📍</span> {t("distance") || "Distance"}
                              </th>
                              <th>
                                <span className="th-icon">₹</span> {t("netProfit") || "Net Profit"}
                              </th>
                              <th>
                                <span className="th-icon">📈</span> {t("profitability") || "Profitability"}
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {results.all_mandis.map((m, index) => {
                              const isTop = index === 0;
                              return (
                                <tr key={index} className={"mandi-row" + (isTop ? " mandi-row-highlight" : "")}>
                                  <td>
                                    <span
                                      className={
                                        "rank-pill " +
                                        (index === 0 ? "rank-1" : index === 1 ? "rank-2" : index === 2 ? "rank-3" : "rank-default")
                                      }
                                    >
                                      #{index + 1}
                                    </span>
                                  </td>
                                  <td className="mandi-table-name">
                                    <div>{m.mandi_name}</div>
                                    <span className="mandi-table-sub">{t("westBengal") || "West Bengal"}</span>
                                  </td>
                                  <td className="price-cell">₹{formatMoney(m.price_per_quintal)}</td>
                                  <td>{formatDistance(m.distance_km)} {t("km") || "km"}</td>
                                  <td className="profit-cell">₹{formatMoney(m.net_profit)}</td>
                                  <td>
                                    <span className="profit-pill">
                                      {formatPercent(m.profitability_percent)}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {activeTab === "map" && (
                    <div className="mandi-map-wrapper">
                      <div className="mandi-map-panel">
                        <div className="mandi-map-header">
                          <Navigation />
                          <span>{t("mandiLocationsMap") || "Mandi Locations Map"}</span>
                        </div>
                        <div className="mandi-map-area">
                          <div className="mandi-map-legend">
                            <span className="legend-dot legend-you" /> {t("yourLocation") || "Your Location"}
                            <span className="legend-dot legend-best" /> {t("bestMandi") || "Best Mandi"}
                            <span className="legend-dot legend-other" /> {t("otherMandis") || "Other Mandis"}
                          </div>
                          <div className="mandi-map-grid">
                            <div className="map-marker you">{t("you") || "You"}</div>
                            {results.all_mandis.map((m, index) => {
                              const isBest = bestMandi && m.mandi_name === bestMandi.mandi_name;
                              const isSelected = selectedMandi && m.mandi_name === selectedMandi.mandi_name;
                              return (
                                <button
                                  key={index}
                                  type="button"
                                  className={
                                    "map-marker mandi " +
                                    (isBest ? "best " : "") +
                                    (isSelected ? "selected" : "")
                                  }
                                  onClick={() => setSelectedMandiIndex(index)}
                                  style={{
                                    top: `${10 + ((index * 13) % 70)}%`,
                                    left: `${15 + ((index * 19) % 70)}%`,
                                  }}
                                >
                                  {m.mandi_name.split(" ")[0]}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      <div className="mandi-map-details">
                        <h3>{t("mandiDetails") || "Mandi Details"}</h3>
                        {selectedMandi ? (
                          <>
                            <h4>{selectedMandi.mandi_name}</h4>
                            <p className="mandi-best-location">{t("westBengal") || "West Bengal"}</p>

                            <div className="mandi-best-stats details">
                              <div className="stat-box">
                                <span className="stat-label">{t("pricePerQuintal") || "Price/Quintal"}</span>
                                <span className="stat-value">
                                  ₹{formatMoney(selectedMandi.price_per_quintal)}
                                </span>
                              </div>
                              <div className="stat-box">
                                <span className="stat-label">{t("distance") || "Distance"}</span>
                                <span className="stat-value">
                                  {formatDistance(selectedMandi.distance_km)} {t("km") || "km"}
                                </span>
                              </div>
                              <div className="stat-box">
                                <span className="stat-label">{t("netProfit") || "Net Profit"}</span>
                                <span className="stat-value">
                                  ₹{formatMoney(selectedMandi.net_profit)}
                                </span>
                              </div>
                              <div className="stat-box">
                                <span className="stat-label">{t("profitability") || "Profitability"}</span>
                                <span className="stat-value stat-profit">
                                  {formatPercent(selectedMandi.profitability_percent)}
                                </span>
                              </div>
                            </div>

                            {(selectedMandi.latitude || selectedMandi.longitude) && (
                              <p className="mandi-coords">
                                📍 {t("coordinates") || "Coordinates"}: {selectedMandi.latitude?.toFixed(4)}°N,{" "}
                                {selectedMandi.longitude?.toFixed(4)}°E
                              </p>
                            )}
                          </>
                        ) : (
                          <p>{t("selectMandiMarker") || "Select a mandi marker on the map."}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mandi-card mandi-insights-card">
                  <h3>{t("marketInsights") || "Market Insights"}</h3>
                  <div className="insight-row">
                    <span>{t("avgMarketPrice") || "Avg. Market Price"}</span>
                    <span>
                      ₹{results?.all_mandis && results.all_mandis.length
                        ? formatMoney(
                            results.all_mandis.reduce((sum, m) => sum + (m.price_per_quintal || 0), 0) /
                            results.all_mandis.length
                          )
                        : "-"}
                    </span>
                  </div>
                  <div className="insight-row">
                    <span>{t("transportEfficiency") || "Transport Efficiency"}</span>
                    <span className="insight-badge">{t("excellent") || "Excellent"}</span>
                  </div>
                  <div className="insight-row">
                    <span>{t("profitMargin") || "Profit Margin"}</span>
                    <span className="insight-badge">{t("excellent") || "Excellent"}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
