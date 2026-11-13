FROM golang:1.26-bookworm AS builder
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/api ./cmd/api

FROM gcr.io/distroless/static-debian12:nonroot
WORKDIR /app
COPY --from=builder /out/api /app/api
COPY migrations /app/migrations
ENV MIGRATIONS_DIR=/app/migrations
ENV HTTP_PORT=3847
EXPOSE 3847
USER nonroot:nonroot
ENTRYPOINT ["/app/api"]
