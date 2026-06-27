InvestorVault — WhatsApp screenshots
=====================================

This folder is where WhatsApp proof screenshots live.

HOW UPLOADS WORK
----------------
The site is a static page (no server / no database / no Cloudinary).
When you open the site by double-clicking index.html, a browser page
cannot write image files directly onto your disk for security reasons.

So screenshots you upload through the Admin dashboard are saved inside
the browser (localStorage) and shown in the "WhatsApp Proof" carousel.
They persist on that device/browser.

OPTIONAL — load images straight from this folder
-------------------------------------------------
You can ALSO drop .jpg/.png screenshots into this folder and list them
in manifest.json (see the sample below). The carousel will load those
too. This is handy if you host the site on a server later.

manifest.json format:
{
  "shots": [
    { "src": "whatsapp-screenshots/chat-1.jpg", "caption": "Happy client — Mumbai" },
    { "src": "whatsapp-screenshots/chat-2.png", "caption": "Same-day delivery" }
  ]
}
