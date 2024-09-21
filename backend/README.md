# .env file (create a .env file in backend folder)

GITHUB_CLIENT_ID={GITHUB_CLIENT_ID}

GITHUB_CLIENT_SECRET={GITHUB_CLIENT_SECRET}

GITHUB_REDIRECT_URL=http://localhost:8080/auth/github/callback

DATABASE_URL=postgres://username:password@localhost:port/database?sslmode=disable # example postgres://

postgres:postgrespw@localhost:5432/cftracker?sslmode=disable

JWT_SECRET=JWT_SECRET_ANY_STRING_WILL_WORK

# API

/

- /auth/github/login - initialize github login
- /auth/github/callback - retuns user info and jwt token

Authorization header with token 'Bearer {token}' required for following
GET - /user/profile - returns users info ,
PUT - /user/cfhandle - body = { "cf_handle": "{handle}" }
GET - /user/cfverification-token - returns verification token - {"token": "{token}"}
GET - /user/verify-cftoken - verifies verification token

set cf firstName as the token recieved from verification token. It is valid for 1 hour

- Go to settings -> social -> firstName


# Docker
