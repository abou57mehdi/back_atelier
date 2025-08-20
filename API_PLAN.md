# Billun Backend API Plan

## Core Entities & Features

- **User** (manager, driver, workshop)
- **Company** (with sites, workshops, partnerships)
- **Equipment** (vehicles, trailers, handling, technical data, deadlines)
- **Anomaly** (reporting, photos, criticality, status)
- **Maintenance** (scheduled, completed, deadlines)
- **Photo** (gallery, geolocation, AI enhancement)
- **Partnership** (company-to-company sharing)
- **Notifications** (alerts, deadlines, invitations)
- **Authentication** (JWT, password recovery, roles)

## Main API Endpoints (RESTful)

### Auth

- `POST /api/auth/register` — Register user/company
- `POST /api/auth/login` — Login
- `POST /api/auth/recover` — Password recovery

### Users

- `GET /api/users` — List users (admin/manager)
- `POST /api/users` — Create user (admin/manager)
- `GET /api/users/:id` — Get user profile
- `PUT /api/users/:id` — Update user
- `DELETE /api/users/:id` — Deactivate user

### Companies

- `GET /api/companies` — List companies (admin)
- `POST /api/companies` — Create company
- `GET /api/companies/:id` — Get company details
- `PUT /api/companies/:id` — Update company

### Sites & Workshops

- `GET /api/sites` — List sites
- `POST /api/sites` — Create site
- `GET /api/workshops` — List workshops
- `POST /api/workshops` — Create workshop

### Equipment

- `GET /api/equipment` — List equipment (filters: type, status, deadlines)
- `POST /api/equipment` — Register equipment
- `GET /api/equipment/:id` — Equipment details
- `PUT /api/equipment/:id` — Update equipment
- `DELETE /api/equipment/:id` — Remove equipment

### Anomalies

- `GET /api/anomalies` — List anomalies (filters: status, criticality, date)
- `POST /api/anomalies` — Report anomaly
- `GET /api/anomalies/:id` — Anomaly details
- `PUT /api/anomalies/:id` — Update anomaly status/diagnosis

### Maintenance

- `GET /api/maintenance` — List maintenance tasks
- `POST /api/maintenance` — Schedule maintenance
- `PUT /api/maintenance/:id` — Update maintenance status

### Photos

- `POST /api/photos/upload` — Upload photo (with geolocation, AI enhancement)
- `GET /api/photos/:id` — Get photo metadata

### Partnerships

- `GET /api/partnerships` — List partnerships
- `POST /api/partnerships` — Invite partner
- `PUT /api/partnerships/:id` — Update partnership status

### Notifications

- `GET /api/notifications` — List notifications for user
- `POST /api/notifications` — Create notification

### Statistics & Dashboard

- `GET /api/dashboard` — Real-time stats (by role)
- `GET /api/reports` — Analytics, exports

## Implementation Order (Recommended)

1. Authentication & User Management
2. Company, Site, Workshop CRUD
3. Equipment CRUD
4. Anomaly Reporting & Management
5. Maintenance Scheduling
6. Photo Upload & Gallery
7. Partnerships
8. Notifications
9. Statistics & Dashboard
