# WeCare Frontend

React + Vite frontend application for the WeCare student aid and donation platform.

## Project Overview

WeCare Frontend is a modern React application built with Vite providing fast development and optimized production builds. The application provides role-based interfaces for students, donors, administrators, and super administrators to manage aid requests, donations, and platform operations.

## Technology Stack

- React 18+ for UI components
- Vite for fast development and optimized builds
- Tailwind CSS for styling
- React Router for navigation
- Axios for API requests
- Socket.io for real-time notifications
- Vite + React plugin for Hot Module Replacement (HMR)

## Getting Started

### Prerequisites
- Node.js 16 or higher
- npm or yarn package manager

### Installation

```bash
npm install
```

### Development Server

```bash
npm run dev
```

The development server will start at `http://localhost:5173`

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
src/
  pages/          - Page components organized by user role
  components/     - Reusable React components
  services/       - API client and service functions
  context/        - React Context for state management
  routes/         - Route definitions and protection
  assets/         - Static assets and images
  App.jsx         - Main application component
  main.jsx        - Application entry point
```

## Available Scripts

- `npm run dev` - Start development server with HMR
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint

## Configuration

### Environment Variables

Create a `.env` file in the project root:

```
VITE_API_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
```

### Tailwind CSS

Tailwind CSS is configured in `tailwind.config.js` for styling the application with utility classes.

## ESLint Configuration

The project includes ESLint for code quality. Configuration is in `eslint.config.js`.

## Build Optimization

Vite provides automatic code splitting and optimized builds for production. The build process creates optimized chunks for faster loading.
