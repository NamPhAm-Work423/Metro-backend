package config

import (
	"context"
	"fmt"
	"os"
	"strconv"
	"time"

	"github.com/go-redis/redis/v8"
	"go.uber.org/zap"
)

var (
	redisClient *redis.Client
	redisCtx    = context.Background()
)

// RedisConfig holds Redis connection configuration
type RedisConfig struct {
	Host     string
	Port     string
	User     string
	Password string
	DB       int
}

// getRedisConfig returns Redis configuration from environment variables
func getRedisConfig() *RedisConfig {
	host := os.Getenv("REDIS_HOST")
	if host == "" {
		host = "127.0.0.1"
	}

	port := os.Getenv("REDIS_PORT")
	if port == "" {
		port = "6379"
	}

	user := os.Getenv("REDIS_USER")
	password := os.Getenv("REDIS_PASSWORD")

	db := 0
	if dbStr := os.Getenv("REDIS_DB"); dbStr != "" {
		if dbNum, err := strconv.Atoi(dbStr); err == nil {
			db = dbNum
		}
	}

	return &RedisConfig{
		Host:     host,
		Port:     port,
		User:     user,
		Password: password,
		DB:       db,
	}
}

// setupRedisClient creates and configures Redis client
func setupRedisClient() error {
	config := getRedisConfig()

	// Create Redis client options
	options := &redis.Options{
		Addr:     fmt.Sprintf("%s:%s", config.Host, config.Port),
		DB:       config.DB,
		PoolSize: 10, // Default pool size
	}

	// Set credentials only if provided
	if config.Password != "" {
		options.Password = config.Password
	}

	// Create Redis client
	client := redis.NewClient(options)

	// Test connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := client.Ping(ctx).Err(); err != nil {
		return fmt.Errorf("failed to connect to Redis: %w", err)
	}

	redisClient = client
	Logger.Info("Redis connected successfully",
		zap.String("host", config.Host),
		zap.String("port", config.Port),
		zap.Int("db", config.DB),
	)

	return nil
}

// InitRedis initializes Redis connection
func InitRedis() error {
	if redisClient != nil {
		return nil
	}

	Logger.Info("Initializing Redis connection...")

	if err := setupRedisClient(); err != nil {
		Logger.Error("Redis initialization failed", zap.Error(err))
		return err
	}

	Logger.Info("Redis initialization complete")
	return nil
}

// GetRedisClient returns the Redis client instance
func GetRedisClient() *redis.Client {
	return redisClient
}

// WithRedisClient executes an operation with Redis client, handling connection issues
func WithRedisClient(operation func(*redis.Client) error) error {
	if redisClient == nil {
		if err := InitRedis(); err != nil {
			return fmt.Errorf("Redis client not available: %w", err)
		}
	}

	// Test connection before operation
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	if err := redisClient.Ping(ctx).Err(); err != nil {
		Logger.Warn("Redis connection lost, attempting to reconnect", zap.Error(err))
		if err := setupRedisClient(); err != nil {
			return fmt.Errorf("failed to reconnect to Redis: %w", err)
		}
	}

	return operation(redisClient)
}

// SetWithExpiry sets a key with expiration time
func SetWithExpiry(key, value string, expirySeconds int) error {
	return WithRedisClient(func(client *redis.Client) error {
		ctx, cancel := context.WithTimeout(redisCtx, 5*time.Second)
		defer cancel()

		err := client.Set(ctx, key, value, time.Duration(expirySeconds)*time.Second).Err()
		if err != nil {
			Logger.Error("Failed to set Redis key",
				zap.String("key", key),
				zap.Error(err))
			return err
		}

		Logger.Debug("Redis key set successfully",
			zap.String("key", key),
			zap.Int("expiry", expirySeconds))
		return nil
	})
}

// Get retrieves a value from Redis
func Get(key string) (string, error) {
	var result string
	err := WithRedisClient(func(client *redis.Client) error {
		ctx, cancel := context.WithTimeout(redisCtx, 5*time.Second)
		defer cancel()

		val, err := client.Get(ctx, key).Result()
		if err != nil {
			if err == redis.Nil {
				Logger.Debug("Redis key not found", zap.String("key", key))
				return err
			}
			Logger.Error("Failed to get Redis key",
				zap.String("key", key),
				zap.Error(err))
			return err
		}

		result = val
		Logger.Debug("Redis key retrieved successfully", zap.String("key", key))
		return nil
	})

	return result, err
}

// Delete removes a key from Redis
func Delete(key string) error {
	return WithRedisClient(func(client *redis.Client) error {
		ctx, cancel := context.WithTimeout(redisCtx, 5*time.Second)
		defer cancel()

		err := client.Del(ctx, key).Err()
		if err != nil {
			Logger.Error("Failed to delete Redis key",
				zap.String("key", key),
				zap.Error(err))
			return err
		}

		Logger.Debug("Redis key deleted successfully", zap.String("key", key))
		return nil
	})
}

// Exists checks if a key exists in Redis
func Exists(key string) (bool, error) {
	var exists bool
	err := WithRedisClient(func(client *redis.Client) error {
		ctx, cancel := context.WithTimeout(redisCtx, 5*time.Second)
		defer cancel()

		result, err := client.Exists(ctx, key).Result()
		if err != nil {
			Logger.Error("Failed to check Redis key existence",
				zap.String("key", key),
				zap.Error(err))
			return err
		}

		exists = result > 0
		return nil
	})

	return exists, err
}

// CloseRedis closes the Redis connection
func CloseRedis() error {
	if redisClient != nil {
		Logger.Info("Closing Redis connection...")
		err := redisClient.Close()
		redisClient = nil
		return err
	}
	return nil
}

// IsRedisAvailable checks if Redis is available
func IsRedisAvailable() bool {
	if redisClient == nil {
		return false
	}

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	return redisClient.Ping(ctx).Err() == nil
}
