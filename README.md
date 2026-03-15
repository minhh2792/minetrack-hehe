<p align="center">
  <img width="120" height="120" src="assets/images/logo.svg">
</p>

# Minetrack

Real-time Minecraft server player count tracker. Monitor popular servers like Hypixel, CubeCraft and many more.

## Tech Stack

- **Runtime**: [Bun](https://bun.sh/) (v1.3+)
- **Backend**: [ElysiaJS](https://elysiajs.com/) + TypeScript
- **Frontend**: [React](https://react.dev/) + [Vite](https://vitejs.dev/) + [Tailwind CSS](https://tailwindcss.com/) + TypeScript
- **Graphs**: [uPlot](https://github.com/leeoniya/uPlot)
- **Database**: [InfluxDB 2.x](https://www.influxdata.com/) (optional, for history graphs)

## Features

- ⚡ Real-time player count via WebSocket
- 📈 Persistent history graphs (requires InfluxDB)
- 📊 Per-server mini graphs with history
- 🏆 Player count records
- ⭐ Favorites & visibility controls
- 📱 Responsive design (mobile & desktop)
- 🔍 SEO optimized
- 🐳 Docker support

## Setup

### Prerequisites

- [Bun](https://bun.sh/) (v1.3+) or Node.js (v18+)
- InfluxDB 2.x (optional, for history graphs)

### Installation

```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd frontend && npm install && cd ..

# Build frontend
cd frontend && npm run build && cd ..
```

### Configuration

Copy `.env.example` to `.env` and edit as needed:

```bash
cp .env.example .env
```

Key settings:
- `PORT` — HTTP server port (default: `8080`)
- `INFLUXDB_ENABLED` — Set to `true` to enable InfluxDB
- `INFLUXDB_URL` — InfluxDB URL (default: `http://localhost:8086`)
- `INFLUXDB_TOKEN` — InfluxDB auth token
- `INFLUXDB_ORG` — InfluxDB organization
- `INFLUXDB_BUCKET` — InfluxDB bucket name
- `INFLUXDB_MODE` — `write` (ping & save) or `read` (read-only)

### Servers

Edit `servers.json` to configure tracked servers:

```json
[
  {
    "name": "Hypixel",
    "ip": "mc.hypixel.net",
    "type": "PC",
    "color": "#e8b422"
  },
  {
    "name": "My Bedrock Server",
    "ip": "bedrock.example.com",
    "type": "PE",
    "port": 19132
  }
]
```

- `type` — `PC` (Java Edition) or `PE` (Bedrock Edition)
- `color` — hex color for graphs (auto-generated if omitted)

### Running

```bash
# Development (with auto-restart)
bun run dev

# Production
bun run start
```

### Docker

```bash
cp .env.example .env
# Edit .env as needed
docker-compose up -d
```

## InfluxDB Modes

### Write Mode (`INFLUXDB_MODE=write`)
- Pings all configured servers
- Writes player counts to InfluxDB
- Shows history graphs from InfluxDB data

### Read Mode (`INFLUXDB_MODE=read`)
- Does NOT ping servers
- Reads existing data from InfluxDB only
- Useful for read-only replicas

### No InfluxDB (`INFLUXDB_ENABLED=false`)
- Pings servers but doesn't persist data
- Shows recent ping history only (no long-term graphs)

## License

MIT
