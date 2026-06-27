import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp, onSnapshot, query, orderBy, getDocs, where, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDbgiGUR16k-E3lsHRNK_vt8gEIX-CxStc",
  authDomain: "cc-recruitment-project.firebaseapp.com",
  projectId: "cc-recruitment-project",
  storageBucket: "cc-recruitment-project.firebasestorage.app",
  messagingSenderId: "685808992166",
  appId: "1:685808992166:web:c2ebfeba7ea1f8f226d967",
  measurementId: "G-V1H80LW2NF"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

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

const map = L.map('map', {
    center: [11.1271, 78.6569], // Starts at Tamil Nadu
    zoom: 7,
    dragging: true,
    worldCopyJump: false,
    zoomControl: true 
});

L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap, © CartoDB'
}).addTo(map);

let markers = [];
let drawnIcons = [];

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    return R * c; 
}

const form = document.getElementById("waste-form");
const usernameInput = document.getElementById("username");
const categoryInput = document.getElementById("category");
const weightInput = document.getElementById("weight");
const submitBtn = document.querySelector(".submit-btn");
const errorEl = document.getElementById("error-message");

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    // Reset error UI
    errorEl.style.display = "none";
    errorEl.textContent = "";

    const username = usernameInput.value.trim();
    const category = categoryInput.value;
    const weight = parseFloat(weightInput.value);

    submitBtn.textContent = "Verifying Username...";
    submitBtn.disabled = true;

    try {
        const hashedId = await hashDeviceId(deviceId);

        const userQuery = query(collection(db, "wasteLogs"), where("username", "==", username));
        const querySnapshot = await getDocs(userQuery);

        if (!querySnapshot.empty) {
            let belongsToDevice = false;
            querySnapshot.forEach((doc) => {
                if (doc.data().hashedDeviceId === hashedId) {
                    belongsToDevice = true;
                }
            });

            if (!belongsToDevice) {
                errorEl.textContent = `The username "@${username}" is already taken by another device! Please choose a different name.`;
                errorEl.style.display = "block";
                submitBtn.textContent = "Submit Log";
                submitBtn.disabled = false;
                return;
            }
        }

        submitBtn.textContent = "Getting Location...";

        if (!navigator.geolocation) {
            errorEl.textContent = "Geolocation is not supported by your browser!";
            errorEl.style.display = "block";
            submitBtn.textContent = "Submit Log";
            submitBtn.disabled = false;
            return;
        }

        navigator.geolocation.getCurrentPosition(async (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            const accuracy = position.coords.accuracy;
            
            if (accuracy > 2000) {
                errorEl.textContent = `Anti-Fraud Alert: GPS signal is too weak (accuracy: ${Math.round(accuracy)}m). Please connect to real GPS to log waste.`;
                errorEl.style.display = "block";
                submitBtn.textContent = "Submit Log";
                submitBtn.disabled = false;
                return;
            }

            const lastLog = JSON.parse(localStorage.getItem("ecoaudit_last_log"));
            const now = Date.now();
            
            if (lastLog) {
                const distanceKm = calculateDistance(lastLog.lat, lastLog.lng, lat, lng);
                const timeDiffHours = (now - lastLog.time) / (1000 * 60 * 60); 
                
                if (timeDiffHours > 0) {
                    const speed = distanceKm / timeDiffHours;
                    if (speed > 1000) {
                        errorEl.textContent = `Anti-Fraud Alert: Impossible travel speed detected (${Math.round(speed)} km/h). GPS Spoofing blocked!`;
                        errorEl.style.display = "block";
                        submitBtn.textContent = "Submit Log";
                        submitBtn.disabled = false;
                        return;
                    }
                }
            }

            localStorage.setItem("ecoaudit_last_log", JSON.stringify({ lat: lat, lng: lng, time: now }));
            submitBtn.textContent = "Saving to Database...";

            try {
                await addDoc(collection(db, "wasteLogs"), {
                    username: username,
                    hashedDeviceId: hashedId,
                    category: category,
                    weight: weight,
                    latitude: lat,
                    longitude: lng,
                    timestamp: serverTimestamp()
                });

                confetti({
                    particleCount: 150,
                    spread: 70,
                    origin: { y: 0.6 },
                    colors: ['#007D5A', '#ffffff', '#81C784']
                });

                if (navigator.vibrate) navigator.vibrate(200);
                
                categoryInput.value = "";
                weightInput.value = "";
                submitBtn.textContent = "Submit Log";
                submitBtn.disabled = false;
                
                // Smooth scroll to Section 2 to see the new pin!
                document.getElementById('section2').scrollIntoView({ behavior: 'smooth' });

            } catch (error) {
                console.error("Error adding document: ", error);
                errorEl.textContent = "Error saving data to database.";
                errorEl.style.display = "block";
                submitBtn.textContent = "Submit Log";
                submitBtn.disabled = false;
            }

        }, (error) => {
            console.error("Geolocation error:", error);
            // Graceful Error Handling for Denied Location
            errorEl.textContent = "Location access was denied! We need your GPS location to verify the entry. Please enable location permissions in your browser.";
            errorEl.style.display = "block";
            submitBtn.textContent = "Submit Log";
            submitBtn.disabled = false;
        }, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        });

    } catch (error) {
        console.error("Verification error:", error);
        errorEl.textContent = "Something went wrong verifying your username.";
        errorEl.style.display = "block";
        submitBtn.textContent = "Submit Log";
        submitBtn.disabled = false;
    }
});

const logsList = document.getElementById("logs-list");
const totalWeightEl = document.getElementById("total-weight");
let wasteChart; // Variable to hold the Chart.js instance
let allLogsData = []; // Store raw data for CSV export

const q = query(collection(db, "wasteLogs"), orderBy("timestamp", "desc"));

onSnapshot(q, (snapshot) => {
    let totalWeight = 0;
    let sumLat = 0;
    let sumLng = 0;
    let logCount = 0;
    
    // Reset lists
    logsList.innerHTML = ""; 
    drawnIcons = [];
    allLogsData = [];
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];

    // Reset Chart Data Categories
    const categoryTotals = {
        "Plastic": 0, "E-Waste": 0, "Organic": 0,
        "Paper": 0, "Glass": 0, "Other": 0
    };

    if (snapshot.empty) {
        logsList.innerHTML = `<li class="empty-state">No waste logged yet! Be the first!</li>`;
        totalWeightEl.innerHTML = `0.00 <span class="unit">kg</span>`;
        updateChart(categoryTotals);
        return;
    }

    // 1. Process all logs for Map, Stats, and Chart
    snapshot.forEach((doc) => {
        const data = doc.data();
        allLogsData.push(data); // Save for CSV
        
        if (data.weight) {
            totalWeight += data.weight;
            // Add weight to specific category for the chart
            if (categoryTotals[data.category] !== undefined) {
                categoryTotals[data.category] += data.weight;
            } else {
                categoryTotals["Other"] += data.weight;
            }
        }

        // Add Markers to Map (Cluster based on weight!)
        if (data.latitude && data.longitude) {
            sumLat += data.latitude;
            sumLng += data.longitude;
            logCount++;
            
            // Scale icon size based on weight (Base 24px + 1px per kg, Max 50px)
            const size = Math.min(50, 24 + data.weight);
            const scaledIcon = L.icon({
                iconUrl: 'trashicon.png',
                iconSize: [size, size],
                iconAnchor: [size / 2, size],
                popupAnchor: [0, -size]
            });

            // Density Check: Max 15 logs in a 5km radius
            let nearbyCount = 0;
            for (let icon of drawnIcons) {
                if (calculateDistance(data.latitude, data.longitude, icon.lat, icon.lng) <= 5) nearbyCount++;
            }

            if (nearbyCount < 15) {
                const marker = L.marker([data.latitude, data.longitude], {icon: scaledIcon})
                    .addTo(map)
                    .bindPopup(`<b>@${data.username || 'anonymous'}</b><br>${data.category}: ${data.weight.toFixed(2)}kg`);
                markers.push(marker);
                drawnIcons.push({lat: data.latitude, lng: data.longitude});
            }
        }
    });

    // 2. Render Top 7 Heaviest Logs
    // Sort array descending by weight
    const sortedByWeight = [...allLogsData].sort((a, b) => b.weight - a.weight);
    const top7 = sortedByWeight.slice(0, 7);

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

    // Update the total weight UI
    totalWeightEl.innerHTML = `${totalWeight.toFixed(2)} <span class="unit">kg</span>`;
    
    // Update the Bar Graph UI
    updateChart(categoryTotals);

    // Automatically center map based on logs
    if (logCount > 0) {
        const centerLat = sumLat / logCount;
        const centerLng = sumLng / logCount;
        const bounds = L.circle([centerLat, centerLng], {radius: 500000}).getBounds();
        map.fitBounds(bounds);
    }
});

Chart.defaults.color = '#b0b0b0';
Chart.defaults.borderColor = 'rgba(255,255,255,0.05)';

function updateChart(categoryData) {
    const ctx = document.getElementById('wasteChart').getContext('2d');
    
    // Destroy previous chart if it exists to redraw
    if (wasteChart) {
        wasteChart.destroy();
    }
    
    wasteChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(categoryData),
            datasets: [{
                label: 'Weight (kg)',
                data: Object.values(categoryData),
                backgroundColor: '#00C48C',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

document.getElementById('download-csv').addEventListener('click', () => {
    if (allLogsData.length === 0) {
        alert("No data available to download.");
        return;
    }
    
    let csvContent = "data:text/csv;charset=utf-8,";
    // Add Headers
    csvContent += "Username,Category,Weight (kg),Latitude,Longitude,Timestamp\n";
    
    // Add Rows
    allLogsData.forEach(row => {
        let dateStr = row.timestamp ? new Date(row.timestamp.toDate()).toISOString() : "Pending...";
        csvContent += `${row.username || 'anonymous'},${row.category},${row.weight},${row.latitude},${row.longitude},${dateStr}\n`;
    });
    
    // Trigger Download
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "ecoaudit_logs.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});

const titleEl = document.getElementById('eco-title');
const adminModal = document.getElementById('admin-modal');
const adminForm = document.getElementById('admin-login-form');
const cancelAdminBtn = document.getElementById('cancel-admin-btn');
const adminError = document.getElementById('admin-error');
let tapCount = 0;
let tapTimer;

if (titleEl) {
    titleEl.addEventListener('click', async () => {
        tapCount++;
        clearTimeout(tapTimer);
        
        if (tapCount >= 5) {
            tapCount = 0;
            // Show Admin Modal
            adminModal.style.display = 'flex';
        } else {
            tapTimer = setTimeout(() => {
                tapCount = 0;
            }, 800); 
        }
    });
}

cancelAdminBtn.addEventListener('click', () => {
    adminModal.style.display = 'none';
    adminForm.reset();
    adminError.style.display = 'none';
});

adminForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    adminError.style.display = 'none';
    
    const email = document.getElementById('admin-email').value;
    const pwd = document.getElementById('admin-password').value;
    const btn = document.getElementById('login-admin-btn');
    
    btn.textContent = "Authenticating...";
    btn.disabled = true;

    try {
        await signInWithEmailAndPassword(auth, email, pwd);
        
        if (confirm("WARNING: You are authenticated as an Admin. You are about to permanently delete ALL waste logs. Proceed?")) {
            btn.textContent = "Resetting Database...";
            const querySnapshot = await getDocs(collection(db, "wasteLogs"));
            const deletePromises = [];
            querySnapshot.forEach((documentSnap) => {
                deletePromises.push(deleteDoc(doc(db, "wasteLogs", documentSnap.id)));
            });
            await Promise.all(deletePromises);
            alert("Database successfully reset to zero!");
            window.location.reload(); 
        } else {
            btn.textContent = "Login & Reset";
            btn.disabled = false;
            adminModal.style.display = 'none';
            adminForm.reset();
        }
    } catch (error) {
        adminError.textContent = "Access Denied: Invalid credentials.";
        adminError.style.display = 'block';
        btn.textContent = "Login & Reset";
        btn.disabled = false;
    }
});
