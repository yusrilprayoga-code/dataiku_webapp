# test_script.py
import sys
import time

print("--- Python Test Script Started ---", file=sys.stderr)
sys.stderr.flush() # Force the output to be sent immediately

time.sleep(2)

print("--- Test Script Still Running... ---", file=sys.stderr)
sys.stderr.flush()

time.sleep(2)

print("--- Test Script Finishing ---", file=sys.stderr)
sys.stderr.flush()

# Final JSON output to stdout
print('{"status": "ok", "message": "Test script completed successfully"}')