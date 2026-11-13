package config

import (
	"os"
	"strconv"
	"strings"
)

type Config struct {
	HTTPPort     string
	DatabaseURL  string
	RabbitMQURL  string
	CORSOrigins  []string
	MigrationsDir string
}

func Load() Config {
	return Config{
		HTTPPort:      getEnv("HTTP_PORT", "3847"),
		DatabaseURL:   getEnv("DATABASE_URL", "postgres://fleetguard:fleetguard@localhost:5432/fleetguard?sslmode=disable"),
		RabbitMQURL:   getEnv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672/"),
		CORSOrigins:   strings.Split(getEnv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3848"), ","),
		MigrationsDir: getEnv("MIGRATIONS_DIR", "migrations"),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func GetEnvInt(key string, fallback int) int {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	return fallback
}
