package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/exec"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"frodobot-server/control"
	"frodobot-server/estimation"
)

// Version information (set via build flags)
var (
	Version   = "dev"
	BuildTime = "unknown"
	GitHash   = "unknown"
)

// SDK-compatible data structure
type SensorData struct {
	Battery     int            `json:"battery"`
	Voltage     float64        `json:"voltage"`            // Battery voltage in volts
	Current     float64        `json:"current"`            // Current draw in amps
	Power       float64        `json:"power"`              // Power consumption in watts
	SignalLevel int            `json:"signal_level"`
	Orientation int            `json:"orientation"`
	Roll        float64        `json:"roll"`               // Roll angle in degrees
	Pitch       float64        `json:"pitch"`              // Pitch angle in degrees
	Yaw         float64        `json:"yaw"`                // Yaw angle in degrees
	Lamp        int            `json:"lamp"`
	Speed       float64        `json:"speed"`
	GPSSignal   float64        `json:"gps_signal"`         // GPS signal strength 0-100% (based on avg SNR)
	AvgSNR      float64        `json:"avg_snr"`            // Average SNR in dBHz
	SNRValues   []SatelliteSNR `json:"snr_values"`         // Individual satellite SNR values
	Latitude    float64        `json:"latitude"`
	Longitude   float64        `json:"longitude"`
	Altitude    float64        `json:"altitude"`           // GPS altitude in meters
	Satellites  int            `json:"satellites"`         // Number of satellites
	FixQuality  int            `json:"fix_quality"`        // 0=Invalid, 1=GPS, 2=DGPS, 4=RTK Fixed, 5=RTK Float
	HDOP        float64        `json:"hdop"`               // Horizontal Dilution of Precision
	HPE         float64        `json:"hpe"`                // Horizontal Position Error in meters (HDOP * UERE)
	GPSHeading  float64        `json:"gps_heading"`        // GPS Course Over Ground in degrees (0-360, only valid when moving)
	GPSSpeed    float64        `json:"gps_speed"`          // GPS ground speed in meters/second
	Vibration   float64        `json:"vibration"`
	Timestamp   float64        `json:"timestamp"`
	Accels      [][]float64    `json:"accels"`
	Gyros       [][]float64    `json:"gyros"`
	Mags        [][]float64    `json:"mags"`
	RPMs        [][]float64    `json:"rpms"`
	// Odometry fields (raw dead reckoning)
	OdomX          float64 `json:"odom_x"`           // Odometry X position in meters
	OdomY          float64 `json:"odom_y"`           // Odometry Y position in meters
	OdomTheta      float64 `json:"odom_theta"`       // Odometry heading in radians
	OdomThetaDeg   float64 `json:"odom_theta_deg"`   // Odometry heading in degrees
	OdomLinearVel  float64 `json:"odom_linear_vel"`  // Odometry linear velocity in m/s
	OdomAngularVel float64 `json:"odom_angular_vel"` // Odometry angular velocity in rad/s
	// State Estimation fields (fused odometry + GPS + IMU)
	EstX           float64 `json:"est_x"`            // Estimated local X position in meters (East)
	EstY           float64 `json:"est_y"`            // Estimated local Y position in meters (North)
	EstVx          float64 `json:"est_vx"`           // Estimated velocity X in m/s
	EstVy          float64 `json:"est_vy"`           // Estimated velocity Y in m/s
	EstTheta       float64 `json:"est_theta"`        // Estimated heading in radians
	EstThetaDeg    float64 `json:"est_theta_deg"`    // Estimated heading in degrees
	EstLat         float64 `json:"est_lat"`          // Estimated latitude in degrees
	EstLon         float64 `json:"est_lon"`          // Estimated longitude in degrees
	EstUncertainty float64 `json:"est_uncertainty"`  // Position uncertainty (std dev) in meters
	EstInitialized bool    `json:"est_initialized"`  // Whether state estimator is initialized
	// Network interface stats
	Network map[string]NetworkInterfaceStats `json:"network"` // Network interface statistics
	// WiFi client status
	WiFi WiFiStatus `json:"wifi"` // WiFi client connection status
	// LTE modem status
	LTE LTEStatus `json:"lte"` // LTE modem connection status
	// Camera system status
	Camera CameraStatusSummary `json:"camera"` // Camera daemon and stream status
	// RTK status
	RTK NTRIPStatus `json:"rtk"` // RTK/NTRIP connection status
	// Logging status
	Log LogStatus `json:"log"` // Data logging status
	// LibSurvive status
	Survive     SurviveStatus    `json:"survive"`      // LibSurvive VR tracking status
	SurvivePose *SurvivePoseData `json:"survive_pose"` // Latest libsurvive pose with timestamps
}

// LogStatus contains the current logging state
type LogStatus struct {
	Active       bool    `json:"active"`
	Paused       bool    `json:"paused"`
	RecordCount  int     `json:"record_count"`
	CurrentFile  string  `json:"current_file,omitempty"`
	StartTime    string  `json:"start_time,omitempty"`
	DurationSecs float64 `json:"duration_seconds,omitempty"`
}

// Stats tracking
type Stats struct{
	PacketsLast10s int
	ErrorsLast10s  int
	DataRateHz     float64
	Uptime         time.Duration
}

// Command structures for WebSocket control
type Command struct {
	Type string      `json:"type"` // "motor", "keepalive", "imu_start", "imu_end", "mag_start", "mag_end", "imu_write", "mag_write", "imu_read", "set_bitrate"
	Data interface{} `json:"data"` // Command-specific data (will be decoded from msgpack/json)
}

type MotorCommand struct {
	Speed    int16 `json:"speed"`     // Linear speed (-100 to 100)
	Angular  int16 `json:"angular"`   // Angular velocity (-100 to 100)
	FrontLED int16 `json:"front_led"` // Front LED brightness (0-100)
	BackLED  int16 `json:"back_led"`  // Back LED brightness (0-100)
}

type LightsCommand struct {
	State string `json:"state"` // "on" or "off"
}

type CalibrationCommand struct {
	Type string `json:"type"` // "mag" or "imu"
}

type IMUWriteCommand struct {
	AccBiasX  uint16 `json:"accBiasX"`
	AccBiasY  uint16 `json:"accBiasY"`
	AccBiasZ  uint16 `json:"accBiasZ"`
	GyroBiasX uint16 `json:"gyroBiasX"`
	GyroBiasY uint16 `json:"gyroBiasY"`
	GyroBiasZ uint16 `json:"gyroBiasZ"`
}

type MagWriteCommand struct {
	MagBiasX uint16 `json:"magBiasX"`
	MagBiasY uint16 `json:"magBiasY"`
	MagBiasZ uint16 `json:"magBiasZ"`
}

type SetBitrateCommand struct {
	CameraID    int `json:"camera_id"`    // 0=front, 1=rear
	BitrateKbps int `json:"bitrate_kbps"` // 100-20000 kbps
}

type CommandResponse struct {
	Success bool                   `json:"success"`
	Message string                 `json:"message,omitempty"`
	Error   string                 `json:"error,omitempty"`
	Data    map[string]interface{} `json:"data,omitempty"`
}

// Global state
var (
	debugMode            bool
	latestTelemetry      *UCPTelemetry
	telemMutex           sync.RWMutex
	latestCalibration    *UCPCalibrationData
	calibrationMutex     sync.RWMutex
	wsConnections        map[*websocket.Conn]bool // Track all active WebSocket connections
	wsConnectionsMutex   sync.RWMutex
	currentGPS           GPSData
	gpsMutex             sync.RWMutex
	ahrsFilter           *MadgwickFilter
	wheelOdometry        *control.WheelOdometry      // Wheel odometry estimator
	stateEstimator       *estimation.StateEstimator  // EKF state estimator for sensor fusion
	currentStats            Stats
	statsMutex              sync.RWMutex
	orientationOffset       OrientationOffsets // Roll, Pitch, Yaw offsets in degrees
	orientationOffsetMutex  sync.RWMutex
	startTime               time.Time
	serialPort           io.Writer // Serial port for sending commands
	serialPortMutex      sync.Mutex
	upgrader             = websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool {
			return true // Allow all origins for now
		},
	}
)

// processCleanupLoop monitors and kills stale frodobot and network manager processes
func processCleanupLoop() {
	processesToKill := []string{
		"frodobot.bin",
		"frodobot-uart",
		"frodobot.sh",
		"net_manager.sh",
	}

	for {
		// Check for and kill stale processes
		for _, processName := range processesToKill {
			// Use pgrep to find process IDs (more reliable than ps|grep)
			cmd := exec.Command("pgrep", "-f", processName)
			output, err := cmd.Output()

			if err == nil && len(output) > 0 {
				// Process found, kill it
				pids := strings.TrimSpace(string(output))
				if pids != "" {
					log.Printf("Found stale process %s (PID: %s), killing...", processName, strings.ReplaceAll(pids, "\n", ", "))

					// Kill all matching processes
					killCmd := exec.Command("killall", processName)
					if err := killCmd.Run(); err != nil {
						log.Printf("Warning: Failed to kill %s: %v", processName, err)
					} else {
						log.Printf("Successfully killed %s", processName)
					}
				}
			}
		}

		// Wait 30 seconds before next check
		time.Sleep(30 * time.Second)
	}
}

func main() {
	// Parse command line flags
	debug := flag.Bool("debug", false, "Enable debug logging (print orientation data in real-time)")
	flag.Parse()

	debugMode = *debug
	startTime = time.Now()

	// Initialize WebSocket connection tracking
	wsConnections = make(map[*websocket.Conn]bool)

	// Load orientation offsets from file
	loadOrientationOffsets()

	// Load AP configuration
	InitAPConfig()

	log.Println("=== FRODOBOT WEB SERVER ===")
	log.Printf("Version: %s | Build: %s | Git: %s", Version, BuildTime, GitHash)
	log.Println("Reading sensor data directly from /dev/ttyS0")
	log.Println("NOTE: This requires frodobot services to be stopped")
	if debugMode {
		log.Println("DEBUG MODE: Real-time orientation data will be printed to console")
	}

	// Initialize wheel odometry BEFORE starting hardware reader
	// Wheel radius: 0.065m (130mm diameter wheels)
	// Wheelbase: 0.4m (distance between left and right wheels)
	wheelOdometry = control.NewWheelOdometry(0.065, 0.4)
	log.Println("Wheel odometry initialized (radius=0.065m, wheelbase=0.4m)")

	// Initialize state estimator (will be initialized with first GPS fix)
	stateEstimator = estimation.NewStateEstimator()
	log.Println("State estimator initialized (waiting for first GPS fix)")

	// Initialize Chrony shared memory for NTP server
	if err := initChronySHM(); err != nil {
		log.Printf("Warning: Failed to initialize Chrony shared memory: %v", err)
		log.Printf("NTP server functionality will not be available")
	}

	// Initialize camera manager
	if err := initCameraManager(); err != nil {
		log.Printf("Warning: Failed to initialize camera manager: %v", err)
	}

	// Start network interface monitoring
	startNetworkMonitor()
	log.Println("Network interface monitoring started")

	// Start process cleanup monitor (kills stale frodobot and network manager processes)
	SupervisedGoroutine("Process cleanup monitor", processCleanupLoop, 30*time.Second)
	log.Println("Process cleanup monitor started (checking every 30s)")

	// Start WiFi status monitoring
	go UpdateWiFiStatus()
	log.Println("WiFi status monitoring started")

	// Initialize LTE modem (auto-connect if configured)
	InitLTE()

	// Start LTE status monitoring
	go UpdateLTEStatus()
	log.Println("LTE status monitoring started")

	startHardwareReader()
	time.Sleep(time.Second * 2) // Wait for initial data

	// Load RTK configuration and initialize NTRIP client
	rtkConfig := loadRTKConfig()
	if err := initNTRIPClient(rtkConfig); err != nil {
		log.Printf("Warning: Failed to initialize NTRIP client: %v", err)
	}

	// Load libsurvive configuration and initialize client
	surviveConfig := loadSurviveConfig()
	if err := initSurviveClient(surviveConfig); err != nil {
		log.Printf("Warning: Failed to initialize libsurvive client: %v", err)
	}

	// Dashboard endpoint
	http.HandleFunc("/dashboard", func(w http.ResponseWriter, r *http.Request) {
		// Try local path first, then deployed path
		if _, err := http.Dir(".").Open("dashboard.html"); err == nil {
			http.ServeFile(w, r, "dashboard.html")
		} else {
			http.ServeFile(w, r, "/data/apps/dashboard.html")
		}
	})

	// Calibration tool endpoint
	http.HandleFunc("/calibration", func(w http.ResponseWriter, r *http.Request) {
		// Try local path first, then deployed path
		if _, err := http.Dir(".").Open("calibration.html"); err == nil {
			http.ServeFile(w, r, "calibration.html")
		} else {
			http.ServeFile(w, r, "/data/apps/calibration.html")
		}
	})

	// Data endpoint - SDK compatible (register first for priority)
	http.HandleFunc("/data", handleDataEndpoint)

	// WebSocket endpoint for streaming data
	http.HandleFunc("/ws", handleWebSocket)

	// WebSocket endpoint for streaming logs
	http.HandleFunc("/ws/logs", handleLogWebSocket)

	// API endpoint
	http.HandleFunc("/api/status", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		status := map[string]interface{}{
			"status": "ok",
			"time":   time.Now().Format(time.RFC3339),
			"uptime": time.Since(startTime).Seconds(),
			"camera": GetCameraStatusSummary(),
		}

		json.NewEncoder(w).Encode(status)
	})

	// Version endpoint
	http.HandleFunc("/api/version", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"version":    Version,
			"build_time": BuildTime,
			"git_hash":   GitHash,
		})
	})

	// Stats endpoint
	http.HandleFunc("/api/stats", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		statsMutex.RLock()
		stats := currentStats
		statsMutex.RUnlock()

		json.NewEncoder(w).Encode(map[string]interface{}{
			"packets_last_10s": stats.PacketsLast10s,
			"errors_last_10s":  stats.ErrorsLast10s,
			"data_rate_hz":     stats.DataRateHz,
			"uptime_seconds":   stats.Uptime.Seconds(),
		})
	})

	// Calibration data endpoint - read from /data/imu.json
	http.HandleFunc("/api/calibration", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		// Read the calibration file
		data, err := os.ReadFile("/data/imu.json")
		if err != nil {
			http.Error(w, fmt.Sprintf(`{"error":"Failed to read calibration file: %v"}`, err), http.StatusInternalServerError)
			return
		}

		// Serve the raw JSON
		w.Write(data)
	})

	// RTK configuration endpoint - GET to retrieve, POST to update
	http.HandleFunc("/api/rtk-config", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		switch r.Method {
		case "GET":
			// Return current RTK configuration
			ntripClientMutex.Lock()
			var config *RTKConfig
			if ntripClient != nil {
				ntripClient.configMutex.RLock()
				configCopy := *ntripClient.config
				ntripClient.configMutex.RUnlock()
				config = &configCopy
			} else {
				config = loadRTKConfig()
			}
			ntripClientMutex.Unlock()

			json.NewEncoder(w).Encode(config)

		case "POST":
			// Update RTK configuration
			var newConfig RTKConfig
			if err := json.NewDecoder(r.Body).Decode(&newConfig); err != nil {
				http.Error(w, fmt.Sprintf(`{"error":"Invalid request: %v"}`, err), http.StatusBadRequest)
				return
			}

			// Save configuration to file
			if err := saveRTKConfig(&newConfig); err != nil {
				http.Error(w, fmt.Sprintf(`{"error":"Failed to save RTK config: %v"}`, err), http.StatusInternalServerError)
				return
			}

			// Update running NTRIP client
			ntripClientMutex.Lock()
			if ntripClient != nil {
				if err := ntripClient.UpdateConfig(&newConfig); err != nil {
					ntripClientMutex.Unlock()
					http.Error(w, fmt.Sprintf(`{"error":"Failed to update NTRIP client: %v"}`, err), http.StatusInternalServerError)
					return
				}
			}
			ntripClientMutex.Unlock()

			json.NewEncoder(w).Encode(map[string]interface{}{
				"success": true,
				"config":  newConfig,
			})

		default:
			http.Error(w, `{"error":"Method not allowed"}`, http.StatusMethodNotAllowed)
		}
	})

	// RTK status endpoint
	http.HandleFunc("/api/rtk-status", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		ntripClientMutex.Lock()
		var status NTRIPStatus
		if ntripClient != nil {
			status = ntripClient.GetStatus()
		} else {
			status = NTRIPStatus{
				Enabled:   false,
				Connected: false,
			}
		}
		ntripClientMutex.Unlock()

		json.NewEncoder(w).Encode(status)
	})

	// RTK presets endpoint
	http.HandleFunc("/api/rtk-presets", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(GetRTKPresets())
	})

	// LibSurvive configuration endpoint - GET to retrieve, POST to update
	http.HandleFunc("/api/survive-config", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		switch r.Method {
		case "GET":
			// Return current LibSurvive configuration
			surviveClientMutex.Lock()
			var config *SurviveConfig
			if surviveClient != nil {
				surviveClient.configMutex.RLock()
				configCopy := *surviveClient.config
				surviveClient.configMutex.RUnlock()
				config = &configCopy
			} else {
				config = loadSurviveConfig()
			}
			surviveClientMutex.Unlock()

			json.NewEncoder(w).Encode(config)

		case "POST":
			// Update LibSurvive configuration
			var newConfig SurviveConfig
			if err := json.NewDecoder(r.Body).Decode(&newConfig); err != nil {
				http.Error(w, fmt.Sprintf(`{"error":"Invalid request: %v"}`, err), http.StatusBadRequest)
				return
			}

			// Save configuration to file
			if err := saveSurviveConfig(&newConfig); err != nil {
				http.Error(w, fmt.Sprintf(`{"error":"Failed to save LibSurvive config: %v"}`, err), http.StatusInternalServerError)
				return
			}

			// Update running LibSurvive client
			surviveClientMutex.Lock()
			if surviveClient != nil {
				if err := surviveClient.UpdateConfig(&newConfig); err != nil {
					surviveClientMutex.Unlock()
					http.Error(w, fmt.Sprintf(`{"error":"Failed to update LibSurvive client: %v"}`, err), http.StatusInternalServerError)
					return
				}
			}
			surviveClientMutex.Unlock()

			json.NewEncoder(w).Encode(map[string]interface{}{
				"success": true,
				"config":  newConfig,
			})

		default:
			http.Error(w, `{"error":"Method not allowed"}`, http.StatusMethodNotAllowed)
		}
	})

	// LibSurvive status endpoint
	http.HandleFunc("/api/survive-status", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		surviveClientMutex.Lock()
		var status SurviveStatus
		if surviveClient != nil {
			status = surviveClient.GetStatus()
		} else {
			status = SurviveStatus{
				Enabled:   false,
				Connected: false,
			}
		}
		surviveClientMutex.Unlock()

		json.NewEncoder(w).Encode(status)
	})

	// Battery debug endpoint - shows power system data
	http.HandleFunc("/api/battery-debug", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		telemMutex.RLock()
		telem := latestTelemetry
		telemMutex.RUnlock()

		if telem == nil {
			http.Error(w, `{"error":"No telemetry data available"}`, http.StatusServiceUnavailable)
			return
		}

		json.NewEncoder(w).Encode(map[string]interface{}{
			"battery_percent_raw": telem.BatteryPercent,
			"battery_percent":     telem.GetBatteryPercent(),
			"voltage_raw":         telem.Voltage,
			"voltage":             telem.GetVoltage(),
			"current_raw":         telem.Current,
			"current":             telem.GetCurrent(),
			"power_raw":           telem.Power,
			"power":               telem.GetPower(),
		})
	})

	// Logging endpoints
	http.HandleFunc("/api/log/start", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		if r.Method != "POST" {
			http.Error(w, `{"error":"Method not allowed"}`, http.StatusMethodNotAllowed)
			return
		}

		logger := GetLogger()
		if err := logger.StartLog(); err != nil {
			http.Error(w, fmt.Sprintf(`{"error":"Failed to start logging: %v"}`, err), http.StatusInternalServerError)
			return
		}

		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
			"message": "Logging started",
			"status":  logger.GetStatus(),
		})
	})

	http.HandleFunc("/api/log/stop", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		if r.Method != "POST" {
			http.Error(w, `{"error":"Method not allowed"}`, http.StatusMethodNotAllowed)
			return
		}

		logger := GetLogger()
		if err := logger.StopLog(); err != nil {
			http.Error(w, fmt.Sprintf(`{"error":"Failed to stop logging: %v"}`, err), http.StatusInternalServerError)
			return
		}

		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
			"message": "Logging stopped",
		})
	})

	http.HandleFunc("/api/log/pause", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		if r.Method != "POST" {
			http.Error(w, `{"error":"Method not allowed"}`, http.StatusMethodNotAllowed)
			return
		}

		logger := GetLogger()
		if err := logger.PauseLog(); err != nil {
			http.Error(w, fmt.Sprintf(`{"error":"Failed to pause logging: %v"}`, err), http.StatusInternalServerError)
			return
		}

		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
			"message": "Logging paused",
			"status":  logger.GetStatus(),
		})
	})

	http.HandleFunc("/api/log/resume", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		if r.Method != "POST" {
			http.Error(w, `{"error":"Method not allowed"}`, http.StatusMethodNotAllowed)
			return
		}

		logger := GetLogger()
		if err := logger.ResumeLog(); err != nil {
			http.Error(w, fmt.Sprintf(`{"error":"Failed to resume logging: %v"}`, err), http.StatusInternalServerError)
			return
		}

		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
			"message": "Logging resumed",
			"status":  logger.GetStatus(),
		})
	})

	http.HandleFunc("/api/log/status", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		logger := GetLogger()
		status := logger.GetStatus()

		json.NewEncoder(w).Encode(status)
	})

	http.HandleFunc("/api/logs", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		switch r.Method {
		case "GET":
			// List all logs
			logs, err := ListLogs()
			if err != nil {
				http.Error(w, fmt.Sprintf(`{"error":"Failed to list logs: %v"}`, err), http.StatusInternalServerError)
				return
			}

			json.NewEncoder(w).Encode(logs)

		case "DELETE":
			// Delete a specific log file
			var req struct {
				Filename string `json:"filename"`
			}
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				http.Error(w, fmt.Sprintf(`{"error":"Invalid request: %v"}`, err), http.StatusBadRequest)
				return
			}

			if err := DeleteLog(req.Filename); err != nil {
				http.Error(w, fmt.Sprintf(`{"error":"Failed to delete log: %v"}`, err), http.StatusInternalServerError)
				return
			}

			json.NewEncoder(w).Encode(map[string]interface{}{
				"success": true,
				"message": "Log deleted",
			})

		default:
			http.Error(w, `{"error":"Method not allowed"}`, http.StatusMethodNotAllowed)
		}
	})

	// Yaw offset endpoint - GET to retrieve, POST to update
	// Orientation offset API endpoint
	http.HandleFunc("/api/orientation-offset", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		switch r.Method {
		case "GET":
			// Return current orientation offsets
			orientationOffsetMutex.RLock()
			offsets := orientationOffset
			orientationOffsetMutex.RUnlock()

			json.NewEncoder(w).Encode(map[string]interface{}{
				"roll":  offsets.Roll,
				"pitch": offsets.Pitch,
				"yaw":   offsets.Yaw,
			})

		case "POST":
			// Update orientation offsets
			var req OrientationOffsets
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				http.Error(w, fmt.Sprintf(`{"error":"Invalid request: %v"}`, err), http.StatusBadRequest)
				return
			}

			// Validate ranges
			if req.Roll < -180 || req.Roll > 180 {
				http.Error(w, `{"error":"Roll offset must be between -180 and 180"}`, http.StatusBadRequest)
				return
			}
			if req.Pitch < -180 || req.Pitch > 180 {
				http.Error(w, `{"error":"Pitch offset must be between -180 and 180"}`, http.StatusBadRequest)
				return
			}
			if req.Yaw < -180 || req.Yaw > 180 {
				http.Error(w, `{"error":"Yaw offset must be between -180 and 180"}`, http.StatusBadRequest)
				return
			}

			// Update and save
			orientationOffsetMutex.Lock()
			orientationOffset = req
			orientationOffsetMutex.Unlock()

			if err := saveOrientationOffsets(req); err != nil {
				http.Error(w, fmt.Sprintf(`{"error":"Failed to save orientation offsets: %v"}`, err), http.StatusInternalServerError)
				return
			}

			json.NewEncoder(w).Encode(map[string]interface{}{
				"success": true,
				"roll":    req.Roll,
				"pitch":   req.Pitch,
				"yaw":     req.Yaw,
			})

		default:
			http.Error(w, `{"error":"Method not allowed"}`, http.StatusMethodNotAllowed)
		}
	})

	// Legacy yaw-offset endpoint for backward compatibility
	http.HandleFunc("/api/yaw-offset", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		switch r.Method {
		case "GET":
			orientationOffsetMutex.RLock()
			offset := orientationOffset.Yaw
			orientationOffsetMutex.RUnlock()

			json.NewEncoder(w).Encode(map[string]interface{}{
				"yaw_offset": int(offset),
			})

		case "POST":
			var req struct {
				YawOffset int `json:"yaw_offset"`
			}
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				http.Error(w, fmt.Sprintf(`{"error":"Invalid request: %v"}`, err), http.StatusBadRequest)
				return
			}

			orientationOffsetMutex.Lock()
			orientationOffset.Yaw = float64(req.YawOffset)
			offsets := orientationOffset
			orientationOffsetMutex.Unlock()

			if err := saveOrientationOffsets(offsets); err != nil {
				http.Error(w, fmt.Sprintf(`{"error":"Failed to save yaw offset: %v"}`, err), http.StatusInternalServerError)
				return
			}

			json.NewEncoder(w).Encode(map[string]interface{}{
				"success":    true,
				"yaw_offset": req.YawOffset,
			})

		default:
			http.Error(w, `{"error":"Method not allowed"}`, http.StatusMethodNotAllowed)
		}
	})

	// AP configuration endpoint - GET to retrieve, POST to update
	http.HandleFunc("/api/ap-config", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		switch r.Method {
		case "GET":
			// Return current AP configuration
			config, err := LoadAPConfig()
			if err != nil {
				http.Error(w, fmt.Sprintf(`{"error":"Failed to load AP config: %v"}`, err), http.StatusInternalServerError)
				return
			}

			json.NewEncoder(w).Encode(config)

		case "POST":
			// Update AP configuration
			var newConfig APConfig
			if err := json.NewDecoder(r.Body).Decode(&newConfig); err != nil {
				http.Error(w, fmt.Sprintf(`{"error":"Invalid request: %v"}`, err), http.StatusBadRequest)
				return
			}

			// Save and apply configuration
			if err := SaveAPConfig(&newConfig); err != nil {
				http.Error(w, fmt.Sprintf(`{"error":"Failed to update AP config: %v"}`, err), http.StatusInternalServerError)
				return
			}

			json.NewEncoder(w).Encode(map[string]interface{}{
				"success": true,
				"config":  newConfig,
				"message": "AP configuration updated. Clients will need to reconnect with new credentials.",
			})

		default:
			http.Error(w, `{"error":"Method not allowed"}`, http.StatusMethodNotAllowed)
		}
	})

	// WiFi scan endpoint - scan for available networks
	http.HandleFunc("/api/wifi/scan", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		if r.Method != "GET" && r.Method != "POST" {
			http.Error(w, `{"error":"Method not allowed"}`, http.StatusMethodNotAllowed)
			return
		}

		networks, err := ScanWiFiNetworks()
		if err != nil {
			http.Error(w, fmt.Sprintf(`{"error":"Failed to scan WiFi networks: %v"}`, err), http.StatusInternalServerError)
			return
		}

		json.NewEncoder(w).Encode(map[string]interface{}{
			"success":  true,
			"networks": networks,
		})
	})

	// WiFi status endpoint - get current connection status
	http.HandleFunc("/api/wifi/status", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		if r.Method != "GET" {
			http.Error(w, `{"error":"Method not allowed"}`, http.StatusMethodNotAllowed)
			return
		}

		status := GetCurrentWiFiStatus()
		json.NewEncoder(w).Encode(status)
	})

	// WiFi connect endpoint - connect to a network
	http.HandleFunc("/api/wifi/connect", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		if r.Method != "POST" {
			http.Error(w, `{"error":"Method not allowed"}`, http.StatusMethodNotAllowed)
			return
		}

		var req struct {
			SSID     string `json:"ssid"`
			Password string `json:"password"`
			KeyMgmt  string `json:"key_mgmt"`
		}

		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, fmt.Sprintf(`{"error":"Invalid request: %v"}`, err), http.StatusBadRequest)
			return
		}

		if err := ConnectToWiFi(req.SSID, req.Password, req.KeyMgmt); err != nil {
			http.Error(w, fmt.Sprintf(`{"error":"Failed to connect to WiFi: %v"}`, err), http.StatusInternalServerError)
			return
		}

		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
			"message": "Connecting to WiFi network. This may take a few seconds.",
		})
	})

	// WiFi config endpoint - get saved WiFi configuration
	http.HandleFunc("/api/wifi/config", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		if r.Method != "GET" {
			http.Error(w, `{"error":"Method not allowed"}`, http.StatusMethodNotAllowed)
			return
		}

		config, err := GetSavedWiFiConfig()
		if err != nil {
			http.Error(w, fmt.Sprintf(`{"error":"Failed to get WiFi config: %v"}`, err), http.StatusInternalServerError)
			return
		}

		json.NewEncoder(w).Encode(config)
	})

	// LTE status endpoint - get current LTE modem status
	http.HandleFunc("/api/lte/status", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		if r.Method != "GET" {
			http.Error(w, `{"error":"Method not allowed"}`, http.StatusMethodNotAllowed)
			return
		}

		status := GetCurrentLTEStatus()
		json.NewEncoder(w).Encode(status)
	})

	// LTE config endpoint - GET to retrieve, POST to update
	http.HandleFunc("/api/lte/config", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		switch r.Method {
		case "GET":
			// Return current LTE configuration
			config, err := LoadLTEConfig()
			if err != nil {
				json.NewEncoder(w).Encode(map[string]interface{}{
					"success": false,
					"error":   fmt.Sprintf("Failed to load LTE config: %v", err),
				})
				return
			}

			json.NewEncoder(w).Encode(map[string]interface{}{
				"success": true,
				"config":  config,
			})

		case "POST":
			// Update LTE configuration and reconnect
			var newConfig LTEConfig
			if err := json.NewDecoder(r.Body).Decode(&newConfig); err != nil {
				http.Error(w, fmt.Sprintf(`{"error":"Invalid request: %v"}`, err), http.StatusBadRequest)
				return
			}

			// Save and apply configuration
			if err := ConnectLTE(&newConfig); err != nil {
				http.Error(w, fmt.Sprintf(`{"error":"Failed to configure LTE: %v"}`, err), http.StatusInternalServerError)
				return
			}

			json.NewEncoder(w).Encode(map[string]interface{}{
				"success": true,
				"config":  newConfig,
				"message": "LTE configuration updated and connection initiated.",
			})

		default:
			http.Error(w, `{"error":"Method not allowed"}`, http.StatusMethodNotAllowed)
		}
	})

	// LTE connect endpoint - connect/reconnect LTE modem
	http.HandleFunc("/api/lte/connect", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		if r.Method != "POST" {
			http.Error(w, `{"error":"Method not allowed"}`, http.StatusMethodNotAllowed)
			return
		}

		// Load current config and connect
		config, err := LoadLTEConfig()
		if err != nil {
			http.Error(w, fmt.Sprintf(`{"error":"Failed to load LTE config: %v"}`, err), http.StatusInternalServerError)
			return
		}

		if err := ConnectLTE(config); err != nil {
			http.Error(w, fmt.Sprintf(`{"error":"Failed to connect LTE: %v"}`, err), http.StatusInternalServerError)
			return
		}

		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
			"message": "LTE connection initiated.",
		})
	})

	// LTE disconnect endpoint
	http.HandleFunc("/api/lte/disconnect", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		if r.Method != "POST" {
			http.Error(w, `{"error":"Method not allowed"}`, http.StatusMethodNotAllowed)
			return
		}

		if err := DisconnectLTE(); err != nil {
			http.Error(w, fmt.Sprintf(`{"error":"Failed to disconnect LTE: %v"}`, err), http.StatusInternalServerError)
			return
		}

		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
			"message": "LTE disconnected.",
		})
	})

	// LTE restart endpoint
	http.HandleFunc("/api/lte/restart", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		if r.Method != "POST" {
			http.Error(w, `{"error":"Method not allowed"}`, http.StatusMethodNotAllowed)
			return
		}

		if err := RestartLTE(); err != nil {
			http.Error(w, fmt.Sprintf(`{"error":"Failed to restart LTE: %v"}`, err), http.StatusInternalServerError)
			return
		}

		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
			"message": "LTE modem restarted.",
		})
	})

	// Camera endpoints
	http.HandleFunc("/api/camera/status", handleCameraStatus)
	http.HandleFunc("/api/camera/metrics", handleCameraMetrics)
	http.HandleFunc("/api/camera/control", handleCameraControl)

	// Static file serving for audio recordings
	http.Handle("/recordings/", http.StripPrefix("/recordings/", http.FileServer(http.Dir("/data/recordings"))))

	// Static file serving for log files
	http.HandleFunc("/logs/", func(w http.ResponseWriter, r *http.Request) {
		// Extract filename from path
		filename := r.URL.Path[6:] // Skip "/logs/"

		if filename == "" {
			http.Error(w, "Filename required", http.StatusBadRequest)
			return
		}

		// Get validated log path
		logPath, err := GetLogPath(filename)
		if err != nil {
			http.Error(w, err.Error(), http.StatusNotFound)
			return
		}

		// Set content type for msgpack files
		w.Header().Set("Content-Type", "application/octet-stream")
		w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))

		http.ServeFile(w, r, logPath)
	})

	// Static file serving for WASM files
	http.HandleFunc("/static/", func(w http.ResponseWriter, r *http.Request) {
		// Remove /static/ prefix to get filename
		filename := r.URL.Path[8:] // Skip "/static/"

		// Try local path first, then deployed path
		if _, err := os.Stat("static/" + filename); err == nil {
			http.ServeFile(w, r, "static/"+filename)
		} else {
			http.ServeFile(w, r, "/data/apps/static/"+filename)
		}
	})

	// Root handler - only for home page
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		// Only serve the home page for exact "/" path
		if r.URL.Path != "/" {
			http.NotFound(w, r)
			return
		}

		html := `<!DOCTYPE html>
<html>
<head>
    <title>Frodobot Web Server</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
        h1 { color: #333; }
        .info { background: #f0f0f0; padding: 15px; border-radius: 5px; }
    </style>
</head>
<body>
    <h1>Frodobot Web Server</h1>
    <div class="info">
        <p><strong>Time:</strong> %s</p>
        <p><strong>Path:</strong> %s</p>
        <p><strong>Method:</strong> %s</p>
    </div>
    <p><a href="/dashboard">Open Dashboard</a></p>
    <p><a href="/calibration">Open Calibration Tool</a></p>
    <p><a href="/data">View sensor data (JSON)</a></p>
    <p><a href="/api/status">View server status</a></p>
</body>
</html>`
		fmt.Fprintf(w, html, time.Now().Format(time.RFC1123), r.URL.Path, r.Method)
	})

	log.Println("Starting web server on :3000")
	log.Println("Endpoints available:")
	log.Println("  - http://localhost:3000/")
	log.Println("  - http://localhost:3000/api/status")
	log.Println("  - http://localhost:3000/data")
	if err := http.ListenAndServe(":3000", nil); err != nil {
		log.Fatal(err)
	}
}
