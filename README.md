# EcoAudit - Community Waste Logger

EcoAudit is a simple web application designed to track and manage community waste logs. It ensures data integrity by automatically capturing geolocation data and storing all information in a secure database.

## Features

- **Log a Waste Entry:** A functional form that takes the waste category (e.g., Plastic, E-Waste, Organic) and weight (in kg).
- **Validated Geolocation (Anti-Fraud):** The form uses the browser's native Geolocation API to automatically capture the user's real latitude and longitude upon submission, replacing manual text input for locations.
- **The Audit Dashboard:** A main feed that fetches and displays all submitted waste logs from the database, including the captured coordinates.
- **Live Totaling:** The dashboard displays live aggregated metrics (e.g., total e-waste logged).
- **Data Persistence:** Data is persistently saved to a Firebase database, ensuring it does not only live in local memory.

## Bonus Features Implemented

- **Map Visualization:** Integrates a map API to drop a visual pin exactly where the waste was logged, rather than just showing raw coordinates.
- **Location Error Handling:** Gracefully handles the UI if the user clicks "Deny" on the browser's location permission popup.

## What I Learned

Building this project provided hands-on experience with several key technologies and concepts:
- Building a simple web application using HTML, CSS, and JavaScript.
- Creating a database and storing user input from the website to the database.
- Deploying a live website using the Firebase CLI.
- Refactoring a massive 450-line JavaScript file into 5 tiny, highly focused micro-files (`map-utils.js`, `firebase-config.js`, etc.) using `import` and `export`.
- Writing a `.gitignore` file and initializing a local repository to safely back up code to GitHub.

## Demo

https://github.com/user-attachments/assets/1b10b49f-e96f-4a70-8054-8b445c033301

