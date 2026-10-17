package configs

import (
	"errors"
	"time"
)

const (
	HTTP_READ_HEADER_TIMEOUT EnvKey = "HTTP_READ_HEADER_TIMEOUT"
	HTTP_READ_TIMEOUT        EnvKey = "HTTP_READ_TIMEOUT"
	HTTP_WRITE_TIMEOUT       EnvKey = "HTTP_WRITE_TIMEOUT"
	HTTP_IDLE_TIMEOUT        EnvKey = "HTTP_IDLE_TIMEOUT"
	HTTP_SHUTDOWN_TIMEOUT    EnvKey = "HTTP_SHUTDOWN_TIMEOUT"

	DefaultHTTPReadHeaderTimeout = 5 * time.Second
	DefaultHTTPReadTimeout       = 10 * time.Second
	DefaultHTTPWriteTimeout      = 30 * time.Second
	DefaultHTTPIdleTimeout       = 60 * time.Second
	DefaultHTTPShutdownTimeout   = 30 * time.Second
)

type HTTPServerConfig struct {
	ReadHeaderTimeout time.Duration
	ReadTimeout       time.Duration
	WriteTimeout      time.Duration
	IdleTimeout       time.Duration
	ShutdownTimeout   time.Duration
}

func loadHTTPServerConfig() (HTTPServerConfig, error) {
	var config HTTPServerConfig
	var validationErrors []error
	for _, setting := range []struct {
		key      EnvKey
		fallback time.Duration
		target   *time.Duration
	}{
		{HTTP_READ_HEADER_TIMEOUT, DefaultHTTPReadHeaderTimeout, &config.ReadHeaderTimeout},
		{HTTP_READ_TIMEOUT, DefaultHTTPReadTimeout, &config.ReadTimeout},
		{HTTP_WRITE_TIMEOUT, DefaultHTTPWriteTimeout, &config.WriteTimeout},
		{HTTP_IDLE_TIMEOUT, DefaultHTTPIdleTimeout, &config.IdleTimeout},
		{HTTP_SHUTDOWN_TIMEOUT, DefaultHTTPShutdownTimeout, &config.ShutdownTimeout},
	} {
		value, err := parseTimeout(setting.key, getEnv(setting.key), setting.fallback)
		*setting.target = value
		if err != nil {
			validationErrors = append(validationErrors, err)
		}
	}
	return config, errors.Join(validationErrors...)
}
