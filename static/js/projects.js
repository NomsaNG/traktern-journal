document.addEventListener("DOMContentLoaded", () => {
    // Load projects
    loadProjects()
  
    // Handle form submission
    const projectForm = document.getElementById("project-form")
    projectForm.addEventListener("submit", (e) => {
      e.preventDefault()
      submitProject()
    })
  
    // Handle search
    const searchInput = document.getElementById("project-search")
    searchInput.addEventListener("input", filterProjects)
  })
  
  async function loadProjects() {
    try {
      const response = await fetch("/api/projects")
      const projects = await response.json()
  
      renderProjects(projects)
      updateProjectStats(projects)
      generateSkillFilters(projects)
    } catch (error) {
      console.error("Error loading projects:", error)
      document.getElementById("projects-grid").innerHTML =
        '<p class="error">Failed to load projects. Please try again.</p>'
    }
  }
  
  function renderProjects(projects) {
    const container = document.getElementById("projects-grid")
  
    if (projects.length === 0) {
      container.innerHTML = '<p class="empty-state">No projects added yet. Start by adding your first project!</p>'
      return
    }
  
    container.innerHTML = ""
    const template = document.getElementById("project-template")
  
    projects.forEach((project) => {
      const clone = template.content.cloneNode(true)
  
      // Set content
      clone.querySelector(".project-title").textContent = project.title
      clone.querySelector(".project-description").textContent = project.description
  
      // Set image
      const imageElement = clone.querySelector(".project-image")
      if (project.image_path) {
        imageElement.src = project.image_path
        imageElement.alt = project.title
      } else {
        imageElement.src = "/static/images/project-placeholder.png"
        imageElement.alt = "No image available"
      }
  
      // Set link
      const linkElement = clone.querySelector(".project-link")
      if (project.link) {
        linkElement.href = project.link
      } else {
        linkElement.style.display = "none"
      }
  
      // Set skills
      const skillsContainer = clone.querySelector(".project-skills")
      const skills = project.skills_used.split(",").map((skill) => skill.trim())
  
      skills.forEach((skill) => {
        const skillBadge = document.createElement("span")
        skillBadge.className = "skill-badge"
        skillBadge.textContent = skill
        skillsContainer.appendChild(skillBadge)
      })
  
      // Set delete button
      const deleteButton = clone.querySelector(".delete-project")
      deleteButton.addEventListener("click", () => deleteProject(project.id))
  
      // Add data attributes for filtering
      const projectCard = clone.querySelector(".project-card")
      projectCard.dataset.title = project.title.toLowerCase()
      projectCard.dataset.skills = skills.join(" ").toLowerCase()
      projectCard.dataset.id = project.id
  
      container.appendChild(clone)
    })
  }
  
  function updateProjectStats(projects) {
    // Update total projects count
    document.getElementById("total-projects").textContent = projects.length
  
    // Count unique skills
    const allSkills = new Set()
    projects.forEach((project) => {
      const skills = project.skills_used.split(",").map((skill) => skill.trim())
      skills.forEach((skill) => allSkills.add(skill))
    })
  
    document.getElementById("total-skills").textContent = allSkills.size
  }
  
  function generateSkillFilters(projects) {
    const skillFiltersContainer = document.getElementById("skill-filters")
    skillFiltersContainer.innerHTML = ""
  
    // Extract all unique skills
    const allSkills = new Set()
    projects.forEach((project) => {
      const skills = project.skills_used.split(",").map((skill) => skill.trim())
      skills.forEach((skill) => allSkills.add(skill))
    })
  
    // Create filter buttons
    allSkills.forEach((skill) => {
      const filterButton = document.createElement("button")
      filterButton.className = "skill-filter"
      filterButton.textContent = skill
      filterButton.dataset.skill = skill.toLowerCase()
  
      filterButton.addEventListener("click", () => {
        filterButton.classList.toggle("active")
        filterProjects()
      })
  
      skillFiltersContainer.appendChild(filterButton)
    })
  }
  
  function filterProjects() {
    const searchTerm = document.getElementById("project-search").value.toLowerCase()
    const activeFilters = Array.from(document.querySelectorAll(".skill-filter.active")).map((btn) => btn.dataset.skill)
  
    const projectCards = document.querySelectorAll(".project-card")
  
    projectCards.forEach((card) => {
      const title = card.dataset.title
      const skills = card.dataset.skills
  
      let matchesSearch = true
      let matchesFilters = true
  
      // Check search term
      if (searchTerm) {
        matchesSearch = title.includes(searchTerm) || skills.includes(searchTerm)
      }
  
      // Check skill filters
      if (activeFilters.length > 0) {
        matchesFilters = activeFilters.every((filter) => skills.includes(filter))
      }
  
      // Show/hide based on filters
      if (matchesSearch && matchesFilters) {
        card.style.display = ""
      } else {
        card.style.display = "none"
      }
    })
  }
  
  async function submitProject() {
    const form = document.getElementById("project-form")
    const submitButton = form.querySelector('button[type="submit"]')
    const originalButtonText = submitButton.textContent
  
    // Disable button and show loading state
    submitButton.disabled = true
    submitButton.textContent = "Adding..."
  
    try {
      const formData = new FormData(form)
  
      const response = await fetch("/api/projects", {
        method: "POST",
        body: formData,
      })
  
      if (!response.ok) {
        throw new Error("Failed to add project")
      }
  
      // Reset form
      form.reset()
  
      // Reload projects
      loadProjects()
  
      // Show success message
      alert("Project added successfully!")
    } catch (error) {
      console.error("Error adding project:", error)
      alert("Failed to add project. Please try again.")
    } finally {
      // Re-enable button
      submitButton.disabled = false
      submitButton.textContent = originalButtonText
    }
  }
  
  async function deleteProject(projectId) {
    if (!confirm("Are you sure you want to delete this project?")) {
      return
    }
  
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
      })
  
      if (!response.ok) {
        throw new Error("Failed to delete project")
      }
  
      // Reload projects
      loadProjects()
  
      // Show success message
      alert("Project deleted successfully!")
    } catch (error) {
      console.error("Error deleting project:", error)
      alert("Failed to delete project. Please try again.")
    }
  }
  