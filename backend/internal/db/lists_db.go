package db

import "log"

func createListsTables() {
	createListsTable := `
		CREATE TABLE IF NOT EXISTS lists (
			id SERIAL PRIMARY KEY,
			user_id INT NOT NULL,
			name TEXT NOT NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			CONSTRAINT fk_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
		);
	`

	createListItemsTable := `
		CREATE TABLE IF NOT EXISTS list_items (
			list_id INT NOT NULL,
			problem_id INT NOT NULL,
			position INT NOT NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			CONSTRAINT fk_list FOREIGN KEY(list_id) REFERENCES lists(id) ON DELETE CASCADE,
			PRIMARY KEY (list_id, problem_id)
		);
	`

	_, err := DB.Exec(createListsTable)
	if err != nil {
		log.Fatalf("Error creating lists table: %v", err)
	}

	_, err = DB.Exec(createListItemsTable)
	if err != nil {
		log.Fatalf("Error creating list_items table: %v", err)
	}

	log.Println("Lists Tables setup completed successfully")
}
