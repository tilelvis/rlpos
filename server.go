package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

const port = "8080"

func main() {
	exePath, err := os.Executable()
	if err != nil {
		log.Fatal(err)
	}

	baseDir := filepath.Dir(exePath)
	appDir := filepath.Join(baseDir, "app")

	if _, err := os.Stat(filepath.Join(appDir, "index.html")); err != nil {
		log.Fatalf("POS application not found: %s", appDir)
	}

	// Serve the POS application.
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Only allow local access.
		if r.Host != "127.0.0.1:"+port && r.Host != "localhost:"+port {
			http.Error(w, "Forbidden", http.StatusForbidden)
			return
		}

		path := filepath.Clean(r.URL.Path)

		// Remove leading slash.
		path = strings.TrimPrefix(path, "/")

		// Serve index.html for the root.
		if path == "" {
			path = "index.html"
		}

		filePath := filepath.Join(appDir, filepath.FromSlash(path))

		// Prevent path traversal.
		rel, err := filepath.Rel(appDir, filePath)
		if err != nil || strings.HasPrefix(rel, "..") {
			http.Error(w, "Forbidden", http.StatusForbidden)
			return
		}

		// If the requested file doesn't exist, return index.html.
		// This supports client-side routing.
		if info, err := os.Stat(filePath); err != nil || info.IsDir() {
			filePath = filepath.Join(appDir, "index.html")
		}

		http.ServeFile(w, r, filePath)
	})

	http.Handle("/", handler)

	address := "127.0.0.1:" + port

	go func() {
		time.Sleep(800 * time.Millisecond)
		url := "http://" + address

		// Open Windows default browser.
		cmd := exec.Command("cmd", "/c", "start", "", url)
		_ = cmd.Start()
	}()

	fmt.Println("====================================")
	fmt.Println("       RAICILABS POS")
	fmt.Println("====================================")
	fmt.Println()
	fmt.Println("POS is running at:")
	fmt.Println("http://" + address)
	fmt.Println()
	fmt.Println("Keep this window open while using POS.")
	fmt.Println("Press Ctrl+C to stop the POS.")
	fmt.Println()

	log.Fatal(http.ListenAndServe(address, nil))
}
