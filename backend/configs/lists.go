package configs

import "math/bits"

// List storage policy is configured together so capacity and rank spacing cannot drift apart.
const (
	MaxItemsPerList           = 1000
	ListPositionGap     int64 = 1 << 30
	ListMinimumGapFloor int64 = 1 << 10
)

// MinimumListPositionGap reserves enough integer positions for a maximum-sized incoming batch.
// Increasing the list limit automatically raises this power-of-two threshold when needed.
func MinimumListPositionGap() int64 {
	return max(ListMinimumGapFloor, int64(1)<<bits.Len(uint(MaxItemsPerList)))
}
