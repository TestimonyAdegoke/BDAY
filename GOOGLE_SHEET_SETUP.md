# Google Sheet Database Setup

The app is already wired to submit blessings and RSVPs to this spreadsheet:

https://docs.google.com/spreadsheets/d/1rw2WDAuwsyQFpg3oEFapb_Kr7T4e9Uv6RwpubyAraS4/

Because browser code cannot write directly to a private Google Sheet safely, use the included Apps Script as the Sheet database endpoint.

## 1. Add The Apps Script

1. Open the Google Sheet.
2. Go to `Extensions` > `Apps Script`.
3. Replace the default script with the contents of `google-apps-script.js`.
4. Save the project.

## 2. Deploy As Web App

1. Click `Deploy` > `New deployment`.
2. Choose type `Web app`.
3. Set `Execute as` to `Me`.
4. Set `Who has access` to `Anyone`.
5. Deploy and copy the `/exec` web app URL.

## 3. Connect The Website

Create a `.env` file in this project:

```env
VITE_GOOGLE_SCRIPT_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
```

Restart Vite after adding `.env`:

```powershell
npm run dev -- --port 5173
```

Submissions will append to two tabs:

- `Blessings`
- `RSVPs`
