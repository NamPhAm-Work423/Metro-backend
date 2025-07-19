package config

import (
	"net/http"
	"os"
	"path/filepath"
	"time"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
	"gopkg.in/natefinch/lumberjack.v2"
)

var Logger *zap.Logger

var RequestLoggerMiddleware func(next http.Handler) http.Handler

func InitLogger() {
	// Set up log level
	var level zapcore.Level
	if os.Getenv("LOG_LEVEL") == "debug" {
		level = zap.DebugLevel
	} else {
		level = zap.InfoLevel
	}

	//Encoder configuration
	encoderConfig := zapcore.EncoderConfig{
		TimeKey:        "time",
		LevelKey:       "level",
		NameKey:        "logger",
		CallerKey:      "caller",
		MessageKey:     "msg",
		StacktraceKey:  "stacktrace",
		LineEnding:     zapcore.DefaultLineEnding,
		EncodeLevel:    zapcore.CapitalLevelEncoder,
		EncodeTime:     zapcore.ISO8601TimeEncoder,
		EncodeDuration: zapcore.StringDurationEncoder,
		EncodeCaller:   zapcore.ShortCallerEncoder,
	}

	//Create core console with simple colorized output
	consoleEncoder := zapcore.NewConsoleEncoder(zapcore.EncoderConfig{
		TimeKey:        "time",
		LevelKey:       "level",
		MessageKey:     "msg",
		EncodeLevel:    zapcore.CapitalColorLevelEncoder,
		EncodeTime:     zapcore.ISO8601TimeEncoder,
		EncodeDuration: zapcore.StringDurationEncoder,
	})
	consoleCore := zapcore.NewCore(consoleEncoder, zapcore.AddSync(os.Stdout), level)

	// Logs path
	logDir := filepath.Join("..", "logs")
	if err := os.MkdirAll(logDir, 0755); err != nil {
		panic("Failed to create log directory: " + err.Error())
	}
	fileEncoder := zapcore.NewJSONEncoder(encoderConfig)
	fileWriter := zapcore.AddSync(&lumberjack.Logger{
		Filename:   filepath.Join(logDir, "application-%Y-%m-%d.log"),
		MaxSize:    20, // MB
		MaxBackups: 14, // days
		MaxAge:     14, // days
		Compress:   true,
	})
	fileCore := zapcore.NewCore(fileEncoder, fileWriter, zapcore.ErrorLevel)
	allFileCore := zapcore.NewCore(fileEncoder, fileWriter, level)

	// Combine cores
	core := zapcore.NewTee(consoleCore, fileCore, allFileCore)

	// Logger with metadata
	logger := zap.New(core, zap.AddCaller(), zap.AddStacktrace(zapcore.ErrorLevel))
	Logger = logger.With(zap.String("service", "customer-support-service"))

	// Create middleware request logger
	RequestLoggerMiddleware = func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			startTime := time.Now()

			// Override ResponseWriter to capture status code
			rw := &responseWriter{ResponseWriter: w, statusCode: 200}
			next.ServeHTTP(rw, r)

			duration := time.Since(startTime)
			Logger.Info("Request completed",
				zap.String("method", r.Method),
				zap.String("url", r.URL.String()),
				zap.Int("status", rw.statusCode),
				zap.Duration("duration", duration),
				zap.String("ip", r.RemoteAddr),
				zap.String("userAgent", r.UserAgent()),
				zap.String("responseTime", duration.String()),
			)
		})
	}
}

// responseWriter to capture status code
type responseWriter struct {
	http.ResponseWriter
	statusCode int
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}
