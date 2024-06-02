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
	createUsersTable()
	createListsTables()

	log.Println("Database setup completed successfully")
}
