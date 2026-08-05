package main

import (
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"errors"
	"flag"
	"fmt"
	"io"
	"log"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"

	"github.com/lib/pq"
	"github.com/mbashem/cftracker/backend/configs"
)

var migrationFilePattern = regexp.MustCompile(`^(\d+)_.*\.(up|down)\.sql$`)

type migrationFiles struct {
	up   string
	down string
}

type migrationChecksum struct {
	version int64
	up      string
	down    string
}

func main() {
	databaseURL := flag.String("database", "", "PostgreSQL connection URL (defaults to DATABASE_URL)")
	migrationsPath := flag.String("path", "migrations", "migration files directory")
	syncChecksums := flag.Bool("sync", false, "record checksums for newly applied migrations")
	flag.Parse()

	if *databaseURL == "" {
		var err error
		*databaseURL, err = configs.LoadDatabaseURL()
		if err != nil {
			log.Fatal(err)
		}
	}
	if *databaseURL == "" {
		log.Fatal("DATABASE_URL or -database is required")
	}

	files, err := readMigrationFiles(*migrationsPath)
	if err != nil {
		log.Fatal(err)
	}

	database, err := sql.Open("postgres", *databaseURL)
	if err != nil {
		log.Fatal(err)
	}
	defer database.Close()

	if err := database.Ping(); err != nil {
		log.Fatal(err)
	}

	if err := checkMigrations(database, files, *syncChecksums); err != nil {
		log.Fatal(err)
	}

	log.Println("migration checksums are valid")
}

func readMigrationFiles(path string) (map[int64]migrationFiles, error) {
	entries, err := os.ReadDir(path)
	if err != nil {
		return nil, fmt.Errorf("read migrations: %w", err)
	}

	migrations := make(map[int64]migrationFiles)
	for _, entry := range entries {
		if entry.IsDir() || filepath.Ext(entry.Name()) != ".sql" {
			continue
		}

		matches := migrationFilePattern.FindStringSubmatch(entry.Name())
		if matches == nil {
			return nil, fmt.Errorf("invalid migration filename %q", entry.Name())
		}

		version, err := strconv.ParseInt(matches[1], 10, 64)
		if err != nil {
			return nil, fmt.Errorf("parse migration version %q: %w", matches[1], err)
		}

		migration := migrations[version]
		filename := filepath.Join(path, entry.Name())
		switch matches[2] {
		case "up":
			if migration.up != "" {
				return nil, fmt.Errorf("migration version %d has multiple up files", version)
			}
			migration.up = filename
		case "down":
			if migration.down != "" {
				return nil, fmt.Errorf("migration version %d has multiple down files", version)
			}
			migration.down = filename
		}
		migrations[version] = migration
	}

	for version, migration := range migrations {
		if migration.up == "" || migration.down == "" {
			return nil, fmt.Errorf("migration version %d must have both up and down files", version)
		}
	}

	return migrations, nil
}

func checkMigrations(database *sql.DB, files map[int64]migrationFiles, syncChecksums bool) error {
	currentVersion, err := getCurrentVersion(database)
	if err != nil {
		return err
	}

	checksums, err := getStoredChecksums(database)
	if errors.Is(err, errChecksumTableMissing) {
		if currentVersion > 0 {
			return errors.New("migration checksum table is missing")
		}
		return nil
	}
	if err != nil {
		return err
	}

	calculated, err := calculateChecksums(files)
	if err != nil {
		return err
	}
	if currentVersion > 0 {
		if _, found := calculated[currentVersion]; !found {
			return fmt.Errorf("current migration version %d is missing from the migrations directory", currentVersion)
		}
	}

	if err := compareChecksums(checksums, calculated); err != nil {
		return err
	}

	if syncChecksums {
		if err := storeMissingChecksums(database, calculated, currentVersion); err != nil {
			return err
		}
		checksums, err = getStoredChecksums(database)
		if err != nil {
			return err
		}
		if err := compareChecksums(checksums, calculated); err != nil {
			return err
		}
	}

	for version := range files {
		if version <= currentVersion {
			if _, found := checksums[version]; !found {
				return fmt.Errorf("applied migration version %d has no recorded checksum; run migration checksum sync", version)
			}
		}
	}

	return nil
}

func compareChecksums(storedChecksums, calculatedChecksums map[int64]migrationChecksum) error {
	for version, stored := range storedChecksums {
		actual, found := calculatedChecksums[version]
		if !found {
			return fmt.Errorf("recorded migration version %d is missing from the migrations directory", version)
		}
		if stored.up != actual.up || stored.down != actual.down {
			return fmt.Errorf("migration version %d was changed after being recorded", version)
		}
	}
	return nil
}

var errChecksumTableMissing = errors.New("migration checksum table does not exist")

func getCurrentVersion(database *sql.DB) (int64, error) {
	var version int64
	err := database.QueryRow(`SELECT version FROM schema_migrations LIMIT 1`).Scan(&version)
	if errors.Is(err, sql.ErrNoRows) {
		return 0, nil
	}
	if err != nil {
		var pqError *pq.Error
		if errors.As(err, &pqError) && pqError.Code == "42P01" {
			return 0, nil
		}
		return 0, fmt.Errorf("read migration version: %w", err)
	}
	return version, nil
}

func getStoredChecksums(database *sql.DB) (map[int64]migrationChecksum, error) {
	rows, err := database.Query(`
		SELECT version, up_checksum, down_checksum
		FROM migration_meta.migration_checksums
		ORDER BY version
	`)
	if err != nil {
		var pqError *pq.Error
		if errors.As(err, &pqError) && (pqError.Code == "42P01" || pqError.Code == "3F000") {
			return nil, errChecksumTableMissing
		}
		return nil, fmt.Errorf("read migration checksums: %w", err)
	}
	defer rows.Close()

	checksums := make(map[int64]migrationChecksum)
	for rows.Next() {
		var checksum migrationChecksum
		if err := rows.Scan(&checksum.version, &checksum.up, &checksum.down); err != nil {
			return nil, fmt.Errorf("scan migration checksum: %w", err)
		}
		checksums[checksum.version] = checksum
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate migration checksums: %w", err)
	}

	return checksums, nil
}

func calculateChecksums(files map[int64]migrationFiles) (map[int64]migrationChecksum, error) {
	checksums := make(map[int64]migrationChecksum, len(files))
	for version, migration := range files {
		upChecksum, err := fileChecksum(migration.up)
		if err != nil {
			return nil, err
		}
		downChecksum, err := fileChecksum(migration.down)
		if err != nil {
			return nil, err
		}
		checksums[version] = migrationChecksum{
			version: version,
			up:      upChecksum,
			down:    downChecksum,
		}
	}
	return checksums, nil
}

func fileChecksum(path string) (string, error) {
	file, err := os.Open(path)
	if err != nil {
		return "", fmt.Errorf("open migration %q: %w", path, err)
	}
	defer file.Close()

	hash := sha256.New()
	if _, err := io.Copy(hash, file); err != nil {
		return "", fmt.Errorf("hash migration %q: %w", path, err)
	}
	return hex.EncodeToString(hash.Sum(nil)), nil
}

func storeMissingChecksums(database *sql.DB, checksums map[int64]migrationChecksum, currentVersion int64) error {
	versions := make([]int64, 0, len(checksums))
	for version := range checksums {
		if version <= currentVersion {
			versions = append(versions, version)
		}
	}
	sort.Slice(versions, func(left, right int) bool { return versions[left] < versions[right] })

	transaction, err := database.Begin()
	if err != nil {
		return fmt.Errorf("begin checksum transaction: %w", err)
	}
	defer transaction.Rollback()

	for _, version := range versions {
		checksum := checksums[version]
		if _, err := transaction.Exec(`
			INSERT INTO migration_meta.migration_checksums (version, up_checksum, down_checksum)
			VALUES ($1, $2, $3)
			ON CONFLICT (version) DO NOTHING
		`, version, checksum.up, checksum.down); err != nil {
			return fmt.Errorf("store checksum for migration %d: %w", version, err)
		}
	}

	if err := transaction.Commit(); err != nil {
		return fmt.Errorf("commit migration checksums: %w", err)
	}
	return nil
}
