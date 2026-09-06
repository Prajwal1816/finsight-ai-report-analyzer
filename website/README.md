# FinSight AI — Financial Report Analyzer

A static, single-page frontend for an AI-powered annual report analyzer. Built with plain HTML, CSS and JavaScript only — no frameworks, no build step, no dependencies to install.

## Files

| File | Purpose |
|---|---|
| `index.html` | Page structure and markup |
| `style.css` | All styling (design tokens are set as CSS variables at the top of the file) |
| `config.js` | The one setting you need to edit: your n8n webhook URL |
| `script.js` | All application logic: file handling, the API call, and rendering results |
| `README.md` | This file |

## Setup

1. Open `config.js`.
2. Replace the placeholder with your real n8n **production** webhook URL:

   ```js
   const WEBHOOK_URL = "https://your-instance.app.n8n.cloud/webhook/your-path";
   ```

3. Open `index.html` in a browser (or host the folder on any static file host — Netlify, GitHub Pages, Vercel, etc.). No server-side code or build process is required.

If you open `index.html` directly from disk and your n8n instance requires CORS headers, you may need to serve the folder over `http://localhost` (e.g. with `npx serve` or the VS Code "Live Server" extension) rather than via `file://`.

## How it works

1. The user enters a company name and uploads a PDF (drag-and-drop or the "Choose PDF" button).
2. The frontend validates that the file is a PDF and under the size limit set in `config.js` (default 20 MB).
3. On "Generate Analysis", the file and company name are sent as `multipart/form-data` to `WEBHOOK_URL`:
   - `companyName` — text field
   - `reportFile` — the PDF file
4. While waiting, a loading card is shown ("Analyzing financial report…").
5. When the backend responds, the frontend expects one of two shapes:

   **Success:**
   ```json
   {
     "success": true,
     "companyName": "Example Corp",
     "recommendation": "Buy",
     "confidenceScore": 78,
     "reasoning": "...",
     "financialHealth": { "score": 82, "rating": "Strong", "summary": "..." },
     "strengths": ["..."],
     "weaknesses": ["..."],
     "risks": ["..."],
     "opportunities": ["..."],
     "financialRatios": [
       { "year": "2024", "returnOnEquity": 18.2, "currentRatio": 1.4, "...": "..." }
     ],
     "trendAnalysis": { "period": "FY22–FY24", "revenueTrend": "Rising", "profitTrend": "Rising", "summary": "..." },
     "newsSentiment": { "overallSentiment": "Positive", "sentimentScore": 0.62, "summary": "...", "highlights": ["..."] },
     "reportPdfBase64": "JVBERi0xLjQK...",
     "reportFileName": "example-corp-analysis.pdf"
   }
   ```

   **Error:**
   ```json
   {
     "success": false,
     "error": { "code": "PARSE_FAILED", "message": "Could not read the uploaded PDF.", "details": "..." }
   }
   ```

6. On success, the dashboard renders: recommendation badge, confidence meter, financial health meter, investment reasoning, a year-by-year ratios table, trend analysis, four strengths/weaknesses/risks/opportunities cards, and a news sentiment card. Missing or `null` ratio values are shown as "N/A".
7. If `reportPdfBase64` is present, a "Download Full PDF Report" button appears; clicking it decodes the base64 string in the browser and downloads it as a PDF — nothing is uploaded or stored elsewhere.
8. Network failures, non-PDF responses, and `success: false` responses all show a clean error card with a "Try Again" button that returns to the upload form without losing the page state.

## Notes for the viva / demo

- All financial data shown comes only from the backend response. Nothing is hard-coded or faked — if a field is missing, the UI clearly shows "N/A" or a "no data returned" message rather than inventing a number.
- The ratios table renders whatever years and metrics your n8n workflow returns; if your Gemini prompt uses slightly different field names, check the `RATIO_FIELDS` mapping near the top of the "Rendering" section in `script.js`.
- No API keys or credentials live in this frontend. The webhook URL in `config.js` is safe to keep client-side, since it's just an endpoint, not a secret.
