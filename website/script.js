// ============================================================
// FinSight AI — Application logic
// Vanilla JS only. No build step, no external frameworks.
// ============================================================

(function () {
  "use strict";

  // ---------- Element references ----------

  const uploadCard = document.getElementById("uploadCard");
  const loadingCard = document.getElementById("loadingCard");
  const errorCard = document.getElementById("errorCard");
  const resultsSection = document.getElementById("resultsSection");
  const uploadSection = document.getElementById("uploadSection");

  const companyNameInput = document.getElementById("companyName");

  const dropzone = document.getElementById("dropzone");
  const fileInput = document.getElementById("fileInput");
  const dropzoneEmpty = document.getElementById("dropzoneEmpty");
  const dropzoneFile = document.getElementById("dropzoneFile");
  const chooseFileBtn = document.getElementById("chooseFileBtn");
  const removeFileBtn = document.getElementById("removeFileBtn");
  const fileNameEl = document.getElementById("fileName");
  const fileSizeEl = document.getElementById("fileSize");
  const fileError = document.getElementById("fileError");

  const generateBtn = document.getElementById("generateBtn");
  const tryAgainBtn = document.getElementById("tryAgainBtn");
  const newAnalysisBtn = document.getElementById("newAnalysisBtn");

  const errorTitle = document.getElementById("errorTitle");
  const errorMessage = document.getElementById("errorMessage");

  // Results elements
  const summaryCompanyName = document.getElementById("summaryCompanyName");
  const recommendationBadge = document.getElementById("recommendationBadge");
  const confidenceValue = document.getElementById("confidenceValue");
  const confidenceFill = document.getElementById("confidenceFill");

  const healthRating = document.getElementById("healthRating");
  const healthValue = document.getElementById("healthValue");
  const healthFill = document.getElementById("healthFill");
  const healthSummary = document.getElementById("healthSummary");

  const reasoningText = document.getElementById("reasoningText");

  const ratiosHead = document.getElementById("ratiosHead");
  const ratiosBody = document.getElementById("ratiosBody");

  const trendGrid = document.getElementById("trendGrid");
  const trendSummary = document.getElementById("trendSummary");

  const strengthsList = document.getElementById("strengthsList");
  const weaknessesList = document.getElementById("weaknessesList");
  const risksList = document.getElementById("risksList");
  const opportunitiesList = document.getElementById("opportunitiesList");

  const sentimentBadge = document.getElementById("sentimentBadge");
  const sentimentScoreValue = document.getElementById("sentimentScoreValue");
  const newsSummary = document.getElementById("newsSummary");
  const newsHighlights = document.getElementById("newsHighlights");

  const downloadCard = document.getElementById("downloadCard");
  const downloadBtn = document.getElementById("downloadBtn");

  // ---------- State ----------

  let selectedFile = null;
  let lastReportPdfBase64 = null;
  let lastReportFileName = "financial-report.pdf";

  // ---------- Helpers ----------

  function escapeHTML(value) {
    const div = document.createElement("div");
    div.textContent = value === null || value === undefined ? "" : String(value);
    return div.innerHTML;
  }

  function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  }

  function isValidNumber(value) {
    return typeof value === "number" && !Number.isNaN(value) && Number.isFinite(value);
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function formatMetric(value, suffix) {
    if (value === null || value === undefined || value === "") return "N/A";
    if (isValidNumber(value)) {
      const rounded = Math.round(value * 100) / 100;
      return rounded.toLocaleString(undefined, { maximumFractionDigits: 2 }) + (suffix || "");
    }
    // Backend may already send a formatted string.
    return escapeHTML(value);
  }

  function setHidden(el, hidden) {
    if (hidden) {
      el.setAttribute("hidden", "");
    } else {
      el.removeAttribute("hidden");
    }
  }

  // ---------- View state machine ----------

  function showUploadForm() {
    setHidden(uploadCard, false);
    setHidden(loadingCard, true);
    setHidden(errorCard, true);
    setHidden(resultsSection, true);
    setHidden(uploadSection, false);
  }

  function showLoading() {
    setHidden(uploadCard, true);
    setHidden(loadingCard, false);
    setHidden(errorCard, true);
    setHidden(resultsSection, true);
    setHidden(uploadSection, false);
  }

  function showError(title, message) {
    errorTitle.textContent = title || "Analysis failed";
    errorMessage.textContent = message || "Something went wrong while analyzing the report. Please try again.";
    setHidden(uploadCard, true);
    setHidden(loadingCard, true);
    setHidden(errorCard, false);
    setHidden(resultsSection, true);
    setHidden(uploadSection, false);
  }

  function showResults() {
    setHidden(uploadSection, true);
    setHidden(resultsSection, false);
    window.scrollTo({ top: resultsSection.offsetTop - 24, behavior: "smooth" });
  }

  // ---------- File selection ----------

  function resetFile() {
    selectedFile = null;
    fileInput.value = "";
    setHidden(dropzoneEmpty, false);
    setHidden(dropzoneFile, true);
    dropzone.classList.remove("has-error");
    setHidden(fileError, true);
    fileError.textContent = "";
    updateGenerateButtonState();
  }

  function showFileError(message) {
    fileError.textContent = message;
    setHidden(fileError, false);
    dropzone.classList.add("has-error");
  }

  function handleFileSelection(file) {
    if (!file) return;

    const isPdfType = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
    if (!isPdfType) {
      selectedFile = null;
      showFileError("Only PDF files are accepted. Please choose a .pdf file.");
      setHidden(dropzoneFile, true);
      setHidden(dropzoneEmpty, false);
      updateGenerateButtonState();
      return;
    }

    const maxBytes = (typeof MAX_FILE_SIZE_MB === "number" ? MAX_FILE_SIZE_MB : 20) * 1024 * 1024;
    if (file.size > maxBytes) {
      selectedFile = null;
      showFileError("This file is too large. Maximum allowed size is " + MAX_FILE_SIZE_MB + " MB.");
      setHidden(dropzoneFile, true);
      setHidden(dropzoneEmpty, false);
      updateGenerateButtonState();
      return;
    }

    selectedFile = file;
    dropzone.classList.remove("has-error");
    setHidden(fileError, true);
    fileError.textContent = "";

    fileNameEl.textContent = file.name;
    fileSizeEl.textContent = formatFileSize(file.size);
    setHidden(dropzoneEmpty, true);
    setHidden(dropzoneFile, false);

    updateGenerateButtonState();
  }

  function updateGenerateButtonState() {
    const hasCompanyName = companyNameInput.value.trim().length > 0;
    generateBtn.disabled = !(hasCompanyName && selectedFile);
  }

  // ---------- Event wiring: upload form ----------

  companyNameInput.addEventListener("input", updateGenerateButtonState);

  chooseFileBtn.addEventListener("click", () => fileInput.click());

  dropzone.addEventListener("click", (event) => {
    if (event.target === removeFileBtn) return;
    if (!selectedFile) fileInput.click();
  });

  dropzone.addEventListener("keydown", (event) => {
    if ((event.key === "Enter" || event.key === " ") && !selectedFile) {
      event.preventDefault();
      fileInput.click();
    }
  });

  fileInput.addEventListener("change", (event) => {
    const file = event.target.files && event.target.files[0];
    handleFileSelection(file);
  });

  ["dragenter", "dragover"].forEach((eventName) => {
    dropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      event.stopPropagation();
      dropzone.classList.add("is-dragover");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    dropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      event.stopPropagation();
      dropzone.classList.remove("is-dragover");
    });
  });

  dropzone.addEventListener("drop", (event) => {
    const file = event.dataTransfer.files && event.dataTransfer.files[0];
    handleFileSelection(file);
  });

  removeFileBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    resetFile();
  });

  tryAgainBtn.addEventListener("click", showUploadForm);
  newAnalysisBtn.addEventListener("click", () => {
    resetFile();
    companyNameInput.value = "";
    updateGenerateButtonState();
    showUploadForm();
  });

  // ---------- Submit / API call ----------

  uploadCard.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (generateBtn.disabled) return;

    if (!WEBHOOK_URL || WEBHOOK_URL.indexOf("PASTE_YOUR_N8N_WEBHOOK_URL_HERE") !== -1) {
      showError(
        "Setup required",
        "The analysis backend has not been configured yet. Add your n8n webhook URL to config.js."
      );
      return;
    }

    showLoading();

    const formData = new FormData();
    formData.append("companyName", companyNameInput.value.trim());
    formData.append("reportFile", selectedFile, selectedFile.name);

    try {
      const response = await fetch(WEBHOOK_URL, {
        method: "POST",
        body: formData
      });

      let data;
      try {
        data = await response.json();
      } catch (parseErr) {
        showError(
          "Unexpected response",
          "The server returned a response that couldn't be understood. Please try again."
        );
        return;
      }

      if (!response.ok) {
        const message = (data && data.error && data.error.message) || "The server returned an error. Please try again.";
        showError("Analysis failed", message);
        return;
      }

      if (!data || data.success !== true) {
        const message = (data && data.error && data.error.message) || "The analysis could not be completed. Please try again.";
        const details = (data && data.error && data.error.details) ? " " + data.error.details : "";
        showError("Analysis failed", message + details);
        return;
      }

      renderResults(data);
      showResults();
    } catch (networkErr) {
      showError(
        "Connection problem",
        "Couldn't reach the analysis server. Check your internet connection and try again."
      );
    }
  });

  // ---------- Rendering ----------

  const RATIO_FIELDS = [
    { keys: ["returnOnEquity", "roe"], label: "Return on Equity", suffix: "%" },
    { keys: ["returnOnAssets", "roa"], label: "Return on Assets", suffix: "%" },
    { keys: ["netProfitMargin"], label: "Net Profit Margin", suffix: "%" },
    { keys: ["operatingMargin"], label: "Operating Margin", suffix: "%" },
    { keys: ["currentRatio"], label: "Current Ratio", suffix: "" },
    { keys: ["quickRatio"], label: "Quick Ratio", suffix: "" },
    { keys: ["debtToEquity"], label: "Debt to Equity", suffix: "" },
    { keys: ["interestCoverage"], label: "Interest Coverage", suffix: "x" },
    { keys: ["eps"], label: "EPS", suffix: "" },
    { keys: ["freeCashFlow", "fcf"], label: "Free Cash Flow", suffix: "" }
  ];

  function getField(obj, keys) {
    for (const key of keys) {
      if (obj && Object.prototype.hasOwnProperty.call(obj, key)) return obj[key];
    }
    return null;
  }

  function recommendationClass(recommendation) {
    const value = (recommendation || "").toLowerCase();
    if (value.includes("strong buy") || value === "buy") return "badge-buy";
    if (value.includes("sell")) return "badge-sell";
    if (value.includes("hold")) return "badge-hold";
    return "";
  }

  function sentimentClass(sentiment) {
    const value = (sentiment || "").toLowerCase();
    if (value.includes("positive")) return "badge-buy";
    if (value.includes("negative")) return "badge-sell";
    if (value.includes("neutral")) return "badge-hold";
    return "";
  }

  function renderResults(data) {
    // Summary
    summaryCompanyName.textContent = data.companyName || companyNameInput.value.trim() || "—";

    recommendationBadge.textContent = data.recommendation || "N/A";
    recommendationBadge.className = "badge " + recommendationClass(data.recommendation);

    const confidence = isValidNumber(data.confidenceScore) ? clamp(data.confidenceScore, 0, 100) : null;
    confidenceValue.textContent = (confidence !== null ? Math.round(confidence) : "N/A") + " / 100";
    confidenceFill.style.width = (confidence !== null ? confidence : 0) + "%";

    // Financial health
    const health = data.financialHealth || {};
    healthRating.textContent = health.rating || "Rating unavailable";
    const healthScore = isValidNumber(health.score) ? clamp(health.score, 0, 100) : null;
    healthValue.textContent = (healthScore !== null ? Math.round(healthScore) : "N/A") + " / 100";
    healthFill.style.width = (healthScore !== null ? healthScore : 0) + "%";
    healthSummary.textContent = health.summary || "No summary provided.";

    // Reasoning
    reasoningText.textContent = data.reasoning || "No investment reasoning was returned for this report.";

    // Ratios table
    renderRatiosTable(Array.isArray(data.financialRatios) ? data.financialRatios : []);

    // Trend analysis
    renderTrend(data.trendAnalysis || {});

    // SWOT
    renderList(strengthsList, data.strengths, "No strengths reported.");
    renderList(weaknessesList, data.weaknesses, "No weaknesses reported.");
    renderList(risksList, data.risks, "No risks reported.");
    renderList(opportunitiesList, data.opportunities, "No opportunities reported.");

    // News sentiment
    renderNews(data.newsSentiment || {});

    // PDF download
    if (data.reportPdfBase64) {
      lastReportPdfBase64 = data.reportPdfBase64;
      lastReportFileName = data.reportFileName || "financial-report.pdf";
      setHidden(downloadCard, false);
    } else {
      lastReportPdfBase64 = null;
      setHidden(downloadCard, true);
    }
  }

  function renderRatiosTable(ratios) {
    ratiosHead.innerHTML = "";
    ratiosBody.innerHTML = "";

    const headRow = document.createElement("tr");
    const metricTh = document.createElement("th");
    metricTh.textContent = "Metric";
    headRow.appendChild(metricTh);

    if (ratios.length === 0) {
      const th = document.createElement("th");
      th.textContent = "—";
      headRow.appendChild(th);
      ratiosHead.appendChild(headRow);

      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 2;
      cell.textContent = "No financial ratio data was returned for this report.";
      row.appendChild(cell);
      ratiosBody.appendChild(row);
      return;
    }

    ratios.forEach((yearData, index) => {
      const th = document.createElement("th");
      th.textContent = yearData.year || yearData.period || "Year " + (index + 1);
      headRow.appendChild(th);
    });
    ratiosHead.appendChild(headRow);

    RATIO_FIELDS.forEach((field) => {
      const row = document.createElement("tr");
      const labelCell = document.createElement("td");
      labelCell.textContent = field.label;
      row.appendChild(labelCell);

      ratios.forEach((yearData) => {
        const cell = document.createElement("td");
        const value = getField(yearData, field.keys);
        cell.textContent = formatMetric(value, field.suffix);
        row.appendChild(cell);
      });

      ratiosBody.appendChild(row);
    });
  }

  function renderTrend(trend) {
    trendGrid.innerHTML = "";

    const items = [
      { label: "Period", value: trend.period },
      { label: "Revenue trend", value: trend.revenueTrend },
      { label: "Profit trend", value: trend.profitTrend }
    ];

    items.forEach((item) => {
      const wrapper = document.createElement("div");
      wrapper.className = "trend-item";

      const label = document.createElement("p");
      label.className = "trend-item-label";
      label.textContent = item.label;

      const value = document.createElement("p");
      value.className = "trend-item-value";
      value.textContent = item.value || "N/A";

      wrapper.appendChild(label);
      wrapper.appendChild(value);
      trendGrid.appendChild(wrapper);
    });

    trendSummary.textContent = trend.summary || "No trend summary provided.";
  }

  function renderList(listEl, items, emptyMessage) {
    listEl.innerHTML = "";
    if (!Array.isArray(items) || items.length === 0) {
      const li = document.createElement("li");
      li.className = "empty-item";
      li.textContent = emptyMessage;
      listEl.appendChild(li);
      return;
    }
    items.forEach((item) => {
      const li = document.createElement("li");
      li.textContent = typeof item === "string" ? item : (item && item.text) || JSON.stringify(item);
      listEl.appendChild(li);
    });
  }

  function renderNews(news) {
    sentimentBadge.textContent = news.overallSentiment || "N/A";
    sentimentBadge.className = "badge " + sentimentClass(news.overallSentiment);

    if (isValidNumber(news.sentimentScore)) {
      sentimentScoreValue.textContent = "Score: " + Math.round(news.sentimentScore * 100) / 100;
    } else {
      sentimentScoreValue.textContent = "";
    }

    newsSummary.textContent = news.summary || "No news summary provided.";

    newsHighlights.innerHTML = "";
    const highlights = Array.isArray(news.highlights) ? news.highlights : [];

    if (highlights.length === 0) {
      const li = document.createElement("li");
      li.textContent = "No recent news highlights were returned.";
      newsHighlights.appendChild(li);
      return;
    }

    highlights.forEach((item) => {
      const li = document.createElement("li");

      if (typeof item === "string") {
        li.textContent = item;
      } else {
        const headline = document.createElement("span");
        headline.className = "news-headline";
        headline.textContent = item.title || item.headline || "Untitled";
        li.appendChild(headline);

        const metaParts = [item.source, item.date].filter(Boolean);
        if (metaParts.length > 0) {
          const meta = document.createElement("span");
          meta.className = "news-meta";
          meta.textContent = metaParts.join(" · ");
          li.appendChild(meta);
        }
      }

      newsHighlights.appendChild(li);
    });
  }

  // ---------- PDF download ----------

  downloadBtn.addEventListener("click", () => {
    if (!lastReportPdfBase64) return;

    try {
      const byteCharacters = atob(lastReportPdfBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "application/pdf" });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = lastReportFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      showFileError("");
      alert("The PDF report could not be prepared for download.");
    }
  });

  // ---------- Init ----------

  showUploadForm();
  updateGenerateButtonState();
})();
