"""
OpenMind Teleops - Standalone Robot Controller
Controls a Unitree Go2 robot remotely via OpenMind's teleops WebSocket API.

Usage:
  python teleops_control.py

Controls:
  W - Move forward
  S - Move backward
  A - Turn left
  D - Turn right
  Q - Quit
"""

import asyncio
import json
import os
import sys
import time
import threading
from pynput import keyboard

API_KEY = os.environ.get("OPENMIND_API_KEY")
if not API_KEY:
    raise ValueError("OPENMIND_API_KEY environment variable is required")
COMMAND_URL = f"wss://api.openmind.org/api/core/teleops/command?api_key={API_KEY}"
VIDEO_URL = f"wss://api.openmind.org/api/core/teleops/video?api_key={API_KEY}"

class TeleopsController:
    def __init__(self):
        self.keys_pressed = set()
        self.vx = 0.0
        self.vy = 0.0
        self.vyaw = 0.0
        self.running = True
        self.connected = False
        self.frame_count = 0
        self.cmd_count = 0

    def on_press(self, key):
        try:
            k = key.char
            if k == 'q':
                self.running = False
                return False  # stop listener
            if k in ('w', 'a', 's', 'd'):
                self.keys_pressed.add(k)
                self.update_velocity()
        except AttributeError:
            pass

    def on_release(self, key):
        try:
            k = key.char
            self.keys_pressed.discard(k)
            self.update_velocity()
        except AttributeError:
            pass

    def update_velocity(self):
        self.vx = 0.0
        self.vyaw = 0.0
        if 'w' in self.keys_pressed:
            self.vx = 0.5
        if 's' in self.keys_pressed:
            self.vx = -0.5
        if 'a' in self.keys_pressed:
            self.vyaw = 0.5
        if 'd' in self.keys_pressed:
            self.vyaw = -0.5

    async def command_loop(self):
        import websockets
        print("[CMD] Connecting to command channel...")
        try:
            async with websockets.connect(COMMAND_URL, open_timeout=10) as ws:
                self.connected = True
                print("[CMD] Connected! Use W/A/S/D to control, Q to quit")
                while self.running:
                    cmd = {
                        "vx": self.vx,
                        "vy": self.vy,
                        "vyaw": self.vyaw,
                        "timestamp": time.time()
                    }
                    await ws.send(json.dumps(cmd))
                    self.cmd_count += 1

                    # Status line
                    direction = ""
                    if self.vx > 0: direction += "FORWARD "
                    elif self.vx < 0: direction += "BACKWARD "
                    if self.vyaw > 0: direction += "LEFT "
                    elif self.vyaw < 0: direction += "RIGHT "
                    if not direction: direction = "STOPPED "

                    sys.stdout.write(
                        f"\r[TELEOPS] {direction}| vx={self.vx:.1f} vyaw={self.vyaw:.1f} "
                        f"| cmds={self.cmd_count} frames={self.frame_count}   "
                    )
                    sys.stdout.flush()

                    await asyncio.sleep(0.1)  # 10 Hz
        except Exception as e:
            print(f"\n[CMD] Error: {e}")
        finally:
            self.connected = False

    async def video_loop(self):
        import websockets
        print("[VID] Connecting to video stream...")
        try:
            async with websockets.connect(VIDEO_URL, open_timeout=10) as ws:
                print("[VID] Video stream connected!")
                while self.running:
                    try:
                        msg = await asyncio.wait_for(ws.recv(), timeout=5)
                        self.frame_count += 1
                    except asyncio.TimeoutError:
                        pass
        except Exception as e:
            print(f"\n[VID] Error: {e}")

    async def run(self):
        # Start keyboard listener in background thread
        listener = keyboard.Listener(
            on_press=self.on_press,
            on_release=self.on_release
        )
        listener.start()

        print("=" * 55)
        print("  OpenMind Teleops - Robot Remote Controller")
        print("=" * 55)
        print(f"  API Key: {API_KEY[:20]}...")
        print(f"  Controls: W=Forward S=Back A=Left D=Right Q=Quit")
        print("=" * 55)

        # Run both command and video loops
        await asyncio.gather(
            self.command_loop(),
            self.video_loop()
        )

        listener.stop()
        print("\n\nDisconnected. Goodbye!")


if __name__ == "__main__":
    controller = TeleopsController()
    try:
        asyncio.run(controller.run())
    except KeyboardInterrupt:
        controller.running = False
        print("\n\nStopped by user.")
