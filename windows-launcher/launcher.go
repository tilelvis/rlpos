package main

import (
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"syscall"
	"time"
)

const address = "127.0.0.1:8080"

func main() {
	baseDir, err := os.Executable()
	if err != nil {
		return
	}

	baseDir = filepath.Dir(baseDir)

	serverPath := filepath.Join(baseDir, "server.exe")

	// Start the local POS server without showing a console window.
	server := exec.Command(serverPath)
	server.Dir = baseDir
	server.Stdout = nil
	server.Stderr = nil
	server.Stdin = nil

	// Hide the server console window.
	server.SysProcAttr = &syscall.SysProcAttr{
		HideWindow: true,
	}

	_ = server.Start()

	// Wait until the local server is actually responding.
	url := "http://" + address + "/#/dashboard"

	for i := 0; i < 30; i++ {
		resp, err := http.Get("http://" + address)

		if err == nil {
			resp.Body.Close()
			break
		}

		time.Sleep(200 * time.Millisecond)
	}

	// Start Edge in application mode.
	edgePaths := []string{
		`C:\Program Files\Microsoft\Edge\Application\msedge.exe`,
		`C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`,
	}

	for _, edge := range edgePaths {
		if _, err := os.Stat(edge); err == nil {
			cmd := exec.Command(
				edge,
				"--app="+url,
				"--start-maximized",
			)

			_ = cmd.Start()
			return
		}
	}
}