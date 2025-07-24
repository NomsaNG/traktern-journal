
document.addEventListener("DOMContentLoaded", () => {
  // Load weekly summary
  loadWeeklySummary()

  // Load chart data
  loadSkillChartData()
  loadProductivityChartData()
})

async function loadWeeklySummary() {
  try {
    const response = await fetch("/api/summary/weekly")
    const summary = await response.json()

    renderWeeklySummary(summary)
  } catch (error) {
    console.error("Error loading weekly summary:", error)
    document.getElementById("weekly-summary").innerHTML =
      '<p class="error">Failed to load weekly summary. Please try again.</p>'
  }
}

function renderWeeklySummary(summary) {
  const container = document.getElementById("weekly-summary")

  if (!summary) {
    container.innerHTML =
      '<p class="empty-state">No data available for weekly summary yet. Add more journal entries!</p>'
    return
  }

  const template = document.getElementById("summary-template")
  const clone = template.content.cloneNode(true)

  // Set date range
  clone.querySelector(".summary-date-range").textContent = `${summary.startDate} to ${summary.endDate}`

  // Populate lists
  populateList(clone.querySelector("#accomplishments-list"), summary.accomplishments)
  populateList(clone.querySelector("#learnings-list"), summary.learnings)
  populateList(clone.querySelector("#challenges-list"), summary.challenges)
  populateList(clone.querySelector("#goals-list"), summary.goals)

  // Clear container and append the summary
  container.innerHTML = ""
  container.appendChild(clone)
}

function populateList(listElement, items) {
  items.forEach((item) => {
    const li = document.createElement("li")
    li.textContent = item
    listElement.appendChild(li)
  })
}

async function loadSkillChartData() {
  try {
    const response = await fetch("/api/chart/skills")
    const data = await response.json()

    if (data.length === 0) {
      document.querySelector("#skill-chart").parentElement.innerHTML =
        '<p class="empty-state">No skill data available yet. Add skills and track your progress!</p>'
      return
    }

    renderSkillChart(data)
  } catch (error) {
    console.error("Error loading skill chart data:", error)
    document.querySelector("#skill-chart").parentElement.innerHTML =
      '<p class="error">Failed to load skill chart data. Please try again.</p>'
  }
}

function renderSkillChart(data) {
  const ctx = document.getElementById("skill-chart").getContext("2d")

  // Extract skill names (excluding 'date')
  const skillNames = Object.keys(data[0]).filter((key) => key !== "date")

  // Generate colors for each skill
  const colors = [
    "#73C7C7", // teal
    "#F7CFD8", // pink
    "#A6F1E0", // mint
    "#F4F8D3", // yellow
    "#6AADAD", // darker teal
    "#E5B7C0", // darker pink
    "#8CD9C8", // darker mint
    "#E0E4BF", // darker yellow
  ]

  // Prepare datasets
  const datasets = skillNames.map((skill, index) => {
    return {
      label: skill,
      data: data.map((item) => item[skill]),
      borderColor: colors[index % colors.length],
      backgroundColor: colors[index % colors.length] + "20",
      tension: 0.3,
      fill: false,
    }
  })

  // Create chart
  new Chart(ctx, {
    type: "line",
    data: {
      labels: data.map((item) => {
        const date = new Date(item.date)
        return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
      }),
      datasets: datasets,
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          max: 5,
          ticks: {
            stepSize: 1,
          },
          title: {
            display: true,
            text: "Skill Level",
          },
        },
        x: {
          title: {
            display: true,
            text: "Date",
          },
        },
      },
      plugins: {
        tooltip: {
          mode: "index",
          intersect: false,
        },
        legend: {
          position: "top",
        },
      },
    },
  })
}

async function loadProductivityChartData() {
  try {
    const response = await fetch("/api/chart/productivity")
    const data = await response.json()

    if (data.length === 0) {
      document.querySelector("#productivity-chart").parentElement.innerHTML =
        '<p class="empty-state">No productivity data available yet. Add more journal entries!</p>'
      return
    }

    renderProductivityChart(data)
  } catch (error) {
    console.error("Error loading productivity chart data:", error)
    document.querySelector("#productivity-chart").parentElement.innerHTML =
      '<p class="error">Failed to load productivity chart data. Please try again.</p>'
  }
}

function renderProductivityChart(data) {
  const ctx = document.getElementById("productivity-chart").getContext("2d")

  // Create chart
  new Chart(ctx, {
    type: "bar",
    data: {
      labels: data.map((item) => item.week),
      datasets: [
        {
          label: "Journal Entries",
          data: data.map((item) => item.entries),
          backgroundColor: "#73C7C7",
          borderRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1,
          },
          title: {
            display: true,
            text: "Number of Entries",
          },
        },
        x: {
          title: {
            display: true,
            text: "Week",
          },
        },
      },
      plugins: {
        tooltip: {
          mode: "index",
          intersect: false,
        },
        legend: {
          position: "top",
        },
      },
    },
  })
}
