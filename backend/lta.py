import requests
from config import LTA_API_KEY

URL_BUS_ARRIVAL = "https://datamall2.mytransport.sg/ltaodataservice/v3/BusArrival"
URL_BUS_STOP = "https://datamall2.mytransport.sg/ltaodataservice/BusStops"

def get_arrivals(bus_stop_code):
    headers = {
        "AccountKey": LTA_API_KEY,
        "Accept": "application/json"
    }
    params = {"BusStopCode": bus_stop_code}
    response = requests.get(URL_BUS_ARRIVAL, headers=headers, params=params)
    if response.status_code != 200:
        return {"error": "LTA API failed", "status": response.status_code, "response": response.text}
    return response.json()

def get_bus_stop(bus_stop_code):
    headers = {
        "AccountKey": LTA_API_KEY,
        "Accept": "application/json"
    }
    params = {"BusStopCode": bus_stop_code}
    response = requests.get(URL_BUS_STOP, headers=headers, params=params)
    if response.status_code != 200:
        return None
    data = response.json()
    if "value" in data and len(data["value"]) > 0:
        return data["value"][0]  # return first match
    return None

# ---------------------------
# NEW: get nearest bus stop
# ---------------------------
def get_nearest_bus_stop(lat, lng):
    headers = {
        "AccountKey": LTA_API_KEY,
        "Accept": "application/json"
    }
    response = requests.get(URL_BUS_STOP, headers=headers)
    if response.status_code != 200:
        return None

    data = response.json()
    if "value" not in data or len(data["value"]) == 0:
        return None

    # Calculate nearest stop
    def distance(bus_lat, bus_lng):
        return (float(bus_lat)-lat)**2 + (float(bus_lng)-lng)**2

    nearest = min(data["value"], key=lambda x: distance(x["Latitude"], x["Longitude"]))
    return nearest
