Chart.defaults.color = '#b0b0b0';
Chart.defaults.borderColor = 'rgba(255,255,255,0.05)';

let wasteChart; 

export function updateChart(categoryData) {
    const ctx = document.getElementById('wasteChart').getContext('2d');
    
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
