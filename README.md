# Epitime

**Epitime** — Enterprise Time Management & Team Collaboration Platform  
A comprehensive full-stack time management application developed as part of the Epitech curriculum. This project provides advanced time tracking, team management, task assignment, and real-time communication features through a modern web interface backed by a robust REST API.

---

## Table of Contents

- [Table of Contents](#table-of-contents)
- [About](#about)
- [Features](#features)
- [Project Structure](#project-structure)
- [Technologies](#technologies)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Running the Application](#running-the-application)
- [Development](#development)
  - [Backend Development](#backend-development)
  - [Frontend Development](#frontend-development)
  - [Running Tests](#running-tests)
- [Environment Variables](#environment-variables)
- [Architecture](#architecture)
- [API Documentation](#api-documentation)
- [CI/CD Pipeline](#cicd-pipeline)
- [Deployment](#deployment)
- [Testing](#testing)
- [License](#license)
- [Contributors](#contributors)

---

## About

**Epitime** is an enterprise-grade time tracking and team management application designed to help organizations monitor employee hours, manage teams, assign tasks, and facilitate team communication. Built as part of the Epitech curriculum, this project demonstrates modern full-stack development practices with a focus on scalability, security, and user experience.

### Key Capabilities

- **Time Tracking**: Clock in/out functionality with automatic hour calculation
- **Team Management**: Organize users into teams with role-based access control
- **Task Assignment**: Create, assign, and track tasks with priorities and deadlines
- **Real-time Communication**: Team chat and direct messaging
- **Working Hours Management**: Define custom working schedules per user
- **Status Tracking**: Monitor team member availability (normal, late, PTO)
- **JWT Authentication**: Secure authentication with access and refresh tokens
- **Two-Factor Authentication**: Optional 2FA for enhanced security

---

## Features

### Authentication & Authorization
- ✅ User registration and login with JWT tokens
- ✅ Role-based access control (User, Manager, Admin)
- ✅ Two-factor authentication (2FA) support
- ✅ Secure password hashing and validation
- ✅ Token refresh mechanism

### Time Management
- ✅ Clock in/out tracking with timestamp recording
- ✅ Automatic total hours calculation
- ✅ Historical time entry viewing
- ✅ Custom working hours per user and day
- ✅ Time-based statistics and analytics

### Team Collaboration
- ✅ Team creation and management
- ✅ User assignment to teams
- ✅ Team-based conversations and chat
- ✅ Direct messaging between users
- ✅ Team status tracking (normal, late, PTO)

### Task Management
- ✅ Task creation with priorities (low, medium, high)
- ✅ Task assignment to team members
- ✅ Progress tracking (0-100%)
- ✅ Due date management
- ✅ Estimated duration tracking

### Communication
- ✅ Team conversations
- ✅ Direct messages
- ✅ Real-time message delivery
- ✅ Conversation history

### Modern UI/UX
- ✅ Responsive design with TailwindCSS
- ✅ Material-UI components
- ✅ Smooth animations with Framer Motion
- ✅ Interactive charts with Recharts
- ✅ Accessibility-first design (WCAG compliant)

---

## Project Structure

```
Epitime/
├── .github/
│   └── workflows/
│       └── ci.yml              # CI/CD pipeline configuration
├── backend/
│   ├── api/                    # Django project settings
│   │   ├── settings.py         # Main configuration
│   │   ├── urls.py             # URL routing
│   │   └── wsgi.py             # WSGI application
│   ├── users/                  # Main Django app
│   │   ├── models.py           # Data models (User, Team, Task, etc.)
│   │   ├── views.py            # API endpoints
│   │   ├── serializers.py      # DRF serializers
│   │   ├── tests/              # Backend tests
│   │   └── migrations/         # Database migrations
│   ├── manage.py               # Django management script
│   ├── requirements.txt        # Python dependencies
│   ├── pyproject.toml          # Ruff linter configuration
│   ├── conftest.py             # Pytest configuration
│   └── dockerfile              # Backend Docker image
├── frontend/
│   ├── public/                 # Static assets
│   ├── src/
│   │   ├── components/         # React components
│   │   ├── pages/              # Page components
│   │   ├── context/            # React context providers
│   │   ├── routes/             # Routing configuration
│   │   ├── styles/             # CSS styles
│   │   └── App.tsx             # Main application component
│   ├── package.json            # Node dependencies
│   ├── tsconfig.json           # TypeScript configuration
│   └── dockerfile              # Frontend Docker image
├── docker-compose.yml          # Multi-container orchestration
├── .env                        # Environment variables
├── .gitignore                  # Git ignore rules
└── README.md                   # This file
```

---

## Technologies

### Backend Stack
- **Language**: Python 3.11+
- **Framework**: Django 5.0+ with Django REST Framework
- **Database**: MariaDB 11
- **Authentication**: djangorestframework-simplejwt (JWT tokens)
- **Security**: django-cors-headers, django-otp (2FA)
- **Linting**: Ruff (fast Python linter and formatter)
- **Testing**: pytest, pytest-django
- **Environment**: python-dotenv

### Frontend Stack
- **Language**: TypeScript 4.9+
- **Framework**: React 19.2
- **UI Library**: Material-UI (MUI) 7.3+
- **Styling**: TailwindCSS 3.4+
- **Animations**: Framer Motion 12.23+
- **Charts**: Recharts 3.2+
- **Icons**: Lucide React 0.545+, React Icons 5.5+
- **HTTP Client**: Axios 1.12+
- **Routing**: React Router DOM 6.22+
- **Linting**: ESLint 8.57+
- **Testing**: Jest, React Testing Library
- **Accessibility**: axe-core, pa11y, Lighthouse

### DevOps & Infrastructure
- **Containerization**: Docker, Docker Compose
- **Database**: MariaDB 11 (production), SQLite (CI/CD)
- **CI/CD**: GitHub Actions
- **Version Control**: Git, GitHub

---

## Getting Started

### Prerequisites

Ensure you have the following installed on your system:

- **Docker** (v20.10+) - [Install Docker](https://docs.docker.com/get-docker/)
- **Docker Compose** (v2.0+) - [Install Docker Compose](https://docs.docker.com/compose/install/)
- **Git** - [Install Git](https://git-scm.com/downloads)

For local development without Docker:
- **Python 3.11+** - [Install Python](https://www.python.org/downloads/)
- **Node.js 20+** - [Install Node.js](https://nodejs.org/)
- **MariaDB 11** - [Install MariaDB](https://mariadb.org/download/)

---

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/LavaheartGaming/Epitime.git
   cd Epitime
   ```

2. **Configure environment variables**
   
   Create a `.env` file in the project root with the following variables:
   ```bash
   # Database Configuration
   DB_NAME=epitime
   DB_USER=epitime_user
   DB_PASSWORD=epitime_pass
   DB_HOST=db
   DB_PORT=3306
   
   # MariaDB Root Password
   MARIADB_ROOT_PASSWORD=root
   MARIADB_DATABASE=epitime
   
   # Django Configuration
   SECRET_KEY=your-secret-key-here
   DEBUG=True
   ALLOWED_HOSTS=localhost,127.0.0.1
   
   # For production, use MariaDB. For CI/CD, use SQLite
   DATABASE_URL=mysql://epitime_user:epitime_pass@db:3306/epitime
   ```

3. **Build and start the containers**
   ```bash
   docker compose up --build
   ```

   This command will:
   - Build the backend Django application
   - Build the frontend React application
   - Start the MariaDB database
   - Run database migrations
   - Start all services

---

### Running the Application

Once the containers are running, access the application:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **Django Admin**: http://localhost:8000/admin

**Default Services:**
- `epitime-frontend-1`: React development server (port 3000)
- `epitime-backend-1`: Django development server (port 8000)
- `epitime-db-1`: MariaDB database (port 3306)

**Stopping the application:**
```bash
docker compose down
```

**Viewing logs:**
```bash
docker compose logs -f          # All services
docker compose logs -f backend  # Backend only
docker compose logs -f frontend # Frontend only
```

---

## Development

### Backend Development

**Running locally without Docker:**

1. **Create a virtual environment**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment**
   ```bash
   # Set environment variables or create a .env file
   export DATABASE_URL=sqlite:///db.sqlite3
   export SECRET_KEY=dev-secret-key
   export DEBUG=True
   ```

4. **Run migrations**
   ```bash
   python manage.py migrate
   ```

5. **Create a superuser**
   ```bash
   python manage.py createsuperuser
   ```

6. **Start the development server**
   ```bash
   python manage.py runserver
   ```

**Linting and formatting:**
```bash
ruff check .          # Check for linting errors
ruff check . --fix    # Auto-fix linting errors
ruff format .         # Format code
```

---

### Frontend Development

**Running locally without Docker:**

1. **Install dependencies**
   ```bash
   cd frontend
   npm install
   ```

2. **Configure API URL**
   
   The frontend is configured to use `http://localhost:8000` as the API URL via the `REACT_APP_API_URL` environment variable.

3. **Start the development server**
   ```bash
   npm start
   ```

**Available scripts:**
```bash
npm start              # Start development server
npm run build          # Build production bundle
npm test               # Run tests
npm run lint           # Run ESLint
npm run lint:fix       # Auto-fix linting errors
npm run type-check     # Run TypeScript type checking
npm run test:a11y      # Run accessibility tests
```

---

### Running Tests

**Backend tests:**
```bash
cd backend
pytest                    # Run all tests
pytest --no-header -q     # Run tests quietly
pytest -v                 # Run tests verbosely
pytest --cov              # Run tests with coverage
```

**Frontend tests:**
```bash
cd frontend
npm test                              # Run tests in watch mode
npm test -- --coverage                # Run tests with coverage
npm test -- --watchAll=false          # Run tests once
npm run test:a11y:unit                # Run accessibility unit tests
```

---

## Environment Variables

### Backend Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `SECRET_KEY` | Django secret key for cryptographic signing | `unsafe-default-key` | Yes (production) |
| `DEBUG` | Enable/disable debug mode | `True` | No |
| `ALLOWED_HOSTS` | Comma-separated list of allowed hosts | `*` | Yes (production) |
| `DATABASE_URL` | Database connection URL | - | Yes |
| `DB_NAME` | Database name | `epitime` | Yes (MariaDB) |
| `DB_USER` | Database user | `epitime_user` | Yes (MariaDB) |
| `DB_PASSWORD` | Database password | `epitime_pass` | Yes (MariaDB) |
| `DB_HOST` | Database host | `db` | Yes (MariaDB) |
| `DB_PORT` | Database port | `3306` | Yes (MariaDB) |

### Frontend Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `REACT_APP_API_URL` | Backend API base URL | `http://localhost:8000` | Yes |
| `CHOKIDAR_USEPOLLING` | Enable file watching polling (Docker) | `true` | No |

---

## Architecture

### Data Models

**User Model:**
- Custom user model extending Django's `AbstractBaseUser`
- Fields: email, first_name, last_name, phone_number, role, team, two_factor_enabled
- Roles: User, Manager, Admin
- JWT authentication with access and refresh tokens

**Team Model:**
- Team organization with members
- Fields: name, description, created_by, created_at

**TimeEntry Model:**
- Clock in/out records
- Fields: user, clock_in, clock_out, total_hours
- Automatic hour calculation

**Task Model:**
- Task assignment and tracking
- Fields: title, description, priority, estimated_duration, progress, due_date, created_by, assigned_to
- Priorities: Low, Medium, High

**WorkingHours Model:**
- Custom working schedules per user
- Fields: user, day_of_week, start_time, end_time

**TeamStatus Model:**
- Daily status tracking
- Fields: user, date, status (normal/late/pto), note

**Conversation & Message Models:**
- Team and direct messaging
- Fields: conversation (name, team, is_direct, participants), message (sender, content, created_at)

### UML Class Diagram

![UML Class Diagram showing the relationships between User, Team, TimeEntry, Task, WorkingHours, TeamStatus, Conversation, and Message models](plan%20uml.png)

**Key Relationships:**
- **User ↔ Team**: Users belong to a team; teams have multiple members and a creator
- **User → TimeEntry**: Users have multiple time entries for clock in/out tracking
- **User → Task**: Users can create and be assigned multiple tasks
- **User → WorkingHours**: Users have custom working schedules per day of week
- **User → TeamStatus**: Users have daily status records (normal, late, PTO)
- **Team → Conversation**: Teams have multiple conversations for communication
- **Conversation ↔ User**: Conversations have multiple participants (many-to-many)
- **Conversation → Message**: Conversations contain multiple messages
- **User → Message**: Users send multiple messages

---

## API Documentation

### Authentication Endpoints

- `POST /api/auth/register/` - Register a new user
- `POST /api/auth/login/` - Login and receive JWT tokens
- `POST /api/auth/token/refresh/` - Refresh access token
- `POST /api/auth/logout/` - Logout (invalidate tokens)

### User Endpoints

- `GET /api/users/` - List all users (admin/manager)
- `GET /api/users/me/` - Get current user profile
- `PUT /api/users/me/` - Update current user profile
- `GET /api/users/{id}/` - Get user by ID

### Team Endpoints

- `GET /api/teams/` - List all teams
- `POST /api/teams/` - Create a new team
- `GET /api/teams/{id}/` - Get team details
- `PUT /api/teams/{id}/` - Update team
- `DELETE /api/teams/{id}/` - Delete team

### Time Entry Endpoints

- `GET /api/time-entries/` - List time entries
- `POST /api/time-entries/clock-in/` - Clock in
- `POST /api/time-entries/clock-out/` - Clock out
- `GET /api/time-entries/my-entries/` - Get current user's entries

### Task Endpoints

- `GET /api/tasks/` - List tasks
- `POST /api/tasks/` - Create a task
- `GET /api/tasks/{id}/` - Get task details
- `PUT /api/tasks/{id}/` - Update task
- `DELETE /api/tasks/{id}/` - Delete task

### Chat Endpoints

- `GET /api/conversations/` - List conversations
- `POST /api/conversations/` - Create conversation
- `GET /api/conversations/{id}/messages/` - Get messages
- `POST /api/conversations/{id}/messages/` - Send message

---

## CI/CD Pipeline

The project uses **GitHub Actions** for continuous integration and deployment. The CI pipeline runs on every push and pull request to `main`, `master`, and `develop` branches.

### Pipeline Jobs

**Frontend:**
1. **Lint** - ESLint validation
2. **Type Check** - TypeScript type checking
3. **Test** - Jest unit tests with coverage
4. **Build** - Production build validation
5. **Accessibility** - a11y unit tests

**Backend:**
1. **Lint** - Ruff linting and formatting checks
2. **Test** - Pytest with Django system checks

### Running CI Locally

**Backend:**
```bash
cd backend
ruff check .
ruff format --check .
pytest --no-header -q
```

**Frontend:**
```bash
cd frontend
npm run lint
npm run type-check
npm test -- --coverage --watchAll=false
npm run build
```

---

## Deployment

### Docker Deployment

1. **Build production images**
   ```bash
   docker compose build
   ```

2. **Push to container registry**
   ```bash
   docker tag epitime-backend:latest your-registry/epitime-backend:latest
   docker tag epitime-frontend:latest your-registry/epitime-frontend:latest
   docker push your-registry/epitime-backend:latest
   docker push your-registry/epitime-frontend:latest
   ```

3. **Deploy to production server**
   ```bash
   # On production server
   docker compose -f docker-compose.prod.yml up -d
   ```

### Production Considerations

- Set `DEBUG=False` in production
- Use strong `SECRET_KEY`
- Configure `ALLOWED_HOSTS` properly
- Use HTTPS with SSL certificates
- Set up proper database backups
- Configure logging and monitoring
- Use environment-specific Docker Compose files
- Implement rate limiting and security headers

---

## Testing

### Backend Testing

The backend uses **pytest** with **pytest-django** for testing.

**Test structure:**
```
backend/users/tests/
├── test_models.py      # Model tests
├── test_views.py       # API endpoint tests
├── test_auth.py        # Authentication tests
└── conftest.py         # Test fixtures
```

**Running tests:**
```bash
pytest                           # Run all tests
pytest users/tests/test_models.py  # Run specific test file
pytest -k "test_user"            # Run tests matching pattern
pytest --cov=users               # Run with coverage for users app
```

### Frontend Testing

The frontend uses **Jest** and **React Testing Library** for unit tests, plus accessibility testing tools.

**Test types:**
- Unit tests (Jest + RTL)
- Accessibility tests (jest-axe, pa11y)
- Type checking (TypeScript)

**Running tests:**
```bash
npm test                    # Interactive test runner
npm test -- --coverage      # With coverage report
npm run test:a11y:unit      # Accessibility unit tests
npm run type-check          # TypeScript validation
```

---

## License

This project is open source and available under the **MIT License**.

---

## Contributors

- **[LavaheartGaming](https://github.com/LavaheartGaming)** – Project Owner & Lead Developer
- **[lucavdb06](https://github.com/lucavdb06)** – Contributor

---

## Acknowledgments

This project was developed as part of the **Epitech** curriculum, demonstrating modern full-stack development practices, clean architecture, and professional development workflows.

For questions, issues, or contributions, please open an issue on [GitHub](https://github.com/LavaheartGaming/Epitime/issues).
