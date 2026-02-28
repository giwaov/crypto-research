@echo off
REM Fortytwo Agent Watchdog — restarts the agent if it's not running
REM Used by OpenClaw cron to ensure persistent operation

tasklist /FI "WINDOWTITLE eq Fortytwo Agent" 2>NUL | find /I "python" >NUL
if %ERRORLEVEL% NEQ 0 (
    echo [%date% %time%] Agent not running, starting... >> "%~dp0fortytwo_watchdog.log"
    start "Fortytwo Agent" /MIN python "%~dp0fortytwo_agent.py"
) else (
    echo [%date% %time%] Agent already running >> "%~dp0fortytwo_watchdog.log"
)
