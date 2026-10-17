// Package server configures the HTTP listener and drains it before dependency cleanup.
package server

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net"
	"net/http"
	"time"

	"github.com/mbashem/cftracker/backend/configs"
)

func New(address string, handler http.Handler, config configs.HTTPServerConfig) *http.Server {
	return &http.Server{
		Addr:              address,
		Handler:           handler,
		ReadHeaderTimeout: config.ReadHeaderTimeout,
		ReadTimeout:       config.ReadTimeout,
		WriteTimeout:      config.WriteTimeout,
		IdleTimeout:       config.IdleTimeout,
	}
}

// ListenAndServe owns listener creation and the complete serving/shutdown lifecycle.
func ListenAndServe(ctx context.Context, server *http.Server, shutdownTimeout time.Duration) error {
	listener, err := net.Listen("tcp", server.Addr)
	if err != nil {
		return fmt.Errorf("listen HTTP: %w", err)
	}
	return Serve(ctx, server, listener, shutdownTimeout)
}

// Serve blocks until serving fails or shutdown completes. The stop context is
// deliberately separate from request contexts so a signal does not abort draining work.
func Serve(ctx context.Context, server *http.Server, listener net.Listener, shutdownTimeout time.Duration) error {
	result := make(chan error, 1)
	go func() { result <- server.Serve(listener) }()
	select {
	case err := <-result:
		return errors.Join(servingError(err), server.Close())
	case <-ctx.Done():
	}

	log.Printf("Shutting down HTTP server; drain budget %s", shutdownTimeout)
	shutdownContext, cancel := context.WithTimeout(context.Background(), shutdownTimeout)
	defer cancel()
	if err := server.Shutdown(shutdownContext); err != nil {
		// Shutdown does not force-close connections when its context expires.
		closeError := server.Close()
		return errors.Join(fmt.Errorf("shutdown HTTP server: %w", err), closeError, servingError(<-result))
	}
	return servingError(<-result)
}

func servingError(err error) error {
	if errors.Is(err, http.ErrServerClosed) {
		return nil
	}
	return fmt.Errorf("serve HTTP: %w", err)
}
