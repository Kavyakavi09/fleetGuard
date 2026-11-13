package messaging

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
)

const (
	ExchangeName = "fleetguard.alerts"
	QueueName    = "fleetguard.alert.notifications"
	RoutingKey   = "alert.created"
)

type Rabbit struct {
	url  string
	conn *amqp.Connection
	ch   *amqp.Channel
}

func Connect(url string) (*Rabbit, error) {
	r := &Rabbit{url: url}
	if err := r.connect(); err != nil {
		return nil, err
	}
	return r, nil
}

func (r *Rabbit) connect() error {
	conn, err := amqp.Dial(r.url)
	if err != nil {
		return fmt.Errorf("dial rabbitmq: %w", err)
	}
	ch, err := conn.Channel()
	if err != nil {
		_ = conn.Close()
		return fmt.Errorf("open channel: %w", err)
	}
	if err := ch.ExchangeDeclare(ExchangeName, "topic", true, false, false, false, nil); err != nil {
		_ = ch.Close()
		_ = conn.Close()
		return fmt.Errorf("declare exchange: %w", err)
	}
	q, err := ch.QueueDeclare(QueueName, true, false, false, false, nil)
	if err != nil {
		_ = ch.Close()
		_ = conn.Close()
		return fmt.Errorf("declare queue: %w", err)
	}
	if err := ch.QueueBind(q.Name, RoutingKey, ExchangeName, false, nil); err != nil {
		_ = ch.Close()
		_ = conn.Close()
		return fmt.Errorf("bind queue: %w", err)
	}
	if err := ch.Qos(10, 0, false); err != nil {
		_ = ch.Close()
		_ = conn.Close()
		return fmt.Errorf("qos: %w", err)
	}
	r.conn = conn
	r.ch = ch
	return nil
}

func (r *Rabbit) Close() {
	if r.ch != nil {
		_ = r.ch.Close()
	}
	if r.conn != nil {
		_ = r.conn.Close()
	}
}

func (r *Rabbit) Publish(ctx context.Context, body []byte) error {
	if err := r.ensure(); err != nil {
		return err
	}
	return r.ch.PublishWithContext(ctx, ExchangeName, RoutingKey, false, false, amqp.Publishing{
		ContentType:  "application/json",
		DeliveryMode: amqp.Persistent,
		Timestamp:    time.Now().UTC(),
		Body:         body,
	})
}

func (r *Rabbit) Consume(ctx context.Context, handler func(ctx context.Context, body []byte) error) error {
	for {
		if err := ctx.Err(); err != nil {
			return err
		}
		if err := r.ensure(); err != nil {
			slog.Error("rabbitmq reconnect failed", "error", err)
			time.Sleep(2 * time.Second)
			continue
		}
		deliveries, err := r.ch.Consume(QueueName, "", false, false, false, false, nil)
		if err != nil {
			slog.Error("rabbitmq consume failed", "error", err)
			time.Sleep(2 * time.Second)
			continue
		}
		slog.Info("rabbitmq consumer started", "queue", QueueName)
		for {
			select {
			case <-ctx.Done():
				return ctx.Err()
			case d, ok := <-deliveries:
				if !ok {
					slog.Warn("rabbitmq delivery channel closed; reconnecting")
					time.Sleep(time.Second)
					break
				}
				if err := handler(ctx, d.Body); err != nil {
					slog.Error("alert worker failed", "error", err)
					_ = d.Nack(false, true)
					continue
				}
				_ = d.Ack(false)
			}
		}
	}
}

func (r *Rabbit) ensure() error {
	if r.conn != nil && !r.conn.IsClosed() && r.ch != nil && !r.ch.IsClosed() {
		return nil
	}
	return r.connect()
}
