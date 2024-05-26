# .env  file (create a .env file in backend folder)

GITHUB_CLIENT_ID={GITHUB_CLIENT_ID}
GITHUB_CLIENT_SECRET={GITHUB_CLIENT_SECRET}
GITHUB_REDIRECT_URL=http://localhost:8080/auth/github/callback
DATABASE_URL=postgres://username:password@localhost:port/database?sslmode=disable # example postgres://postgres:postgrespw@localhost:5432/cftracker?sslmode=disable
JWT_SECRET=JWT_SECRET_ANY_STRING_WILL_WORK