package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/fleetguard/backend/internal/config"
	"github.com/fleetguard/backend/internal/database"
	"github.com/fleetguard/backend/internal/handler"
	"github.com/fleetguard/backend/internal/middleware"
	"github.com/fleetguard/backend/internal/repository"
	"github.com/fleetguard/backend/internal/routes"
	"github.com/fleetguard/backend/internal/service"
	"github.com/fleetguard/backend/pkg/messaging"
	"github.com/fleetguard/backend/pkg/websocket"
	"github.com/joho/godotenv"
)

func main() {
	_ = godotenv.Load()
	cfg := config.Load()

	slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo})))

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	if err := database.Migrate(cfg.DatabaseURL, cfg.MigrationsDir); err != nil {
		slog.Error("migration failed", "error", err)
		os.Exit(1)
	}

	pool, err := database.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		slog.Error("database connection failed", "error", err)
		os.Exit(1)
	}
	defer pool.Close()

	rabbit, err := messaging.Connect(cfg.RabbitMQURL)
	if err != nil {
		slog.Error("rabbitmq connection failed", "error", err)
		os.Exit(1)
	}
	defer rabbit.Close()

	hub := websocket.NewHub()
	go hub.Run()

	publisher := service.NewOutboxPublisher(pool, rabbit)
	go publisher.Run(ctx)

	worker := service.NewAlertWorker(hub)
	go func() {
		if err := rabbit.Consume(ctx, worker.Handle); err != nil && ctx.Err() == nil {
			slog.Error("rabbit consumer stopped", "error", err)
		}
	}()

	geofenceRepo := repository.NewGeofenceRepository(pool)
	geofenceService := service.NewGeofenceService(geofenceRepo)
	geofenceHandler := handler.NewGeofenceHandler(geofenceService)

	vehicleRepo := repository.NewVehicleRepository(pool)
	vehicleService := service.NewVehicleService(vehicleRepo)
	vehicleHandler := handler.NewVehicleHandler(vehicleService)

	alertRepo := repository.NewAlertRepository(pool)
	alertService := service.NewAlertService(alertRepo)
	alertHandler := handler.NewAlertHandler(alertService)

	trackingRepo := repository.NewTrackingRepository(pool)
	trackingService := service.NewTrackingService(trackingRepo, vehicleService)
	trackingHandler := handler.NewTrackingHandler(trackingService)

	violationRepo := repository.NewViolationRepository(pool)
	violationService := service.NewViolationService(violationRepo)
	violationHandler := handler.NewViolationHandler(violationService)

	mux := routes.NewMux(routes.Deps{
		Geofence:  geofenceHandler,
		Vehicle:   vehicleHandler,
		Tracking:  trackingHandler,
		Alert:     alertHandler,
		Violation: violationHandler,
		Hub:       hub,
	})

	httpHandler := middleware.Chain(mux, middleware.Recover, middleware.Timing, middleware.CORS(cfg.CORSOrigins))

	srv := &http.Server{
		Addr:              ":" + cfg.HTTPPort,
		Handler:           httpHandler,
		ReadHeaderTimeout: 5 * time.Second,
	}

	go func() {
		slog.Info("fleetguard api listening", "port", cfg.HTTPPort)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("http server failed", "error", err)
			os.Exit(1)
		}
	}()

	<-ctx.Done()
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	_ = srv.Shutdown(shutdownCtx)
	slog.Info("fleetguard api stopped")
}
