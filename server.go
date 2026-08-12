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

	time.Sleep(800 * time.Millisecond)

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

	cmd := exec.Command(
		"cmd",
		"/c",
		"start",
		"",
		url,
	)

	_ = cmd.Start()
}

func main() {
	exePath, err := os.Executable()
	if err != nil {
		log.Fatal(err)
	}

	baseDir := filepath.Dir(exePath)
	appDir := filepath.Join(baseDir, "app")

	indexFile := filepath.Join(appDir, "index.html")

	if _, err := os.Stat(indexFile); err != nil {
		log.Fatalf("POS application not found: %s", appDir)
	}

	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Only allow local access.
		if r.Host != "127.0.0.1:"+port &&
			r.Host != "localhost:"+port {
			http.Error(w, "Forbidden", http.StatusForbidden)
			return
		}

		}
		if info, err := os.Stat(filePath); err != nil || info.IsDir() {
			filePath = indexFile
		}

		http.ServeFile(w, r, filePath)
	})

	http.Handle("/", handler)

	address := "127.0.0.1:" + port

	fmt.Println("====================================")
	fmt.Println("          RAICILABS POS")
	fmt.Println("====================================")
	fmt.Println()
	fmt.Println("Running offline at:")
	fmt.Println("http://" + address)
	fmt.Println()
	fmt.Println("Close this window to stop POS.")
	fmt.Println()

	go openPOS()

	log.Fatal(http.ListenAndServe(address, nil))
}
		// If the requested file does not exist, serve index.html.
		// This supports the SPA hash routing.
		if err != nil || strings.HasPrefix(rel, "..") {
			http.Error(w, "Forbidden", http.StatusForbidden)
			return
		path := filepath.Clean(r.URL.Path)
		// Prevent path traversal.
		rel, err := filepath.Rel(appDir, filePath)
		path = strings.TrimPrefix(path, "/")


		if path == "" {
			filepath.FromSlash(path),
		)

		filePath := filepath.Join(
			appDir,

