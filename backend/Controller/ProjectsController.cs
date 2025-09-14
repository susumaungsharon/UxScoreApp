using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UXScore.DTOs;
using UXScore.Models;

namespace UXScore.Controller;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class ProjectsController(ApplicationDbContext context) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> CreateProject([FromBody] ProjectDto dto)
    {
        try
        {
            var currentUser = User.FindFirst(ClaimTypes.Name)?.Value ?? 
                              User.FindFirst(ClaimTypes.Email)?.Value ?? 
                              "Unknown";

            var project = new Project
            {
                Id = Guid.NewGuid(),
                Name = dto.Name,
                Description = dto.Description ?? string.Empty,
                Websites = dto.Websites ?? [],
                CreatedBy = currentUser,
                CreatedAt = DateTime.UtcNow,
                Evaluations = new List<Evaluation>()
            };

            context.Projects.Add(project);
            await context.SaveChangesAsync();
            
            return CreatedAtAction(nameof(GetProject), new { id = project.Id }, project);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = "Failed to create project", error = ex.Message });
        }
    }

    [HttpGet]
    public async Task<IActionResult> GetProjects()
    {
        try
        {
            var currentUser = User.FindFirst(ClaimTypes.Name)?.Value ?? 
                              User.FindFirst(ClaimTypes.Email)?.Value;
            
            var projects = await context.Projects
                .Where(p => p.CreatedBy == currentUser || User.IsInRole("Admin"))
                .Include(p => p.Evaluations)
                .OrderByDescending(p => p.CreatedAt)
                .ToListAsync();
                
            return Ok(projects);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = "Failed to fetch projects", error = ex.Message });
        }
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetProject(Guid id)
    {
        try
        {
            var currentUser = User.FindFirst(ClaimTypes.Name)?.Value ?? 
                              User.FindFirst(ClaimTypes.Email)?.Value;
            
            var project = await context.Projects
                .Include(p => p.Evaluations)
                .FirstOrDefaultAsync(p => p.Id == id && (p.CreatedBy == currentUser || User.IsInRole("Admin")));
                
            if (project == null) 
                return NotFound(new { message = "Project not found" });
                
            return Ok(project);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = "Failed to fetch project", error = ex.Message });
        }
    }
    
    [HttpGet("websites")]
    public async Task<IActionResult> GetAllWebsites()
    {
        try
        {
            var currentUser = User.FindFirst(ClaimTypes.Name)?.Value ?? 
                              User.FindFirst(ClaimTypes.Email)?.Value;
            
            var projectWebsites = await context.Projects
                .Where(p => p.CreatedBy == currentUser || User.IsInRole("Admin"))
                .Select(p => new 
                {
                    p.Id,
                    p.Name,
                    Websites = p.Websites ?? Array.Empty<string>()
                })
                .ToListAsync();

            var websites = projectWebsites
                .SelectMany(p => p.Websites
                    .Select(url => new 
                    {
                        id = p.Id,
                        url,
                        projectName = p.Name
                    }))
                .ToList();

            return Ok(websites);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = "Failed to fetch websites", error = ex.Message });
        }
    }
    
    [HttpGet("{id:guid}/websites")]
    public async Task<IActionResult> GetWebsites(Guid id)
    {
        try
        {
            var currentUser = User.FindFirst(ClaimTypes.Name)?.Value ?? 
                              User.FindFirst(ClaimTypes.Email)?.Value;
            
            var project = await context.Projects
                .Where(p => p.Id == id && (p.CreatedBy == currentUser || User.IsInRole("Admin")))
                .Select(p => new 
                {
                    ProjectId = p.Id, 
                    p.Name,
                    p.Websites
                })
                .FirstOrDefaultAsync();

            if (project == null)
            {
                return NotFound(new { message = "Project not found" });
            }

            var websites = (project.Websites ?? [])
                .Select(url => new 
                {
                    id = project.ProjectId,
                    url,
                    projectName = project.Name
                })
                .ToList();

            return Ok(websites);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = "Failed to fetch project websites", error = ex.Message });
        }
    }

    [Authorize(Roles = "Admin")]
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateProject(Guid id, [FromBody] ProjectDto dto)
    {
        try
        {
            var currentUser = User.FindFirst(ClaimTypes.Name)?.Value ?? 
                              User.FindFirst(ClaimTypes.Email)?.Value;
            
            var existingProject = await context.Projects.Include(project => project.Evaluations)
                .FirstOrDefaultAsync(p => p.Id == id && (p.CreatedBy == currentUser || User.IsInRole("Admin")));

            if (existingProject == null)
                return NotFound(new { message = "Project not found" });

            var updatedProject = new Project
            {
                Id = existingProject.Id,
                Name = dto.Name,
                Description = dto.Description ?? string.Empty,
                Websites = dto.Websites ?? [],
                CreatedAt = existingProject.CreatedAt,
                CreatedBy = existingProject.CreatedBy,
                UpdatedAt = DateTime.UtcNow,
                UpdatedBy = currentUser,
                Evaluations = existingProject.Evaluations
            };

            context.Entry(existingProject).CurrentValues.SetValues(updatedProject);
            await context.SaveChangesAsync();

            return Ok(updatedProject);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = "Failed to update project", error = ex.Message });
        }
    }

    [Authorize(Roles = "Admin")]
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteProject(Guid id)
    {
        try
        {
            var currentUser = User.FindFirst(ClaimTypes.Name)?.Value ?? 
                              User.FindFirst(ClaimTypes.Email)?.Value;
            
            var project = await context.Projects
                .FirstOrDefaultAsync(p => p.Id == id && (p.CreatedBy == currentUser || User.IsInRole("Admin")));

            if (project == null)
                return NotFound(new { message = "Project not found" });

            context.Projects.Remove(project);
            await context.SaveChangesAsync();

            return Ok(new { message = "Project deleted successfully" });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = "Failed to delete project", error = ex.Message });
        }
    }
}