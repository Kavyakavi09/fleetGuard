package service

import (
	"context"
	"log/slog"
	"time"

	"github.com/fleetguard/backend/pkg/messaging"
	"github.com/jackc/pgx/v5/pgxpool"
)

type OutboxPublisher struct {
	db       *pgxpool.Pool
	rabbit   *messaging.Rabbit
	interval time.Duration
}

func NewOutboxPublisher(db *pgxpool.Pool, rabbit *messaging.Rabbit) *OutboxPublisher {
	return &OutboxPublisher{db: db, rabbit: rabbit, interval: time.Second}
}

func (p *OutboxPublisher) Run(ctx context.Context) {
	ticker := time.NewTicker(p.interval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			if err := p.flush(ctx); err != nil {
				slog.Error("outbox publish failed", "error", err)
			}
		}
	}
}

func (p *OutboxPublisher) flush(ctx context.Context) error {
	tx, err := p.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	rows, err := tx.Query(ctx, `
		SELECT id, event_id, payload
		FROM notification_outbox
		WHERE status = 'pending'
		ORDER BY created_at
		LIMIT 50
		FOR UPDATE SKIP LOCKED
	`)
	if err != nil {
		return err
	}

	type item struct {
		id      string
		eventID string
		payload []byte
	}
	items := make([]item, 0)
	for rows.Next() {
		var it item
		if err := rows.Scan(&it.id, &it.eventID, &it.payload); err != nil {
			rows.Close()
			return err
		}
		items = append(items, it)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return err
	}

	for _, it := range items {
		if _, err := tx.Exec(ctx, `UPDATE notification_outbox SET attempts = attempts + 1 WHERE id = $1`, it.id); err != nil {
			return err
		}
		if err := p.rabbit.Publish(ctx, it.payload); err != nil {
			slog.Error("rabbit publish failed", "event_id", it.eventID, "error", err)
			continue
		}
		if _, err := tx.Exec(ctx, `
			UPDATE notification_outbox
			SET status = 'published', published_at = NOW()
			WHERE id = $1
		`, it.id); err != nil {
			return err
		}
		slog.Info("outbox event published", "event_id", it.eventID)
	}
	return tx.Commit(ctx)
}
