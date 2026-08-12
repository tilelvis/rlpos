package main

import (
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"time"
)

const address = "127.0.0.1:8080"

func openPOS() {
	time.Sleep(1000 * time.Millisecond)

	url := "http://" + address + "/#/dashboard"

	// Try Microsoft Edge first.
	edgePaths := []string{
		`C:\Program Files\Microsoft\Edge\Application\msedge.exe`,
		`C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`,
	}

	for _, path := range edgePaths {
		if _, err := os.Stat(path); err == nil {
			err := exec.Command(
				path,
				"--app="+url,
				"--start-maximized",
			).Start()

			if err == nil {
				return
			}
		}
	}

	// Try Google Chrome.
	chromePaths := []string{
		`C:\Program Files\Google\Chrome\Application\chrome.exe`,
		`C:\Program Files (x86)\Google\Chrome\Application\chrome.exe`,
	}

	for _, path := range chromePaths {
		if _, err := os.Stat(path); err == nil {
			err := exec.Command(
				path,
				"--app="+url,
				"--start-maximized",
			).Start()

			if err == nil {
				return
			}
		}
	}

	// Final fallback: default Windows browser.
	exec.Command(
		"cmd",
		"/c",
		"start",
		"",
		url,
	).Start()
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

	// Serve the compiled Vite application.
	fileServer := http.FileServer(http.Dir(appDir))

	http.Handle("/", fileServer)

	log.Println("====================================")
	log.Println("          RAICILABS POS")
	log.Println("====================================")
	log.Println("")
	log.Println("Offline server:")
	log.Println("http://" + address)
	log.Println("")
	log.Println("Starting POS...")
	// IMPORTANT:
	// Listen only on localhost.
	// The POS is not exposed to the LAN or internet.
	log.Fatal(http.ListenAndServe(address, nil))
}