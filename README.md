<h1 align="center">
  <br>
  <img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/zap.svg" alt="LocalShare" width="48">
  <br>
  LocalShare
  <br>
</h1>

<h4 align="center">Ultra-fast, zero-configuration WiFi file sharing across all your devices.</h4>

<p align="center">
  <a href="#key-features">Key Features</a> •
  <a href="#how-to-use">How To Use</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#license">License</a>
</p>

<div align="center">
  <!-- Add a screenshot by replacing this block once you upload the repository -->
  <img src="https://img.shields.io/badge/Status-Production_Ready-emerald?style=for-the-badge" alt="Production Ready" />
</div>

<br/>

LocalShare is a modern, lightweight, browser-based native file sharing tool. It allows you to drag-and-drop any file to any device currently connected to your local WiFi router. It uses a **Node.js** network backend paired with a minimalist, responsive **Vite/Tailwind v4** frontend.

No cloud servers. No compression. No account creation. Complete privacy.

---

## ⚡ Key Features

* **Zero Setup**: Simply double-click `start.bat` (Windows) or `start.sh` (Mac/Linux). It automatically downloads its own requirements, builds the UI, and spins up.
* **Smart Device Detection**: Automatically grabs your computer's real physical IP address (bypassing virtual adapters, Docker masks, or VPNs) so you can directly scan its QR code to connect your phone instantly.
* **Offline Hosted Files**: Any file sent to the server stays pinned to the **Server Files** directory until explicitly downloaded or permanently deleted by the user. 
* **Seamless Downloading**: Custom websocket logic triggers native, immediate streaming to bypass restrictive iOS/Android pop-up blockers natively.
* **Beautiful Minimal Setup**: Single-page architecture crafted purely with HTML, Vanilla JavaScript, and Tailwind CSS.
* **Mobile First**: Built tightly so that opening it on your phone feels like a premium native mobile application.

---

## 🚀 How To Use

1. Make sure Node.js (v18+) is installed on your computer.
2. Clone this repository:
```bash
git clone https://github.com/Yogesh1290/Local-Share.git
cd Local-Share

# Install dependencies and start the native networking server
npm install
npm run dev:server
```
3. Boot the environment automatically (Alternative GUI method):
  * **Windows**: Double-click `start.bat`
  * **Mac/Linux**: Run `./start.sh`
4. A browser window will automatically open to `http://localhost:8080`.
5. Point your phone's camera at the massive QR code on the screen, and both devices will immediately see each other.
6. Drag files onto the screen.

---

## 🧠 Architecture Overview

To accommodate easy code-contribution, the project is structured as a tightly-coupled monorepo:

```text
LocalShare/
├── .github/          # OSS Contribution/Issue templates
├── client/           # The entire Frontend
│   ├── index.html    # Static application shell
│   ├── vite.config.js
│   └── src/          
│       ├── main.js   # Logic bindings and event flow
│       ├── ui.js     # Component generators and toasts
│       ├── utils.js  # Formatters, parsers and metadata
│       └── style.css # Tailwind configuration
├── server/           # The entire Backend
│   ├── index.js      # Express API, WebSockets, Local IP sniffers
│   └── uploads/      # Physical hard-disk storage of Shared Files
├── start.bat         # Windows lifecycle script (Install, Build, Run)
└── start.sh          # UNIX lifecycle script
```

### Build Lifecycle
Because `client/` and `server/` operate in tandem, we do not require users to run complex build tasks. The `.bat` / `.sh` scripts automatically call `npx vite build` against the `client` directory. This effortlessly transcompiles the HTML and Javascript, drops them cleanly into `server/public`, and instructs Express to dynamically host them natively.

### Dedicated Development
If you are developing or simply prefer executing node manually from a remote shell without invoking the startup scripts, deploy using the official node routine:

```bash
# Start the production server purely via Node
npm run dev:server
```

---

## 📄 License

MIT

> Built for friction-less productivity. No Apple ecosystem limitations, no Android ecosystem limitations. Just local TCP/IP networking doing what it was always designed to do.
