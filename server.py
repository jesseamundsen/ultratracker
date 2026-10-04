#!/usr/bin/env python3
"""Small local server that safely translates Trackleaders display scripts to JSON."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.request import Request, urlopen
from urllib.parse import urlparse
from datetime import datetime
from zoneinfo import ZoneInfo
from pathlib import Path
import html
import json
import re
import time

ROOT = Path(__file__).resolve().parent
BASE = "https://trackleaders.com/spot/mammoth26/"
URLS = {"route": BASE + "route.js", "checkpoints": BASE + "checkgen.js", "runner": BASE + "Sarah_Huebner.js"}
CACHE = {}

def fetch(kind):
    req = Request(URLS[kind], headers={"User-Agent": "Ultratracker personal tracker/1.0"})
    with urlopen(req, timeout=20) as response:
        return response.read().decode("utf-8", "replace")

def bracket_value(source, start):
    """Return an array literal without executing source code."""
    open_at = source.find("[", start)
    if open_at < 0: raise ValueError("array not found")
    depth = 0
    for index in range(open_at, len(source)):
        char = source[index]
        if char == "[": depth += 1
        elif char == "]":
            depth -= 1
            if depth == 0: return source[open_at:index + 1]
    raise ValueError("unterminated array")

def parse_route(source):
    parts = []
    for match in re.finditer(r"routepts(\d+)\s*=", source):
        try:
            points = json.loads(bracket_value(source, match.end()))
            if isinstance(points, list): parts.extend(points)
        except (ValueError, json.JSONDecodeError):
            continue
    if not parts: raise ValueError("no route points found")
    return {"points": [{"lat": float(p[0]), "lng": float(p[1])} for p in parts if len(p) >= 2], "source": URLS["route"]}

def clean(value):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", value))).strip()

def parse_checkpoints(source):
    items = []
    pattern = re.compile(r"markercp\d+\s*=\s*L\.marker\(\[([\-\d.]+),\s*([\-\d.]+)\][\s\S]{0,900}?bindTooltip\(\"<b>(.*?)</b>\"\)[\s\S]{0,900}?bindPopup\(\"(.*?)\"\)", re.S)
    for lat, lng, label, popup in pattern.findall(source):
        miles = re.findall(r"Route mile:\s*([\d.]+)", popup)
        if not miles: continue
        items.append({"name": clean(label), "lat": float(lat), "lng": float(lng), "mile": float(miles[0]), "visits": [float(x) for x in miles[1:]]})
    return {"checkpoints": items, "source": URLS["checkpoints"]}

def parse_time(text):
    text = clean(text)
    match = re.search(r"(\d{1,2}:\d{2}(?::\d{2})?\s*[AP]M)\s*\([^)]+\)\s*(\d{2}/\d{2}/\d{2})", text)
    if not match: return None
    clock = match.group(1).replace(" ", "")
    try: return datetime.strptime(f"{clock} {match.group(2)}", "%I:%M:%S%p %m/%d/%y").replace(tzinfo=ZoneInfo("America/Los_Angeles")).isoformat()
    except ValueError:
        try: return datetime.strptime(f"{clock} {match.group(2)}", "%I:%M%p %m/%d/%y").replace(tzinfo=ZoneInfo("America/Los_Angeles")).isoformat()
        except ValueError: return None

def parse_runner(source):
    # Pair marker assignments and popup records by their explicit imarker number.
    # This is deliberate text extraction: third-party JavaScript is never evaluated.
    coordinates = {int(number): (float(lat), float(lng)) for number, lat, lng in re.findall(r"imarker(\d+)\s*=\s*L\.marker\(\[([\-\d.]+),\s*([\-\d.]+)\]", source)}
    popups = {int(number): body for number, body in re.findall(r"imarker(\d+)\.bindPopup\('([\s\S]*?)'\);", source)}
    points = []
    for number, body in popups.items():
        if number not in coordinates: continue
        detail = re.search(r"Point\s*#(\d+)\s+received at:\s*([\s\S]*?)<br\s*/?>[\s\S]*?([\d.,]+)\s*(ft|mi) traveled at\s*([\d.]+)\s*mph[\s\S]*?Route mile\s*([\d.]+)", body, re.I)
        if not detail: continue
        point_number, received, travelled, travel_unit, mph, mile = detail.groups()
        timestamp = parse_time(received)
        if timestamp:
            lat, lng = coordinates[number]
            travelled_feet = float(travelled.replace(",", "")) * (5280 if travel_unit.lower() == "mi" else 1)
            points.append({"number": int(point_number), "lat": lat, "lng": lng, "time": timestamp, "routeMile": float(mile), "feet": round(travelled_feet), "mph": float(mph)})
    points.sort(key=lambda p: p["number"])
    if not points: raise ValueError("no runner points found")
    return {"runner": "Sarah Huebner", "bib": "313", "points": points, "source": URLS["runner"], "fetchedAt": datetime.now().astimezone().isoformat()}

def data(kind):
    if kind in CACHE and kind != "runner": return CACHE[kind]
    source = fetch(kind)
    parsed = {"route": parse_route, "checkpoints": parse_checkpoints, "runner": parse_runner}[kind](source)
    if kind != "runner": CACHE[kind] = parsed
    return parsed

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs): super().__init__(*args, directory=str(ROOT), **kwargs)
    def log_message(self, fmt, *args): print(f"[{self.log_date_time_string()}] {fmt % args}")
    def do_GET(self):
        path = urlparse(self.path).path
        if path.startswith("/api/"):
            kind = path.removeprefix("/api/")
            if kind not in URLS:
                self.send_error(404, "Unknown data endpoint"); return
            try:
                payload = data(kind)
                body = json.dumps(payload, separators=(",", ":")).encode()
                self.send_response(200); self.send_header("Content-Type", "application/json; charset=utf-8"); self.send_header("Cache-Control", "no-store" if kind == "runner" else "max-age=3600"); self.send_header("Content-Length", str(len(body))); self.end_headers(); self.wfile.write(body)
            except Exception as exc:
                body = json.dumps({"error": f"Could not load {kind}: {exc}"}).encode()
                self.send_response(502); self.send_header("Content-Type", "application/json"); self.send_header("Content-Length", str(len(body))); self.end_headers(); self.wfile.write(body)
            return
        return super().do_GET()

if __name__ == "__main__":
    server = ThreadingHTTPServer(("127.0.0.1", 8000), Handler)
    print("Ultratracker running at http://127.0.0.1:8000")
    try: server.serve_forever()
    except KeyboardInterrupt: print("\nStopping.")
