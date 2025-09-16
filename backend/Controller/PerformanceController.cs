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
public class PerformanceController(ApplicationDbContext context) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetPerformanceMetrics()
    {
        try
        {
            var currentUser = User.FindFirst(ClaimTypes.Name)?.Value ?? 
                              User.FindFirst(ClaimTypes.Email)?.Value;

            var metrics = await context.PerformanceMetrics
                .Where(p => p.CreatedBy == currentUser || User.IsInRole("Admin"))
                .OrderByDescending(p => p.TestDate)
                .ToListAsync();

            return Ok(metrics);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error fetching performance metrics: {ex.Message}");
            return StatusCode(500, new { message = "Failed to fetch performance metrics", error = ex.Message });
        }
    }

    [HttpPost]
    public async Task<IActionResult> CreatePerformanceMetric([FromBody] PerformanceMetricDto dto)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var currentUser = User.FindFirst(ClaimTypes.Name)?.Value ?? 
                              User.FindFirst(ClaimTypes.Email)?.Value ?? 
                              "Unknown";

            var metric = new PerformanceMetric
            {
                Id = Guid.NewGuid(),
                WebsiteUrl = dto.WebsiteUrl,
                LoadTimeMs = dto.LoadTimeMs,
                ResponseTimeMs = dto.ResponseTimeMs,
                DomContentLoadedMs = dto.DomContentLoadedMs,
                FirstPaintMs = dto.FirstPaintMs,
                PerformanceScore = dto.PerformanceScore,
                TestDate = dto.TestDate != default ? dto.TestDate : DateTime.UtcNow,
                TestLocation = dto.TestLocation ?? "Unknown",
                CreatedBy = currentUser,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                UpdatedBy = currentUser
            };

            context.PerformanceMetrics.Add(metric);
            await context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetPerformanceMetric), new { id = metric.Id }, new
            {
                id = metric.Id,
                websiteUrl = metric.WebsiteUrl,
                loadTimeMs = metric.LoadTimeMs,
                responseTimeMs = metric.ResponseTimeMs,
                domContentLoadedMs = metric.DomContentLoadedMs,
                firstPaintMs = metric.FirstPaintMs,
                performanceScore = metric.PerformanceScore,
                testDate = metric.TestDate,
                testLocation = metric.TestLocation,
                createdAt = metric.CreatedAt,
                createdBy = metric.CreatedBy
            });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error creating performance metric: {ex.Message}");
            return StatusCode(500, new { message = "Failed to create performance metric", error = ex.Message });
        }
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetPerformanceMetric(Guid id)
    {
        try
        {
            var currentUser = User.FindFirst(ClaimTypes.Name)?.Value ?? 
                              User.FindFirst(ClaimTypes.Email)?.Value;

            var metric = await context.PerformanceMetrics
                .FirstOrDefaultAsync(p => p.Id == id && (p.CreatedBy == currentUser || User.IsInRole("Admin")));

            if (metric == null)
                return NotFound(new { message = "Performance metric not found" });

            return Ok(metric);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error fetching performance metric: {ex.Message}");
            return StatusCode(500, new { message = "Failed to fetch performance metric", error = ex.Message });
        }
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeletePerformanceMetric(Guid id)
    {
        try
        {
            var currentUser = User.FindFirst(ClaimTypes.Name)?.Value ?? 
                              User.FindFirst(ClaimTypes.Email)?.Value;

            var metric = await context.PerformanceMetrics
                .FirstOrDefaultAsync(p => p.Id == id && (p.CreatedBy == currentUser || User.IsInRole("Admin")));

            if (metric == null)
                return NotFound(new { message = "Performance metric not found" });

            context.PerformanceMetrics.Remove(metric);
            await context.SaveChangesAsync();

            return Ok(new { message = "Performance metric deleted successfully" });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error deleting performance metric: {ex.Message}");
            return StatusCode(500, new { message = "Failed to delete performance metric", error = ex.Message });
        }
    }
}