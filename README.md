# Multichat Starter Kit (Twitch + YouTube + TikTok)

Un multichat **sans quota YouTube** grâce à la lecture du chat via Playwright (live chat popout),
avec WebSocket local et un overlay prêt pour OBS (Browser Source).

## ✅ Fonctionnalités
- Twitch via `tmi.js` (IRC temps réel, stable)
- TikTok via `tiktok-live-connector` (reverse websocket)
- YouTube **sans API / sans quota** via Playwright (scrape du popout de chat)
- Serveur WebSocket unifié (`ws://localhost:8787`)
- Overlay HTML/CSS/JS épuré, filtrable, prêt pour OBS

---

## 🧩 Installation
1) Prérequis : Node 18+, Chrome/Chromium headless (Playwright s'en charge)
2) Installe
```bash
cd server
npm install
```
3) Configure
```bash
cp .env.example .env
# édite .env (Twitch, TikTok, YouTube VIDEO ID)
```
4) Lance le serveur
```bash
npm start
```

## 🔗 OBS (Browser Source)
- Méthode 1 (fichier local) : ajoute `overlay/index.html` en *Local File* (chemin absolu)
- Méthode 2 (serveur statique) :
  ```bash
  # depuis /overlay si tu veux un serveur local, ou utilise ton serveur web habituel
  npx http-server ./overlay -p 5173 -c-1
  ```
  Puis dans OBS, Browser Source → URL : `http://localhost:5173/index.html`
  (optionnel) Ajouter `?ws=ws://localhost:8787` pour préciser l'endpoint WS.

## ⚙️ Variables .env
- `PORT` (par défaut 8787) : port du serveur WS
- `DEBUG` : `true/false`
- `TWITCH_USERNAME`, `TWITCH_OAUTH`, `TWITCH_CHANNELS`
- `YT_VIDEO_ID` : ID de la vidéo/live YouTube (valeur après `v=`)
- `YT_RETRY_WHEN_OFFLINE` : `true/false` (retries auto si le live n'est pas encore démarré)
- `TIKTOK_USERNAME` : ton pseudo sans `@`

## 🛡️ Permissions / Conseils
- Playwright ouvre la page *popout* du chat YouTube en **headless**. Pas d'API, donc pas de quotas.
- Sur macOS, tu devras peut-être autoriser "Developer Tools" / automatisation.
- Si ta session YouTube a des restrictions d'âge ou un chat réservé aux membres, le scraping peut échouer.

## 🧪 Test rapide (sans clés)
- Tu peux tester uniquement YouTube en mettant `YT_VIDEO_ID` d'un live public et en lançant `npm start`.
- Ouvre `overlay/index.html` dans ton navigateur → vois les messages arriver.

## 🧰 Dev notes
- Les messages sont normalisés côté serveur puis diffusés tels quels :
  ```json
  {
    "id": "uuid",
    "ts": 1710000000000,
    "platform": "twitch|youtube|tiktok",
    "username": "Alice",
    "message": "Hello world",
    "badges": [],
    "color": null,
    "avatar": null,
    "raw": { ...sourceSpecific }
  }
  ```
- Ajoute ta logique (modération, anti-spam, highlights, mapping d'emotes) dans `src/index.js` avant le `broadcast()`.

## 🧷 Limitations / TODO
- YouTube via Playwright s'appuie sur le DOM du popout → si YouTube change son markup, il faudra ajuster le sélecteur.
- TikTok : selon la région, il peut y avoir des limites/ratelimits.
- Pour un déploiement serveur, pense à un proxy WS sécurisé et à des clés séparées.
- Tu peux remplacer Playwright par `yt-livechat-viewer` si tu préfères (moins lourd), il faudra adapter `adapters/youtube.js`.

---

Bon stream !
