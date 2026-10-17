package ratelimit

import (
	"fmt"
	"math"
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"
)

type Policy uint8

const (
	General Policy = iota
	Write
	Login
	Callback
	Codeforces
)

const (
	defaultMaxEntries = 10000
	idleLifetime      = 10 * time.Minute
	cleanupInterval   = time.Minute
	trafficBurst      = 10
	tooManyRequests   = "Too many requests. Try again later."
)

type Config struct {
	GeneralPerMinute   int
	WritePerMinute     int
	AuthPerMinute      int
	CodeforcesCooldown time.Duration
	MaxEntries         int
}

func DefaultConfig() Config {
	return Config{GeneralPerMinute: 60, WritePerMinute: 30, AuthPerMinute: 10, CodeforcesCooldown: time.Minute, MaxEntries: defaultMaxEntries}
}

type key struct {
	policy   Policy
	identity string
}

type entry struct {
	limiter  *rate.Limiter
	lastSeen time.Time
}

// Service owns process-local allowances. Multiple instances need shared enforcement.
type Service struct {
	mu          sync.Mutex
	entries     map[key]*entry
	config      Config
	now         func() time.Time
	nextCleanup time.Time
}

type Option func(*Service)

// WithClock supplies the clock used for allowance and expiration calculations.
func WithClock(now func() time.Time) Option {
	return func(service *Service) { service.now = now }
}

func New(config Config, options ...Option) (*Service, error) {
	if config.GeneralPerMinute <= 0 || config.WritePerMinute <= 0 || config.AuthPerMinute <= 0 || config.CodeforcesCooldown <= 0 || config.MaxEntries <= 0 {
		return nil, fmt.Errorf("rate limits, cooldown, and maximum entries must be positive")
	}
	service := &Service{entries: make(map[key]*entry), config: config, now: time.Now}
	for _, option := range options {
		option(service)
	}
	return service, nil
}

// Allow atomically consumes one allowance, or returns the delay until a retry.
// Rejected attempts never reserve future capacity or extend the cooldown.
func (service *Service) Allow(policy Policy, identity string) (bool, time.Duration) {
	service.mu.Lock()
	defer service.mu.Unlock()
	now := service.now()
	if !now.Before(service.nextCleanup) {
		lifetime := max(idleLifetime, service.config.CodeforcesCooldown)
		for key, entry := range service.entries {
			if now.Sub(entry.lastSeen) >= lifetime {
				delete(service.entries, key)
			}
		}
		service.nextCleanup = now.Add(cleanupInterval)
	}
	key := key{policy: policy, identity: identity}
	stored, found := service.entries[key]
	if !found {
		if len(service.entries) >= service.config.MaxEntries {
			// Fail closed rather than evicting active identities and resetting their limits.
			return false, cleanupInterval
		}
		var limit rate.Limit
		burst := trafficBurst
		switch policy {
		case General:
			limit = rate.Limit(float64(service.config.GeneralPerMinute) / 60)
		case Write:
			limit = rate.Limit(float64(service.config.WritePerMinute) / 60)
		case Login, Callback:
			limit = rate.Limit(float64(service.config.AuthPerMinute) / 60)
		case Codeforces:
			limit = rate.Every(service.config.CodeforcesCooldown)
			burst = 1
		default:
			return false, cleanupInterval
		}
		stored = &entry{limiter: rate.NewLimiter(limit, burst)}
		service.entries[key] = stored
	}
	stored.lastSeen = now
	reservation := stored.limiter.ReserveN(now, 1)
	delay := reservation.DelayFrom(now)
	if delay > 0 {
		reservation.CancelAt(now)
		return false, delay
	}
	return true, 0
}

func Reject(context *gin.Context, retryAfter time.Duration) {
	seconds := max(1, int(math.Ceil(retryAfter.Seconds())))
	context.Header("Retry-After", strconv.Itoa(seconds))
	context.Header("Cache-Control", "no-store")
	context.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{"error": tooManyRequests})
}
