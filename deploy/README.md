# PCCA - PatientPay PCC Assessment

Self-contained React assessment tool for senior living payment readiness.
Deployed via GitHub Pages, embedded in Webflow at `patientpay.com/pcca`.

## File Structure

```
PCCA/
├── index.html              # Main assessment app (React + Babel via CDN)
├── core/
│   └── assessment-engine.js   # Business logic, scoring, PDF generation (V4.10)
├── assets/
│   └── patientpay_color.png   # Logo
└── README.md
```

## Deployment to GitHub Pages

### Step 1: Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `PCCA`
3. Make it **Public** (required for free GitHub Pages)
4. Click "Create repository"

### Step 2: Upload Files

**Option A: GitHub Web Interface**
1. Click "uploading an existing file"
2. Drag and drop all files from this `deploy` folder
3. Commit directly to `main` branch

**Option B: Git Command Line**
```bash
cd deploy
git init
git add .
git commit -m "Initial PCCA deployment"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/PCCA.git
git push -u origin main
```

### Step 3: Enable GitHub Pages

1. Go to repository Settings → Pages
2. Source: **Deploy from a branch**
3. Branch: **main** / **(root)**
4. Click Save
5. Wait 1-2 minutes for deployment

Your assessment will be live at:
```
https://YOUR-USERNAME.github.io/PCCA/
```

## Webflow Integration

### In Webflow Designer:

1. Create new page: **PCCA** (slug: `pcca`)
2. Go to Page Settings (gear icon)
3. Scroll to **Custom Code**

### Head Code (paste in "Inside <head> tag"):

```html
<style>
  /* Hide Webflow content, prepare for full-page takeover */
  body > *:not(#pcca-root) { display: none !important; }
  body { margin: 0; padding: 0; overflow-x: hidden; }
  #pcca-root { min-height: 100vh; }
</style>
```

### Body Code (paste in "Before </body> tag"):

```html
<div id="pcca-root"></div>
<script>
(function() {
  // Configuration - UPDATE THIS URL after GitHub Pages deployment
  const PCCA_BASE_URL = 'https://YOUR-USERNAME.github.io/PCCA';

  // Create iframe for full-page assessment
  const iframe = document.createElement('iframe');
  iframe.src = PCCA_BASE_URL + '/index.html';
  iframe.style.cssText = 'width:100%;height:100vh;border:none;display:block;';
  iframe.id = 'pcca-iframe';
  iframe.allow = 'clipboard-write';

  // Insert into container
  document.getElementById('pcca-root').appendChild(iframe);

  // Handle dynamic height from assessment
  window.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'patientpay-assessment-resize') {
      iframe.style.height = e.data.height + 'px';
    }
  });
})();
</script>
```

### After Deploying:

1. Replace `YOUR-USERNAME` with your GitHub username in the Webflow code
2. Publish your Webflow site
3. Visit `patientpay.com/pcca` to verify

## Testing Locally

Open `index.html` directly in a browser to test. All dependencies load from CDN.

## Version Info

- **Assessment Engine:** V4.10
- **Features:** 4 segments (SL, MC, SNF, CCRC), dynamic scoring, PDF reports, webhook integration
- **Last Updated:** January 2026
