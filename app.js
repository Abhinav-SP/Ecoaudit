import { collection, addDoc, serverTimestamp, onSnapshot, query, orderBy, getDocs, where } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from "./firebase-config.js";
import { map, drawnIcons, clearMarkers, addMarker, calculateDistance } from "./map-utils.js";
import { updateChart } from "./chart-utils.js";
import { setupAdminEasterEgg } from "./admin-auth.js";

// 1. Setup Admin Tools
setupAdminEasterEgg();

// 2. Device Identity for Anti-Fraud
let deviceId = localStorage.getItem("ecoaudit_device_id");
if (!deviceId) {
    deviceId = crypto.randomUUID ? crypto.randomUUID() : (Math.random().toString(36).substring(2) + Date.now().toString(36));
    localStorage.setItem("ecoaudit_device_id", deviceId);
}

async function hashDeviceId(id) {
    const msgBuffer = new TextEncoder().encode(id);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// 3. Form Submission & Validation Logic
const form = document.getElementById("waste-form");
const usernameInput = document.getElementById("username");
const categoryInput = document.getElementById("category");
const weightInput = document.getElementById("weight");
const submitBtn = document.querySelector(".submit-btn");
const errorEl = document.getElementById("error-message");

form.addEventListener("submit", async (event) => {
    event.preventDefault();
    errorEl.style.display = "none";
    
    const username = usernameInput.value.trim();
    const category = categoryInput.value;
    const weight = parseFloat(weightInput.value);

    submitBtn.textContent = "Verifying Username...";
    submitBtn.disabled = true;

    try {
        const hashedId = await hashDeviceId(deviceId);

        // Check if username is taken by another device
        const userQuery = query(collection(db, "wasteLogs"), where("username", "==", username));
        const querySnapshot = await getDocs(userQuery);

        if (!querySnapshot.empty) {
            let belongsToDevice = false;
            querySnapshot.forEach((doc) => {
                if (doc.data().hashedDeviceId === hashedId) belongsToDevice = true;
            });

            if (!belongsToDevice) {
                showError(`The username "@${username}" is already taken!`);
                return;
            }
        }

        submitBtn.textContent = "Getting Location...";

        if (!navigator.geolocation) {
            showError("Geolocation is not supported by your browser!");
            return;
        }

        navigator.geolocation.getCurrentPosition(async (position) => {
            const { latitude: lat, longitude: lng, accuracy } = position.coords;
            
            if (accuracy > 2000) {
                showError(`Anti-Fraud: GPS signal too weak (accuracy: ${Math.round(accuracy)}m).`);
                return;
            }

            // Speed Teleportation Check
            const lastLog = JSON.parse(localStorage.getItem("ecoaudit_last_log"));
            const now = Date.now();
            
            if (lastLog) {
                const distanceKm = calculateDistance(lastLog.lat, lastLog.lng, lat, lng);
                const timeDiffHours = (now - lastLog.time) / (1000 * 60 * 60); 
                if (timeDiffHours > 0 && (distanceKm / timeDiffHours) > 1000) {
                    showError(`Anti-Fraud: Impossible travel speed detected. GPS Spoofing blocked!`);
                    return;
                }
            }

            localStorage.setItem("ecoaudit_last_log", JSON.stringify({ lat, lng, time: now }));
            submitBtn.textContent = "Saving to Database...";

            try {
                await addDoc(collection(db, "wasteLogs"), {
                    username, hashedDeviceId: hashedId, category, weight, 
                    latitude: lat, longitude: lng, timestamp: serverTimestamp()
                });

                confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#007D5A', '#ffffff', '#81C784'] });
                if (navigator.vibrate) navigator.vibrate(200);
                
                categoryInput.value = ""; weightInput.value = "";
                resetButton();
                document.getElementById('section2').scrollIntoView({ behavior: 'smooth' });
            } catch (error) {
                showError("Error saving data to database.");
            }
        }, (error) => {
            showError("Location access was denied! We need GPS to verify the entry.");
        }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });

    } catch (error) {
        showError("Something went wrong verifying your username.");
    }
});

function showError(msg) {
    errorEl.textContent = msg;
    errorEl.style.display = "block";
    resetButton();
}

function resetButton() {
    submitBtn.textContent = "Submit Log";
    submitBtn.disabled = false;
}

// 4. Real-time Dashboard & Map rendering
const logsList = document.getElementById("logs-list");
const totalWeightEl = document.getElementById("total-weight");
let allLogsData = []; 

const q = query(collection(db, "wasteLogs"), orderBy("timestamp", "desc"));

onSnapshot(q, (snapshot) => {
    let totalWeight = 0;
    let sumLat = 0, sumLng = 0, logCount = 0;
    
    logsList.innerHTML = ""; 
    allLogsData = [];
    clearMarkers();

    const categoryTotals = { "Plastic": 0, "E-Waste": 0, "Organic": 0, "Paper": 0, "Glass": 0, "Other": 0 };

    if (snapshot.empty) {
        logsList.innerHTML = `<li class="empty-state">No waste logged yet! Be the first!</li>`;
        totalWeightEl.innerHTML = `0.00 <span class="unit">kg</span>`;
        updateChart(categoryTotals);
        return;
    }

    snapshot.forEach((doc) => {
        const data = doc.data();
        allLogsData.push(data); 
        
        if (data.weight) {
            totalWeight += data.weight;
            categoryTotals[categoryTotals[data.category] !== undefined ? data.category : "Other"] += data.weight;
        }

        if (data.latitude && data.longitude) {
            sumLat += data.latitude; sumLng += data.longitude; logCount++;
            
            // Check density limit (max 15 logs per 5km)
            let nearbyCount = 0;
            for (let icon of drawnIcons) {
                if (calculateDistance(data.latitude, data.longitude, icon.lat, icon.lng) <= 5) nearbyCount++;
            }

            if (nearbyCount < 15) {
                const popup = `<b>@${data.username || 'anonymous'}</b><br>${data.category}: ${data.weight.toFixed(2)}kg`;
                addMarker(data.latitude, data.longitude, data.weight, popup);
            }
        }
    });

    // Render Top 7 Heaviest
    const top7 = [...allLogsData].sort((a, b) => b.weight - a.weight).slice(0, 7);
    top7.forEach(data => {
        const li = document.createElement("li");
        li.className = "log-item";
        li.innerHTML = `
            <div class="log-details">
                <span class="log-username">@${data.username || 'anonymous'}</span>
                <span class="log-category">${data.category}</span>
                <span class="log-location">Lat: ${data.latitude.toFixed(4)}, Lng: ${data.longitude.toFixed(4)}</span>
            </div>
            <div class="log-weight">${data.weight.toFixed(2)} kg</div>
        `;
        logsList.appendChild(li);
    });

    totalWeightEl.innerHTML = `${totalWeight.toFixed(2)} <span class="unit">kg</span>`;
    updateChart(categoryTotals);

    // Auto-center map
    if (logCount > 0) {
        const bounds = L.circle([sumLat / logCount, sumLng / logCount], {radius: 500000}).getBounds();
        map.fitBounds(bounds);
    }
});

// 5. CSV Export
document.getElementById('download-csv').addEventListener('click', () => {
    if (allLogsData.length === 0) return alert("No data available to download.");
    
    let csvContent = "data:text/csv;charset=utf-8,Username,Category,Weight (kg),Latitude,Longitude,Timestamp\n";
    allLogsData.forEach(row => {
        let dateStr = row.timestamp ? new Date(row.timestamp.toDate()).toISOString() : "Pending...";
        csvContent += `${row.username || 'anonymous'},${row.category},${row.weight},${row.latitude},${row.longitude},${dateStr}\n`;
    });
    
    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = "ecoaudit_logs.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
});
