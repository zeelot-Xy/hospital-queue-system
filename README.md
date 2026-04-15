# Hospital Queue Management System

A modern web-based hospital queue management system built with Express.js, React, and Tailwind CSS.

## Features

- Role-based authentication (Patient, Doctor, Staff/Admin)
- Secure JWT authentication
- Protected role-specific dashboards
- Clean, calm medical UI/UX
- Live hospital queue workflow for patients, doctors, and staff

## Tech Stack

- **Backend**: Node.js + Express + Sequelize + PostgreSQL
- **Frontend**: React 18 + Vite + Tailwind CSS
- **Database**: PostgreSQL (Docker)
- **Real-time**: Socket.io

## How to Run

```bash
# 1. Clone & install
npm run setup

# 2. Start PostgreSQL
docker compose up -d

# 3. Start both frontend and backend from the repo root
npm run dev

# Optional: clear all users and dependent queue data while keeping departments
npm run reset:auth
```
