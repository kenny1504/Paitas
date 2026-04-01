let dailyChart = null;
let hourlyChart = null;

function chartOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: "#d9e7f5",
          font: {
            family: "Outfit"
          }
        }
      },
      tooltip: {
        backgroundColor: "rgba(6, 12, 21, 0.96)",
        borderColor: "rgba(148, 163, 184, 0.15)",
        borderWidth: 1,
        titleColor: "#eef6ff",
        bodyColor: "#c8d8ea"
      }
    },
    scales: {
      x: {
        ticks: {
          color: "#8ea4bd",
          maxRotation: 0,
          minRotation: 0
        },
        grid: {
          color: "rgba(148, 163, 184, 0.08)"
        }
      },
      y: {
        beginAtZero: true,
        ticks: {
          color: "#8ea4bd"
        },
        grid: {
          color: "rgba(148, 163, 184, 0.08)"
        }
      }
    }
  };
}

export function renderDailyChart(canvas, series) {
  if (dailyChart) {
    dailyChart.destroy();
  }

  dailyChart = new Chart(canvas, {
    type: "bar",
    data: {
      labels: series.map((item) => item.date),
      datasets: [{
        label: "Spots",
        data: series.map((item) => item.total),
        backgroundColor: "rgba(64, 216, 196, 0.62)",
        borderColor: "rgba(64, 216, 196, 1)",
        borderWidth: 1,
        borderRadius: 10
      }]
    },
    options: chartOptions()
  });
}

export function renderHourlyChart(canvas, rows) {
  if (hourlyChart) {
    hourlyChart.destroy();
  }

  hourlyChart = new Chart(canvas, {
    type: "line",
    data: {
      labels: rows.map((item) => `${String(item.hour).padStart(2, "0")}:00`),
      datasets: [{
        label: "Detecciones",
        data: rows.map((item) => item.total),
        borderColor: "#f6b65b",
        backgroundColor: "rgba(246, 182, 91, 0.18)",
        fill: true,
        tension: 0.34,
        pointRadius: 3,
        pointHoverRadius: 5
      }]
    },
    options: chartOptions()
  });
}
