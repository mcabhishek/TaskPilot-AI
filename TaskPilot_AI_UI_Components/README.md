# TaskPilot AI — UI Components Starter

A React + Vite UI starter based on the supplied TaskPilot AI reference collage. It includes 11 routed screens and shared UI components using a warm white, cream, pale-orange palette.

## Included screens

1. Landing / sign-in concept
2. Dashboard
3. Tasks
4. Calendar
5. AI Assistant
6. Notes
7. Workflow Automation
8. Projects
9. Integrations
10. Analytics
11. Settings

## Run locally

Requirements: Node.js 18+ and npm.

```bash
npm install
npm run dev
```

Create a production build:

```bash
npm run build
npm run preview
```

## Important implementation notes

- This is a frontend UI starter, not a complete production system.
- Some screens use illustrative starter data to demonstrate the design.
- Tasks, notes and settings may use local React state for UI interactions.
- Authentication buttons are visual entry points and are not connected to a real identity provider.
- AI responses are placeholder UI behavior until an actual backend AI endpoint is connected.
- Integration connection labels are examples and are not verified live connections.
- Workflow definitions need a real backend scheduler/execution engine.
- Analytics values are illustrative and must be replaced with real backend aggregates.
- The landing-page workspace photo uses an external Unsplash URL; download and host a licensed image locally if required.
- Connect all data operations to the existing Spring Boot REST API and PostgreSQL database before treating the app as production-ready.

## Suggested integration sequence

1. Configure the existing authentication strategy and protected routes.
2. Create a centralized API client and error handling.
3. Replace starter task data with API responses.
4. Connect projects, notes, calendar and settings to backend endpoints.
5. Configure a real AI provider on the server and implement plan review/approval.
6. Implement and test a backend workflow execution service.
7. Replace analytics samples with real aggregate endpoints.
8. Add tests, accessibility checks, and deployment configuration.

## Design tokens

The primary palette is in `src/styles.css` using CSS custom properties. Main orange: `#F97316`; warm white: `#FFFDF9`; pale orange: `#FFF0E5`; dark green navigation: `#29413D`.
