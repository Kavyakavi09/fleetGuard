package response

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"time"
)

type ctxKey int

const startTimeKey ctxKey = 1

var errNotObject = errors.New("payload must be a JSON object")

func WithStartTime(ctx context.Context, t time.Time) context.Context {
	return context.WithValue(ctx, startTimeKey, t)
}

func ElapsedNS(r *http.Request) string {
	start, ok := r.Context().Value(startTimeKey).(time.Time)
	if !ok {
		return "0"
	}
	return strconv.FormatInt(time.Since(start).Nanoseconds(), 10)
}

// JSON writes a top-level object and appends time_ns, preserving struct field order.
func JSON(w http.ResponseWriter, r *http.Request, status int, payload any) {
	raw, err := json.Marshal(payload)
	if err != nil {
		writeRawJSON(w, http.StatusInternalServerError, []byte(
			`{"error":"failed to encode response","time_ns":`+strconv.Quote(ElapsedNS(r))+`}`,
		))
		return
	}

	out, err := appendTimeNS(raw, ElapsedNS(r))
	if err != nil {
		writeJSON(w, status, payload)
		return
	}
	writeRawJSON(w, status, out)
}

func Error(w http.ResponseWriter, r *http.Request, status int, message string) {
	JSON(w, r, status, map[string]any{"error": message})
}

func appendTimeNS(raw []byte, timeNS string) ([]byte, error) {
	raw = bytes.TrimSpace(raw)
	if len(raw) == 0 || raw[0] != '{' || raw[len(raw)-1] != '}' {
		return nil, errNotObject
	}
	inner := bytes.TrimSpace(raw[1 : len(raw)-1])

	var b bytes.Buffer
	b.Grow(len(raw) + len(timeNS) + 16)
	b.WriteByte('{')
	if len(inner) > 0 {
		b.Write(inner)
		b.WriteByte(',')
	}
	b.WriteString(`"time_ns":`)
	b.WriteString(strconv.Quote(timeNS))
	b.WriteByte('}')
	return b.Bytes(), nil
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func writeRawJSON(w http.ResponseWriter, status int, raw []byte) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_, _ = w.Write(raw)
	_, _ = w.Write([]byte("\n"))
}
