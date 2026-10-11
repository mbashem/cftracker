package health

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

const readinessTimeout = time.Second

type DatabasePinger interface {
	PingContext(context.Context) error
}

type API struct {
	database DatabasePinger
}

func NewAPI(database DatabasePinger) *API {
	return &API{database: database}
}

// Live checks the HTTP process independently of its external dependencies.
func (api *API) Live(request *gin.Context) {
	request.Header("Cache-Control", "no-store")
	request.JSON(http.StatusOK, gin.H{"status": "alive"})
}

// Ready checks the shared application pool, including time spent waiting for it.
func (api *API) Ready(request *gin.Context) {
	request.Header("Cache-Control", "no-store")
	ctx, cancel := context.WithTimeout(request.Request.Context(), readinessTimeout)
	defer cancel()
	if api.database == nil || api.database.PingContext(ctx) != nil {
		request.JSON(http.StatusServiceUnavailable, gin.H{"status": "unavailable"})
		return
	}
	request.JSON(http.StatusOK, gin.H{"status": "ready"})
}
