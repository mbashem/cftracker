package db

import (
	"database/sql"
	"log"

	_ "github.com/lib/pq"
	"github.com/mbashem/cftracker/backend/configs"
)

var DB *sql.DB

func InitDB() {
	var err error
	DB, err = sql.Open("postgres", configs.GetEnv(configs.DATABASE_URL))

	if err != nil {
		log.Panic("Could not connect to database")
	}

	DB.SetMaxOpenConns(10)
	DB.SetMaxIdleConns(5)

	createTables()
}

func createTables() {
	createTableQuery := `
	CREATE TABLE IF NOT EXISTS users (
		id SERIAL PRIMARY KEY,
		github_id BIGINT UNIQUE NOT NULL,
		github_username VARCHAR(255) NOT NULL,
		email VARCHAR(255) NOT NULL,
		avatar_url VARCHAR(255),
		cf_handle VARCHAR(255),
		cf_verified BOOLEAN DEFAULT FALSE,
		admin BOOLEAN DEFAULT FALSE,
		created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
	);
	`

	if _, err := DB.Exec(createTableQuery); err != nil {
		log.Fatalf("Error creating user table: %v", err)
	}

	// createFunctionQuery := `
	// // CREATE OR REPLACE FUNCTION update_updated_at_column()
	// // RETURNS TRIGGER AS $$
	// // BEGIN
	// //   NEW.updated_at = NOW();
	// //   RETURN NEW;
	// // END;
	// // $$ LANGUAGE plpgsql;
	// // `

	// if _, err := DB.Exec(createFunctionQuery); err != nil {
	// 	log.Fatalf("Error creating function: %v", err)
	// }

	// createTriggerQuery := `
	// CREATE TRIGGER update_user_updated_at
	// BEFORE UPDATE ON users
	// FOR EACH ROW
	// EXECUTE FUNCTION update_updated_at_column();
	// `

	// if _, err := DB.Exec(createTriggerQuery); err != nil {
	// 	log.Fatalf("Error creating trigger: %v", err)
	// }

	log.Println("Database setup completed successfully")
}
