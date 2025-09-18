using PdfSharpCore.Drawing;
using System.Text.Json;
using PdfDocument = PdfSharpCore.Pdf.PdfDocument;

namespace UXScore.Services;

public interface IPdfService
{
    byte[] GenerateEvaluationReportPdf(IEnumerable<dynamic>? reportData);
}

public class PdfService : IPdfService
{
    public byte[] GenerateEvaluationReportPdf(IEnumerable<dynamic>? reportData)
    {
        var document = new PdfDocument();
        var page = document.AddPage();
        page.Orientation = PdfSharpCore.PageOrientation.Landscape;
        var gfx = XGraphics.FromPdfPage(page);
        var font = new XFont("Arial", 8, XFontStyle.Regular);
        var fontBold = new XFont("Arial", 10, XFontStyle.Bold);
        var fontTitle = new XFont("Arial", 14, XFontStyle.Bold);

        gfx.DrawString("Evaluation Report", fontTitle, XBrushes.DarkBlue, 
            new XRect(0, 20, page.Width, 30), XStringFormats.TopCenter);
        
        gfx.DrawString($"Generated on {DateTime.Now:dd/MM/yyyy}", font, XBrushes.DarkGray, 
            new XRect(0, 45, page.Width, 20), XStringFormats.TopCenter);

        var data = new List<object>();
        if (reportData != null) data.AddRange(reportData);

        if (data.Count == 0)
        {
            gfx.DrawString("No evaluations found", fontBold, XBrushes.Gray, 
                new XRect(0, 100, page.Width, 30), XStringFormats.TopCenter);
            
            using var emptyStream = new MemoryStream();
            document.Save(emptyStream);
            return emptyStream.ToArray();
        }

        double y = 80;
        const double rowHeight = 25;
        string[] headers = ["Project", "Website", "Category", "Score", "Comment", "Notes", "Avg"];
        double[] columnWidths = [120, 150, 150, 40, 120, 120, 50];
        double x = 40;

        var headerBrush = XBrushes.DarkBlue;
        var headerBackgroundBrush = XBrushes.LightGray;
        
        for (var i = 0; i < headers.Length; i++)
        {
            var rect = new XRect(x, y, columnWidths[i], rowHeight);
            gfx.DrawRectangle(XPens.DarkGray, headerBackgroundBrush, rect);
            gfx.DrawString(headers[i], fontBold, headerBrush, rect, XStringFormats.Center);
            x += columnWidths[i];
        }

        y += rowHeight;

        foreach (var evaluationObj in data)
        {
            try
            {
                var jsonString = JsonSerializer.Serialize(evaluationObj);
                var evaluation = JsonSerializer.Deserialize<JsonElement>(jsonString);
                
                var projectName = GetJsonElementValue(evaluation, "ProjectName");
                var websiteUrl = GetJsonElementValue(evaluation, "WebsiteUrl");
                var notes = GetJsonElementValue(evaluation, "Notes");
                var averageScore = GetJsonElementValue(evaluation, "AverageScore");

                var categoryScores = GetCategoryScoresFromJsonElement(evaluation);

                if (categoryScores.Count > 0)
                {
                    foreach (var score in categoryScores)
                    {
                        if (y > page.Height - 80)
                        {
                            page = document.AddPage();
                            page.Orientation = PdfSharpCore.PageOrientation.Landscape;
                            gfx = XGraphics.FromPdfPage(page);
                            y = 40;
                            x = 40;
                            for (var i = 0; i < headers.Length; i++)
                            {
                                var rect = new XRect(x, y, columnWidths[i], rowHeight);
                                gfx.DrawRectangle(XPens.Black, headerBackgroundBrush, rect);
                                gfx.DrawString(headers[i], fontBold, headerBrush, rect, XStringFormats.Center);
                                x += columnWidths[i];
                            }
                            y += rowHeight;
                        }

                        x = 40;
                        string[] values =
                        [
                            TruncateText(projectName, 30),
                            TruncateText(websiteUrl, 30),
                            TruncateText(score.Category, 30),
                            score.Score.ToString(),
                            TruncateText(score.Comment, 30),
                            TruncateText(notes, 30),
                            averageScore
                        ];

                        var rowBrush = (data.IndexOf(evaluationObj) % 2 == 0) ? XBrushes.White : XBrushes.DarkGray;

                        for (var i = 0; i < values.Length; i++)
                        {
                            var rect = new XRect(x, y, columnWidths[i], rowHeight);
                            gfx.DrawRectangle(XPens.DarkGray, rowBrush, rect);
                            
                            var textBrush = XBrushes.Black;
                            if (i == 3 && int.TryParse(values[i], out var scoreValue))
                            {
                                textBrush = scoreValue >= 4 ? XBrushes.Green : 
                                           scoreValue >= 3 ? XBrushes.Orange : XBrushes.Red;
                            }
                            
                            gfx.DrawString(values[i], font, textBrush, 
                                new XRect(x + 5, y + 5, columnWidths[i] - 10, rowHeight - 10), 
                                XStringFormats.CenterLeft);
                            x += columnWidths[i];
                        }
                        y += rowHeight;
                    }
                }
                else
                {
                    if (y > page.Height - 80)
                    {
                        page = document.AddPage();
                        page.Orientation = PdfSharpCore.PageOrientation.Landscape;
                        gfx = XGraphics.FromPdfPage(page);
                        y = 40;
                    }

                    x = 40;
                    string[] values =
                    [
                        TruncateText(projectName, 12), 
                        TruncateText(websiteUrl, 18), 
                        "No scores", "", "", 
                        TruncateText(notes, 15), 
                        averageScore
                    ];

                    var rowBrush = (data.IndexOf(evaluationObj) % 2 == 0) ? XBrushes.White : XBrushes.AliceBlue;

                    for (var i = 0; i < values.Length; i++)
                    {
                        var rect = new XRect(x, y, columnWidths[i], rowHeight);
                        gfx.DrawRectangle(XPens.DarkGray, rowBrush, rect);
                        gfx.DrawString(values[i], font, XBrushes.DarkGray, 
                            new XRect(x + 5, y + 5, columnWidths[i] - 10, rowHeight - 10), 
                            XStringFormats.CenterLeft);
                        x += columnWidths[i];
                    }
                    y += rowHeight;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error processing evaluation: {ex.Message}");
            }
        }

        var footerY = page.Height - 40;
        gfx.DrawString($"Page 1 • Total Evaluations: {data.Count} • Report generated by Website Evaluator", 
            font, XBrushes.Gray, new XRect(40, footerY, page.Width - 80, 20), XStringFormats.CenterLeft);

        using var stream = new MemoryStream();
        document.Save(stream);
        return stream.ToArray();
    }

    private static string TruncateText(string text, int maxLength)
    {
        if (string.IsNullOrEmpty(text))
            return "";
        
        return text.Length > maxLength ? string.Concat(text.AsSpan(0, maxLength - 3), "...") : text;
    }

    private static string GetJsonElementValue(JsonElement element, string key)
    {
        if (element.TryGetProperty(key, out var property))
        {
            return property.ValueKind switch
            {
                JsonValueKind.String => property.GetString() ?? "",
                JsonValueKind.Number => property.ToString(),
                _ => ""
            };
        }
        return "";
    }

    private static List<CategoryScoreInfo> GetCategoryScoresFromJsonElement(JsonElement evaluation)
    {
        var result = new List<CategoryScoreInfo>();
        
        if (evaluation.TryGetProperty("CategoryScores", out var categoryScoresProperty))
        {
            if (categoryScoresProperty.ValueKind == JsonValueKind.Array)
            {
                foreach (var scoreElement in categoryScoresProperty.EnumerateArray())
                {
                    result.Add(new CategoryScoreInfo
                    {
                        Category = GetJsonElementValue(scoreElement, "Category"),
                        Score = scoreElement.TryGetProperty("Score", out var scoreProp) && scoreProp.TryGetInt32(out var scoreInt) ? scoreInt : 0,
                        Comment = GetJsonElementValue(scoreElement, "Comment")
                    });
                }
            }
        }
        
        return result;
    }
}

public class CategoryScoreInfo
{
    public string Category { get; init; } = "";
    public int Score { get; init; }
    public string Comment { get; init; } = "";
}