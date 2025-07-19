package config

import (
	"os"
	"os/signal"
	"syscall"

	"go.uber.org/zap"
)

// InitConfig initializes all configuration components
func InitConfig() error {
	// Initialize logger first
	InitLogger()

	// Initialize Redis
	if err := InitRedis(); err != nil {
		Logger.Error("Failed to initialize Redis", zap.Error(err))
		return err
	}

	// Set up graceful shutdown
	setupGracefulShutdown()

	return nil
}

// setupGracefulShutdown sets up signal handling for graceful shutdown
func setupGracefulShutdown() {
	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt, syscall.SIGTERM)

	go func() {
		<-c
		Logger.Info("Received shutdown signal, closing connections...")

		// Close Redis connection
		if err := CloseRedis(); err != nil {
			Logger.Error("Error closing Redis connection", zap.Error(err))
		}

		Logger.Info("Graceful shutdown completed")
		os.Exit(0)
	}()
}
