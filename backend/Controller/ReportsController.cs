using Microsoft.AspNetCore.Mvc;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using UXScore.Services;

namespace UXScore.Controller;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class ReportsController(ApplicationDbContext context, IPdfService pdfService) : ControllerBase
{
    [HttpGet("evaluation-report")]
    public async Task<IActionResult> GetEvaluationReport(
        Guid? projectId = null, 
        DateTime? startDate = null, 
        DateTime? endDate = null)
    {
        var query = context.Projects
            .Include(p => p.Evaluations)!
                .ThenInclude(e => e.CategoryScores)
                    .ThenInclude(cs => cs.Category)
            .Where(p => User.Identity != null && (p.CreatedBy == User.Identity.Name || User.IsInRole("Admin")))
            .Where(p => p.Evaluations != null && p.Evaluations
                .Any(e => User.Identity != null && (e.CreatedBy == User.Identity.Name || User.IsInRole("Admin"))));
        
        if (projectId.HasValue)
            query = query.Where(p => p.Id == projectId.Value);

        var projects = await query.ToListAsync();

        var reportData = new List<object>();

        foreach (var project in projects)
        {
            if (project.Evaluations == null) continue;
            var userEvaluations = project.Evaluations
                .Where(e => e.CreatedBy == User.Identity?.Name || User.IsInRole("Admin"))
                .AsQueryable();

            if (startDate.HasValue)
                userEvaluations = userEvaluations.Where(e => e.CreatedAt >= startDate.Value);

            if (endDate.HasValue)
                userEvaluations = userEvaluations.Where(e => e.CreatedAt <= endDate.Value);

            var filteredEvaluations = userEvaluations.OrderByDescending(e => e.CreatedAt).ToList();

            reportData.AddRange((from evaluation in filteredEvaluations
                let averageScore = evaluation.CategoryScores.Count != 0 == true
                    ? Math.Round(evaluation.CategoryScores.Average(cs => cs.Score), 1)
                    : 0
                select new
                {
                    EvaluationId = evaluation.Id,
                    ProjectId = project.Id,
                    ProjectName = project.Name,
                    ProjectDescription = project.Description,
                    ProjectWebsites = project.Websites,
                    evaluation.WebsiteUrl,
                    evaluation.Notes,
                    evaluation.CreatedAt,
                    UserId = evaluation.CreatedBy,
                    AverageScore = averageScore,
                    CategoryScores = evaluation.CategoryScores
                        .OrderBy(cs => cs.Category!.DisplayOrder)
                        .Select(cs => new 
                        { cs.Id, Category = cs.Category?.Name ?? "Unknown Category", cs.Score, cs.Comment }),
                    ScreenshotAnnotations = evaluation.CategoryScores.Where(cs => cs.Screenshot != null)
                        .OrderBy(cs => cs.Category!.DisplayOrder)
                        .Select(cs => new 
                            { cs.Id, Category = cs.Category?.Name ?? "Unknown Category", Comment = cs.Annotation, Screenshot = cs.Screenshot != null ? Convert.ToBase64String(cs.Screenshot) : null })
                }));
        }

        return Ok(reportData);
    }

    [HttpGet("evaluation-report/csv")]
    public async Task<IActionResult> ExportToCsv(
        Guid? projectId = null, 
        DateTime? startDate = null, 
        DateTime? endDate = null)
    {
        var reportResponse = await GetEvaluationReport(projectId, startDate, endDate);
        var reportData = ((OkObjectResult)reportResponse).Value as IEnumerable<dynamic>;

        var csv = new StringBuilder();
        csv.AppendLine("Project Name,Project Description,Evaluation Website URL,Notes,Created At,User,Category,Score,Comment,Average Score");

        if (reportData != null)
            foreach (var evaluation in reportData)
            {
                var projectName = GetDynamicPropertyValue(evaluation, "ProjectName");
                var projectDescription = GetDynamicPropertyValue(evaluation, "ProjectDescription");
                var websiteUrl = GetDynamicPropertyValue(evaluation, "WebsiteUrl");
                var notes = GetDynamicPropertyValue(evaluation, "Notes");
                var createdAt = GetDynamicPropertyValue(evaluation, "CreatedAt");
                var userId = GetDynamicPropertyValue(evaluation, "UserId");
                var averageScore = GetDynamicPropertyValue(evaluation, "AverageScore");

                var baseInfo =
                    $"\"{projectName}\",\"{projectDescription}\",\"{websiteUrl}\",\"{notes}\",\"{Convert.ToDateTime(createdAt).ToString("dd/MM/yyyy")}\",\"{userId}\"";

                var hasScores = false;

                try
                {
                    var categoryScores = evaluation.CategoryScores;
                    if (categoryScores != null)
                    {
                        foreach (var score in categoryScores)
                        {
                            var category = GetDynamicPropertyValue(score, "Category");
                            var scoreValue = GetDynamicPropertyValue(score, "Score");
                            var comment = GetDynamicPropertyValue(score, "Comment");

                            csv.AppendLine($"{baseInfo},\"{category}\",{scoreValue},\"{comment}\",{averageScore}");
                            hasScores = true;
                        }
                    }
                }
                catch
                {
                    // If we can't access CategoryScores, continue without scores
                }

                if (!hasScores)
                {
                    csv.AppendLine($"{baseInfo},,,{averageScore}");
                }
            }

        var bytes = Encoding.UTF8.GetBytes(csv.ToString());
        return File(bytes, "text/csv", $"evaluation_report_{DateTime.Now:yyyyMMdd_HHmmss}.csv");
    }

    private static string GetDynamicPropertyValue(dynamic obj, string propertyName)
    {
        try
        {
            var type = obj.GetType();
            var property = type.GetProperty(propertyName);
            if (property != null)
            {
                var value = property.GetValue(obj);
                return value?.ToString() ?? "";
            }
        }
        catch
        {
            // Property doesn't exist or can't be accessed
        }
        return "";
    }

    [HttpGet("evaluation-report/pdf")]
    public async Task<IActionResult> ExportToPdf(
        Guid? projectId = null, 
        DateTime? startDate = null, 
        DateTime? endDate = null)
    {
        var reportResponse = await GetEvaluationReport(projectId, startDate, endDate);
        var reportData = ((OkObjectResult)reportResponse).Value as IEnumerable<dynamic>;

        var pdfBytes = pdfService.GenerateEvaluationReportPdf(reportData);
        
        return File(pdfBytes, "application/pdf", $"evaluation_report_{DateTime.Now:yyyyMMdd_HHmmss}.pdf");
    }

    [HttpGet("projects")]
    public async Task<IActionResult> GetProjectsForFilter()
    {
        var projects = await context.Projects
            .Where(p => User.Identity != null && (p.CreatedBy == User.Identity.Name || User.IsInRole("Admin")))
            .Where(p => p.Evaluations != null && p.Evaluations.Any())
            .Select(p => new { p.Id, p.Name })
            .ToListAsync();

        return Ok(projects);
    }
}