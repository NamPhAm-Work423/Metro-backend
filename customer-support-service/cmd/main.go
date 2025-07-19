package main

import (
	"log"

	"customer-support-service/config"

	"go.uber.org/zap"
)

func main() {
	// Initialize configuration (logger, Redis, etc.)
	if err := config.InitConfig(); err != nil {
		log.Fatalf("Failed to initialize configuration: %v", err)
	}

	config.Logger.Info("Customer Support Service starting...")

	// Example Redis operations
	exampleRedisOperations()

	// Set up HTTP server (placeholder for future implementation)
	setupHTTPServer()
}

func exampleRedisOperations() {
	// Example: Set a key with expiry
	err := config.SetWithExpiry("test:key", "test_value", 3600)
	if err != nil {
		config.Logger.Error("Failed to set Redis key", zap.Error(err))
		return
	}

	// Example: Get a value
	value, err := config.Get("test:key")
	if err != nil {
		config.Logger.Error("Failed to get Redis key", zap.Error(err))
		return
	}

	config.Logger.Info("Retrieved value from Redis", zap.String("value", value))

	// Example: Check if key exists
	exists, err := config.Exists("test:key")
	if err != nil {
		config.Logger.Error("Failed to check key existence", zap.Error(err))
		return
	}

	config.Logger.Info("Key exists", zap.Bool("exists", exists))
}

func setupHTTPServer() {
	// Placeholder for HTTP server setup
	// This would typically include router setup, middleware, etc.
	config.Logger.Info("HTTP server setup placeholder - implement your routes here")

	// Example of how to use the request logger middleware
	// router := mux.NewRouter()
	// router.Use(config.RequestLoggerMiddleware)

	// Start HTTP server on port 3004
	port := "3004"
	config.Logger.Info("Starting HTTP server", zap.String("port", port))

	// Keep the process running
	select {}
}
