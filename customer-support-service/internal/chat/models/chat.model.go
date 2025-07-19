package models

import (
	"time"
)

// Chat represents a chat session between users or with support.
type Chat struct {
	chatID         string    `json:"id" bson:"_id"`
	passengerID string    `json:"customer_id" bson:"customer_id"`
	staffID    string    `json:"agent_id,omitempty" bson:"agent_id,omitempty"`
	CreatedAt  time.Time `json:"created_at" bson:"created_at"`
	ClosedAt   *time.Time `json:"closed_at,omitempty" bson:"closed_at,omitempty"`
	Messages   []Message `json:"messages" bson:"messages"`
	Status     string    `json:"status" bson:"status"` // e.g. "open", "closed"
}

// Message represents a single message in a chat.
type Message struct {
	ID        string    `json:"id" bson:"_id"`
	ChatID    string    `json:"chat_id" bson:"chat_id"`
	SenderID  string    `json:"sender_id" bson:"sender_id"`
	Content   string    `json:"content" bson:"content"`
	SentAt    time.Time `json:"sent_at" bson:"sent_at"`
	IsAgent   bool      `json:"is_agent" bson:"is_agent"`
}