# WeCare Project

A comprehensive platform for managing student financial aid, donations, and resource distribution. The system connects donors with students in need through a structured approval and disbursement workflow managed by administrators.

## Project Overview

WeCare is a full-stack application designed to facilitate transparent and efficient distribution of financial aid and essentials to university students. The platform serves multiple user roles with different capabilities and responsibilities.

## Key Features

Users and Authentication:
- Role-based access control (Student, Donor, Admin, Super Admin)
- JWT-based authentication with session management
- Account verification and approval workflows
- User profile management with document uploads

Aid Management:
- Students can request financial aid with categorization
- Administrators verify and approve aid requests
- Support for multiple aid categories with custom amounts
- Document upload and verification tracking

Donations:
- Donors can make financial or essentials donations
- M-Pesa payment integration for mobile money transactions
- Donation status tracking and disbursement matching
- Analytics dashboard showing donation effectiveness

Administrator Controls:
- Bulk student and admin approval workflows
- Audit logging for all administrative actions with timestamps
- Aid request verification and approval pipeline
- Report generation with comprehensive statistics
- Department-based organization and management

Analytics and Reporting:
- Real-time super admin analytics dashboard
- Donation success rate tracking (confirmed, disbursed, partially_disbursed)
- University-level distribution statistics
- Financial flow monitoring and balance tracking
- Audit trail with admin action history

## Technical Architecture

Frontend:
- React with Vite as build tool
- Tailwind CSS for styling
- React Router for navigation
- Socket.io for real-time notifications
- Axios for API requests

Backend:
- Node.js with Express framework
- MongoDB database with Mongoose ODM
- JWT authentication middleware
- M-Pesa integration for payments
- Groq AI integration for feedback processing
- Socket.io for real-time updates

## Prerequisites

Node.js 16 or higher
npm or yarn package manager
MongoDB Atlas account for cloud database
M-Pesa developer account for payment integration
Groq API key for AI features

## Installation

Clone Repository:
```bash
git clone https://github.com/Nonga001/WeCare_Project.git
cd WeCare_Project
```

Backend Setup:
```bash
cd wecare-backend
npm install
```

Create .env file in wecare-backend:
```
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
MPESA_CONSUMER_KEY=your_mpesa_key
MPESA_CONSUMER_SECRET=your_mpesa_secret
GROQ_API_KEY=your_groq_api_key
PORT=5000
```

Frontend Setup:
```bash
cd wecare-frontend
npm install
```

Create .env file in wecare-frontend:
```
VITE_API_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
```

## Running the Application

Start Backend:
```bash
cd wecare-backend
npm start
```

The backend server will run on http://localhost:5000

Start Frontend (in a new terminal):
```bash
cd wecare-frontend
npm run dev
```

The frontend development server will run on http://localhost:5173

## Project Structure

wecare-backend/
- controllers/ - Request handlers for all routes
- models/ - MongoDB schema definitions
- routes/ - API endpoint definitions
- middleware/ - Authentication and request processing
- services/ - External service integrations
- server.js - Express application entry point

wecare-frontend/
- src/pages/ - User interface pages organized by role
- src/components/ - Reusable React components
- src/services/ - API client functions
- src/context/ - React context for state management
- src/routes/ - Route definitions and protection

## Database Models

User - Student, Donor, Admin, Super Admin accounts with role-based permissions
AidRequest - Student aid requests with verification and approval status
Donation - Financial and essentials donations with M-Pesa integration
Notification - In-app notifications for users
Group - Administrative groupings for organization
EthicalFeedback - Feedback and ethics reporting

## API Authentication

All protected endpoints require a valid JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

Token is obtained through the login endpoint and contains user ID, role, and name.

## Security Considerations

Environment variables (.env files) are excluded from version control
Passwords and sensitive data use bcrypt hashing
M-Pesa API credentials and secrets are environment-protected
All database operations use parameterized queries
Role-based access control enforced at middleware and endpoint levels
Audit logging tracks all administrative actions with timestamps and admin identification

## Donation Status Tracking

Donations pass through several status states:
- pending - Initial creation
- confirmed - Payment received and verified
- disbursed - Full amount distributed to beneficiary
- partially_disbursed - Partial amount distributed, remainder pending
- failed - Payment failed or was rejected

Analytics only count confirmed, disbursed, and partially_disbursed donations as successful.

## Data Accuracy

Total donation amounts displayed in analytics reflect only successful donations
Donation counts match the financial amounts shown
Weekly and monthly statistics only include successful donations
Average donation calculation uses successful donation amount divided by successful count

## Deployment

Backend Deployment:
The backend is designed for deployment on platforms like Render or Heroku. Set environment variables in the deployment platform's configuration and ensure MongoDB Atlas connection is configured for production.

Frontend Deployment:
The frontend can be deployed to Vercel, GitHub Pages, or any static hosting service. Ensure VITE_API_URL points to the production backend URL.

## Development Notes

The application uses Socket.io for real-time updates on notifications and approval workflows
Database indexes are created automatically on application startup
Admin approval workflows include audit logging for compliance
Document uploads are stored in the wecare-backend/uploads directory
M-Pesa payment processing includes background synchronization tasks

## Support and Contribution

For issues or questions, please refer to the project repository or contact the development team.

## License

This project is part of an academic initiative for university-wide resource distribution.
