package middlewares

import (
	"bytes"
	"errors"
	"fmt"
	"io"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/mbashem/cftracker/backend/internal/limits"
)

// LimitRequestBody reads at most the cap plus one byte before handlers decode JSON.
// Reading the complete bounded body also catches oversized trailing JSON/whitespace
// and chunked requests, regardless of Content-Length or decoder read-ahead.
func LimitRequestBody(context *gin.Context) {
	if context.Request.Body == nil {
		return
	}
	defer context.Request.Body.Close()
	capBytes := limits.RequestBodyBytes
	if context.Request.Method == http.MethodPost {
		switch context.FullPath() {
		case "/api/v1/lists/:listId/items", "/api/v1/lists/:listId/items/move", "/api/v1/lists/:listId/items/remove":
			capBytes = limits.ListCollectionRequestBodyBytes
		}
	}
	body, err := io.ReadAll(http.MaxBytesReader(context.Writer, context.Request.Body, int64(capBytes)))
	if err != nil {
		var oversized *http.MaxBytesError
		if errors.As(err, &oversized) {
			size, unit := capBytes/1024, "KiB"
			if capBytes%(1024*1024) == 0 {
				size, unit = capBytes/(1024*1024), "MiB"
			}
			message := fmt.Sprintf("Request body exceeds %d %s", size, unit)
			context.AbortWithStatusJSON(http.StatusRequestEntityTooLarge, gin.H{"error": message})
		} else {
			context.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "Failed to read request body"})
		}
		return
	}
	context.Request.Body = io.NopCloser(bytes.NewReader(body))
}
