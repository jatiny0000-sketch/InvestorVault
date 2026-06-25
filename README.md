# DataVault

A trusted, hand-designed demo website for selling verified industry databases
(doctors, investors, business owners, and more). Visitors browse categories,
submit a request form, and you receive the lead in **Google Sheets (Excel) + email**.

## Files
| File | Purpose |
|------|---------|
| `index.html` | The full website |
| `styles.css` | All styling (ink + brass premium theme) |
| `script.js` | Counters, scroll reveal, form validation & submit |
| `google-apps-script.gs` | Backend: writes to your Sheet + emails you |

## Run locally
Just open `index.html` in a browser. The form works in **demo mode** (logs to
the browser console) until you wire the backend below.

---

## Go live in 5 minutes — Sheet + email

1. **Create a Google Sheet** (any name).
2. In it: **Extensions ▸ Apps Script**. Delete the sample code, paste everything
   from `google-apps-script.gs`, then **Save**.
3. In the Apps Script editor, run the **`setupHeaders`** function once
   (authorize when prompted). This writes the column titles.
4. **Deploy ▸ New deployment ▸ Web app**
   - *Execute as:* **Me**
   - *Who has access:* **Anyone**
   - Click **Deploy**, copy the **Web app URL**.
5. Open `script.js`, paste that URL into:
   ```js
   const ENDPOINT_URL = "https://script.google.com/macros/s/XXXX/exec";
   ```
6. Reload the site, submit a test request. You'll see a new row in the Sheet
   and an email at **kanishkamps11c@gmail.com**.

> The email's *reply-to* is set to the customer's email, so you can reply
> straight from your inbox.

## Sheet columns captured
`Timestamp · Request ID · Full Name · Phone · Email · Occupation/Company ·
Data Category · Quantity · Target Region · Budget · Specific Requirement ·
Source Page · Status`

Export anytime via **File ▸ Download ▸ Microsoft Excel (.xlsx)**.

## Customising
- **Brand name / colors:** edit the `:root` variables at the top of `styles.css`.
- **Categories & record counts:** edit the `.card` blocks in `index.html`
  (and the matching `<option>`s in the form `<select>`).
- **Notification email:** change `NOTIFY_EMAIL` in `google-apps-script.gs`.

## Hosting (later)
Drop these files in a GitHub repo and enable **Pages**, or upload to any static
host (Netlify, Vercel, cPanel). No server needed — the form talks directly to
Apps Script.
