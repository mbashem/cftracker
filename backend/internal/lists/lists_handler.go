package lists

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

// Create a new list
func createListHandler(c *gin.Context) {
	userID := c.GetInt64("userID") // Assume userID is set in the context
	var list List
	if err := c.ShouldBindJSON(&list); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	list.UserID = userID
	if err := list.Create(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create list"})
		return
	}
	c.JSON(http.StatusOK, list)
}

// Delete a list
func deleteListHandler(c *gin.Context) {
	listID, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	if err := deleteList(listID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete list"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "List deleted"})
}

// Add a problem to a list
func addToListHandler(c *gin.Context) {
	var item ListItem
	if err := c.ShouldBindJSON(&item); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := item.AddToList(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add item to list"})
		return
	}
	c.JSON(http.StatusOK, item)
}

// Reorder problems in a list
func reorderListItemsHandler(c *gin.Context) {
	listID, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	var newOrder []int64
	if err := c.ShouldBindJSON(&newOrder); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := reorderListItems(listID, newOrder); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to reorder items"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "List items reordered"})
}
