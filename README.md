# OS Visualization Dashboard

Interactive OS learning lab built with React + Vite. Explore CPU scheduling, memory allocation, paging, cache replacement, and live system metrics through guided visual simulations.

## Features
- CPU Scheduling Simulator (FCFS, SJF, SRTF, Priority, Round Robin)
- Storage Allocation Studio
- Paging Replacement Explorer (FIFO, LRU)
- Cache Replacement Simulator (FIFO, LRU)
- Dynamic CPU Metrics panel with browser-friendly fallback data

## Tech Stack
- React 18
- Vite 5
- Tailwind CSS
- Framer Motion
- Lucide Icons

## Getting Started

### Install dependencies
```bash
npm install
```

### Run the app
```bash
npm run dev
```

### Run the OS Tutor (RAG + Grok)
1) Place your notes PDF in the project root as `ragreference.pdf`.
2) Copy `.env.example` to `.env` and add your `GROK_API_KEY`.
3) Start the tutor server in a second terminal:
```bash
npm run tutor
```
The UI will call `http://localhost:8787/api/chat` by default. To change it, set `VITE_TUTOR_API_URL` in a `.env` file and restart Vite.

### Build for production
```bash
npm run build
```

### Preview production build
```bash
npm run preview
```

## Project Structure
```
OSEL/
  public/
  src/
    components/
      cache/
      memory/
    utils/
  tools/
```

## Notes
- The Dynamic CPU Metrics panel uses real system metrics in Node environments and a safe fallback dataset in the browser.
- This is an educational simulator, not a hardware-accurate model.
- Tutor RAG configuration lives in `server/rag.config.json` (adjust files or chunk sizes as needed).
