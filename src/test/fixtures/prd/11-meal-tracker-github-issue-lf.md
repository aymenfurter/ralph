Meal Tracker
Overview
Build a Meal Tracker application that lets users add, edit, and delete meal entries. Phase 1 uses a React front end and a .NET backend API with in-memory storage (database persistence is explicitly out of scope for phase 1).

Tasks

- [ ] Set up the solution structure with a React frontend and an ASP.NET Core Web API backend, including CORS configuration for local development

- [ ] Create the meal data contract (DTO/model) and validation rules (required fields, meal type enum, time format, calories as number) shared consistently between frontend and backend

- [ ] Implement backend CRUD endpoints for meals (create, list, update, delete) using an in-memory repository/service layer and basic error handling

- [ ] Build the React UI for listing meals and a form to add/edit meals with fields: name, description, type (breakfast/lunch/dinner/snack), time, and estimated calories

- [ ] Wire the React app to the backend API (fetch/axios), including optimistic UI updates or refresh logic and user-friendly error states

- [ ] Add basic automated checks: backend unit tests for the service/controller behavior and frontend smoke tests for core CRUD flows
