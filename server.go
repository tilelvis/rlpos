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

func openPOS() {
	url := "http://127.0.0.1:" + port + "/#/dashboard"

	// Give the HTTP server a moment to start.
	time.Sleep(800 * time.Millisecond)

	// Prefer Microsoft Edge app mode.
	edgePaths := []string{
		`C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`,
		`C:\Program Files\Microsoft\Edge\Application\msedge.exe`,
	}

	for _, edge := range edgePaths {
		if _, err := os.Stat(edge); err == nil {
			cmd := exec.Command(
				edge,
				"--app="+url,
				"--start-maximized",
			)

			if err := cmd.Start(); err == nil {
				return
			}
		}
	}

	// Fall back to Chrome app mode.
	chromePaths := []string{
		`C:\Program Files\Google\Chrome\Application\chrome.exe`,
		`C:\Program Files (x86)\Google\Chrome\Application\chrome.exe`,
	}

	for _, chrome := range chromePaths {
		if _, err := os.Stat(chrome); err == nil {
			cmd := exec.Command(
				chrome,
				"--app="+url,
				"--start-maximized",
			)

			if err := cmd.Start(); err == nil {
				return
			}
		}
	}

	// Final fallback: Windows default browser.

	baseDir := filepath.Dir(exePath)
	appDir := filepath.Join(baseDir, "app")

	if _, err := os.Stat(filepath.Join(appDir, "index.html")); err != nil {
		log.Fatalf("POS application not found: %s", appDir)
	}

	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Only allow local access.
		if r.Host != "127.0.0.1:"+port &&
			r.Host != "localhost:"+port {
			http.Error(w, "Forbidden", http.StatusForbidden)
			return
		}

		path := filepath.Clean(r.URL.Path)
		path = strings.TrimPrefix(path, "/")

		if path == "" {
			path = "index.html"
		}

		filePath := filepath.Join(
			appDir,
			filepath.FromSlash(path),
		)

		// Prevent path traversal.
		rel, err := filepath.Rel(appDir, filePath)

		if err != nil || strings.HasPrefix(rel, "..") {
			http.Error(w, "Forbidden", http.StatusForbidden)
	fmt.Println()
	fmt.Println("Running offline at:")
	fmt.Println("http://" + address)
	fmt.Println()
	fmt.Println("Close this window to stop POS.")
	fmt.Println()

	go openPOS()

	log.Fatal(http.ListenAndServe(address, nil))
}	fmt.Println("====================================")
	fmt.Println("          RAICILABS POS")
	fmt.Println("====================================")
			return
	address := "127.0.0.1:" + port


	http.Handle("/", handler)


		http.ServeFile(w, r, filePath)
	})
		}
			filePath = filepath.Join(appDir, "index.html")
		}

		// Support SPA routing.
		if info, err := os.Stat(filePath); err != nil || info.IsDir() {
		log.Fatal(err)
	}

func main() {
	exePath, err := os.Executable()
	if err != nil {
	cmd := exec.Command(
		"cmd",
}
		"/c",

	_ = cmd.Start()
		"start",
		"",
		url,
