// =====================
// MAP INITIALISATION
// =====================
let map = L.map("map").setView([1.3521, 103.8198], 12);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap"
}).addTo(map);

// =====================
// STATE
// =====================
let busMarkers = {};
let favoriteStops = JSON.parse(localStorage.getItem("favoriteStops") || "[]");
let recentStops = JSON.parse(localStorage.getItem("recentStops") || []);

// =====================
// DARK MODE
// =====================
const darkToggle = document.getElementById("darkModeToggle");
darkToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark-mode");
  darkToggle.textContent = document.body.classList.contains("dark-mode") ? "☀️ Light Mode" : "🌙 Dark Mode";
});

// =====================
// RECENT STOPS
// =====================
function addRecentStop(stop) {
  if (!recentStops.includes(stop)) {
    recentStops.unshift(stop);
    if (recentStops.length > 5) recentStops.pop();
    localStorage.setItem("recentStops", JSON.stringify(recentStops));
  }
  renderRecentStops();
}

function renderRecentStops() {
  const container = document.getElementById("recentStops");
  container.innerHTML = "";
  recentStops.forEach(s => {
    const btn = document.createElement("button");
    btn.className = "recent-stop-btn";
    btn.textContent = s;
    btn.onclick = () => { document.getElementById("stop").value = s; loadBus(); };
    container.appendChild(btn);
  });
}

// =====================
// UTILITY FUNCTIONS
// =====================
function getLoadColor(load) { return load === "SEA" ? "#2ecc71" : load==="SDA"? "#f39c12" : load==="LSD"? "#e74c3c":"#95a5a6"; }
function getFriendlyLoad(load) { switch(load){case"SEA":return"Seats Available";case"SDA":return"Standing Available";case"LSD":return"Limited Standing";default:return"Not Available";} }
function getMinutes(timeStr){if(!timeStr) return "Not Available";const arrival=new Date(timeStr),now=new Date(),diff=Math.round((arrival-now)/60000);return diff<=0?"Arriving":diff+" min";}
function clearMarkers(){for(let key in busMarkers) map.removeLayer(busMarkers[key]); busMarkers={};}

// =====================
// FAVORITES
// =====================
function toggleFavorite(stop){const i=favoriteStops.indexOf(stop);i>=0?favoriteStops.splice(i,1):favoriteStops.push(stop);localStorage.setItem("favoriteStops",JSON.stringify(favoriteStops));loadBus(); renderFavorites();}
function renderFavorites(){const c=document.getElementById("favorites");if(!c)return;c.innerHTML="";favoriteStops.forEach(stop=>{const btn=document.createElement("button");btn.className="favorite-btn";btn.textContent=stop;btn.onclick=()=>{document.getElementById("stop").value=stop; loadBus();};c.appendChild(btn);});}

// =====================
// BUS MARKERS
// =====================
function createBusDivIcon(serviceNo,busType){if(!busType)return null;return L.divIcon({html:`<div style="width:40px;height:40px;text-align:center;color:white;font-weight:bold;font-size:14px;line-height:40px;border-radius:50%;background-image:url('web/icons/${busType.toLowerCase()}_bus.png');background-size:contain;background-repeat:no-repeat;background-position:center">${serviceNo}</div>`,className:"",iconSize:[40,40],iconAnchor:[20,40],popupAnchor:[0,-40]});}

function addOrUpdateMarker(bus,serviceNo,label){if(!bus||!bus.Latitude||bus.Latitude==="0.0")return;const lat=parseFloat(bus.Latitude),lng=parseFloat(bus.Longitude),key=serviceNo+"_"+label,icon=createBusDivIcon(serviceNo,bus.Type);if(!icon)return;const arrivalMins=getMinutes(bus.EstimatedArrival),loadText=getFriendlyLoad(bus.Load),wabIcon=bus.Feature==="WAB"?" ♿":"";const popupContent=`🚌 Service ${serviceNo} (${label})${wabIcon}<br>Type: ${bus.Type}<br>Load: ${loadText}<br>Arrival: ${arrivalMins}`;if(busMarkers[key]){busMarkers[key].setLatLng([lat,lng]);busMarkers[key].bindPopup(popupContent);}else{const marker=L.marker([lat,lng],{icon:icon}).addTo(map).bindPopup(popupContent);if(arrivalMins==="Arriving"||parseInt(arrivalMins)<=2)marker.getElement().classList.add("imminent");busMarkers[key]=marker;}}

// =====================
// BUS CARD RENDER
// =====================
function renderBus(bus,index){let mins=getMinutes(bus?.EstimatedArrival);const arrivingClass=mins==="Arriving"||(mins!=="Not Available"&&parseInt(mins)<=2)?"arriving imminent":"";const type=bus?.Type||"N/A",loadText=bus?getFriendlyLoad(bus.Load):"Not Available",wabIcon=bus?.Feature==="WAB"?" ♿":"";let progressPercent=0;if(mins==="Arriving")progressPercent=100;else if(mins!=="Not Available")progressPercent=Math.max(0,Math.min(100,100-parseInt(mins)));return`<div class="bus-line ${bus?.Load||''} ${arrivingClass}">Bus ${index}: ${mins} | ${type} | ${loadText}${wabIcon}<div class="progress-bar"><div class="progress-fill" style="width:${progressPercent}%"></div></div></div>`;}

// =====================
// LOAD BUS DATA
// =====================
async function loadBus() {
  const stop = document.getElementById("stop").value;
  if (!stop) return;

  showLoading(true);

  try {
    const res = await fetch(`/api/arrivals?stop=${stop}`);
    if (!res.ok) throw new Error("API failed");

    const data = await res.json();

    const container = document.getElementById("results");
    container.innerHTML = "";

    if (!data.Services || data.Services.length === 0) {
      container.innerHTML = "No services found";
      return;
    }

    data.Services.forEach(service => {
      const card = document.createElement("div");
      card.className = "bus-card";

      card.innerHTML = `
        <h2>Service ${service.ServiceNo}</h2>
        ${renderBusSafe(service.NextBus, 1)}
        ${renderBusSafe(service.NextBus2, 2)}
        ${renderBusSafe(service.NextBus3, 3)}
      `;

      container.appendChild(card);
    });

  } catch (err) {
    console.error(err);
    document.getElementById("results").innerHTML =
      "Failed to load bus timings";
  } finally {
    showLoading(false);   // ← THIS FIXES THE INFINITE LOADING
  }
}

// RECENT STOPS RENDER
// =====================
renderFavorites();
renderRecentStops();

// =====================
// AUTO REFRESH
// =====================
setInterval(()=>{if(document.getElementById("stop").value)loadBus();},20000);

// =====================
// LOADING SPINNER
// =====================
function showLoading(show){const container=document.getElementById("results");if(show)container.innerHTML='<div class="loading-spinner">Loading...</div>';}
