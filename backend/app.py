import os
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from lta import get_arrivals, get_nearest_bus_stop, get_bus_stop

app = Flask(__name__)
CORS(app)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
WEB_DIR = os.path.join(BASE_DIR, "..", "web")

# ---------------------------
# FRONTEND ROUTES
# ---------------------------
@app.route("/")
def home():
    return send_from_directory(WEB_DIR, "index.html")

@app.route("/web/<path:filename>")
def web_files(filename):
    return send_from_directory(WEB_DIR, filename)

# ---------------------------
# API ROUTES
# ---------------------------
@app.route("/api/arrivals")
def arrivals():
    stop = request.args.get("stop")
    if not stop:
        return jsonify({"error": "Bus stop code required"}), 400
    return jsonify(get_arrivals(stop))

@app.route("/api/nearest_stop")
def nearest_stop():
    lat = request.args.get("lat")
    lng = request.args.get("lng")
    if not lat or not lng:
        return jsonify({"error": "Latitude and longitude required"}), 400
    try:
        lat = float(lat)
        lng = float(lng)
    except ValueError:
        return jsonify({"error": "Invalid coordinates"}), 400

    stop = get_nearest_bus_stop(lat, lng)
    if not stop:
        return jsonify({"error": "No nearby bus stop found"}), 404

    return jsonify({
        "BusStopCode": stop["BusStopCode"],
        "Description": stop["Description"],
        "Latitude": stop["Latitude"],
        "Longitude": stop["Longitude"]
    })

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))

