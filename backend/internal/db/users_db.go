package db

import "log"

func createUsersTable() {
	createTableQuery := `
	CREATE TABLE IF NOT EXISTS users (
		id SERIAL PRIMARY KEY,
		github_id BIGINT UNIQUE NOT NULL,
		github_username VARCHAR(255) NOT NULL,
		email VARCHAR(255),
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

	createFunctionQuery := `
	CREATE OR REPLACE FUNCTION update_updated_at_column()
	RETURNS TRIGGER AS $$
	BEGIN
	  NEW.updated_at = NOW();
	  RETURN NEW;
	END;
	$$ LANGUAGE plpgsql;
	`

	functionExistsQuery := `
	SELECT EXISTS (
		SELECT 1
		FROM pg_proc
		WHERE proname = 'update_updated_at_column'
	);
	`

	var functionExists bool
	err := DB.QueryRow(functionExistsQuery).Scan(&functionExists)
	if err != nil {
		log.Fatalf("Error checking if function exists: %v", err)
	}

	if !functionExists {
		if _, err := DB.Exec(createFunctionQuery); err != nil {
			log.Fatalf("Error creating function: %v", err)
		}
		log.Println("Function update_updated_at_column created successfully.")
	} else {
		log.Println("Function update_updated_at_column already exists.")
	}

	createTriggerQuery := `
	CREATE TRIGGER update_user_updated_at
	BEFORE UPDATE ON users
	FOR EACH ROW
	EXECUTE FUNCTION update_updated_at_column();
	`

	triggerExistsQuery := `
	SELECT EXISTS (
		SELECT 1
		FROM pg_trigger
		WHERE tgname = 'update_user_updated_at'
	);
	`

	var triggerExists bool
	err = DB.QueryRow(triggerExistsQuery).Scan(&triggerExists)
	if err != nil {
		log.Fatalf("Error checking if trigger exists: %v", err)
	}

	if !triggerExists {
		if _, err := DB.Exec(createTriggerQuery); err != nil {
			log.Fatalf("Error creating trigger: %v", err)
		}
		log.Println("Trigger update_user_updated_at created successfully.")
	} else {
		log.Println("Trigger update_user_updated_at already exists.")
	}
}
