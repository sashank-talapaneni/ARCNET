# ARCNET

**Algorithm Routing Comparator for Network Education and Testing** — an interactive network graph simulator comparing Dijkstra, Floyd-Warshall, BFS, DFS, and Backtracking.

Built for the **Design and Analysis of Algorithms Experiential Learning project at RV College of Engineering, 2025–26**.

## Features

- Synchronized multi-algorithm execution on the same directed, weighted graph.
- Step-by-step animation, playback controls, and pseudocode highlighting.
- Comparative path cost, hop count, execution time, and nodes visited, with a normalized winner score weighted 40%, 25%, 25%, and 10% respectively.
- Dynamic Network mode with node crashes, link-cost spikes, recoveries, automatic rerouting, an event feed, and a session resilience score.
- Four preset topologies: Campus Network, Data Center, Mesh Network, and Internet Backbone.
- Custom adjacency matrix for graphs with 2–10 nodes.
- Groq-powered AI explanations grounded in simulation results, algorithm context, and dynamic session events.

BFS optimizes hop count rather than weighted cost; DFS explores a traversal route, and Backtracking applies constraints. Winner scores are relative to successful routes in the current comparison. The resilience score is a session-specific heuristic.

## Tech Stack

- React 18 and Vite 7
- Express 4, CORS, and dotenv for the local AI proxy
- Framer Motion and Lucide React for animation and icons
- Groq chat completions API with model fallback
- Node.js algorithm tests and concurrently for development processes

## Getting Started

Use Node.js **22.12 or newer**, npm, and Git. Run these commands in PowerShell:

```powershell
git clone https://github.com/sashank-talapaneni/ARCNET.git
cd ARCNET
npm install
Copy-Item .env.example server/.env
```

Edit `server/.env` and replace the placeholder with your Groq API key:

```dotenv
GROQ_API_KEY=your_key_here
```

The proxy reads `server/.env`, so copy the template there. Keep this file private; Git ignores it. Routing simulations run locally; AI explanations require a configured key and internet access.

Start both the frontend and AI proxy:

```powershell
npm run dev
```

Open the Vite URL printed in the terminal. The proxy defaults to port 3001; Vite forwards `/api` requests to it. The proxy tries `llama-3.3-70b-versatile`, then `llama-3.1-8b-instant`. Optional `GROQ_MODELS` in `server/.env` overrides that comma-separated model list.

### Validation and build

```powershell
npm test
npm run build
npm run preview
```

`npm test` runs the algorithm tests; `npm run build` creates the frontend in `dist/`. `npm run preview` previews the build and does not start the AI proxy. Use `npm run dev` for the full local application with AI.

## Project Structure

```text
src/
  algorithms/        Five routing algorithms
  components/        Graph, playback, metrics, dynamic mode, and AI UI
  hooks/             Algorithm, simulation, graph, and AI state logic
  store/             Application reducer and initial state
  styles/            Global styles, variables, and animations
  utils/             Topologies, graph helpers, scoring, events, AI prompts
  App.jsx            Application entry component
  main.jsx           React bootstrap
server/
  proxy.js           Express proxy for Groq requests
  package.json       CommonJS configuration for the server
tests/
  algorithms.test.js Algorithm test suite
.env.example         Server environment template
vite.config.js       Frontend and development API proxy configuration
```

## Authors

- **Sashank Talapaneni**
- **Sathvik K Y**

**Mentor:** Prof. Saraswathi Govind Datar, Department of CSE, RV College of Engineering.
